import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useNutrition } from "@/hooks/useNutrition";

export default function AddMealScreen() {
  const { addMeal } = useNutrition();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a meal name");
      return;
    }
    if (!calories) {
      Alert.alert("Error", "Please enter calories");
      return;
    }
    setLoading(true);
    try {
      await addMeal({
        name: name.trim(),
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
      });
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save meal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="ml-3 text-xl font-bold text-white">Add Meal</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Meal Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Grilled Chicken Salad"
            autoFocus
          />
          <Input
            label="Calories"
            value={calories}
            onChangeText={setCalories}
            placeholder="e.g. 450"
            keyboardType="decimal-pad"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Protein (g)"
                value={protein}
                onChangeText={setProtein}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Input
                label="Carbs (g)"
                value={carbs}
                onChangeText={setCarbs}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Input
                label="Fat (g)"
                value={fat}
                onChangeText={setFat}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View className="mt-4">
            <Button title="Save Meal" onPress={handleSave} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
