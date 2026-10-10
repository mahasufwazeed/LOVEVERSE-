-- ============================================================================
-- ❤️ LOVEVERSE MASTER PRODUCTION DATABASE SCHEMA
-- Supabase PostgreSQL with Row Level Security (RLS), Realtime & Storage
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
        "accessory": "none",
        "expression": "happy"
    }'::jsonb,
    anniversary_date date,
    couple_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profile_select on public.profiles;
create policy profile_select on public.profiles 
    for select to authenticated using (true);

drop policy if exists profile_update on public.profiles;
create policy profile_update on public.profiles 
    for update to authenticated using (id = auth.uid());

drop policy if exists profile_insert on public.profiles;
create policy profile_insert on public.profiles 
    for insert to authenticated with check (id = auth.uid());

-- Automatic Profile Creation Trigger on Auth Sign-Up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_config)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Sweetheart'),
    '{
      "skinColor": "#FDDFB2",
      "hairStyle": "wavy",
      "hairColor": "#4A2B11",
      "eyeColor": "#3E2723",
      "shirtColor": "#FF5C8A",
      "pantsColor": "#292238",
      "accessory": "none",
      "expression": "happy"
    }'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

drop policy if exists space_select on public.spaces;
create policy space_select on public.spaces for select to authenticated 
    using (id = public.my_space());

drop policy if exists member_select on public.members;
create policy member_select on public.members for select to authenticated 
    using (space_id = public.my_space());

-- Compatibility views for coupleStore
create or replace view public.couples as 
select id, invite_code, created_by, created_at, 'active'::text as status 
from public.spaces;

create or replace view public.couple_members as 
select user_id, space_id as couple_id, joined_at 
from public.members;

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

drop policy if exists event_select on public.events;
create policy event_select on public.events for select to authenticated 
    using (space_id = public.my_space());

drop policy if exists event_insert on public.events;
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
    message_type text not null check (message_type in ('text', 'hug_card', 'kiss_card', 'media', 'system', 'sticker')) default 'text',
    media_url text,
    created_at timestamptz not null default now()
);

create index if not exists messages_couple_time_idx on public.messages(couple_id, created_at desc);
alter table public.messages enable row level security;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated 
    using (couple_id = public.my_space());

drop policy if exists messages_insert on public.messages;
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

drop policy if exists reactions_all on public.message_reactions;
create policy reactions_all on public.message_reactions for all to authenticated 
    using (exists (select 1 from public.messages m where m.id = message_id and m.couple_id = public.my_space()));

