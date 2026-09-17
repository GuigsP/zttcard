CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  comment text NOT NULL DEFAULT '',
  handle text NOT NULL DEFAULT '',
  user_id uuid NULL,
  page text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_comment_len CHECK (char_length(comment) <= 500),
  CONSTRAINT feedback_handle_len CHECK (char_length(handle) <= 60),
  CONSTRAINT feedback_page_len CHECK (char_length(page) <= 200),
  CONSTRAINT feedback_ua_len CHECK (char_length(user_agent) <= 500)
);

GRANT SELECT, DELETE ON public.feedback TO authenticated;
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit feedback"
  ON public.feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins can delete feedback"
  ON public.feedback FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX feedback_created_at_idx ON public.feedback (created_at DESC);