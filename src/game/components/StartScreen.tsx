import { useIsMobile } from "../hooks/useIsMobile";
import { StartScreenMobile, type StartScreenProps } from "./mobile/StartScreenMobile";
import { StartScreenDesktop } from "./desktop/StartScreenDesktop";

export type { StartScreenProps };

/**
 * 🏠 Roteador da Tela Inicial / Lobby
 * Separa a interface entre Mobile e Desktop de forma 100% isolada.
 * - Celular: `mobile/StartScreenMobile.tsx`
 * - PC: `desktop/StartScreenDesktop.tsx`
 */
export function StartScreen(props: StartScreenProps) {
  const isMobile = useIsMobile();
  return isMobile ? <StartScreenMobile {...props} /> : <StartScreenDesktop {...props} />;
}
