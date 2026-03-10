-- Perfiles de usuario con puntos
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  points integer not null default 1000,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Los usuarios solo pueden ver y actualizar su propio perfil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Crear perfil automáticamente al registrarse (1000 puntos)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, points)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    1000
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger en auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Salas de juego (4 jugadores)
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  max_players integer not null default 4,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Jugadores en la sala
create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.game_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  bet_amount integer not null default 0,
  position integer not null,
  unique(room_id, user_id),
  unique(room_id, position)
);

-- Estado del juego (JSON para flexibilidad)
create table if not exists public.game_states (
  room_id uuid primary key references public.game_rooms(id) on delete cascade,
  state jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.game_rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.game_states enable row level security;

-- Políticas para salas
create policy "Anyone can create rooms"
  on public.game_rooms for insert with check (auth.uid() = host_id);

create policy "Anyone can view rooms"
  on public.game_rooms for select using (true);

create policy "Anyone can view room players"
  on public.room_players for select using (true);

create policy "Users can join rooms"
  on public.room_players for insert with check (auth.uid() = user_id);

create policy "Users can update own room player"
  on public.room_players for update using (auth.uid() = user_id);

create policy "Anyone can view game states"
  on public.game_states for select using (true);

create policy "Room host can update game state"
  on public.game_states for update using (
    exists (select 1 from public.game_rooms gr where gr.id = room_id and gr.host_id = auth.uid())
  );

create policy "Room host can insert game state"
  on public.game_states for insert with check (
    exists (select 1 from public.game_rooms gr where gr.id = room_id and gr.host_id = auth.uid())
  );

-- Opcional: Habilitar Realtime para sincronización multijugador (ejecutar en SQL Editor si falla)
-- alter publication supabase_realtime add table public.game_states;
-- alter publication supabase_realtime add table public.room_players;

-- Función para generar código de sala
create or replace function generate_room_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;