-- ----------------------------------------------------------------------------
-- 5. DURABLE AFFECTION LOG (HUGS, KISSES, INTERACTIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.avatar_interactions (
    id bigint generated always as identity primary key,
    couple_id uuid not null references public.spaces(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    interaction_type text not null check (interaction_type in ('hug', 'kiss', 'cuddle', 'dance', 'wave', 'flying_hearts', 'blow_kiss', 'hold_hands', 'forehead_kiss', 'sit_together', 'sleep_beside')),
    created_at timestamptz not null default now()
);

create index if not exists interactions_couple_idx on public.avatar_interactions(couple_id, created_at desc);
alter table public.avatar_interactions enable row level security;

drop policy if exists interactions_select on public.avatar_interactions;
create policy interactions_select on public.avatar_interactions for select to authenticated 
    using (couple_id = public.my_space());

drop policy if exists interactions_insert on public.avatar_interactions;
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

drop policy if exists memories_all on public.shared_memories;
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
    
    -- Link couple_id to user profile
    update public.profiles set couple_id = s.id where id = auth.uid();
    
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
    
    -- Link couple_id to user profile
    update public.profiles set couple_id = s where id = auth.uid();
    
    return s; 
end $$;

revoke all on function public.create_space() from public;
revoke all on function public.join_space(text) from public;
grant execute on function public.create_space() to authenticated;
grant execute on function public.join_space(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. QUIZ & CONVERSATION PROMPTS SEED DATA
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_prompts (
    id serial primary key,
    category text not null check (category in ('deep', 'romantic', 'funny', 'wyr')),
    prompt text not null,
    option_a text,
    option_b text
);

alter table public.quiz_prompts enable row level security;
drop policy if exists quiz_prompts_select on public.quiz_prompts;
create policy quiz_prompts_select on public.quiz_prompts for select to authenticated using (true);

insert into public.quiz_prompts (category, prompt, option_a, option_b) values
    ('deep', 'What was the exact moment you realized you had feelings for me?', null, null),
    ('deep', 'What is our dream romantic vacation destination?', null, null),
    ('romantic', 'What little thing do I do that always makes you smile?', null, null),
    ('romantic', 'Which song will forever remind you of our love?', null, null),
    ('funny', 'Who falls asleep first during movies?', null, null),
    ('funny', 'If we were animals, which pair would we be?', null, null),
    ('wyr', 'Would You Rather', 'A cozy candlelit dinner at home cooked together', 'A spontaneous late-night road trip under the stars'),
    ('wyr', 'Would You Rather', 'A weekend in a secluded mountain cabin', 'A luxury beach resort with ocean view balcony'),
    ('wyr', 'Would You Rather', 'Holding hands while walking through a quiet park', 'Slow dancing in the living room to our favorite songs')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 9. STORAGE BUCKETS (AVATARS, MEMORIES, CHAT MEDIA)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values 
    ('avatars', 'avatars', true),
    ('memories', 'memories', true),
    ('chat-media', 'chat-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public avatar read" on storage.objects;
create policy "Public avatar read" on storage.objects
    for select using (bucket_id = 'avatars');

drop policy if exists "Authenticated avatar upload" on storage.objects;
create policy "Authenticated avatar upload" on storage.objects
    for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "Public memories read" on storage.objects;
create policy "Public memories read" on storage.objects
    for select using (bucket_id = 'memories');

drop policy if exists "Authenticated memories upload" on storage.objects;
create policy "Authenticated memories upload" on storage.objects
    for insert to authenticated with check (bucket_id = 'memories');

-- ----------------------------------------------------------------------------
-- 10. REALTIME REPLICATION PUBLICATION
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.avatar_interactions;
alter publication supabase_realtime add table public.shared_memories;

-- ----------------------------------------------------------------------------
-- 11. ADVANCED 3D ROOM CREATOR DATABASE
-- ----------------------------------------------------------------------------
create table if not exists public.room_templates (
    id text primary key,
    name text not null,
    room_type text not null,
    description text,
    dimensions jsonb not null default '{"width": 6, "depth": 6, "height": 3.2}'::jsonb,
    wall_color text not null default '#FDF0ED',
    floor_material text not null default 'hardwood_oak',
    lighting_theme text not null default 'warm_sunset',
    window_scenery text not null default 'city_sunset',
    default_objects jsonb not null default '[]'::jsonb
);

create table if not exists public.furniture_catalog (
    catalog_id text primary key,
    name text not null,
    category text not null,
    icon text not null,
    description text,
    default_color text not null,
    available_colors text[] not null default '{}',
    grid_width int not null default 1,
    grid_depth int not null default 1,
    height numeric not null default 1.0,
    interaction_type text
);

create table if not exists public.rooms (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null references public.spaces(id) on delete cascade,
    name text not null default 'Our Couple Sanctuary',
    room_type text not null default 'bedroom',
    dimensions jsonb not null default '{"width": 6, "depth": 6, "height": 3.2}'::jsonb,
    wall_color text not null default '#FDF0ED',
    floor_material text not null default 'hardwood_oak',
    lighting_theme text not null default 'warm_sunset',
    window_scenery text not null default 'city_sunset',
    revision bigint not null default 1,
    last_edited_by uuid references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(couple_id)
);

create table if not exists public.room_objects (
    id text primary key,
    room_id uuid not null references public.rooms(id) on delete cascade,
    catalog_id text not null,
    position jsonb not null default '{"x": 0, "y": 0, "z": 0}'::jsonb,
    rotation_y numeric not null default 0,
    color text not null default '#FF6B8B',
    scale numeric not null default 1.0,
    interaction_type text,
    photo_url text,
    created_at timestamptz not null default now()
);

create table if not exists public.room_customizations (
    id uuid primary key default gen_random_uuid(),
    room_id uuid not null references public.rooms(id) on delete cascade,
    custom_wall_texture text,
    custom_floor_texture text,
    ambient_audio_url text,
    updated_at timestamptz not null default now()
);

create table if not exists public.room_edit_history (
    id bigint generated always as identity primary key,
    room_id uuid not null references public.rooms(id) on delete cascade,
    editor_id uuid not null references auth.users(id),
    revision bigint not null,
    snapshot_objects jsonb not null,
    action_type text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.room_permissions (
    room_id uuid not null references public.rooms(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    can_edit boolean not null default true,
    primary key(room_id, user_id)
);

alter table public.rooms enable row level security;
alter table public.room_objects enable row level security;
alter table public.room_customizations enable row level security;
alter table public.room_edit_history enable row level security;
alter table public.room_permissions enable row level security;

drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms for select to authenticated 
    using (couple_id = public.my_space());

drop policy if exists rooms_all on public.rooms;
create policy rooms_all on public.rooms for all to authenticated 
    using (couple_id = public.my_space())
    with check (couple_id = public.my_space());

drop policy if exists room_objects_all on public.room_objects;
create policy room_objects_all on public.room_objects for all to authenticated 
    using (exists (select 1 from public.rooms r where r.id = room_id and r.couple_id = public.my_space()))
    with check (exists (select 1 from public.rooms r where r.id = room_id and r.couple_id = public.my_space()));

drop policy if exists history_select on public.room_edit_history;
create policy history_select on public.room_edit_history for select to authenticated 
    using (exists (select 1 from public.rooms r where r.id = room_id and r.couple_id = public.my_space()));

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_objects;

-- ==============================================================================
-- 12. LOVEVERSE SECURE E2EE PRIVATE MESSENGER & ENCRYPTED MEDIA VAULT
-- ==============================================================================

-- 12.1 E2EE Verified Conversations
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    couple_space_id uuid not null references public.spaces(id) on delete cascade,
    created_at timestamptz not null default now(),
    last_message_at timestamptz default now(),
    is_active boolean not null default true,
    unique(couple_space_id)
);

create table if not exists public.conversation_members (
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key(conversation_id, user_id)
);

-- 12.2 Device Identity & Cryptographic Prekeys
create table if not exists public.device_identities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    device_id text not null,
    identity_key text not null,
    signed_prekey text not null,
    prekey_signature text not null,
    registration_id integer not null default 1,
    safety_number text not null,
    is_verified boolean not null default false,
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, device_id)
);

create table if not exists public.device_prekeys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    device_id text not null,
    key_id integer not null,
    public_key text not null,
    is_consumed boolean not null default false,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

-- 12.3 Disappearing Message Policy
create table if not exists public.disappearing_message_policies (
    conversation_id uuid primary key references public.conversations(id) on delete cascade,
    duration_seconds integer not null default 0, -- 0 = Off, 30, 300, 3600, 86400, 604800
    updated_by uuid references auth.users(id),
    updated_at timestamptz not null default now()
);

-- 12.4 Encrypted Messages (E2EE Ciphertext Only)
create table if not exists public.encrypted_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid not null references auth.users(id),
    sender_device_id text not null,
    recipient_id uuid not null references auth.users(id),
    recipient_device_id text not null,
    ciphertext text not null,
    iv text not null,
    tag text not null,
    ephemeral_public_key text not null,
    message_type text not null default 'text', -- 'text', 'photo', 'video', 'voice', 'sticker'
    is_disappearing boolean not null default false,
    expires_at timestamptz,
    reply_to_id uuid references public.encrypted_messages(id) on delete set null,
    is_edited boolean not null default false,
    created_at timestamptz not null default now()
);

-- 12.5 Client-Encrypted Media Attachments & Vault Gallery
create table if not exists public.encrypted_attachments (
    id uuid primary key default gen_random_uuid(),
    message_id uuid references public.encrypted_messages(id) on delete cascade,
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    uploader_id uuid not null references auth.users(id),
    file_path text not null,
    bucket_id text not null default 'encrypted-media',
    mime_type text not null,
    file_size_bytes bigint not null default 0,
    iv text not null,
    ciphertext_hash text not null,
    encrypted_metadata text, -- client-side encrypted caption, title, dimensions
    is_gallery boolean not null default false,
    album_id uuid,
    is_favorite boolean not null default false,
    created_at timestamptz not null default now()
);

-- 12.6 Message Delivery & Read Receipts
create table if not exists public.message_receipts (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null references public.encrypted_messages(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null, -- 'sent', 'delivered', 'read'
    timestamp timestamptz not null default now(),
    unique(message_id, user_id, status)
);

-- 12.7 Media Upload Sessions (Resumable & Cancellation Tracking)
create table if not exists public.media_upload_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    file_name text not null,
    file_size bigint not null,
    status text not null default 'initiated', -- 'initiated', 'uploading', 'completed', 'cancelled', 'failed'
    upload_progress integer not null default 0,
    expires_at timestamptz not null default (now() + interval '2 hours'),
    created_at timestamptz not null default now()
);

-- 12.8 Security Events Audit Log
create table if not exists public.security_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    event_type text not null, -- 'key_rotation', 'safety_number_changed', 'device_registered', 'partner_verified', 'app_lock_failure', 'tamper_detected'
    event_metadata jsonb not null default '{}'::jsonb,
    ip_address_hash text,
    created_at timestamptz not null default now()
);

-- Private Storage Buckets
insert into storage.buckets (id, name, public) 
values ('encrypted-media', 'encrypted-media', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('encrypted-gallery', 'encrypted-gallery', false)
on conflict (id) do nothing;

-- 12.9 Row Level Security (RLS) Policies
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.device_identities enable row level security;
alter table public.device_prekeys enable row level security;
alter table public.disappearing_message_policies enable row level security;
alter table public.encrypted_messages enable row level security;
alter table public.encrypted_attachments enable row level security;
alter table public.message_receipts enable row level security;
alter table public.media_upload_sessions enable row level security;
alter table public.security_events enable row level security;

-- Conversations RLS
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated
    using (couple_space_id = public.my_space());

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations for insert to authenticated
    with check (couple_space_id = public.my_space());

-- Conversation Members RLS
drop policy if exists conv_members_select on public.conversation_members;
create policy conv_members_select on public.conversation_members for select to authenticated
    using (exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()));

drop policy if exists conv_members_insert on public.conversation_members;
create policy conv_members_insert on public.conversation_members for insert to authenticated
    with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()));

