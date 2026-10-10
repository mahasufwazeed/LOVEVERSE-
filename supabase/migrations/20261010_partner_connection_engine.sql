-- ============================================================================
-- ❤️ LOVEVERSE UNIQUE ID & PARTNER CONNECTION ENGINE MIGRATION
-- Him & Her | Partner Pairing | Real-Time Synchronization | Unreal Engine 5
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. CRYPTOGRAPHIC ID GENERATOR FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Generates a cryptographically secure, unique LoveVerse ID (LV-XXXXXXXXXX)
create or replace function public.generate_unique_loveverse_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_charset text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    v_id text;
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

        -- Check uniqueness against profiles table
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

        -- Check uniqueness against spaces table
        if not exists (select 1 from public.spaces where public_couple_id = v_candidate) then
            return v_candidate;
        end if;

        if v_attempts > 20 then
            raise exception 'Failed to generate unique Couple ID after 20 attempts';
        end if;
    end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. USER PROFILE EXTENSIONS (HIM & HER ROLES + UNIQUE LOVEVERSE ID)
-- ----------------------------------------------------------------------------
alter table public.profiles 
    add column if not exists public_loveverse_id text unique,
    add column if not exists profile_label text default 'partner' check (profile_label in ('him', 'her', 'partner'));

-- Backfill any existing profiles that don't have a public_loveverse_id yet
do $$
declare
    r record;
begin
    for r in select id from public.profiles where public_loveverse_id is null loop
        update public.profiles 
        set public_loveverse_id = public.generate_unique_loveverse_id() 
        where id = r.id;
    end loop;
end $$;

-- Update auth trigger to automatically assign unique LoveVerse ID & profile_label
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_label text;
begin
    v_label := coalesce(new.raw_user_meta_data->>'profile_label', 'partner');
    if v_label not in ('him', 'her', 'partner') then
        v_label := 'partner';
    end if;

    insert into public.profiles (
        id, 
        display_name, 
        public_loveverse_id, 
        profile_label, 
        avatar_config
    )
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Sweetheart'),
        public.generate_unique_loveverse_id(),
        v_label,
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

-- ----------------------------------------------------------------------------
-- 3. COUPLE SPACES & ROOMS EXTENSIONS
-- ----------------------------------------------------------------------------
alter table public.spaces 
    add column if not exists public_couple_id text unique;

-- Backfill existing spaces with public couple id
do $$
declare
    r record;
begin
    for r in select id from public.spaces where public_couple_id is null loop
        update public.spaces 
        set public_couple_id = public.generate_unique_couple_id() 
        where id = r.id;
    end loop;
end $$;

-- Recreate couples view with public_couple_id
create or replace view public.couples as 
select id, public_couple_id, invite_code, created_by, created_at, 'active'::text as status 
from public.spaces;

-- Couple Rooms Table (Unreal Engine 5 private room configurations)
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

-- ----------------------------------------------------------------------------
-- 4. PARTNER REQUESTS ENGINE
-- ----------------------------------------------------------------------------
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

-- Enforce maximum of ONE pending request between two users at a time (in either direction)
create unique index if not exists unique_active_partner_request 
    on public.partner_requests (least(sender_user_id, receiver_user_id), greatest(sender_user_id, receiver_user_id))
    where (status = 'pending');

alter table public.partner_requests enable row level security;

-- Only sender and receiver can view the request
drop policy if exists partner_requests_select on public.partner_requests;
create policy partner_requests_select on public.partner_requests for select to authenticated 
    using (sender_user_id = auth.uid() or receiver_user_id = auth.uid());

-- Authenticated user can only insert requests as the sender
drop policy if exists partner_requests_insert on public.partner_requests;
create policy partner_requests_insert on public.partner_requests for insert to authenticated 
    with check (sender_user_id = auth.uid());

-- Sender can cancel, receiver can accept/reject
drop policy if exists partner_requests_update on public.partner_requests;
create policy partner_requests_update on public.partner_requests for update to authenticated 
    using (sender_user_id = auth.uid() or receiver_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. SAFETY & MODERATION (BLOCKING & REPORTING)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. STORED PROCEDURES & BUSINESS LOGIC
-- ----------------------------------------------------------------------------

-- Search partner by LoveVerse ID (returns public profile only; zero private data)
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
      -- Do not return if caller has blocked target or target has blocked caller
      and not exists (
          select 1 from public.blocked_users b 
          where (b.blocker_id = v_caller_id and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = v_caller_id)
      )
    limit 1;
end;
$$;

-- Send Partner Request
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

    -- Ensure sender is not already paired
    if public.my_space() is not null then
        raise exception 'You are already connected with a partner';
    end if;

    -- Look up receiver
    select id into v_receiver_id
    from public.profiles
    where public_loveverse_id = v_clean_id;

    if v_receiver_id is null then
        raise exception 'Partner ID not found';
    end if;

    if v_receiver_id = v_sender_id then
        raise exception 'You cannot send a partner request to yourself';
    end if;

    -- Check if receiver is already paired
    if exists (select 1 from public.members where user_id = v_receiver_id) then
        raise exception 'This user is already connected with a partner';
    end if;

    -- Check if either user is blocked
    if exists (
        select 1 from public.blocked_users 
        where (blocker_id = v_sender_id and blocked_id = v_receiver_id)
           or (blocker_id = v_receiver_id and blocked_id = v_sender_id)
    ) then
        raise exception 'Unable to send request to this user';
    end if;

    -- Check for existing pending request between them
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

-- Accept Partner Request (Atomic Couple Creation)
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

    -- Lock and retrieve request
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

    -- Check if either user is already paired
    if public.my_space() is not null then
        raise exception 'You are already in an active couple';
    end if;

    if exists (select 1 from public.members where user_id = v_request.sender_user_id) then
        raise exception 'The sender is already connected with another partner';
    end if;

    -- Generate Unique Couple ID
    v_new_couple_id := public.generate_unique_couple_id();
    v_invite_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 6));

    -- Create new space
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

    -- Add both partners to members
    insert into public.members (user_id, space_id)
    values 
        (v_request.sender_user_id, v_new_space_id),
        (v_receiver_id, v_new_space_id);

    -- Create private couple room for 3D & Unreal Engine 5 synchronization
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

    -- Mark this request ACCEPTED
    update public.partner_requests
    set status = 'accepted', updated_at = now()
    where id = p_request_id;

    -- Cancel all other pending requests for both users
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

-- Reject Partner Request
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

-- Cancel Partner Request
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

-- Block User
create or replace function public.block_user(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    if auth.uid() = p_target_id then
        raise exception 'Cannot block self';
    end if;

    insert into public.blocked_users (blocker_id, blocked_id)
    values (auth.uid(), p_target_id)
    on conflict do nothing;

    -- Cancel any pending requests between them
    update public.partner_requests
    set status = 'cancelled', updated_at = now()
    where ((sender_user_id = auth.uid() and receiver_user_id = p_target_id)
       or  (sender_user_id = p_target_id and receiver_user_id = auth.uid()))
      and status = 'pending';
end;
$$;

-- Report User
create or replace function public.report_user(p_target_id uuid, p_reason text, p_details text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    insert into public.user_reports (reporter_id, reported_id, reason, details)
    values (auth.uid(), p_target_id, p_reason, p_details);
end;
$$;

-- Enable Realtime for partner_requests
do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        alter publication supabase_realtime add table public.partner_requests;
    end if;
exception when others then
    -- publication might already have table or permissions vary
    null;
end $$;
