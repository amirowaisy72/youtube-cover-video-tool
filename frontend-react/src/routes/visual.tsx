import { createFileRoute } from "@tanstack/react-router";
import { AutoVideoPage } from "./auto-video";

/** Visual Explainer (user, 2026-11-19): explainer videos made only of animated drawings —
    illustrated objects that move to show the idea, a sound effect for every motion, no stock footage. */
export const Route = createFileRoute("/visual")({
  component: VisualPage,
});

function VisualPage() {
  return <AutoVideoPage visual />;
}
