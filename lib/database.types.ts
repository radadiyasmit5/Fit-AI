export type FitnessGoal = "lose_weight" | "build_muscle" | "maintain";
export type PhotoAngle = "front" | "side" | "back";

export interface Profile {
  id: string;
  name: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  goal: FitnessGoal | null;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

export interface Meal {
  id: string;
  user_id: string;
  nutrition_log_id: string | null;
  name: string;
  photo_url: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment_type: string | null;
  instructions: string | null;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface WorkoutTemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  order: number;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  template_id: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  completed_at: string | null;
}

export interface BodyPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  angle: PhotoAngle;
  taken_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  arms: number | null;
  hips: number | null;
  recorded_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id">>;
      };
      nutrition_logs: {
        Row: NutritionLog;
        Insert: Omit<NutritionLog, "id"> & { id?: string };
        Update: Partial<Omit<NutritionLog, "id">>;
      };
      meals: {
        Row: Meal;
        Insert: Omit<Meal, "id" | "logged_at"> & { id?: string; logged_at?: string };
        Update: Partial<Omit<Meal, "id">>;
      };
      exercises: {
        Row: Exercise;
        Insert: Omit<Exercise, "id"> & { id?: string };
        Update: Partial<Omit<Exercise, "id">>;
      };
      workout_templates: {
        Row: WorkoutTemplate;
        Insert: Omit<WorkoutTemplate, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<WorkoutTemplate, "id">>;
      };
      workout_template_exercises: {
        Row: WorkoutTemplateExercise;
        Insert: Omit<WorkoutTemplateExercise, "id"> & { id?: string };
        Update: Partial<Omit<WorkoutTemplateExercise, "id">>;
      };
      workout_sessions: {
        Row: WorkoutSession;
        Insert: Omit<WorkoutSession, "id" | "started_at"> & { id?: string; started_at?: string };
        Update: Partial<Omit<WorkoutSession, "id">>;
      };
      workout_sets: {
        Row: WorkoutSet;
        Insert: Omit<WorkoutSet, "id"> & { id?: string };
        Update: Partial<Omit<WorkoutSet, "id">>;
      };
      body_photos: {
        Row: BodyPhoto;
        Insert: Omit<BodyPhoto, "id"> & { id?: string };
        Update: Partial<Omit<BodyPhoto, "id">>;
      };
      body_measurements: {
        Row: BodyMeasurement;
        Insert: Omit<BodyMeasurement, "id" | "recorded_at"> & { id?: string; recorded_at?: string };
        Update: Partial<Omit<BodyMeasurement, "id">>;
      };
    };
  };
}
