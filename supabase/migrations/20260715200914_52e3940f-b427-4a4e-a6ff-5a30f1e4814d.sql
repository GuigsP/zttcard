
-- Add card_number sequence and real_name column
CREATE SEQUENCE IF NOT EXISTS public.cards_card_number_seq;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS card_number integer,
  ADD COLUMN IF NOT EXISTS real_name text;

-- Backfill existing cards in order side, position, tier
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY side, position, tier, created_at) AS rn
  FROM public.cards
  WHERE card_number IS NULL
)
UPDATE public.cards c
SET card_number = o.rn
FROM ordered o
WHERE c.id = o.id;

-- Advance sequence past current max
SELECT setval('public.cards_card_number_seq', COALESCE((SELECT MAX(card_number) FROM public.cards), 0));

-- Set default and NOT NULL + unique
ALTER TABLE public.cards
  ALTER COLUMN card_number SET DEFAULT nextval('public.cards_card_number_seq'),
  ALTER COLUMN card_number SET NOT NULL;

ALTER SEQUENCE public.cards_card_number_seq OWNED BY public.cards.card_number;

CREATE UNIQUE INDEX IF NOT EXISTS cards_card_number_key ON public.cards(card_number);
CREATE INDEX IF NOT EXISTS cards_lower_name_idx ON public.cards(lower(name));
