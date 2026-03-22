create table if not exists workout_adaptations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  session_id uuid references workout_sessions(id) on delete cascade not null,
  recommendations jsonb not null,
  created_at timestamptz default now()
);

alter table workout_adaptations enable row level security;

create policy "Users can manage own adaptations"
  on workout_adaptations for all
  using (auth.uid() = user_id);
