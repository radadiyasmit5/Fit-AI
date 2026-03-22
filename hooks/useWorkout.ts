import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/lib/auth-context";
import type {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/database.types";

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("*")
      .order("muscle_group")
      .order("name")
      .then(({ data }) => {
        if (data) setExercises(data as Exercise[]);
        setIsLoading(false);
      });
  }, []);

  const groupedByMuscle = exercises.reduce<Record<string, Exercise[]>>(
    (acc, ex) => {
      const group = ex.muscle_group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(ex);
      return acc;
    },
    {}
  );

  return { exercises, groupedByMuscle, isLoading };
}

export function useWorkoutTemplates() {
  const { user } = useAuthContext();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setTemplates(data as WorkoutTemplate[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(
    async (name: string, exerciseIds: string[]) => {
      if (!user) return;
      const { data: template } = await supabase
        .from("workout_templates")
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (template) {
        const exercises = exerciseIds.map((exerciseId, idx) => ({
          template_id: template.id,
          exercise_id: exerciseId,
          order: idx + 1,
        }));
        await supabase.from("workout_template_exercises").insert(exercises);
        await fetchTemplates();
      }
    },
    [user, fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await supabase.from("workout_templates").delete().eq("id", id);
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  return { templates, isLoading, createTemplate, deleteTemplate, refresh: fetchTemplates };
}

export function useWorkoutSession() {
  const { user } = useAuthContext();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);

  const startSession = useCallback(
    async (templateId?: string) => {
      if (!user) return;
      const { data } = await supabase
        .from("workout_sessions")
        .insert({ user_id: user.id, template_id: templateId ?? null })
        .select()
        .single();
      if (data) setActiveSession(data as WorkoutSession);
    },
    [user]
  );

  // Returns the saved WorkoutSet so callers can store the DB id
  const addSet = useCallback(
    async (exerciseId: string, setNumber: number, reps: number, weight: number): Promise<WorkoutSet | null> => {
      if (!activeSession) return null;
      const { data } = await supabase
        .from("workout_sets")
        .insert({
          session_id: activeSession.id,
          exercise_id: exerciseId,
          set_number: setNumber,
          reps,
          weight,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (data) {
        setSets((prev) => [...prev, data as WorkoutSet]);
        return data as WorkoutSet;
      }
      return null;
    },
    [activeSession]
  );

  const completeSession = useCallback(async () => {
    if (!activeSession) return;
    await supabase
      .from("workout_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", activeSession.id);
    setActiveSession(null);
    setSets([]);
  }, [activeSession]);

  return { activeSession, sets, startSession, addSet, completeSession };
}

export function useWorkoutHistory() {
  const { user } = useAuthContext();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(20);
    if (data) setSessions(data as WorkoutSession[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const deleteSession = useCallback(async (id: string) => {
    // Delete sets first in case there's no DB cascade
    await supabase.from("workout_sets").delete().eq("session_id", id);
    await supabase.from("workout_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sessions, isLoading, deleteSession };
}
