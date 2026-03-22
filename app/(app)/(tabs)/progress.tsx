import { useState, useCallback } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useProgress } from "@/hooks/useProgress";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { callEdgeFunction } from "@/lib/claude";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import type { PhotoAngle } from "@/lib/database.types";
import { T } from "@/constants/theme";

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
];

interface ProgressAnalysis {
  summary: string;
  observations: string[];
  encouragement: string;
}

export default function ProgressScreen() {
  const { photos, measurements, isLoading, addMeasurement, uploadPhoto, deletePhoto, refresh } = useProgress();
  const toast = useToast();
  const dialog = useDialog();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [arms, setArms] = useState("");
  const [hips, setHips] = useState("");
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ProgressAnalysis | null>(null);
  const [analyzingProgress, setAnalyzingProgress] = useState(false);

  const handleTakePhoto = async (angle: PhotoAngle) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.error("Camera access is needed for progress photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    setUploadingPhoto(true);
    try {
      await uploadPhoto(result.assets[0].base64, angle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveMeasurement = async () => {
    setSavingMeasurement(true);
    try {
      await addMeasurement({
        weight: weight ? parseFloat(weight) : undefined,
        waist: waist ? parseFloat(waist) : undefined,
        chest: chest ? parseFloat(chest) : undefined,
        arms: arms ? parseFloat(arms) : undefined,
        hips: hips ? parseFloat(hips) : undefined,
      });
      setShowMeasurementForm(false);
      setWeight(""); setWaist(""); setChest(""); setArms(""); setHips("");
      toast.success("Measurement saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingMeasurement(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (photos.length < 2) {
      toast.info("Upload at least 2 progress photos to compare.");
      return;
    }
    const ok = await dialog.confirm(
      "AI Progress Analysis",
      "This will send your two most recent photos to AI for analysis. Continue?",
      { confirmText: "Analyze" }
    );
    if (!ok) return;

    setAnalyzingProgress(true);
    const beforePhoto = photos[photos.length - 1];
    const afterPhoto = photos[0];
    try {
      const [beforeRes, afterRes] = await Promise.all([
        fetch(beforePhoto.photo_url).then((r) => r.blob()),
        fetch(afterPhoto.photo_url).then((r) => r.blob()),
      ]);
      const toBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => { const result = reader.result as string; resolve(result.split(",")[1]); };
          reader.readAsDataURL(blob);
        });
      const [beforeB64, afterB64] = await Promise.all([toBase64(beforeRes), toBase64(afterRes)]);
      const { data, error } = await callEdgeFunction<ProgressAnalysis>("analyze-progress", { before_image: beforeB64, after_image: afterB64 });
      if (error || !data) { toast.error(error ?? "Analysis failed"); } else { setAiAnalysis(data); }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzingProgress(false);
    }
  };

  const latestMeasurement = measurements[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "600", color: T.text, letterSpacing: -0.5, fontFamily: T.font }}>
            Progress
          </Text>
          <Text style={{ fontSize: 12, color: T.text2, marginTop: 2, fontFamily: T.font }}>
            Track your transformation
          </Text>
        </View>

        {/* Progress Photos Section Header */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: T.text2, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: T.font }}>
            PROGRESS PHOTOS
          </Text>
        </View>

        {/* Photo Slots */}
        <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 14 }}>
          {ANGLES.map((a) => {
            const photo = photos.find((p) => p.angle === a.value);
            return (
              <TouchableOpacity
                key={a.value}
                style={{
                  flex: 1,
                  aspectRatio: 3 / 4,
                  backgroundColor: T.surface2,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: T.border,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                onPress={async () => {
                  if (photo) {
                    dialog.show({
                      title: a.label + " Photo",
                      message: "What would you like to do?",
                      buttons: [
                        { text: "Retake", style: "default", onPress: () => handleTakePhoto(a.value) },
                        {
                          text: "Delete", style: "destructive", onPress: async () => {
                            const ok = await dialog.confirm("Delete Photo", "Remove this photo?", { confirmText: "Delete", destructive: true });
                            if (ok) deletePhoto(photo.id, photo.photo_url);
                          }
                        },
                        { text: "Cancel", style: "cancel", onPress: () => {} },
                      ],
                    });
                  } else {
                    handleTakePhoto(a.value);
                  }
                }}
                disabled={uploadingPhoto}
                activeOpacity={0.75}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo.photo_url }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Text style={{ fontSize: 18, color: T.orange, opacity: 0.5 }}>📷</Text>
                    <Text style={{ fontSize: 10, color: T.text3, marginTop: 6, fontFamily: T.font }}>{a.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {uploadingPhoto && <ActivityIndicator color={T.orange} style={{ marginBottom: 12 }} />}

        {/* Photo Timeline */}
        {photos.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>
                Timeline ({photos.length} photos)
              </Text>
              {photos.length >= 2 && (
                <TouchableOpacity onPress={handleAiAnalysis} disabled={analyzingProgress}>
                  <Text style={{ fontSize: 12, color: T.orange, fontFamily: T.font }}>AI Analysis</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo) => (
                <View key={photo.id} style={{ marginRight: 10, position: "relative" }}>
                  <Image source={{ uri: photo.photo_url }} style={{ width: 72, height: 96, borderRadius: 10 }} resizeMode="cover" />
                  {/* Delete button overlay */}
                  <TouchableOpacity
                    onPress={async () => {
                      const ok = await dialog.confirm("Delete Photo", "Remove this progress photo?", { confirmText: "Delete", destructive: true });
                      if (ok) deletePhoto(photo.id, photo.photo_url);
                    }}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    hitSlop={4}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, lineHeight: 12 }}>✕</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 9, color: T.text3, textAlign: "center", marginTop: 4, fontFamily: T.mono }}>
                    {photo.angle} · {new Date(photo.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Analysis Result */}
        {analyzingProgress && (
          <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: T.surface2, borderRadius: 14, padding: 24, alignItems: "center" }}>
            <ActivityIndicator size="large" color={T.orange} />
            <Text style={{ color: T.text2, marginTop: 12, fontFamily: T.font }}>Analyzing your progress...</Text>
          </View>
        )}
        {aiAnalysis && (
          <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: "rgba(255,94,31,0.06)", borderWidth: 1, borderColor: "rgba(255,94,31,0.2)", borderRadius: 14, padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: T.orange, marginBottom: 8, fontFamily: T.font }}>AI Progress Report</Text>
            <Text style={{ fontSize: 12, color: T.text, lineHeight: 18, marginBottom: 10, fontFamily: T.font }}>{aiAnalysis.summary}</Text>
            {(aiAnalysis.observations ?? []).map((obs, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ color: T.orange, marginRight: 6 }}>•</Text>
                <Text style={{ flex: 1, fontSize: 12, color: T.text2, fontFamily: T.font }}>{obs}</Text>
              </View>
            ))}
            <Text style={{ marginTop: 10, fontSize: 12, color: T.green, fontStyle: "italic", fontFamily: T.font }}>{aiAnalysis.encouragement}</Text>
          </View>
        )}

        {/* Measurements Section Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: T.text2, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: T.font }}>
            MEASUREMENTS
          </Text>
          <TouchableOpacity
            onPress={() => setShowMeasurementForm(!showMeasurementForm)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: T.orangeDim,
              borderWidth: 1,
              borderColor: "rgba(255,94,31,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, color: T.orange, lineHeight: 16 }}>{showMeasurementForm ? "×" : "+"}</Text>
          </TouchableOpacity>
        </View>

        {showMeasurementForm && (
          <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: T.surface2, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14 }}>
            <Input label="Weight (kg)" value={weight} onChangeText={setWeight} placeholder="0" keyboardType="decimal-pad" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Input label="Waist (cm)" value={waist} onChangeText={setWaist} placeholder="0" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Input label="Chest (cm)" value={chest} onChangeText={setChest} placeholder="0" keyboardType="decimal-pad" /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Input label="Arms (cm)" value={arms} onChangeText={setArms} placeholder="0" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Input label="Hips (cm)" value={hips} onChangeText={setHips} placeholder="0" keyboardType="decimal-pad" /></View>
            </View>
            <Button title="Save Measurement" onPress={handleSaveMeasurement} loading={savingMeasurement} />
          </View>
        )}

        {latestMeasurement ? (
          <View style={{ marginHorizontal: 16, marginBottom: 24, backgroundColor: T.surface2, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14 }}>
            <Text style={{ fontSize: 11, color: T.text3, fontFamily: T.mono, marginBottom: 12 }}>
              Latest — {new Date(latestMeasurement.recorded_at).toLocaleDateString()}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              {latestMeasurement.weight ? <MeasureVal label="Weight" value={`${latestMeasurement.weight}kg`} /> : null}
              {latestMeasurement.waist ? <MeasureVal label="Waist" value={`${latestMeasurement.waist}cm`} /> : null}
              {latestMeasurement.chest ? <MeasureVal label="Chest" value={`${latestMeasurement.chest}cm`} /> : null}
              {latestMeasurement.arms ? <MeasureVal label="Arms" value={`${latestMeasurement.arms}cm`} /> : null}
              {latestMeasurement.hips ? <MeasureVal label="Hips" value={`${latestMeasurement.hips}cm`} /> : null}
            </View>
          </View>
        ) : (
          !showMeasurementForm && (
            <View style={{ marginHorizontal: 16, marginBottom: 24, backgroundColor: T.surface2, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 28, alignItems: "center" }}>
              <Text style={{ fontSize: 28, opacity: 0.3 }}>🏃</Text>
              <Text style={{ fontSize: 12, color: T.text3, marginTop: 8, fontFamily: T.font }}>No measurements yet</Text>
            </View>
          )
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function MeasureVal({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: "600", color: T.text, fontFamily: T.mono }}>{value}</Text>
      <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>{label}</Text>
    </View>
  );
}
