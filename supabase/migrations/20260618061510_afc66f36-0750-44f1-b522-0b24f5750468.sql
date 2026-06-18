ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS prompt_snooze_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_prompted_at timestamptz,
  ADD COLUMN IF NOT EXISTS prompt_dismissed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS transactions_incomplete_idx
  ON public.transactions (user_id, created_at DESC)
  WHERE prompt_dismissed = false AND (category IS NULL OR note IS NULL OR category = '' OR note = '');