-- Device Identities RLS (Users can view their own and partner's device identity in the same space)
drop policy if exists device_identities_select on public.device_identities;
create policy device_identities_select on public.device_identities for select to authenticated
    using (
        user_id = auth.uid() or 
        exists (select 1 from public.space_members sm where sm.space_id = public.my_space() and sm.user_id = device_identities.user_id)
    );

drop policy if exists device_identities_upsert on public.device_identities;
create policy device_identities_upsert on public.device_identities for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Device Prekeys RLS
drop policy if exists device_prekeys_select on public.device_prekeys;
create policy device_prekeys_select on public.device_prekeys for select to authenticated
    using (
        user_id = auth.uid() or
        exists (select 1 from public.space_members sm where sm.space_id = public.my_space() and sm.user_id = device_prekeys.user_id)
    );

drop policy if exists device_prekeys_all on public.device_prekeys;
create policy device_prekeys_all on public.device_prekeys for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Disappearing Message Policy RLS
drop policy if exists disappearing_policy_all on public.disappearing_message_policies;
create policy disappearing_policy_all on public.disappearing_message_policies for all to authenticated
    using (exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()))
    with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()));

-- Encrypted Messages RLS
drop policy if exists encrypted_messages_select on public.encrypted_messages;
create policy encrypted_messages_select on public.encrypted_messages for select to authenticated
    using (
        exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space())
        and (expires_at is null or expires_at > now())
    );

