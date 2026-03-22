import { Text, TouchableOpacity, View } from "react-native";
import type { Meal } from "@/lib/database.types";
import { T } from "@/constants/theme";

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  const time = new Date(meal.logged_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isClean = meal.calories > 0 && (meal.protein * 4) / meal.calories > 0.15;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: T.surface2,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: T.orangeDim,
          borderWidth: 1,
          borderColor: "rgba(255,94,31,0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16 }}>🍽️</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: T.text,
              fontFamily: T.font,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {meal.name}
          </Text>
          <View
            style={{
              backgroundColor: isClean
                ? "rgba(46,204,138,0.15)"
                : "rgba(240,165,0,0.15)",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "500",
                color: isClean ? T.green : T.amber,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontFamily: T.font,
              }}
            >
              {isClean ? "CLEAN" : "MODERATE"}
            </Text>
          </View>
        </View>
        <Text
          style={{
            fontSize: 11,
            color: T.text2,
            fontFamily: T.mono,
          }}
        >
          {time} · {Math.round(meal.protein)}p · {Math.round(meal.carbs)}c · {Math.round(meal.fat)}f
        </Text>
      </View>

      {/* Calories */}
      <View style={{ alignItems: "flex-end" }}>
        {onDelete ? (
          <TouchableOpacity onPress={() => onDelete(meal.id)} hitSlop={8} style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: T.text3 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: T.orange,
            fontFamily: T.mono,
          }}
        >
          {Math.round(meal.calories)}
        </Text>
        <Text style={{ fontSize: 9, color: T.text3, fontFamily: T.font }}>kcal</Text>
      </View>
    </View>
  );
}
