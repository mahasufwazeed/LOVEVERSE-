-- ============================================================================
-- LOVEVERSE COMPREHENSIVE PRODUCTION DATABASE SCHEMA
-- Row Level Security (RLS) & Realtime Synchronization
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. USER PROFILES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default 'Sweetheart',
    avatar_url text,
    avatar_config jsonb not null default '{
        "skinColor": "#FDDFB2",
        "hairStyle": "wavy",
        "hairColor": "#4A2B11",
        "eyeColor": "#3E2723",
        "shirtColor": "#FF5C8A",
        "pantsColor": "#292238",
        "accessory": "none"
    }'::jsonb,
    anniversary_date date,
    couple_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profile_select on public.profiles 
    for select to authenticated using (true);

create policy profile_update on public.profiles 
    for update to authenticated using (id = auth.uid());

create policy profile_insert on public.profiles 
    for insert to authenticated with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. COUPLE SPACES & MEMBERSHIP
-- ----------------------------------------------------------------------------
create table if not exists public.spaces (
    id uuid primary key default gen_random_uuid(),
    invite_code text unique not null default upper(substr(encode(gen_random_bytes(8),'hex'),1,6)),
    created_by uuid not null references auth.users(id),
    created_at timestamptz default now()
);

create table if not exists public.members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    space_id uuid not null references public.spaces(id) on delete cascade,
    joined_at timestamptz default now()
);

alter table public.spaces enable row level security;
alter table public.members enable row level security;

-- Helper to retrieve current authenticated user's active couple space
create or replace function public.my_space() 
returns uuid 
language sql 
stable 
security definer 
set search_path = public 
as $$ 
    select space_id from public.members where user_id = auth.uid() limit 1; 
$$;

create policy space_select on public.spaces for select to authenticated 
    using (id = public.my_space());

create policy member_select on public.members for select to authenticated 
    using (space_id = public.my_space());

-- ----------------------------------------------------------------------------
-- 3. REALTIME TIMELINE EVENTS (CHAT, AFFECTION, GAMES, MEDIA)
-- ----------------------------------------------------------------------------
create table if not exists public.events (
    id bigint generated always as identity primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    sender uuid not null references auth.users(id),
    kind text not null check (kind in ('chat','hug','kiss','game','video','cuddle','wave','dance')),
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz default now()
);

create index if not exists events_space_idx on public.events(space_id, id desc);
alter table public.events enable row level security;

create policy event_select on public.events for select to authenticated 
    using (space_id = public.my_space());

create policy event_insert on public.events for insert to authenticated 
    with check (
        space_id = public.my_space() 
        and sender = auth.uid() 
        and kind in ('chat','hug','kiss','game','video','cuddle','wave','dance') 
        and octet_length(payload::text) < 16000
    );

-- ----------------------------------------------------------------------------
-- 4. MESSAGES TIMELINE & REACTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.spaces(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    message_type text not null check (message_type in ('text', 'hug_card', 'kiss_card', 'media', 'system')) default 'text',
    media_url text,
    created_at timestamptz not null default now()
);

create index if not exists messages_couple_time_idx on public.messages(couple_id, created_at desc);
alter table public.messages enable row level security;

create policy messages_select on public.messages for select to authenticated 
    using (couple_id = public.my_space());

create policy messages_insert on public.messages for insert to authenticated 
    with check (couple_id = public.my_space() and sender_id = auth.uid());

create table if not exists public.message_reactions (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null references public.messages(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    emoji text not null,
    created_at timestamptz not null default now(),
    unique(message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy reactions_all on public.message_reactions for all to authenticated 
    using (exists (select 1 from public.messages m where m.id = message_id and m.couple_id = public.my_space()));

-- ----------------------------------------------------------------------------
-- 5. DURABLE AFFECTION LOG (HUGS, KISSES, INTERACTIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.avatar_interactions (
    id bigint generated always as identity primary key,
    couple_id uuid not null references public.spaces(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    interaction_type text not null check (interaction_type in ('hug', 'kiss', 'cuddle', 'dance', 'wave')),
    created_at timestamptz not null default now()
);

create index if not exists interactions_couple_idx on public.avatar_interactions(couple_id, created_at desc);
alter table public.avatar_interactions enable row level security;

create policy interactions_select on public.avatar_interactions for select to authenticated 
    using (couple_id = public.my_space());

create policy interactions_insert on public.avatar_interactions for insert to authenticated 
    with check (couple_id = public.my_space() and sender_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. SHARED MEMORIES & MILESTONES
-- ----------------------------------------------------------------------------
create table if not exists public.shared_memories (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.spaces(id) on delete cascade,
    creator_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    memory_date date not null default current_date,
    image_url text,
    created_at timestamptz not null default now()
);

create index if not exists memories_couple_idx on public.shared_memories(couple_id, memory_date desc);
alter table public.shared_memories enable row level security;

create policy memories_all on public.shared_memories for all to authenticated 
    using (couple_id = public.my_space());

-- ----------------------------------------------------------------------------
-- 7. ATOMIC STORED PROCEDURES (CREATE & JOIN SPACE)
-- ----------------------------------------------------------------------------
create or replace function public.create_space() 
returns table(space_id uuid, code text) 
language plpgsql 
security definer 
set search_path = public 
as $$ 
declare 
    s public.spaces; 
begin 
    if auth.uid() is null then 
        raise exception 'Login required'; 
    end if; 
    
    if exists(select 1 from public.members where user_id = auth.uid()) then 
        raise exception 'Already paired with a partner'; 
    end if; 
    
    insert into public.spaces(created_by) values(auth.uid()) returning * into s; 
    insert into public.members(user_id, space_id) values(auth.uid(), s.id); 
    
    return query select s.id, s.invite_code; 
end $$;

create or replace function public.join_space(p_code text) 
returns uuid 
language plpgsql 
security definer 
set search_path = public 
as $$ 
declare 
    s uuid; 
begin 
    if auth.uid() is null then 
        raise exception 'Login required'; 
    end if; 
    
    if exists(select 1 from public.members where user_id = auth.uid()) then 
        raise exception 'Already paired with a partner'; 
    end if; 
    
    select id into s from public.spaces where invite_code = upper(trim(p_code)) for update; 
    if s is null then 
        raise exception 'Invalid invite code'; 
    end if; 
    
    if (select count(*) from public.members where space_id = s) >= 2 then 
        raise exception 'Space is full (maximum 2 partners)'; 
    end if; 
    
    insert into public.members(user_id, space_id) values(auth.uid(), s); 
    return s; 
end $$;

revoke all on function public.create_space() from public;
revoke all on function public.join_space(text) from public;
grant execute on function public.create_space() to authenticated;
grant execute on function public.join_space(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. REALTIME REPLICATION PUBLICATION
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.avatar_interactions;
alter publication supabase_realtime add table public.shared_memories;
