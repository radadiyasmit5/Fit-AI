import { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/Button";
import { callEdgeFunction } from "@/lib/claude";

interface EquipmentResult {
  equipment_name: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  common_mistakes: string[];
  beginner_tip: string;
  error?: string;
}

export default function IdentifyEquipmentScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<EquipmentResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission Required", "Please grant access to continue.");
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.3, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.3, base64: true });

    if (pickerResult.canceled || !pickerResult.assets[0]) return;

    const asset = pickerResult.assets[0];
    setImageUri(asset.uri);
    setResult(null);

    if (asset.base64) {
      setAnalyzing(true);
      const { data, error } = await callEdgeFunction<EquipmentResult>(
        "identify-equipment",
        { image: asset.base64 }
      );
      if (error || !data) {
        Alert.alert("Error", error ?? "Could not identify equipment");
      } else if (data.error) {
        Alert.alert("Not Recognized", data.error);
      } else {
        setResult(data);
      }
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="ml-3 text-xl font-bold text-white">Equipment ID</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {!imageUri ? (
          <View className="gap-3">
            <TouchableOpacity
              className="items-center rounded-2xl border-2 border-dashed border-dark-border bg-dark-card py-16"
              onPress={() => pickImage(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={48} color="#FF6B35" />
              <Text className="mt-3 text-lg font-semibold text-white">
                Take a Photo
              </Text>
              <Text className="mt-1 text-sm text-gray-400">
                Point at any gym equipment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center rounded-2xl border border-dark-border bg-dark-card py-6"
              onPress={() => pickImage(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={24} color="#8E8E93" />
              <Text className="mt-2 text-sm text-gray-400">Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Image
              source={{ uri: imageUri }}
              className="mb-4 h-52 w-full rounded-2xl"
              resizeMode="cover"
            />

            {analyzing && (
              <View className="items-center rounded-2xl bg-dark-card p-6">
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text className="mt-3 text-white">Identifying equipment...</Text>
              </View>
            )}

            {result && (
              <View>
                <View className="mb-4 rounded-2xl bg-dark-card p-4">
                  <Text className="text-2xl font-bold text-white">
                    {result.equipment_name}
                  </Text>
                  <Text className="mt-1 text-sm text-primary">{result.category}</Text>
                </View>

                {/* Muscles */}
                <View className="mb-4 rounded-2xl bg-dark-card p-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-300">
                    Target Muscles
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {result.primary_muscles.map((m, i) => (
                      <View key={i} className="rounded-full bg-primary/20 px-3 py-1">
                        <Text className="text-xs font-semibold text-primary">{m}</Text>
                      </View>
                    ))}
                    {result.secondary_muscles.map((m, i) => (
                      <View key={i} className="rounded-full bg-dark-border px-3 py-1">
                        <Text className="text-xs text-gray-400">{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Instructions */}
                <View className="mb-4 rounded-2xl bg-dark-card p-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-300">
                    How to Use
                  </Text>
                  {result.instructions.map((step, i) => (
                    <View key={i} className="mb-2 flex-row">
                      <Text className="mr-2 text-sm font-bold text-primary">
                        {i + 1}.
                      </Text>
                      <Text className="flex-1 text-sm text-white">{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Common Mistakes */}
                <View className="mb-4 rounded-2xl bg-dark-card p-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-300">
                    Common Mistakes
                  </Text>
                  {result.common_mistakes.map((m, i) => (
                    <View key={i} className="mb-1 flex-row items-start">
                      <Ionicons name="warning" size={14} color="#FACC15" />
                      <Text className="ml-2 flex-1 text-sm text-gray-300">{m}</Text>
                    </View>
                  ))}
                </View>

                {/* Tip */}
                <View className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <Text className="text-sm font-semibold text-primary">
                    Beginner Tip
                  </Text>
                  <Text className="mt-1 text-sm text-gray-300">
                    {result.beginner_tip}
                  </Text>
                </View>

                <Button
                  title="Scan Another"
                  variant="outline"
                  onPress={() => {
                    setImageUri(null);
                    setResult(null);
                  }}
                />
              </View>
            )}

            {!analyzing && !result && (
              <Button
                title="Try Another Photo"
                variant="outline"
                onPress={() => setImageUri(null)}
              />
            )}
          </View>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
