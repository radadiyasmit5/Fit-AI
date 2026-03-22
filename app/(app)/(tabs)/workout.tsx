import { useCallback } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorkoutTemplates, useWorkoutHistory } from "@/hooks/useWorkout";
import { useDialog } from "@/lib/dialog-context";
import { T } from "@/constants/theme";

export default function WorkoutScreen() {
  const { templates, isLoading: loadingTemplates, deleteTemplate, refresh: refreshTemplates } = useWorkoutTemplates();
  const { sessions, isLoading: loadingSessions, deleteSession } = useWorkoutHistory();
  const dialog = useDialog();

  useFocusEffect(
    useCallback(() => {
      refreshTemplates();
    }, [refreshTemplates])
  );

  const confirmDeleteSession = async (id: string, date: string) => {
    const ok = await dialog.confirm("Delete Workout", `Delete the workout from ${date}?`, { confirmText: "Delete", destructive: true });
    if (ok) deleteSession(id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "600", color: T.text, letterSpacing: -0.5, fontFamily: T.font }}>
            Workout
          </Text>
          <Text style={{ fontSize: 12, color: T.text2, marginTop: 2, fontFamily: T.font }}>
            Build strength, track progress
          </Text>
        </View>

        {/* Quick Start */}
        <TouchableOpacity
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: T.orange,
            borderRadius: 16,
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
          onPress={() => router.push("/(app)/workout/session")}
          activeOpacity={0.75}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>⚡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff", fontFamily: T.font }}>
              Quick Start
            </Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: T.font }}>
              Start an empty workout
            </Text>
          </View>
          <Text style={{ fontSize: 20, color: "rgba(255,255,255,0.7)" }}>›</Text>
        </TouchableOpacity>

        {/* New Routine + Exercises Row */}
        <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: T.surface2,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: T.border,
              padding: 14,
              alignItems: "center",
              gap: 6,
            }}
            onPress={() => router.push("/(app)/workout/create-routine")}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 22 }}>📋</Text>
            <Text style={{ fontSize: 12, fontWeight: "500", color: T.text, fontFamily: T.font }}>
              New Routine
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: T.surface2,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: T.border,
              padding: 14,
              alignItems: "center",
              gap: 6,
            }}
            onPress={() => router.push("/(app)/workout/exercise-library")}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 22 }}>📖</Text>
            <Text style={{ fontSize: 12, fontWeight: "500", color: T.text, fontFamily: T.font }}>
              Exercises
            </Text>
          </TouchableOpacity>
        </View>

        {/* Identify Equipment */}
        <TouchableOpacity
          style={{
            marginHorizontal: 16,
            marginBottom: 20,
            backgroundColor: T.surface2,
            borderRadius: 14,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "rgba(255,94,31,0.3)",
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
          onPress={() => router.push("/(app)/workout/identify-equipment")}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <Text style={{ fontSize: 13, fontWeight: "500", color: T.text, fontFamily: T.font }}>
            Identify Equipment{" "}
            <Text style={{ color: T.orange }}>(AI)</Text>
          </Text>
          <Text style={{ marginLeft: "auto", fontSize: 16, color: T.text3 }}>›</Text>
        </TouchableOpacity>

        {/* My Routines */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: T.text2, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: T.font }}>
            MY ROUTINES
          </Text>
        </View>

        {loadingTemplates ? (
          <ActivityIndicator color={T.orange} style={{ paddingVertical: 24 }} />
        ) : templates.length === 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 20,
              backgroundColor: T.surface2,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: T.border,
              padding: 28,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28, opacity: 0.3 }}>📋</Text>
            <Text style={{ fontSize: 12, color: T.text3, marginTop: 8, fontFamily: T.font }}>
              No routines yet
            </Text>
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, marginBottom: 20, gap: 8 }}>
            {templates.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={{
                  backgroundColor: T.surface2,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: T.border,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => router.push({ pathname: "/(app)/workout/session", params: { templateId: t.id } })}
                activeOpacity={0.75}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: T.text, fontFamily: T.font }}>
                    {t.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: T.text3, fontFamily: T.mono }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <TouchableOpacity onPress={() => deleteTemplate(t.id)} hitSlop={8}>
                    <Text style={{ fontSize: 14, color: T.text3 }}>🗑️</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, color: T.orange }}>▶</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Workouts */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: T.text2, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: T.font }}>
            RECENT WORKOUTS
          </Text>
        </View>

        {loadingSessions ? (
          <ActivityIndicator color={T.orange} style={{ paddingVertical: 24 }} />
        ) : sessions.length === 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 24,
              backgroundColor: T.surface2,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: T.border,
              padding: 28,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 28, opacity: 0.3 }}>🕐</Text>
            <Text style={{ fontSize: 12, color: T.text3, marginTop: 8, fontFamily: T.font }}>
              No history yet
            </Text>
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, marginBottom: 24, gap: 8 }}>
            {sessions.map((s) => {
              const duration = s.completed_at
                ? Math.round(
                    (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000
                  )
                : 0;
              return (
                <View
                  key={s.id}
                  style={{
                    backgroundColor: T.surface2,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: T.border,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "rgba(46,204,138,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(46,204,138,0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>💪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "500", color: T.text, fontFamily: T.font }}>
                      {new Date(s.started_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                    <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.mono }}>{duration} min</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDeleteSession(s.id, new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color={T.text3} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
