import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RestTimer } from "@/components/RestTimer";
import { useWorkoutSession, useExercises } from "@/hooks/useWorkout";
import { useAuthContext } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { callEdgeFunction } from "@/lib/claude";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { T } from "@/constants/theme";
import type { Exercise } from "@/lib/database.types";

interface SetEntry {
  reps: string;
  weight: string;
  completed: boolean;
  dbId?: string;
}

interface ExerciseLog {
  exercise: Exercise;
  sets: SetEntry[];
}

export default function WorkoutSessionScreen() {
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const { startSession, addSet, completeSession, activeSession } = useWorkoutSession();
  const { exercises } = useExercises();
  const { user } = useAuthContext();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const dialog = useDialog();

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [search, setSearch] = useState("");
  const [prevBests, setPrevBests] = useState<Record<string, string>>({});

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Start session + load template exercises
  useEffect(() => {
    const init = async () => {
      await startSession(templateId);
      if (templateId) {
        const { data } = await supabase
          .from("workout_template_exercises")
          .select("exercise_id, order, exercises(*)")
          .eq("template_id", templateId)
          .order("order");
        if (data) {
          const logs = data
            .map((te) => {
              const ex = (te as { exercises: Exercise | null }).exercises;
              if (!ex) return null;
              return { exercise: ex, sets: [{ reps: "", weight: "", completed: false }] };
            })
            .filter(Boolean) as ExerciseLog[];
          setExerciseLogs(logs);
        }
      }
    };
    init();
  }, []);

  // Fetch previous bests whenever exercise list changes
  useEffect(() => {
    const ids = exerciseLogs.map((l) => l.exercise.id);
    if (!user || ids.length === 0) return;

    const fetch = async () => {
      const { data: recentSessions } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(20);

      if (!recentSessions?.length) return;

      const { data: recentSets } = await supabase
        .from("workout_sets")
        .select("exercise_id, weight, reps")
        .in("session_id", recentSessions.map((s) => s.id))
        .in("exercise_id", ids)
        .order("completed_at", { ascending: false });

      const bests: Record<string, string> = {};
      recentSets?.forEach((s) => {
        if (!bests[s.exercise_id]) {
          const w = s.weight > 0 ? `${s.weight}kg` : "BW";
          bests[s.exercise_id] = `${w} × ${s.reps}`;
        }
      });
      setPrevBests(bests);
    };
    fetch();
  }, [exerciseLogs.length, user]);

  const formatElapsed = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const addExercise = (exercise: Exercise) => {
    setExerciseLogs((prev) => [
      ...prev,
      { exercise, sets: [{ reps: "", weight: "", completed: false }] },
    ]);
    setShowPicker(false);
    setSearch("");
  };

  const removeExercise = async (exerciseIdx: number) => {
    const log = exerciseLogs[exerciseIdx];
    const ok = await dialog.confirm("Remove Exercise", `Remove ${log.exercise.name}?`, { confirmText: "Remove", destructive: true });
    if (!ok) return;
    if (activeSession) {
      await supabase
        .from("workout_sets")
        .delete()
        .eq("session_id", activeSession.id)
        .eq("exercise_id", log.exercise.id);
    }
    setExerciseLogs((prev) => prev.filter((_, i) => i !== exerciseIdx));
  };

  const addSetToExercise = (exerciseIdx: number) => {
    setExerciseLogs((prev) => {
      const updated = [...prev];
      updated[exerciseIdx] = {
        ...updated[exerciseIdx],
        sets: [...updated[exerciseIdx].sets, { reps: "", weight: "", completed: false }],
      };
      return updated;
    });
  };

  const deleteSet = async (exerciseIdx: number, setIdx: number) => {
    const set = exerciseLogs[exerciseIdx].sets[setIdx];
    if (set.dbId) {
      await supabase.from("workout_sets").delete().eq("id", set.dbId);
    }
    setExerciseLogs((prev) => {
      const updated = [...prev];
      const sets = updated[exerciseIdx].sets.filter((_, i) => i !== setIdx);
      updated[exerciseIdx] = { ...updated[exerciseIdx], sets };
      return updated;
    });
  };

  const updateSet = (exerciseIdx: number, setIdx: number, field: "reps" | "weight", value: string) => {
    setExerciseLogs((prev) => {
      const updated = [...prev];
      const sets = [...updated[exerciseIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      updated[exerciseIdx] = { ...updated[exerciseIdx], sets };
      return updated;
    });
  };

  const completeSet = async (exerciseIdx: number, setIdx: number) => {
    const log = exerciseLogs[exerciseIdx];
    const set = log.sets[setIdx];
    const reps = parseInt(set.reps, 10);
    const weight = parseFloat(set.weight);

    if (!reps || reps <= 0) {
      toast.error("Enter reps before completing this set");
      return;
    }

    const savedSet = await addSet(log.exercise.id, setIdx + 1, reps, weight || 0);

    setExerciseLogs((prev) => {
      const updated = [...prev];
      const sets = [...updated[exerciseIdx].sets];
      sets[setIdx] = { ...sets[setIdx], completed: true, dbId: savedSet?.id };
      updated[exerciseIdx] = { ...updated[exerciseIdx], sets };
      return updated;
    });
  };

  const handleFinish = async () => {
    const totalSets = exerciseLogs.reduce(
      (sum, log) => sum + log.sets.filter((s) => s.completed).length,
      0
    );
    const ok = await dialog.confirm(
      "Finish Workout?",
      `${exerciseLogs.length} exercise${exerciseLogs.length !== 1 ? "s" : ""}, ${totalSets} set${totalSets !== 1 ? "s" : ""} completed.`,
      { confirmText: "Finish" }
    );
    if (!ok) return;
    const sessionId = activeSession?.id;
    await completeSession();
    if (sessionId) {
      callEdgeFunction("workout-analysis", { sessionId }).catch(() => {});
    }
    router.back();
  };

  // Exercise picker: filter + group
  const filteredExercises = search.trim()
    ? exercises.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.muscle_group.toLowerCase().includes(search.toLowerCase())
      )
    : exercises;

  const grouped = filteredExercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = [];
    acc[ex.muscle_group].push(ex);
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header — manual top inset so fullScreenModal works on web too */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: T.border,
        }}
      >
        <TouchableOpacity
          hitSlop={8}
          onPress={() => setShowDiscard(true)}
        >
          <Ionicons name="close" size={24} color={T.text2} />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: T.font }}>
            Duration
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: T.text, fontFamily: T.mono }}>
            {formatElapsed(elapsed)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleFinish}
          style={{ backgroundColor: T.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff", fontFamily: T.font }}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <RestTimer />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {exerciseLogs.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text style={{ fontSize: 40, opacity: 0.25 }}>🏋️</Text>
            <Text style={{ color: T.text2, marginTop: 10, fontSize: 14, fontFamily: T.font }}>
              No exercises added yet
            </Text>
            <Text style={{ color: T.text3, fontSize: 12, marginTop: 4, fontFamily: T.font }}>
              Tap "Add Exercise" below to start
            </Text>
          </View>
        )}

        {exerciseLogs.map((log, exIdx) => {
          const volume = log.sets
            .filter((s) => s.completed)
            .reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
          const prev = prevBests[log.exercise.id];

          return (
            <View
              key={exIdx}
              style={{
                backgroundColor: T.surface2,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: T.border,
                padding: 14,
                marginBottom: 12,
              }}
            >
              {/* Exercise header */}
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: T.orange, fontFamily: T.font }}>
                    {log.exercise.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: T.text3, fontFamily: T.font, marginTop: 2 }}>
                    {log.exercise.muscle_group}
                    {prev ? `  ·  Last: ${prev}` : ""}
                  </Text>
                </View>
                {volume > 0 && (
                  <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.mono, marginRight: 10, marginTop: 2 }}>
                    {Math.round(volume)}kg vol
                  </Text>
                )}
                <TouchableOpacity onPress={() => removeExercise(exIdx)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={T.text3} />
                </TouchableOpacity>
              </View>

              {/* Column headers */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ width: 32, fontSize: 10, color: T.text3, textAlign: "center", fontFamily: T.font }}>SET</Text>
                <Text style={{ flex: 1, fontSize: 10, color: T.text3, textAlign: "center", fontFamily: T.font }}>KG</Text>
                <Text style={{ flex: 1, fontSize: 10, color: T.text3, textAlign: "center", fontFamily: T.font }}>REPS</Text>
                <View style={{ width: 68 }} />
              </View>

              {/* Sets */}
              {log.sets.map((set, setIdx) => (
                <View key={setIdx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  {/* Set number badge */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: set.completed ? "rgba(46,204,138,0.15)" : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: set.completed ? T.green : T.text2,
                        fontFamily: T.mono,
                      }}
                    >
                      {setIdx + 1}
                    </Text>
                  </View>

                  {/* Weight input */}
                  <TextInput
                    style={{
                      flex: 1,
                      marginHorizontal: 4,
                      height: 36,
                      borderRadius: 8,
                      textAlign: "center",
                      fontSize: 14,
                      fontFamily: T.mono,
                      borderWidth: 1,
                      backgroundColor: set.completed ? "rgba(46,204,138,0.08)" : T.surface,
                      borderColor: set.completed ? "rgba(46,204,138,0.2)" : T.border,
                      color: set.completed ? T.green : T.text,
                    }}
                    value={set.weight}
                    onChangeText={(v) => updateSet(exIdx, setIdx, "weight", v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={T.text3}
                    editable={!set.completed}
                  />

                  {/* Reps input */}
                  <TextInput
                    style={{
                      flex: 1,
                      marginHorizontal: 4,
                      height: 36,
                      borderRadius: 8,
                      textAlign: "center",
                      fontSize: 14,
                      fontFamily: T.mono,
                      borderWidth: 1,
                      backgroundColor: set.completed ? "rgba(46,204,138,0.08)" : T.surface,
                      borderColor: set.completed ? "rgba(46,204,138,0.2)" : T.border,
                      color: set.completed ? T.green : T.text,
                    }}
                    value={set.reps}
                    onChangeText={(v) => updateSet(exIdx, setIdx, "reps", v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={T.text3}
                    editable={!set.completed}
                  />

                  {/* Complete button / completed indicator */}
                  {set.completed ? (
                    <View
                      style={{
                        width: 68,
                        height: 36,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(46,204,138,0.15)",
                      }}
                    >
                      <Ionicons name="checkmark" size={18} color={T.green} />
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", width: 68, gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => completeSet(exIdx, setIdx)}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: T.orange,
                        }}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteSet(exIdx, setIdx)}
                        style={{
                          width: 28,
                          height: 36,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: T.surface,
                        }}
                      >
                        <Ionicons name="close" size={14} color={T.text3} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

              {/* Add Set */}
              <TouchableOpacity
                onPress={() => addSetToExercise(exIdx)}
                style={{ alignItems: "center", paddingVertical: 8, marginTop: 2 }}
              >
                <Text style={{ fontSize: 13, color: T.orange, fontFamily: T.font }}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add Exercise button */}
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={{
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "rgba(255,94,31,0.4)",
            borderRadius: 14,
            padding: 16,
            alignItems: "center",
            marginBottom: 32,
          }}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 14, color: T.orange, fontFamily: T.font }}>+ Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Discard Confirmation Modal */}
      <Modal visible={showDiscard} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ backgroundColor: T.surface2, borderRadius: 16, padding: 24, marginHorizontal: 32, width: "85%" }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: T.text, fontFamily: T.font, marginBottom: 6 }}>
              Discard Workout?
            </Text>
            <Text style={{ fontSize: 14, color: T.text2, fontFamily: T.font, marginBottom: 22, lineHeight: 20 }}>
              Your progress will not be saved.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowDiscard(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, alignItems: "center" }}
              >
                <Text style={{ color: T.text, fontWeight: "500", fontFamily: T.font }}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowDiscard(false); router.back(); }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#ff453a", alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontFamily: T.font }}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
          {/* Modal header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: T.border,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "600", color: T.text, fontFamily: T.font }}>
              Add Exercise
            </Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setSearch(""); }} hitSlop={8}>
              <Ionicons name="close" size={24} color={T.text2} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <TextInput
              style={{
                backgroundColor: T.surface2,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: T.text,
                fontSize: 14,
                fontFamily: T.font,
                borderWidth: 1,
                borderColor: T.border,
              }}
              placeholder="Search exercises or muscle group..."
              placeholderTextColor={T.text3}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {Object.entries(grouped).map(([muscle, exs]) => (
              <View key={muscle}>
                <Text
                  style={{
                    fontSize: 11,
                    color: T.text2,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 6,
                    fontFamily: T.font,
                  }}
                >
                  {muscle}
                </Text>
                {exs.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    onPress={() => addExercise(ex)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderBottomWidth: 1,
                      borderBottomColor: T.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={{ fontSize: 14, color: T.text, fontFamily: T.font }}>{ex.name}</Text>
                      {prevBests[ex.id] && (
                        <Text style={{ fontSize: 11, color: T.text3, fontFamily: T.mono, marginTop: 1 }}>
                          Last: {prevBests[ex.id]}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={T.orange} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
