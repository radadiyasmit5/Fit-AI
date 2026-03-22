import { MacroRing } from "@/components/MacroRing";
import { MealCard } from "@/components/MealCard";
import { useNutrition } from "@/hooks/useNutrition";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { T } from "@/constants/theme";

const DAILY_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70 };

export default function NutritionScreen() {
  const { meals, dailyTotals, isLoading, deleteMeal, refreshMeals } = useNutrition();

  useFocusEffect(
    useCallback(() => {
      refreshMeals();
    }, [refreshMeals]),
  );

  const remaining = Math.max(DAILY_GOALS.calories - dailyTotals.calories, 0);
  const approxMeals = remaining > 0 ? Math.round(remaining / 500) : 0;
  const showLowProtein = dailyTotals.protein < DAILY_GOALS.protein * 0.5;
  const proteinNeeded = Math.round(DAILY_GOALS.protein - dailyTotals.protein);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "600", color: T.text, letterSpacing: -0.5, fontFamily: T.font }}>
            Nutrition
          </Text>
          <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Text>
        </View>

        {/* Macro Ring Card */}
        <MacroRing
          calories={dailyTotals.calories}
          protein={dailyTotals.protein}
          carbs={dailyTotals.carbs}
          fat={dailyTotals.fat}
          goals={DAILY_GOALS}
        />

        {/* Low Protein Warning */}
        {showLowProtein && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              backgroundColor: "rgba(74,158,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(74,158,255,0.2)",
              borderRadius: 12,
              padding: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 14 }}>⚠️</Text>
            <View>
              <Text style={{ fontSize: 11, color: T.blue, fontWeight: "500", fontFamily: T.font }}>
                Low protein today
              </Text>
              <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>
                Add {proteinNeeded}g more to hit your muscle-gain target
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 14 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: T.orange,
              borderRadius: 12,
              padding: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
            onPress={() => router.push("/(app)/nutrition/scan-meal")}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 14 }}>📷</Text>
            <Text style={{ fontSize: 13, fontWeight: "500", color: "#fff", fontFamily: T.font }}>
              Scan Meal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "transparent",
              borderRadius: 12,
              padding: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,94,31,0.35)",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
            onPress={() => router.push("/(app)/nutrition/add-meal")}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 13, fontWeight: "500", color: T.orange, fontFamily: T.font }}>
              + Manual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "500", color: T.text2, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: T.font }}>
            TODAY'S MEALS
          </Text>
          <Text style={{ fontSize: 12, color: T.orange, fontFamily: T.font }}>See all</Text>
        </View>

        {/* Meals */}
        {isLoading ? (
          <ActivityIndicator color={T.orange} style={{ paddingVertical: 32 }} />
        ) : meals.length === 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: T.surface2,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: T.border,
              padding: 28,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28, opacity: 0.3 }}>🍽️</Text>
            <Text style={{ fontSize: 12, color: T.text3, marginTop: 8, fontFamily: T.font }}>
              No meals logged yet
            </Text>
          </View>
        ) : (
          meals.map((meal) => <MealCard key={meal.id} meal={meal} onDelete={deleteMeal} />)
        )}

        {/* Remaining Calories Hint */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 24,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: T.text2, fontFamily: T.font }}>
            {remaining} kcal remaining today
          </Text>
          {approxMeals > 0 && (
            <Text style={{ fontSize: 11, color: T.text3, marginTop: 2, fontFamily: T.font }}>
              ~{approxMeals} more meal{approxMeals !== 1 ? "s" : ""} to hit your goal
            </Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
