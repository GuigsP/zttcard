-- Migration: Update volante (VOL) attributes to conducao, passe, defesa
UPDATE public.cards
SET attrs = jsonb_build_object(
  'conducao', COALESCE((attrs->'conducao')::int, (attrs->'criacao')::int, (attrs->'fisico')::int, 80),
  'passe', (attrs->'passe')::int,
  'defesa', (attrs->'defesa')::int
)
WHERE position = 'VOL';
