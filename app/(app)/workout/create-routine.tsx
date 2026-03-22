import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useExercises, useWorkoutTemplates } from "@/hooks/useWorkout";
import { useToast } from "@/lib/toast-context";
import { T } from "@/constants/theme";

export default function CreateRoutineScreen() {
  const { exercises, groupedByMuscle, isLoading } = useExercises();
  const { createTemplate } = useWorkoutTemplates();
  const toast = useToast();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState<string | null>(null);

  const muscleGroups = Object.keys(groupedByMuscle);
  const displayExercises = filterMuscle ? (groupedByMuscle[filterMuscle] ?? []) : exercises;

  const toggleExercise = (id: string) => {
    Keyboard.dismiss();
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please name your routine"); return; }
    if (selected.length === 0) { toast.error("Select at least one exercise"); return; }
    setSaving(true);
    try {
      await createTemplate(name.trim(), selected);
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 12, fontSize: 18, fontWeight: "600", color: T.text, fontFamily: T.font }}>
            Create Routine
          </Text>
        </View>

        {/* Name input */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <Input
            label="Routine Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day, Upper Body"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        {/* Muscle group filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          {[{ label: "All", value: null }, ...muscleGroups.map((mg) => ({ label: mg, value: mg }))].map((item) => {
            const active = filterMuscle === item.value;
            return (
              <TouchableOpacity
                key={item.label}
                onPress={() => setFilterMuscle(item.value)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active ? T.orange : T.surface2,
                  borderWidth: 1,
                  borderColor: active ? T.orange : T.border,
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13, fontWeight: active ? "600" : "400", color: active ? "#fff" : T.text2, fontFamily: T.font }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Exercise list */}
        {isLoading ? (
          <ActivityIndicator color={T.orange} style={{ marginTop: 32, flex: 1 }} />
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {displayExercises.map((ex) => {
              const isSelected = selected.includes(ex.id);
              return (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => toggleExercise(ex.id)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                    borderRadius: 14,
                    borderWidth: 1,
                    padding: 14,
                    backgroundColor: isSelected ? "rgba(255,94,31,0.08)" : T.surface2,
                    borderColor: isSelected ? T.orange : T.border,
                  }}
                >
                  {/* Checkbox */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? T.orange : "transparent",
                      borderColor: isSelected ? T.orange : T.border,
                    }}
                  >
                    {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: T.text, fontFamily: T.font, fontWeight: isSelected ? "500" : "400" }}>
                      {ex.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: T.text3, marginTop: 2, fontFamily: T.font }}>
                      {ex.muscle_group}{ex.equipment_type ? ` · ${ex.equipment_type}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Save button — in normal flow, pushed up by KeyboardAvoidingView */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, borderTopWidth: 1, borderTopColor: T.border }}>
          <Button
            title={`Save Routine (${selected.length} exercise${selected.length !== 1 ? "s" : ""})`}
            onPress={handleSave}
            loading={saving}
            disabled={selected.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
