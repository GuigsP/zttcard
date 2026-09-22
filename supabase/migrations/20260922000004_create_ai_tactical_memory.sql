-- ============================================================================
-- Migration: 20260922000004_create_ai_tactical_memory.sql
-- Tabela e funções para aprendizado tático coletivo e adaptativo da IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_tactical_memory (
  stat_key TEXT PRIMARY KEY,
  sample_count INTEGER NOT NULL DEFAULT 0,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_tactical_memory_updated_idx ON public.ai_tactical_memory (updated_at DESC);

-- Permissões RLS
ALTER TABLE public.ai_tactical_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_tactical_memory is publicly readable" ON public.ai_tactical_memory;
CREATE POLICY "ai_tactical_memory is publicly readable"
  ON public.ai_tactical_memory FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "ai_tactical_memory can be inserted or updated by anyone" ON public.ai_tactical_memory;
CREATE POLICY "ai_tactical_memory can be inserted or updated by anyone"
  ON public.ai_tactical_memory FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.ai_tactical_memory TO anon, authenticated;
GRANT ALL ON public.ai_tactical_memory TO service_role;

-- Função atômica segura para registrar estatísticas táticas
CREATE OR REPLACE FUNCTION public.record_tactical_stat(
  p_stat_key TEXT,
  p_attribute TEXT,
  p_increment INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_tactical_memory (stat_key, sample_count, weights, updated_at)
  VALUES (
    p_stat_key,
    p_increment,
    jsonb_build_object(p_attribute, p_increment),
    now()
  )
  ON CONFLICT (stat_key) DO UPDATE
  SET 
    sample_count = public.ai_tactical_memory.sample_count + p_increment,
    weights = jsonb_set(
      public.ai_tactical_memory.weights,
      array[p_attribute],
      to_jsonb(coalesce((public.ai_tactical_memory.weights ->> p_attribute)::int, 0) + p_increment),
      true
    ),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_tactical_stat(TEXT, TEXT, INT) TO anon, authenticated, service_role;
