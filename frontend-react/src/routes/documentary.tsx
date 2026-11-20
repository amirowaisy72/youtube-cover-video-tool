import { createFileRoute, Navigate } from "@tanstack/react-router";

/** The Documentary Explainer was replaced by the Visual Explainer (user, 2026-11-19). */
export const Route = createFileRoute("/documentary")({
  component: () => <Navigate to="/visual" />,
});
