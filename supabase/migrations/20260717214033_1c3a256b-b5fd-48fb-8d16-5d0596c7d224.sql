
-- match_rooms: salas de 1v1
CREATE TABLE public.match_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','finished','abandoned')),
  host_player_id uuid NOT NULL,
  host_nickname text NOT NULL,
  host_avatar text NOT NULL,
  host_cup_pack text NOT NULL DEFAULT 'copa-90',
  guest_player_id uuid,
  guest_nickname text,
  guest_avatar text,
  guest_cup_pack text,
  seed bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX idx_match_rooms_code ON public.match_rooms(code);
CREATE INDEX idx_match_rooms_expires ON public.match_rooms(expires_at);

GRANT SELECT, INSERT, UPDATE ON public.match_rooms TO anon, authenticated;
GRANT ALL ON public.match_rooms TO service_role;

ALTER TABLE public.match_rooms ENABLE ROW LEVEL SECURITY;

-- Sem auth: qualquer um pode ler/escrever. A "segurança" é o código da sala.
CREATE POLICY "anyone can read rooms"
  ON public.match_rooms FOR SELECT
  USING (true);

CREATE POLICY "anyone can create rooms"
  ON public.match_rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone can update rooms"
  ON public.match_rooms FOR UPDATE
  USING (true);

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON public.match_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- match_moves: sequência de eventos de uma sala
CREATE TABLE public.match_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.match_rooms(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  player_id uuid NOT NULL,
  side text NOT NULL CHECK (side IN ('HOST','GUEST','SYS')),
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, seq)
);

CREATE INDEX idx_moves_room_seq ON public.match_moves(room_id, seq);

GRANT SELECT, INSERT ON public.match_moves TO anon, authenticated;
GRANT ALL ON public.match_moves TO service_role;

ALTER TABLE public.match_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read moves"
  ON public.match_moves FOR SELECT
  USING (true);

CREATE POLICY "anyone can insert moves"
  ON public.match_moves FOR INSERT
  WITH CHECK (true);

-- Realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_moves;
