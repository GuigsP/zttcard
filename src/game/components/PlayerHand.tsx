import { useIsMobile } from "../hooks/useIsMobile";
import { PlayerHandMobile, type PlayerHandProps } from "./mobile/PlayerHandMobile";
import { PlayerHandDesktop } from "./desktop/PlayerHandDesktop";

export type { PlayerHandProps };

/**
 * 🃏 Roteador da Mão do Jogador
 * Separa a interface entre Mobile e Desktop de forma 100% isolada.
 * - Para alterar o celular: edite `mobile/PlayerHandMobile.tsx`
 * - Para alterar o PC: edite `desktop/PlayerHandDesktop.tsx`
 */
export function PlayerHand(props: PlayerHandProps) {
  const isMobile = useIsMobile();
  return isMobile ? <PlayerHandMobile {...props} /> : <PlayerHandDesktop {...props} />;
}
