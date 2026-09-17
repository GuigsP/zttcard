import { createFileRoute } from "@tanstack/react-router";
import { GameScreen } from "../game/GameScreen";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <GameScreen />;
}
