-- trueStory v2 schema migration
-- Discovery: .workflow/discovery/truestory-v2-20260512-2250-PRD.md
-- Adds dynamic participant count, Pro upgrade fields, end_proposals table, releasable room code

BEGIN;

-- ── participants: per-participant visual + presence state ─────────────────

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#888888',
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── meetings: Pro flag, expected count, releasable code, Arweave + Lit refs

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expected_count SMALLINT,
  ADD COLUMN IF NOT EXISTS code_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arweave_tx_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS lit_acc_ref BYTEA,
  ADD COLUMN IF NOT EXISTS pro_status VARCHAR(20) NOT NULL DEFAULT 'none',
    -- 'none' | 'paid' | 'finalizing' | 'finalized' | 'refunded'
  ADD COLUMN IF NOT EXISTS skip_attestation BOOLEAN NOT NULL DEFAULT false;

-- Release the unique constraint on room_code so we can reuse codes after sealed.
-- The old unique constraint may have been created automatically; drop it if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meetings_room_code_key' AND conrelid = 'meetings'::regclass
  ) THEN
    ALTER TABLE meetings DROP CONSTRAINT meetings_room_code_key;
  END IF;
END $$;

-- Partial unique index: only active (not yet released) codes are unique.
-- This lets sealed meetings' codes be reused by new meetings.
CREATE UNIQUE INDEX IF NOT EXISTS meetings_active_code_unique
  ON meetings (room_code)
  WHERE code_released_at IS NULL;

-- ── end_proposals: track end-meeting proposal voting ──────────────────────

CREATE TABLE IF NOT EXISTS end_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  proposer_address VARCHAR(42) NOT NULL,
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active' | 'approved' | 'cancelled'
  agreed_addresses TEXT[] NOT NULL DEFAULT '{}',
  disagreed_addresses TEXT[] NOT NULL DEFAULT '{}',
  resolved_at TIMESTAMPTZ
);

-- Only one active proposal per meeting at a time.
CREATE UNIQUE INDEX IF NOT EXISTS end_proposals_one_active_per_meeting
  ON end_proposals (meeting_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS end_proposals_meeting_id_idx ON end_proposals (meeting_id);

-- ── messages: index for incremental pagination (?since=<id>) ──────────────

CREATE INDEX IF NOT EXISTS messages_meeting_spoken_idx
  ON messages (meeting_id, spoken_at);

COMMIT;
