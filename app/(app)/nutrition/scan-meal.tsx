import { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useNutrition } from "@/hooks/useNutrition";
import { callEdgeFunction } from "@/lib/claude";
import { T } from "@/constants/theme";

interface FoodItem {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface MealAnalysis {
  items: FoodItem[];
  total: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  confidence: "high" | "medium" | "low";
  notes: string;
}

type Mode = "pick" | "barcode" | "result";

export default function ScanMealScreen() {
  const { addMeal } = useNutrition();
  const [mode, setMode] = useState<Mode>("pick");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mealName, setMealName] = useState("");
  const [scanned, setScanned] = useState(false);

  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission Required", "Please grant access to continue.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.3,
          base64: true,
          exif: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.3,
          base64: true,
          exif: false,
        });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setAnalysis(null);
    setMode("result");

    if (asset.base64) {
      await analyzeImage(asset.base64);
    }
  };

  const openBarcodeScanner = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan barcodes.");
        return;
      }
    }
    setScanned(false);
    setMode("barcode");
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // Stay in barcode mode while fetching — show overlay spinner
    setAnalyzing(true);

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${data}?fields=product_name,nutriments,serving_size`
      );
      const json = await res.json();

      if (json.status !== 1 || !json.product) {
        setAnalyzing(false);
        Alert.alert(
          "Product Not Found",
          "This barcode isn't in the Open Food Facts database. Try scanning your meal photo instead.",
          [{ text: "OK", onPress: () => { setMode("pick"); setScanned(false); } }]
        );
        return;
      }

      setMode("result");

      const p = json.product;
      const n = p.nutriments ?? {};

      // Prefer per-serving values, fall back to per-100g
      const calories =
        n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0;
      const protein =
        n["proteins_serving"] ?? n["proteins_100g"] ?? 0;
      const carbs =
        n["carbohydrates_serving"] ?? n["carbohydrates_100g"] ?? 0;
      const fat =
        n["fat_serving"] ?? n["fat_100g"] ?? 0;

      const productName = p.product_name ?? "Scanned Product";
      const servingNote = p.serving_size ? ` (per ${p.serving_size})` : " (per 100g)";

      const built: MealAnalysis = {
        items: [{ name: productName, calories, protein_g: protein, carbs_g: carbs, fat_g: fat }],
        total: { calories, protein_g: protein, carbs_g: carbs, fat_g: fat },
        confidence: "high",
        notes: `Nutritional info from Open Food Facts${servingNote}`,
      };

      setAnalysis(built);
      setMealName(productName);
      setEditCalories(String(Math.round(calories)));
      setEditProtein(String(Math.round(protein)));
      setEditCarbs(String(Math.round(carbs)));
      setEditFat(String(Math.round(fat)));
    } catch {
      setAnalyzing(false);
      Alert.alert(
        "Error",
        "Failed to look up barcode. Check your connection.",
        [{ text: "OK", onPress: () => { setMode("pick"); setScanned(false); } }]
      );
    }
  };

  const analyzeImage = async (base64: string) => {
    setAnalyzing(true);
    const { data, error } = await callEdgeFunction<MealAnalysis>("analyze-meal", {
      image: base64,
    });

    if (error || !data) {
      Alert.alert("Analysis Failed", error ?? "Could not analyze the image");
      setAnalyzing(false);
      return;
    }

    setAnalysis(data);
    setMealName(data.items.map((i) => i.name).join(", "));
    setEditCalories(String(Math.round(data.total.calories)));
    setEditProtein(String(Math.round(data.total.protein_g)));
    setEditCarbs(String(Math.round(data.total.carbs_g)));
    setEditFat(String(Math.round(data.total.fat_g)));
    setAnalyzing(false);
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
      Alert.alert("Error", "Please enter a meal name");
      return;
    }
    setSaving(true);
    try {
      await addMeal({
        name: mealName.trim(),
        calories: parseFloat(editCalories) || 0,
        protein: parseFloat(editProtein) || 0,
        carbs: parseFloat(editCarbs) || 0,
        fat: parseFloat(editFat) || 0,
      });
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setMode("pick");
    setImageUri(null);
    setAnalysis(null);
    setScanned(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={{ marginLeft: 12, fontSize: 18, fontWeight: "600", color: T.text, fontFamily: T.font }}>
          AI Meal Scanner
        </Text>
      </View>

      {/* Barcode camera view */}
      {mode === "barcode" && (
        <View style={{ flex: 1 }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
          />
          {/* Overlay */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {analyzing ? (
              <View style={{ alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 16, padding: 28 }}>
                <ActivityIndicator size="large" color={T.orange} />
                <Text style={{ marginTop: 12, color: "#fff", fontSize: 14, fontFamily: T.font }}>Looking up product...</Text>
              </View>
            ) : (
              <>
                <View style={{ width: 260, height: 140, borderWidth: 2, borderColor: T.orange, borderRadius: 12 }} />
                <Text style={{ marginTop: 20, color: "#fff", fontSize: 14, fontFamily: T.font, textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
                  Point at a product barcode
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setMode("pick")}
            style={{ position: "absolute", top: 20, right: 20, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, padding: 8 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Pick / result modes */}
      {mode !== "barcode" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">

          {mode === "pick" && (
            <View style={{ gap: 10 }}>
              {/* Take photo */}
              <TouchableOpacity
                style={{ alignItems: "center", borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: T.border, backgroundColor: T.surface2, paddingVertical: 48 }}
                onPress={() => pickImage(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="camera" size={40} color={T.orange} />
                <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "600", color: T.text, fontFamily: T.font }}>Take a Photo</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: T.text2, fontFamily: T.font }}>AI identifies food & macros</Text>
              </TouchableOpacity>

              {/* Scan barcode */}
              <TouchableOpacity
                style={{ alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,94,31,0.35)", backgroundColor: T.surface2, padding: 16 }}
                onPress={openBarcodeScanner}
                activeOpacity={0.75}
              >
                <Ionicons name="barcode-outline" size={22} color={T.orange} />
                <Text style={{ fontSize: 14, fontWeight: "500", color: T.text, fontFamily: T.font }}>
                  Scan Barcode <Text style={{ color: T.orange }}>(instant lookup)</Text>
                </Text>
              </TouchableOpacity>

              {/* Gallery */}
              <TouchableOpacity
                style={{ alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface2, paddingVertical: 14 }}
                onPress={() => pickImage(false)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13, color: T.text2, fontFamily: T.font }}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "result" && (
            <View>
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={{ height: 200, width: "100%", borderRadius: 16, marginBottom: 14 }}
                  resizeMode="cover"
                />
              )}

              {analyzing && (
                <View style={{ alignItems: "center", backgroundColor: T.surface2, borderRadius: 16, padding: 28 }}>
                  <ActivityIndicator size="large" color={T.orange} />
                  <Text style={{ marginTop: 12, color: T.text2, fontFamily: T.font }}>
                    {imageUri ? "Analyzing your meal..." : "Looking up product..."}
                  </Text>
                </View>
              )}

              {analysis && (
                <View>
                  {/* Confidence badge */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: analysis.confidence === "high" ? T.green : analysis.confidence === "medium" ? T.amber : "#ef4444" }} />
                    <Text style={{ fontSize: 12, color: T.text2, fontFamily: T.font }}>{analysis.confidence} confidence</Text>
                  </View>

                  {/* Detected items */}
                  <View style={{ backgroundColor: T.surface2, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: T.text2, marginBottom: 8, fontFamily: T.font }}>Detected Items</Text>
                    {(analysis.items ?? []).map((item, idx) => (
                      <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: idx < (analysis.items ?? []).length - 1 ? 1 : 0, borderBottomColor: T.border }}>
                        <Text style={{ color: T.text, fontSize: 13, fontFamily: T.font }}>{item.name}</Text>
                        <Text style={{ color: T.text2, fontSize: 13, fontFamily: T.mono }}>{Math.round(item.calories)} kcal</Text>
                      </View>
                    ))}
                  </View>

                  {/* Editable fields */}
                  <Input label="Meal Name" value={mealName} onChangeText={setMealName} placeholder="Name this meal" />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}><Input label="Calories" value={editCalories} onChangeText={setEditCalories} keyboardType="decimal-pad" /></View>
                    <View style={{ flex: 1 }}><Input label="Protein (g)" value={editProtein} onChangeText={setEditProtein} keyboardType="decimal-pad" /></View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}><Input label="Carbs (g)" value={editCarbs} onChangeText={setEditCarbs} keyboardType="decimal-pad" /></View>
                    <View style={{ flex: 1 }}><Input label="Fat (g)" value={editFat} onChangeText={setEditFat} keyboardType="decimal-pad" /></View>
                  </View>

                  {analysis.notes && (
                    <Text style={{ marginBottom: 12, fontSize: 11, color: T.text3, fontFamily: T.font }}>{analysis.notes}</Text>
                  )}

                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}><Button title="Back" variant="outline" onPress={reset} /></View>
                    <View style={{ flex: 1 }}><Button title="Log Meal" onPress={handleSave} loading={saving} /></View>
                  </View>
                </View>
              )}

              {!analyzing && !analysis && (
                <Button title="Try Again" variant="outline" onPress={reset} />
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