drop policy if exists encrypted_messages_insert on public.encrypted_messages;
create policy encrypted_messages_insert on public.encrypted_messages for insert to authenticated
    with check (
        sender_id = auth.uid() and
        exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space())
    );

drop policy if exists encrypted_messages_update on public.encrypted_messages;
create policy encrypted_messages_update on public.encrypted_messages for update to authenticated
    using (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()))
    with check (sender_id = auth.uid());

drop policy if exists encrypted_messages_delete on public.encrypted_messages;
create policy encrypted_messages_delete on public.encrypted_messages for delete to authenticated
    using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Encrypted Attachments RLS
drop policy if exists encrypted_attachments_select on public.encrypted_attachments;
create policy encrypted_attachments_select on public.encrypted_attachments for select to authenticated
    using (exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()));

drop policy if exists encrypted_attachments_insert on public.encrypted_attachments;
create policy encrypted_attachments_insert on public.encrypted_attachments for insert to authenticated
    with check (
        uploader_id = auth.uid() and
        exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space())
    );

drop policy if exists encrypted_attachments_update on public.encrypted_attachments;
create policy encrypted_attachments_update on public.encrypted_attachments for update to authenticated
    using (exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()));

drop policy if exists encrypted_attachments_delete on public.encrypted_attachments;
create policy encrypted_attachments_delete on public.encrypted_attachments for delete to authenticated
    using (exists (select 1 from public.conversations c where c.id = conversation_id and c.couple_space_id = public.my_space()));

