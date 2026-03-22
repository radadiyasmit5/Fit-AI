import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthContext } from "@/lib/auth-context";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import type { FitnessGoal } from "@/lib/database.types";

const GOALS: { value: FitnessGoal; label: string; emoji: string }[] = [
  { value: "lose_weight", label: "Lose Weight", emoji: "🔥" },
  { value: "build_muscle", label: "Build Muscle", emoji: "💪" },
  { value: "maintain", label: "Stay Fit", emoji: "⚡" },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuthContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!goal) {
      Alert.alert("Error", "Please select a fitness goal");
      return;
    }
    setLoading(true);
    try {
      await completeOnboarding({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        goal,
      });
      router.replace("/(app)/(tabs)");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, paddingTop: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress dots */}
          <View className="mb-8 flex-row justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                className={`h-2 rounded-full ${
                  i <= step ? "w-8 bg-primary" : "w-2 bg-dark-border"
                }`}
              />
            ))}
          </View>

          {step === 0 && (
            <View>
              <Text className="text-3xl font-bold text-white">
                What should we call you?
              </Text>
              <Text className="mb-8 mt-2 text-gray-400">
                Let's personalize your experience.
              </Text>
              <Input
                label="Your Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                autoFocus
              />
              <View className="mt-4">
                <Button
                  title="Continue"
                  onPress={() => {
                    if (!name.trim()) {
                      Alert.alert("Error", "Please enter your name");
                      return;
                    }
                    setStep(1);
                  }}
                />
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text className="text-3xl font-bold text-white">Your Stats</Text>
              <Text className="mb-8 mt-2 text-gray-400">
                Optional — helps us calculate your goals.
              </Text>
              <Input
                label="Age"
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 25"
                keyboardType="number-pad"
              />
              <Input
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 75"
                keyboardType="decimal-pad"
              />
              <Input
                label="Height (cm)"
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 175"
                keyboardType="decimal-pad"
              />
              <View className="mt-4 flex-row gap-3">
                <View className="flex-1">
                  <Button title="Back" variant="outline" onPress={() => setStep(0)} />
                </View>
                <View className="flex-1">
                  <Button title="Continue" onPress={() => setStep(2)} />
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text className="text-3xl font-bold text-white">Your Goal</Text>
              <Text className="mb-8 mt-2 text-gray-400">
                What are you working toward?
              </Text>
              <View className="gap-3">
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    className={`flex-row items-center rounded-xl border p-4 ${
                      goal === g.value
                        ? "border-primary bg-primary/10"
                        : "border-dark-border bg-dark-card"
                    }`}
                    onPress={() => setGoal(g.value)}
                    activeOpacity={0.7}
                  >
                    <Text className="mr-3 text-2xl">{g.emoji}</Text>
                    <Text
                      className={`text-lg font-semibold ${
                        goal === g.value ? "text-primary" : "text-white"
                      }`}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="mt-6 flex-row gap-3">
                <View className="flex-1">
                  <Button title="Back" variant="outline" onPress={() => setStep(1)} />
                </View>
                <View className="flex-1">
                  <Button
                    title="Let's Go!"
                    onPress={handleComplete}
                    loading={loading}
                    disabled={!goal}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
