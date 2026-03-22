-- ============================================
-- Fit-AI Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. Profiles
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  age integer,
  weight real,
  height real,
  goal text check (goal in ('lose_weight', 'build_muscle', 'maintain')),
  created_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- ============================================
-- 2. Nutrition Logs
-- ============================================
create table nutrition_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  total_calories real default 0 not null,
  total_protein real default 0 not null,
  total_carbs real default 0 not null,
  total_fat real default 0 not null,
  unique (user_id, date)
);

alter table nutrition_logs enable row level security;

create policy "Users can view own nutrition logs"
  on nutrition_logs for select using (auth.uid() = user_id);
create policy "Users can insert own nutrition logs"
  on nutrition_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own nutrition logs"
  on nutrition_logs for update using (auth.uid() = user_id);
create policy "Users can delete own nutrition logs"
  on nutrition_logs for delete using (auth.uid() = user_id);

-- ============================================
-- 3. Meals
-- ============================================
create table meals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nutrition_log_id uuid references nutrition_logs on delete set null,
  name text not null,
  photo_url text,
  calories real default 0 not null,
  protein real default 0 not null,
  carbs real default 0 not null,
  fat real default 0 not null,
  logged_at timestamptz default now() not null
);

alter table meals enable row level security;

create policy "Users can view own meals"
  on meals for select using (auth.uid() = user_id);
create policy "Users can insert own meals"
  on meals for insert with check (auth.uid() = user_id);
create policy "Users can update own meals"
  on meals for update using (auth.uid() = user_id);
create policy "Users can delete own meals"
  on meals for delete using (auth.uid() = user_id);

-- ============================================
-- 4. Exercises (shared library)
-- ============================================
create table exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  muscle_group text not null,
  equipment_type text,
  instructions text
);

alter table exercises enable row level security;

create policy "Exercises are readable by all authenticated users"
  on exercises for select using (auth.role() = 'authenticated');

-- ============================================
-- 5. Workout Templates
-- ============================================
create table workout_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null
);

alter table workout_templates enable row level security;

create policy "Users can view own workout templates"
  on workout_templates for select using (auth.uid() = user_id);
create policy "Users can insert own workout templates"
  on workout_templates for insert with check (auth.uid() = user_id);
create policy "Users can update own workout templates"
  on workout_templates for update using (auth.uid() = user_id);
create policy "Users can delete own workout templates"
  on workout_templates for delete using (auth.uid() = user_id);

-- ============================================
-- 6. Workout Template Exercises (join table)
-- ============================================
create table workout_template_exercises (
  id uuid default uuid_generate_v4() primary key,
  template_id uuid references workout_templates on delete cascade not null,
  exercise_id uuid references exercises on delete cascade not null,
  "order" integer not null
);

alter table workout_template_exercises enable row level security;

create policy "Users can view own template exercises"
  on workout_template_exercises for select
  using (
    exists (
      select 1 from workout_templates
      where workout_templates.id = workout_template_exercises.template_id
        and workout_templates.user_id = auth.uid()
    )
  );
create policy "Users can insert own template exercises"
  on workout_template_exercises for insert
  with check (
    exists (
      select 1 from workout_templates
      where workout_templates.id = workout_template_exercises.template_id
        and workout_templates.user_id = auth.uid()
    )
  );
create policy "Users can delete own template exercises"
  on workout_template_exercises for delete
  using (
    exists (
      select 1 from workout_templates
      where workout_templates.id = workout_template_exercises.template_id
        and workout_templates.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. Workout Sessions
-- ============================================
create table workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  template_id uuid references workout_templates on delete set null,
  started_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table workout_sessions enable row level security;

create policy "Users can view own workout sessions"
  on workout_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own workout sessions"
  on workout_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own workout sessions"
  on workout_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own workout sessions"
  on workout_sessions for delete using (auth.uid() = user_id);

-- ============================================
-- 8. Workout Sets
-- ============================================
create table workout_sets (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references workout_sessions on delete cascade not null,
  exercise_id uuid references exercises on delete cascade not null,
  set_number integer not null,
  reps integer,
  weight real,
  completed_at timestamptz
);

alter table workout_sets enable row level security;

create policy "Users can view own workout sets"
  on workout_sets for select
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );
create policy "Users can insert own workout sets"
  on workout_sets for insert
  with check (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );
create policy "Users can update own workout sets"
  on workout_sets for update
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );
create policy "Users can delete own workout sets"
  on workout_sets for delete
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_sets.session_id
        and workout_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- 9. Body Photos
-- ============================================
create table body_photos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  photo_url text not null,
  angle text check (angle in ('front', 'side', 'back')) not null,
  taken_at timestamptz default now() not null
);

