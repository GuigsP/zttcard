-- Migration: Update goalkeeper attributes from defesa/passe/fisico to defesa/posicionamento/reflexo
UPDATE public.cards
SET attrs = jsonb_build_object(
  'defesa', (attrs->'defesa')::int,
  'posicionamento', COALESCE((attrs->'posicionamento')::int, (attrs->'passe')::int, 80),
  'reflexo', COALESCE((attrs->'reflexo')::int, (attrs->'fisico')::int, 80)
)
WHERE position = 'GOL';
