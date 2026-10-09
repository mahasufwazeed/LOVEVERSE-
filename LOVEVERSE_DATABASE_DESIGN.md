# LoveVerse — Database Architecture & Security Design

## 1. Schema Architecture Overview
The database uses PostgreSQL with Supabase Row Level Security (RLS) to enforce strict isolation between couple entities. No user can read or modify data outside their own assigned couple.

---

## 2. Table Specifications

### 2.1 `profiles`
User profiles extending Supabase `auth.users`.
```sql
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default 'Sweetheart',
    avatar_url text,
    avatar_config jsonb not null default '{
        "skinColor": "#FDDFB2",
        "hairStyle": "wavy",
        "hairColor": "#4A2B11",
        "eyeColor": "#3E2723",
        "shirtColor": "#FF5C8A",
        "pantsColor": "#292238"
    }'::jsonb,
    anniversary_date date,
    couple_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

### 2.2 `couples` & `couple_members`
Stores the official couple entity and binds exactly two users per couple.
```sql
create table public.couples (
    id uuid primary key default gen_random_uuid(),
    invite_code text unique not null,
    anniversary_date date,
    status text not null check (status in ('active', 'disconnected')) default 'active',
    created_at timestamptz not null default now()
);

create table public.couple_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    couple_id uuid not null references public.couples(id) on delete cascade,
    joined_at timestamptz not null default now()
);
create index couple_members_couple_idx on public.couple_members(couple_id);
```

### 2.3 `partner_invitations`
Handles time-limited, single-use 6-character invitation pairing.
```sql
create table public.partner_invitations (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    creator_id uuid not null references auth.users(id) on delete cascade,
    status text not null check (status in ('pending', 'accepted', 'expired', 'cancelled')) default 'pending',
    expires_at timestamptz not null default (now() + interval '48 hours'),
    created_at timestamptz not null default now()
);
```

### 2.4 `messages` & `message_reactions`
Encrypted-in-transit messaging timeline with emoji reactions.
```sql
create table public.messages (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.couples(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    message_type text not null check (message_type in ('text', 'hug_card', 'kiss_card', 'media', 'system')) default 'text',
    media_url text,
    created_at timestamptz not null default now()
);
create index messages_couple_time_idx on public.messages(couple_id, created_at desc);

create table public.message_reactions (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null references public.messages(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    emoji text not null,
    created_at timestamptz not null default now(),
    unique(message_id, user_id, emoji)
);
```

### 2.5 `avatar_interactions`
Logs durable affection events (hugs, kisses, cuddles) for relationship stats.
```sql
create table public.avatar_interactions (
    id bigint generated always as identity primary key,
    couple_id uuid not null references public.couples(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    interaction_type text not null check (interaction_type in ('hug', 'kiss', 'cuddle', 'dance', 'wave')),
    created_at timestamptz not null default now()
);
create index interactions_couple_idx on public.avatar_interactions(couple_id, created_at desc);
```

### 2.6 `game_sessions` & `game_moves`
Manages turn-based multiplayer couple games.
```sql
create table public.game_sessions (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.couples(id) on delete cascade,
    game_type text not null check (game_type in ('tictactoe', 'quiz', 'would_you_rather', 'truth_dare')),
    current_turn uuid references auth.users(id),
    status text not null check (status in ('active', 'completed', 'abandoned')) default 'active',
    game_state jsonb not null default '{}'::jsonb,
    winner_id uuid references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

### 2.7 `watch_rooms`
Persists the authoritative playback state for co-watching.
```sql
create table public.watch_rooms (
    couple_id uuid primary key references public.couples(id) on delete cascade,
    video_url text not null,
    is_playing boolean not null default false,
    current_time_seconds float not null default 0,
    controller_id uuid references auth.users(id),
    updated_at timestamptz not null default now()
);
```

### 2.8 `shared_memories`
Stores couple milestones, memory photos, and diary moments.
```sql
create table public.shared_memories (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.couples(id) on delete cascade,
    creator_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    memory_date date not null default current_date,
    image_url text,
    created_at timestamptz not null default now()
);
create index memories_couple_idx on public.shared_memories(couple_id, memory_date desc);
```

---

## 3. Row-Level Security Functions & Policies

### 3.1 Helper Function: `my_couple_id()`
```sql
create or replace function public.my_couple_id() 
returns uuid 
language sql 
stable 
security definer 
set search_path = public 
as $$
    select couple_id from public.couple_members where user_id = auth.uid() limit 1;
$$;
```

### 3.2 Couple Data Policies
Every table is locked down so authenticated users can only query rows associated with their couple:
```sql
-- Messages
create policy messages_select on public.messages for select to authenticated 
using (couple_id = public.my_couple_id());

create policy messages_insert on public.messages for insert to authenticated 
with check (couple_id = public.my_couple_id() and sender_id = auth.uid());

-- Interactions
create policy interactions_select on public.avatar_interactions for select to authenticated 
using (couple_id = public.my_couple_id());

create policy interactions_insert on public.avatar_interactions for insert to authenticated 
with check (couple_id = public.my_couple_id() and sender_id = auth.uid());

-- Games
create policy games_select on public.game_sessions for select to authenticated 
using (couple_id = public.my_couple_id());

create policy games_update on public.game_sessions for update to authenticated 
using (couple_id = public.my_couple_id());

-- Watch
create policy watch_all on public.watch_rooms for all to authenticated 
using (couple_id = public.my_couple_id());

-- Memories
create policy memories_all on public.shared_memories for all to authenticated 
using (couple_id = public.my_couple_id());
```

---

## 4. Atomic Stored Procedures

### `create_couple_space()`
Atomically creates a new couple, associates the creating member, and returns the 6-character uppercase invite code.

### `join_couple_space(p_code text)`
Locks the invitation, verifies expiry, ensures the target couple has exactly 1 member, adds the joining partner, and activates the couple space.

### `disconnect_couple()`
Atomically archives or severs the couple relationship upon mutual or individual request.
