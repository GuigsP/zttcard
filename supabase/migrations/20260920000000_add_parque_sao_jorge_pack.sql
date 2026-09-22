-- Add Parque São Jorge - 90 pack
INSERT INTO public.packs (name, slug, description, sort_order, is_active)
VALUES ('Parque São Jorge - 90', 'parque-sao-jorge-90', 'Esquadrão Campeão de 1990', 4, true)
ON CONFLICT (slug) DO UPDATE
SET name = 'Parque São Jorge - 90', description = 'Esquadrão Campeão de 1990', is_active = true;