-- Message Receipts RLS
drop policy if exists message_receipts_all on public.message_receipts;
create policy message_receipts_all on public.message_receipts for all to authenticated
    using (exists (select 1 from public.encrypted_messages em join public.conversations c on em.conversation_id = c.id where em.id = message_id and c.couple_space_id = public.my_space()))
    with check (user_id = auth.uid());

-- Security Events RLS
drop policy if exists security_events_all on public.security_events;
create policy security_events_all on public.security_events for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Upload Sessions RLS
drop policy if exists upload_sessions_all on public.media_upload_sessions;
create policy upload_sessions_all on public.media_upload_sessions for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Storage RLS for encrypted-media and encrypted-gallery
drop policy if exists storage_encrypted_media_select on storage.objects;
create policy storage_encrypted_media_select on storage.objects for select to authenticated
    using (bucket_id in ('encrypted-media', 'encrypted-gallery'));

drop policy if exists storage_encrypted_media_insert on storage.objects;
create policy storage_encrypted_media_insert on storage.objects for insert to authenticated
    with check (bucket_id in ('encrypted-media', 'encrypted-gallery') and auth.uid()::text = (storage.foldername(name))[1]);

-- Expired messages cleanup procedure
create or replace function public.cleanup_expired_messages()
returns integer
language plpgsql
security definer
as $$
declare
    deleted_count integer;
begin
    delete from public.encrypted_messages
    where expires_at is not null and expires_at <= now();
    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$;

-- Realtime publication additions
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.encrypted_messages;
alter publication supabase_realtime add table public.message_receipts;
alter publication supabase_realtime add table public.disappearing_message_policies;

-- ============================================================================
-- 15. UNIQUE ID & PARTNER CONNECTION ENGINE (HIM & HER PAIRING)
-- ============================================================================

-- Function: Generates a cryptographically secure, unique LoveVerse ID (LV-XXXXXXXXXX)
create or replace function public.generate_unique_loveverse_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_charset text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    v_candidate text;
    v_attempts int := 0;
    v_len int := 10;
    v_byte bytea;
    v_idx int;
