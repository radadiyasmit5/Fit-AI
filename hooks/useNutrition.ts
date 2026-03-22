import { useAuthContext } from "@/lib/auth-context";
import type { Meal, NutritionLog } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function useNutrition(date?: string) {
  const { user } = useAuthContext();
  const today = date ?? new Date().toISOString().split("T")[0];
  const [meals, setMeals] = useState<Meal[]>([]);
  const [nutritionLog, setNutritionLog] = useState<NutritionLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dailyTotals: DailyTotals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const [mealsRes, logRes] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay)
        .order("logged_at", { ascending: false }),
      supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single(),
    ]);

    if (mealsRes.data) setMeals(mealsRes.data as Meal[]);
    if (logRes.data) setNutritionLog(logRes.data as NutritionLog);
    setIsLoading(false);
  }, [user, today]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const addMeal = useCallback(
    async (meal: {
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      photo_url?: string;
    }) => {
      if (!user) return;

      // Upsert nutrition log for today
      const { data: log } = await supabase
        .from("nutrition_logs")
        .upsert(
          {
            user_id: user.id,
            date: today,
            total_calories: dailyTotals.calories + meal.calories,
            total_protein: dailyTotals.protein + meal.protein,
            total_carbs: dailyTotals.carbs + meal.carbs,
            total_fat: dailyTotals.fat + meal.fat,
          },
          { onConflict: "user_id,date" },
        )
        .select()
        .single();

      // Insert meal
      const { error: mealError } = await supabase.from("meals").insert({
        user_id: user.id,
        nutrition_log_id: log?.id ?? null,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        photo_url: meal.photo_url ?? null,
      });

      if (mealError) throw new Error(mealError.message);

      await fetchMeals();
    },
    [user, today, dailyTotals, fetchMeals],
  );

  const deleteMeal = useCallback(
    async (mealId: string) => {
      await supabase.from("meals").delete().eq("id", mealId);
      await fetchMeals();
    },
    [fetchMeals],
  );

  return {
    meals,
    nutritionLog,
    dailyTotals,
    isLoading,
    addMeal,
    deleteMeal,
    refreshMeals: fetchMeals,
  };
}
