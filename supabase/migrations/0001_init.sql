-- TriSign initial schema
-- Run in Supabase SQL Editor or via: supabase db push

-- meetings
-- status values: 'waiting' | 'starting' | 'recording' | 'reviewing' | 'signing' | 'sealed'
create table meetings (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null check (char_length(room_code) = 6),
  host_address text not null,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  recording_started_at timestamptz,
  recording_ended_at timestamptz,
  on_chain_tx_hash text
);

create index idx_meetings_room_code on meetings(room_code);
create index idx_meetings_status on meetings(status);

-- participants
create table participants (
  meeting_id uuid not null references meetings(id) on delete cascade,
  wallet_address text not null,
  role text not null check (role in ('host', 'participant')),
  joined_at timestamptz not null default now(),
  start_sig text,
  start_signed_at timestamptz,
  end_sig text,
  end_signed_at timestamptz,
  review_completed bool not null default false,
  primary key (meeting_id, wallet_address)
);

create index idx_participants_meeting on participants(meeting_id);

-- messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  speaker_address text not null,
  original_text text not null,
  final_text text,
  spoken_at timestamptz not null,
  server_received_at timestamptz not null default now(),
  original_hash text not null,
  final_hash text,
  is_disputed bool not null default false
);

create index idx_messages_meeting_time on messages(meeting_id, spoken_at);

-- disputes
create table disputes (
  message_id uuid not null references messages(id) on delete cascade,
  disputer_address text not null,
  disputed_at timestamptz not null default now(),
  primary key (message_id, disputer_address)
);