begin
    loop
        v_attempts := v_attempts + 1;
        v_candidate := 'LV-';
        for i in 1..v_len loop
            v_byte := gen_random_bytes(1);
            v_idx := (get_byte(v_byte, 0) % length(v_charset)) + 1;
            v_candidate := v_candidate || substr(v_charset, v_idx, 1);
        end loop;

        if not exists (select 1 from public.profiles where public_loveverse_id = v_candidate) then
            return v_candidate;
        end if;

        if v_attempts > 20 then
            raise exception 'Failed to generate unique LoveVerse ID after 20 attempts';
        end if;
    end loop;
end;
$$;

-- Function: Generates a cryptographically secure, unique Couple ID (CP-XXXXXXXXXX)
create or replace function public.generate_unique_couple_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_charset text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    v_candidate text;
    v_attempts int := 0;
    v_len int := 10;
    v_byte bytea;
    v_idx int;
begin
    loop
        v_attempts := v_attempts + 1;
        v_candidate := 'CP-';
        for i in 1..v_len loop
            v_byte := gen_random_bytes(1);
            v_idx := (get_byte(v_byte, 0) % length(v_charset)) + 1;
            v_candidate := v_candidate || substr(v_charset, v_idx, 1);
        end loop;

        if not exists (select 1 from public.spaces where public_couple_id = v_candidate) then
            return v_candidate;
        end if;

        if v_attempts > 20 then
            raise exception 'Failed to generate unique Couple ID after 20 attempts';
        end if;
    end loop;
end;
$$;

alter table public.profiles 
    add column if not exists public_loveverse_id text unique,
    add column if not exists profile_label text default 'partner' check (profile_label in ('him', 'her', 'partner'));

alter table public.spaces 
    add column if not exists public_couple_id text unique;

create table if not exists public.couple_rooms (
    id uuid primary key default gen_random_uuid(),
    couple_id uuid not null unique references public.spaces(id) on delete cascade,
    room_configuration jsonb not null default '{
        "theme": "romantic_villa",
        "ue5_map": "LoveVerse_Villa_Map",
        "lighting_preset": "golden_hour",
        "furniture": []
    }'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.couple_rooms enable row level security;

drop policy if exists couple_rooms_select on public.couple_rooms;
create policy couple_rooms_select on public.couple_rooms for select to authenticated 
    using (couple_id = public.my_space());

drop policy if exists couple_rooms_update on public.couple_rooms;
create policy couple_rooms_update on public.couple_rooms for update to authenticated 
    using (couple_id = public.my_space());

create table if not exists public.partner_requests (
    id uuid primary key default gen_random_uuid(),
    sender_user_id uuid not null references auth.users(id) on delete cascade,
    receiver_user_id uuid not null references auth.users(id) on delete cascade,
    status text not null check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')) default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '7 days'),
    constraint check_different_users check (sender_user_id <> receiver_user_id)
);

create index if not exists partner_requests_sender_idx on public.partner_requests(sender_user_id, status);
create index if not exists partner_requests_receiver_idx on public.partner_requests(receiver_user_id, status);

create unique index if not exists unique_active_partner_request 
    on public.partner_requests (least(sender_user_id, receiver_user_id), greatest(sender_user_id, receiver_user_id))
    where (status = 'pending');

alter table public.partner_requests enable row level security;

drop policy if exists partner_requests_select on public.partner_requests;
create policy partner_requests_select on public.partner_requests for select to authenticated 
    using (sender_user_id = auth.uid() or receiver_user_id = auth.uid());

drop policy if exists partner_requests_insert on public.partner_requests;
create policy partner_requests_insert on public.partner_requests for insert to authenticated 
    with check (sender_user_id = auth.uid());

drop policy if exists partner_requests_update on public.partner_requests;
create policy partner_requests_update on public.partner_requests for update to authenticated 
    using (sender_user_id = auth.uid() or receiver_user_id = auth.uid());

