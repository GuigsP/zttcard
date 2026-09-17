import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Server-side publishable Supabase client (no user session, RLS applies as anon).
// The `sb_publishable_*` opaque key format requires stripping the default Authorization bearer.
function serverSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// 5-char code (no ambiguous chars): 24^5 = ~7.9M combos
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function genCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

function genSeed(): number {
  // 53-bit safe integer
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

export type CreateRoomInput = {
  playerId: string;
  nickname: string;
  avatar: string;
  cupPack: string;
};

export const createRoom = createServerFn({ method: "POST" })
  .inputValidator((data: CreateRoomInput) => {
    if (!data.playerId || !data.nickname || !data.avatar || !data.cupPack) {
      throw new Error("Missing fields");
    }
    if (data.nickname.length > 24) throw new Error("Nickname too long");
    return data;
  })
  .handler(async ({ data }) => {
    const supabase = serverSupabase();

    // Try up to 6 times to avoid rare code collisions
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = genCode();
      const seed = genSeed();
      const { data: row, error } = await supabase
        .from("match_rooms")
        .insert({
          code,
          status: "waiting",
          host_player_id: data.playerId,
          host_nickname: data.nickname,
          host_avatar: data.avatar,
          host_cup_pack: data.cupPack,
          seed,
        })
        .select("id, code, seed")
        .single();
      if (!error && row) {
        return { id: row.id, code: row.code, seed: Number(row.seed) };
      }
      lastErr = error;
    }
    throw new Error(
      `Could not create room: ${lastErr instanceof Error ? lastErr.message : "unknown"}`,
    );
  });

export type JoinRoomInput = {
  code: string;
  playerId: string;
  nickname: string;
  avatar: string;
  cupPack: string;
};

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator((data: JoinRoomInput) => {
    if (!data.code || !data.playerId || !data.nickname || !data.avatar || !data.cupPack) {
      throw new Error("Missing fields");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const code = data.code.toUpperCase();

    const { data: room, error: fetchErr } = await supabase
      .from("match_rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!room) throw new Error("SALA NÃO ENCONTRADA");
    if (new Date(room.expires_at).getTime() < Date.now()) {
      throw new Error("SALA EXPIRADA");
    }

    // If I'm the host reconnecting, just return the room.
    if (room.host_player_id === data.playerId) {
      return normalizeRoom(room);
    }

    // If the room already has a different guest, block.
    if (room.guest_player_id && room.guest_player_id !== data.playerId) {
      throw new Error("SALA CHEIA");
    }

    // Join as guest.
    const { data: updated, error: upErr } = await supabase
      .from("match_rooms")
      .update({
        guest_player_id: data.playerId,
        guest_nickname: data.nickname,
        guest_avatar: data.avatar,
        guest_cup_pack: data.cupPack,
        status: "playing",
      })
      .eq("id", room.id)
      .select("*")
      .single();
    if (upErr || !updated) throw new Error(upErr?.message ?? "join failed");
    return normalizeRoom(updated);
  });

export type FetchRoomInput = { code: string };

export const fetchRoom = createServerFn({ method: "POST" })
  .inputValidator((data: FetchRoomInput) => data)
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const code = data.code.toUpperCase();
    const { data: room, error } = await supabase
      .from("match_rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!room) return null;
    return normalizeRoom(room);
  });

type RoomRow = {
  id: string;
  code: string;
  status: string;
  host_player_id: string;
  host_nickname: string;
  host_avatar: string;
  host_cup_pack: string;
  guest_player_id: string | null;
  guest_nickname: string | null;
  guest_avatar: string | null;
  guest_cup_pack: string | null;
  seed: number | string;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

function normalizeRoom(row: RoomRow) {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    hostPlayerId: row.host_player_id,
    hostNickname: row.host_nickname,
    hostAvatar: row.host_avatar,
    hostCupPack: row.host_cup_pack,
    guestPlayerId: row.guest_player_id,
    guestNickname: row.guest_nickname,
    guestAvatar: row.guest_avatar,
    guestCupPack: row.guest_cup_pack,
    seed: Number(row.seed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export type RoomDTO = ReturnType<typeof normalizeRoom>;
