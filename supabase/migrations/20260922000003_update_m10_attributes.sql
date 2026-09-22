-- Migration: Update M10 (Mei 10) attributes from (criacao, passe, defesa) to (criacao, passe, finalizacao)
-- And apply +10 bonus points on finalizacao (former defesa + 10, max 99), recalculating OVR.

UPDATE public.cards
SET 
  attrs = jsonb_build_object(
    'criacao', COALESCE((attrs->>'criacao')::int, 80),
    'passe', COALESCE((attrs->>'passe')::int, 80),
    'finalizacao', LEAST(99, COALESCE((attrs->>'finalizacao')::int, (attrs->>'defesa')::int + 10, 75))
  ),
  ovr = ROUND(
    (
      COALESCE((attrs->>'criacao')::int, 80) +
      COALESCE((attrs->>'passe')::int, 80) +
      LEAST(99, COALESCE((attrs->>'finalizacao')::int, (attrs->>'defesa')::int + 10, 75))
    ) / 3.0
  )
WHERE position = 'M10';