create table if not exists public.blocked_users (
    blocker_id uuid not null references auth.users(id) on delete cascade,
    blocked_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    constraint check_block_not_self check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists blocked_users_all on public.blocked_users;
create policy blocked_users_all on public.blocked_users for all to authenticated 
    using (blocker_id = auth.uid()) 
    with check (blocker_id = auth.uid());

create table if not exists public.user_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references auth.users(id) on delete cascade,
    reported_id uuid not null references auth.users(id) on delete cascade,
    reason text not null,
    details text,
    created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

drop policy if exists user_reports_insert on public.user_reports;
create policy user_reports_insert on public.user_reports for insert to authenticated 
    with check (reporter_id = auth.uid());

-- Stored Procedures
create or replace function public.search_partner_by_id(p_loveverse_id text)
returns table (
    id uuid,
    public_loveverse_id text,
    display_name text,
    profile_label text,
    avatar_config jsonb,
    avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_clean_id text := upper(trim(p_loveverse_id));
    v_caller_id uuid := auth.uid();
begin
    if v_caller_id is null then
        raise exception 'Authentication required';
    end if;

    return query
    select 
        p.id,
        p.public_loveverse_id,
        p.display_name,
        coalesce(p.profile_label, 'partner') as profile_label,
        p.avatar_config,
        p.avatar_url
    from public.profiles p
    where p.public_loveverse_id = v_clean_id
      and p.id <> v_caller_id
      and not exists (
          select 1 from public.blocked_users b 
          where (b.blocker_id = v_caller_id and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = v_caller_id)
      )
    limit 1;
end;
$$;

create or replace function public.send_partner_request(p_receiver_loveverse_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_sender_id uuid := auth.uid();
    v_receiver_id uuid;
    v_clean_id text := upper(trim(p_receiver_loveverse_id));
    v_existing_id uuid;
    v_request public.partner_requests;
begin
    if v_sender_id is null then
        raise exception 'Authentication required';
    end if;

    if public.my_space() is not null then
        raise exception 'You are already connected with a partner';
    end if;

    select id into v_receiver_id
    from public.profiles
    where public_loveverse_id = v_clean_id;

    if v_receiver_id is null then
        raise exception 'Partner ID not found';
    end if;

    if v_receiver_id = v_sender_id then
        raise exception 'You cannot send a partner request to yourself';
    end if;

    if exists (select 1 from public.members where user_id = v_receiver_id) then
        raise exception 'This user is already connected with a partner';
    end if;

    if exists (
        select 1 from public.blocked_users 
        where (blocker_id = v_sender_id and blocked_id = v_receiver_id)
           or (blocker_id = v_receiver_id and blocked_id = v_sender_id)
    ) then
        raise exception 'Unable to send request to this user';
    end if;

    select id into v_existing_id
    from public.partner_requests
    where ((sender_user_id = v_sender_id and receiver_user_id = v_receiver_id)
       or  (sender_user_id = v_receiver_id and receiver_user_id = v_sender_id))
      and status = 'pending';

    if v_existing_id is not null then
        raise exception 'A pending partner request already exists';
    end if;

    insert into public.partner_requests (
        sender_user_id,
        receiver_user_id,
        status,
        expires_at
    )
    values (
        v_sender_id,
        v_receiver_id,
        'pending',
        now() + interval '7 days'
    )
    returning * into v_request;

    return jsonb_build_object(
        'id', v_request.id,
        'sender_user_id', v_request.sender_user_id,
        'receiver_user_id', v_request.receiver_user_id,
        'status', v_request.status,
        'created_at', v_request.created_at,
        'expires_at', v_request.expires_at
    );
end;
$$;

create or replace function public.accept_partner_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_receiver_id uuid := auth.uid();
    v_request public.partner_requests;
    v_new_space_id uuid;
    v_new_couple_id text;
    v_invite_code text;
begin
    if v_receiver_id is null then
        raise exception 'Authentication required';
    end if;

    select * into v_request
    from public.partner_requests
    where id = p_request_id
    for update;

    if v_request.id is null then
        raise exception 'Partner request not found';
    end if;

    if v_request.receiver_user_id <> v_receiver_id then
        raise exception 'Only the recipient can accept this partner request';
    end if;

    if v_request.status <> 'pending' then
        raise exception 'Partner request is not pending (status: %)', v_request.status;
    end if;

    if v_request.expires_at < now() then
        update public.partner_requests set status = 'expired', updated_at = now() where id = p_request_id;
        raise exception 'Partner request has expired';
    end if;

    if public.my_space() is not null then
        raise exception 'You are already in an active couple';
    end if;

    if exists (select 1 from public.members where user_id = v_request.sender_user_id) then
        raise exception 'The sender is already connected with another partner';
    end if;

    v_new_couple_id := public.generate_unique_couple_id();
    v_invite_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 6));

    insert into public.spaces (
        public_couple_id,
        invite_code,
        created_by
    )
    values (
        v_new_couple_id,
        v_invite_code,
        v_request.sender_user_id
    )
    returning id into v_new_space_id;

    insert into public.members (user_id, space_id)
    values 
        (v_request.sender_user_id, v_new_space_id),
        (v_receiver_id, v_new_space_id);

    insert into public.couple_rooms (
        couple_id,
        room_configuration
    )
    values (
        v_new_space_id,
        jsonb_build_object(
            'theme', 'romantic_villa',
            'ue5_map', 'LoveVerse_Villa_Map',
            'partner_a', v_request.sender_user_id,
            'partner_b', v_receiver_id,
            'unrealSessionReady', true
        )
    );

    update public.partner_requests
    set status = 'accepted', updated_at = now()
    where id = p_request_id;

    update public.partner_requests
    set status = 'cancelled', updated_at = now()
    where id <> p_request_id
      and (sender_user_id in (v_request.sender_user_id, v_receiver_id)
       or  receiver_user_id in (v_request.sender_user_id, v_receiver_id))
      and status = 'pending';

    return jsonb_build_object(
        'couple_id', v_new_space_id,
        'public_couple_id', v_new_couple_id,
        'invite_code', v_invite_code,
        'sender_user_id', v_request.sender_user_id,
        'receiver_user_id', v_receiver_id,
        'status', 'accepted'
    );
end;
$$;

create or replace function public.reject_partner_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_receiver_id uuid := auth.uid();
    v_request public.partner_requests;
begin
    if v_receiver_id is null then
        raise exception 'Authentication required';
    end if;

    select * into v_request
    from public.partner_requests
    where id = p_request_id;

    if v_request.id is null then
        raise exception 'Request not found';
    end if;

    if v_request.receiver_user_id <> v_receiver_id then
        raise exception 'Only the recipient can decline this request';
    end if;

    if v_request.status <> 'pending' then
        raise exception 'Request is not pending';
    end if;

    update public.partner_requests
    set status = 'rejected', updated_at = now()
    where id = p_request_id;

    return jsonb_build_object('id', p_request_id, 'status', 'rejected');
end;
$$;

create or replace function public.cancel_partner_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_sender_id uuid := auth.uid();
    v_request public.partner_requests;
begin
    if v_sender_id is null then
        raise exception 'Authentication required';
    end if;

    select * into v_request
    from public.partner_requests
    where id = p_request_id;

    if v_request.id is null then
        raise exception 'Request not found';
    end if;

    if v_request.sender_user_id <> v_sender_id then
        raise exception 'Only the sender can cancel this request';
    end if;

    if v_request.status <> 'pending' then
        raise exception 'Request is not pending';
    end if;

    update public.partner_requests
    set status = 'cancelled', updated_at = now()
    where id = p_request_id;

    return jsonb_build_object('id', p_request_id, 'status', 'cancelled');
end;
$$;



