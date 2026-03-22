import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { T } from "@/constants/theme";

interface WeeklySummary {
  mealsLogged: number;
  totalCalories: number;
  workoutsCompleted: number;
  currentStreak: number;
}

interface WorkoutAdaptation {
  summary: string;
  next_focus: string;
  exercises: { name: string; trend: string; suggestion: string }[];
}

export default function DashboardScreen() {
  const { profile } = useAuthContext();
  const [summary, setSummary] = useState<WeeklySummary>({
    mealsLogged: 0,
    totalCalories: 0,
    workoutsCompleted: 0,
    currentStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [adaptation, setAdaptation] = useState<WorkoutAdaptation | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [mealsRes, sessionsRes, measurementRes, adaptationRes] = await Promise.all([
        supabase
          .from("meals")
          .select("id, calories")
          .eq("user_id", profile.id)
          .gte("logged_at", weekAgo.toISOString()),
        supabase
          .from("workout_sessions")
          .select("id, started_at")
          .eq("user_id", profile.id)
          .not("completed_at", "is", null)
          .gte("started_at", weekAgo.toISOString()),
        supabase
          .from("body_measurements")
          .select("weight")
          .eq("user_id", profile.id)
          .order("recorded_at", { ascending: false })
          .limit(1),
        supabase
          .from("workout_adaptations")
          .select("recommendations")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      const meals = mealsRes.data ?? [];
      const sessions = sessionsRes.data ?? [];

      const activityDays = new Set<string>();
      meals.forEach(() => activityDays.add(now.toISOString().split("T")[0]));
      sessions.forEach((s) =>
        activityDays.add(new Date(s.started_at).toISOString().split("T")[0])
      );

      let streak = 0;
      const checkDate = new Date(now);
      while (true) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (activityDays.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setSummary({
        mealsLogged: meals.length,
        totalCalories: meals.reduce((sum, m) => sum + ((m as { calories: number }).calories ?? 0), 0),
        workoutsCompleted: sessions.length,
        currentStreak: streak,
      });

      if (measurementRes.data?.[0]) {
        setLatestWeight((measurementRes.data[0] as { weight: number | null }).weight);
      }
      if (adaptationRes.data?.recommendations) {
        setAdaptation(adaptationRes.data.recommendations as WorkoutAdaptation);
      }

      setIsLoading(false);
    };

    fetchDashboardData();
  }, [profile]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const goalLabel =
    profile?.goal === "lose_weight" ? "Lose Weight"
    : profile?.goal === "build_muscle" ? "Build Muscle"
    : "Stay Fit";

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={T.orange} />
      </SafeAreaView>
    );
  }

  const statCards = [
    {
      emoji: "🍽️",
      value: summary.mealsLogged,
      label: "Meals logged",
      color: T.orange,
      iconBg: T.orangeDim,
      iconBorder: "rgba(255,94,31,0.2)",
      barFill: summary.mealsLogged / 10,
    },
    {
      emoji: "💪",
      value: summary.workoutsCompleted,
      label: "Workouts",
      color: T.green,
      iconBg: "rgba(46,204,138,0.12)",
      iconBorder: "rgba(46,204,138,0.2)",
      barFill: summary.workoutsCompleted / 7,
    },
    {
      emoji: "⚡",
      value: Math.round(summary.totalCalories),
      label: "Calories this week",
      color: T.amber,
      iconBg: "rgba(240,165,0,0.12)",
      iconBorder: "rgba(240,165,0,0.2)",
      barFill: summary.totalCalories / 15400,
    },
    {
      emoji: "⚖️",
      value: latestWeight ? `${latestWeight}` : "—",
      label: latestWeight ? "kg current" : "No weight data",
      color: T.blue,
      iconBg: "rgba(74,158,255,0.12)",
      iconBorder: "rgba(74,158,255,0.2)",
      barFill: 0.5,
    },
  ];

  const insightText = adaptation?.summary
    ?? (summary.workoutsCompleted > 0
      ? `${summary.workoutsCompleted} workouts and ${summary.mealsLogged} meals logged this week. Avg ${Math.round(summary.totalCalories / 7)} kcal/day.`
      : "Log your first workout to unlock personalized insights.");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            background: "linear-gradient(180deg, rgba(255,94,31,0.06) 0%, transparent 100%)",
          }}
        >
          <Text style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: T.font }}>
            {greeting()}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "600", color: T.text, letterSpacing: -0.5, marginTop: 2, fontFamily: T.font }}>
            {profile?.name ?? "there"}{" "}
            <Text style={{ color: T.orange }}>↗</Text>
          </Text>
        </View>

        {/* FIX 4: Streak Card */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: T.surface2,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: T.border,
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Glow in top-right corner */}
          <View
            style={{
              position: "absolute",
              right: -10,
              top: -10,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(255,87,34,0.18)",
            }}
          />
          <View>
            <Text style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: T.font }}>
              CURRENT STREAK
            </Text>
            <Text style={{ fontSize: 52, fontWeight: "700", color: T.orange, fontFamily: T.mono, lineHeight: 60, marginTop: 2 }}>
              {summary.currentStreak}
            </Text>
            <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>days in a row</Text>
          </View>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: T.orangeDim,
              borderWidth: 1,
              borderColor: "rgba(255,94,31,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 26 }}>🔥</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {statCards.map((card, i) => (
            <View
              key={i}
              style={{
                width: "48%",
                backgroundColor: T.surface2,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: T.border,
                padding: 14,
              }}
            >
              {/* FIX 3: icon box 34×34, radius 10, emoji 16px */}
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: card.iconBg,
                  borderWidth: 1,
                  borderColor: card.iconBorder,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 16 }}>{card.emoji}</Text>
              </View>
              {/* FIX 3: 28px, weight 700, letterSpacing -1 */}
              <Text style={{ fontSize: 28, fontWeight: "700", color: card.color, fontFamily: T.mono, lineHeight: 32, letterSpacing: -1 }}>
                {card.value}
              </Text>
              <Text style={{ fontSize: 11, color: T.text2, marginTop: 4, fontFamily: T.font }}>
                {card.label}
              </Text>
              <View style={{ height: 3, backgroundColor: T.border, borderRadius: 2, marginTop: 10 }}>
                <View
                  style={{
                    height: "100%",
                    width: `${Math.min(card.barFill, 1) * 100}%`,
                    backgroundColor: card.color,
                    borderRadius: 2,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        {/* AI Weekly Insight */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            background: "linear-gradient(135deg, rgba(255,94,31,0.1), rgba(255,94,31,0.04))",
            backgroundColor: "rgba(255,94,31,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,94,31,0.2)",
            borderRadius: 16,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
            <Text style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: T.font, flex: 1 }}>
              AI WEEKLY INSIGHT
            </Text>
            <View
              style={{
                backgroundColor: T.orangeDim,
                borderWidth: 1,
                borderColor: "rgba(255,94,31,0.2)",
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "500", color: T.orange, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: T.font }}>
                NEW
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: T.text, lineHeight: 18, fontFamily: T.font }}>
            {insightText}
          </Text>
        </View>

        {/* Goal Card */}
        {profile?.goal && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 24,
              backgroundColor: T.surface2,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,94,31,0.25)",
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: T.orange,
                shadowColor: T.orange,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 4,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>Current goal</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: T.text, fontFamily: T.font }}>{goalLabel}</Text>
            </View>
            <Text style={{ fontSize: 18, color: T.text2, opacity: 0.4 }}>›</Text>
          </View>
        )}

        {/* Next Workout Card (from adaptation) */}
        {adaptation && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 24,
              backgroundColor: T.surface2,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: T.border,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 14 }}>💡</Text>
              <Text style={{ fontSize: 11, color: T.text2, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: T.font }}>
                NEXT WORKOUT
              </Text>
            </View>
            {adaptation.exercises?.slice(0, 2).map((ex) => (
              <View key={ex.name} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: ex.trend === "progressing" ? T.green : ex.trend === "regressing" ? "#ff453a" : T.amber }}>
                  {ex.trend === "progressing" ? "↑" : ex.trend === "regressing" ? "↓" : "→"}
                </Text>
                <Text style={{ flex: 1, fontSize: 11, color: T.text2, fontFamily: T.font }}>
                  <Text style={{ color: T.text }}>{ex.name}: </Text>{ex.suggestion}
                </Text>
              </View>
            ))}
            {adaptation.next_focus ? (
              <Text style={{ fontSize: 11, color: T.orange, marginTop: 6, fontFamily: T.font }}>{adaptation.next_focus}</Text>
            ) : null}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
