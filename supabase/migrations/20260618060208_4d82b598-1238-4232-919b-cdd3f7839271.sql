
-- 1. Extend transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS mpesa_code text,
  ADD COLUMN IF NOT EXISTS counterparty text,
  ADD COLUMN IF NOT EXISTS counterparty_phone text,
  ADD COLUMN IF NOT EXISTS balance_kes integer,
  ADD COLUMN IF NOT EXISTS raw_sms text;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_mpesa_code_uniq
  ON public.transactions(user_id, mpesa_code)
  WHERE mpesa_code IS NOT NULL;

-- 2. Profiles ingest token
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ingest_token text UNIQUE;

UPDATE public.profiles
  SET ingest_token = encode(gen_random_bytes(18), 'hex')
  WHERE ingest_token IS NULL;

-- Auto-generate token for new profiles
CREATE OR REPLACE FUNCTION public.set_ingest_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ingest_token IS NULL THEN
    NEW.ingest_token := encode(gen_random_bytes(18), 'hex');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_set_ingest_token ON public.profiles;
CREATE TRIGGER trg_profiles_set_ingest_token
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_ingest_token();

-- 3. Secure RPC: ingest a parsed M-Pesa transaction by ingest_token.
-- Returns the transaction id (or null if duplicate). SECURITY DEFINER so
-- the public endpoint can call it via the anon key without exposing tables.
CREATE OR REPLACE FUNCTION public.ingest_mpesa_transaction(
  _token text,
  _mpesa_code text,
  _amount_kes integer,
  _type text,
  _category text,
  _counterparty text,
  _counterparty_phone text,
  _balance_kes integer,
  _transaction_date date,
  _note text,
  _raw_sms text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  SELECT id INTO _user_id FROM public.profiles WHERE ingest_token = _token;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  IF _type NOT IN ('income','expense') THEN
    RAISE EXCEPTION 'invalid type';
  END IF;
  IF _amount_kes IS NULL OR _amount_kes <= 0 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;

  INSERT INTO public.transactions (
    user_id, type, amount_kes, category, note, source,
    transaction_date, mpesa_code, counterparty, counterparty_phone,
    balance_kes, raw_sms
  ) VALUES (
    _user_id, _type, _amount_kes, _category, _note, 'mpesa_sms',
    COALESCE(_transaction_date, CURRENT_DATE),
    _mpesa_code, _counterparty, _counterparty_phone,
    _balance_kes, _raw_sms
  )
  ON CONFLICT (user_id, mpesa_code) WHERE mpesa_code IS NOT NULL DO NOTHING
  RETURNING id INTO _id;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.ingest_mpesa_transaction(text,text,integer,text,text,text,text,integer,date,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.ingest_mpesa_transaction(text,text,integer,text,text,text,text,integer,date,text,text) TO anon, authenticated, service_role;

-- 4. Rotate token helper (called by the signed-in user)
CREATE OR REPLACE FUNCTION public.rotate_ingest_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new text := encode(gen_random_bytes(18), 'hex');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  UPDATE public.profiles SET ingest_token = _new WHERE id = auth.uid();
  RETURN _new;
END $$;

REVOKE ALL ON FUNCTION public.rotate_ingest_token() FROM public;
GRANT EXECUTE ON FUNCTION public.rotate_ingest_token() TO authenticated, service_role;
