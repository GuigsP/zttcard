import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensurePlayerId } from "../storage";

let sharedCount: number | null = null;
const listeners = new Set<(c: number | null) => void>();
let lobbyChannel: ReturnType<typeof supabase.channel> | null = null;
let activeRefCount = 0;

function setupLobbyChannel() {
  if (typeof window === "undefined") return;
  activeRefCount++;
  if (lobbyChannel) return;

  try {
    const pid = ensurePlayerId();
    lobbyChannel = supabase.channel("lobby", {
      config: { presence: { key: pid } },
    });

    lobbyChannel
      .on("presence", { event: "sync" }, () => {
        if (!lobbyChannel) return;
        const state = lobbyChannel.presenceState();
        sharedCount = Object.keys(state).length;
        listeners.forEach((fn) => fn(sharedCount));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && lobbyChannel) {
          try {
            await lobbyChannel.track({ online_at: new Date().toISOString() });
          } catch {
            // ignore
          }
        }
      });
  } catch (err) {
    console.warn("Failed to subscribe to lobby presence:", err);
  }
}

function releaseLobbyChannel() {
  activeRefCount = Math.max(0, activeRefCount - 1);
  if (activeRefCount === 0 && lobbyChannel) {
    try {
      supabase.removeChannel(lobbyChannel);
    } catch {
      // ignore
    }
    lobbyChannel = null;
  }
}

/**
 * Presence-based online counter for the lobby channel.
 * Uses a single shared channel so multiple instances (mobile + desktop) don't conflict.
 */
export function OnlineBadge({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState<number | null>(sharedCount);

  useEffect(() => {
    const listener = (newCount: number | null) => setCount(newCount);
    listeners.add(listener);
    setupLobbyChannel();

    return () => {
      listeners.delete(listener);
      releaseLobbyChannel();
    };
  }, []);

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 font-arcade text-[9px] px-2 py-1 bg-arcade-dark/80 text-arcade-cream border border-arcade-yellow/60 rounded"
        title="Jogadores online agora"
      >
        <span className="w-2 h-2 rounded-full bg-arcade-green animate-pulse" />
        <span className="text-arcade-yellow font-bold">
          {count === null ? "..." : count}
        </span>
        <span className="text-[8px] text-arcade-cream/80">ONLINE</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 font-arcade text-xs px-4 py-2 bg-arcade-dark text-arcade-cream border-2 border-arcade-yellow rounded shadow-sm">
      <span className="w-3 h-3 rounded-full bg-arcade-green animate-pulse" />
      <span>
        {count === null ? "..." : count} {count === 1 ? "HUMANO ONLINE" : "HUMANOS ONLINE"}
      </span>
    </div>
  );
}