alter table body_photos enable row level security;

create policy "Users can view own body photos"
  on body_photos for select using (auth.uid() = user_id);
create policy "Users can insert own body photos"
  on body_photos for insert with check (auth.uid() = user_id);
create policy "Users can delete own body photos"
  on body_photos for delete using (auth.uid() = user_id);

-- ============================================
-- 10. Body Measurements
-- ============================================
create table body_measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  weight real,
  waist real,
  chest real,
  arms real,
  hips real,
  recorded_at timestamptz default now() not null
);

alter table body_measurements enable row level security;

create policy "Users can view own body measurements"
  on body_measurements for select using (auth.uid() = user_id);
create policy "Users can insert own body measurements"
  on body_measurements for insert with check (auth.uid() = user_id);
create policy "Users can update own body measurements"
  on body_measurements for update using (auth.uid() = user_id);
create policy "Users can delete own body measurements"
  on body_measurements for delete using (auth.uid() = user_id);

-- ============================================
-- 11. Seed Exercise Library
-- ============================================
insert into exercises (name, muscle_group, equipment_type, instructions) values
  ('Barbell Bench Press', 'Chest', 'Barbell', 'Lie on bench, grip bar shoulder-width, lower to chest, press up'),
  ('Incline Dumbbell Press', 'Chest', 'Dumbbell', 'Set bench to 30-45 degrees, press dumbbells up from chest'),
  ('Cable Flyes', 'Chest', 'Cable', 'Stand between cables, bring handles together in front of chest'),
  ('Push Ups', 'Chest', 'Bodyweight', 'Hands shoulder-width, lower chest to floor, push back up'),
  ('Barbell Back Squat', 'Legs', 'Barbell', 'Bar on upper back, squat down to parallel, drive up through heels'),
  ('Romanian Deadlift', 'Legs', 'Barbell', 'Hinge at hips with slight knee bend, lower bar along legs'),
  ('Leg Press', 'Legs', 'Machine', 'Feet shoulder-width on platform, lower weight by bending knees'),
  ('Leg Curl', 'Legs', 'Machine', 'Lie face down, curl weight toward glutes'),
  ('Leg Extension', 'Legs', 'Machine', 'Sit upright, extend legs to straighten knees'),
  ('Bulgarian Split Squat', 'Legs', 'Dumbbell', 'Rear foot elevated, lunge down on front leg'),
  ('Pull Ups', 'Back', 'Bodyweight', 'Hang from bar, pull chin over bar'),
  ('Barbell Row', 'Back', 'Barbell', 'Hinge forward, pull bar to lower chest'),
  ('Lat Pulldown', 'Back', 'Cable', 'Sit at machine, pull bar to upper chest'),
  ('Seated Cable Row', 'Back', 'Cable', 'Sit upright, pull handle to torso'),
  ('Overhead Press', 'Shoulders', 'Barbell', 'Press bar from shoulders overhead to lockout'),
  ('Lateral Raise', 'Shoulders', 'Dumbbell', 'Raise dumbbells out to sides to shoulder height'),
  ('Face Pull', 'Shoulders', 'Cable', 'Pull rope to face with elbows high'),
  ('Barbell Curl', 'Arms', 'Barbell', 'Curl bar from thighs to shoulders'),
  ('Hammer Curl', 'Arms', 'Dumbbell', 'Curl with neutral grip'),
  ('Tricep Pushdown', 'Arms', 'Cable', 'Push cable attachment down, extending elbows'),
  ('Skull Crushers', 'Arms', 'Barbell', 'Lie on bench, lower bar to forehead, extend arms'),
  ('Plank', 'Core', 'Bodyweight', 'Hold push-up position on forearms'),
  ('Cable Crunch', 'Core', 'Cable', 'Kneel at cable, crunch down contracting abs'),
  ('Hanging Leg Raise', 'Core', 'Bodyweight', 'Hang from bar, raise legs to parallel'),
  ('Conventional Deadlift', 'Back', 'Barbell', 'Grip bar at shins, drive through floor, lock out hips');

-- ============================================
-- 12. Storage Bucket for Body Photos (private)
-- ============================================
-- Run this separately in Supabase Dashboard > Storage:
-- Create bucket: "body-photos" with private access
-- Then add these storage policies via SQL:

-- insert into storage.buckets (id, name, public) values ('body-photos', 'body-photos', false);
--
-- create policy "Users can upload own photos"
--   on storage.objects for insert
--   with check (bucket_id = 'body-photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users can view own photos"
--   on storage.objects for select
--   using (bucket_id = 'body-photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users can delete own photos"
--   on storage.objects for delete
--   using (bucket_id = 'body-photos' and auth.uid()::text = (storage.foldername(name))[1]);
