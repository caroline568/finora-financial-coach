CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER FUNCTION public.set_ingest_token() SET search_path = public, extensions;
ALTER FUNCTION public.rotate_ingest_token() SET search_path = public, extensions;