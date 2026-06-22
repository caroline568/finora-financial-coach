REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_ingest_token() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_feedback() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ingest_mpesa_transaction(text, text, integer, text, text, text, text, integer, date, text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_mpesa_transaction(text, text, integer, text, text, text, text, integer, date, text, text) TO anon;

REVOKE ALL ON FUNCTION public.rotate_ingest_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_ingest_token() TO authenticated;