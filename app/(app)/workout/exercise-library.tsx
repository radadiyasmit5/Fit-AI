import { View, Text, SectionList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useExercises } from "@/hooks/useWorkout";

export default function ExerciseLibraryScreen() {
  const { groupedByMuscle, isLoading } = useExercises();

  const sections = Object.entries(groupedByMuscle).map(([title, data]) => ({
    title,
    data,
  }));

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-row items-center px-4 pb-2 pt-2">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="ml-3 text-xl font-bold text-white">Exercise Library</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FF6B35" className="mt-8" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderSectionHeader={({ section }) => (
            <View className="bg-dark-bg pb-2 pt-4">
              <Text className="text-sm font-semibold uppercase tracking-wider text-primary">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="mb-2 rounded-xl bg-dark-card p-4">
              <Text className="text-base font-semibold text-white">{item.name}</Text>
              <View className="mt-1 flex-row items-center">
                {item.equipment_type && (
                  <Text className="text-xs text-gray-400">
                    {item.equipment_type}
                  </Text>
                )}
              </View>
              {item.instructions && (
                <Text className="mt-1 text-xs text-gray-500">
                  {item.instructions}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
