import { useIsMobile } from "../hooks/useIsMobile";
import { DuelArenaMobile } from "./mobile/DuelArenaMobile";
import { DuelArenaDesktop } from "./desktop/DuelArenaDesktop";
import type { DuelArenaProps } from "./duel/DuelArenaShared";

export type { DuelArenaProps };

/**
 * ⚔️ Roteador de Arena de Duelo
 * Separa a interface entre Mobile e Desktop de forma 100% isolada.
 * - Para alterar o celular: edite `mobile/DuelArenaMobile.tsx`
 * - Para alterar o PC: edite `desktop/DuelArenaDesktop.tsx`
 */
export function DuelArena(props: DuelArenaProps) {
  const isMobile = useIsMobile();
  return isMobile ? <DuelArenaMobile {...props} /> : <DuelArenaDesktop {...props} />;
}
