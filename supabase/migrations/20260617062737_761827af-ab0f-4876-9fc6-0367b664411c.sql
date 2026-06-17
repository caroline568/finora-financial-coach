
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  page text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_feedback()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF NEW.category NOT IN ('general','bug','idea','concern','praise') THEN
    RAISE EXCEPTION 'invalid category';
  END IF;
  IF char_length(trim(NEW.message)) = 0 OR char_length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'message must be 1-2000 characters';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_feedback_trg
BEFORE INSERT OR UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.validate_feedback();

CREATE TRIGGER feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own feedback"
ON public.feedback FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX feedback_user_id_created_at_idx ON public.feedback (user_id, created_at DESC);
