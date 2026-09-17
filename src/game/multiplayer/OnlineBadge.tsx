import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensurePlayerId } from "../storage";

/**
 * Presence-based online counter for the lobby channel.
 * Every visitor to the home joins channel `lobby` with their playerId as key,
 * which naturally deduplicates the same person across multiple tabs.
 */
export function OnlineBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const pid = ensurePlayerId();
    const channel = supabase.channel("lobby", {
      config: { presence: { key: pid } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 font-arcade text-xs px-4 py-2 bg-arcade-dark text-arcade-cream border-2 border-arcade-yellow rounded">
      <span className="w-3 h-3 rounded-full bg-arcade-green animate-pulse" />
      <span>
        {count === null ? "..." : count} {count === 1 ? "HUMANO ONLINE" : "HUMANOS ONLINE"}
      </span>
    </div>
  );
}
