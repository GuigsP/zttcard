-- Migration: Add exclusive_to column to packs table
ALTER TABLE public.packs 
ADD COLUMN IF NOT EXISTS exclusive_to TEXT DEFAULT NULL;

COMMENT ON COLUMN public.packs.exclusive_to IS 'Identificador (e-mail ou nickname) do apoiador que possui acesso exclusivo a este pacote e suas cartas.';
