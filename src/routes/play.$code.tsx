import { createFileRoute } from "@tanstack/react-router";
import { HumanBoard } from "@/game/multiplayer/HumanBoard";

export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "Partida ao vivo — Zero to Top Card" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayRoute,
});

function PlayRoute() {
  const { code } = Route.useParams();
  return <HumanBoard code={code.toUpperCase()} />;
}
