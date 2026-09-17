
-- 1. packs
CREATE TABLE public.packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX packs_sort_order_idx ON public.packs (sort_order);

GRANT SELECT ON public.packs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packs TO authenticated;
GRANT ALL ON public.packs TO service_role;

ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packs are publicly readable" ON public.packs
  FOR SELECT USING (true);
CREATE POLICY "admins can insert packs" ON public.packs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update packs" ON public.packs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete packs" ON public.packs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER packs_set_updated_at
  BEFORE UPDATE ON public.packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. card_packs (junction)
CREATE TABLE public.card_packs (
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, pack_id)
);
CREATE INDEX card_packs_pack_id_idx ON public.card_packs (pack_id);

GRANT SELECT ON public.card_packs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_packs TO authenticated;
GRANT ALL ON public.card_packs TO service_role;

ALTER TABLE public.card_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_packs are publicly readable" ON public.card_packs
  FOR SELECT USING (true);
CREATE POLICY "admins can insert card_packs" ON public.card_packs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can update card_packs" ON public.card_packs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins can delete card_packs" ON public.card_packs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Seed packs
INSERT INTO public.packs (name, slug, description, sort_order, is_active) VALUES
  ('Fundador', 'fundador', 'Baralho original de lançamento do Zero to Top | Card.', 0, true),
  ('Copa 90',  'copa-90',  'Astros da Copa de 1990.', 1, false),
  ('Copa 94',  'copa-94',  'Astros da Copa de 1994.', 2, false),
  ('Copa 98',  'copa-98',  'Astros da Copa de 1998.', 3, false);

-- 4. Backfill: vincular todas as cartas existentes ao pack Fundador
INSERT INTO public.card_packs (card_id, pack_id)
SELECT c.id, p.id
FROM public.cards c
CROSS JOIN public.packs p
WHERE p.slug = 'fundador'
ON CONFLICT DO NOTHING;
