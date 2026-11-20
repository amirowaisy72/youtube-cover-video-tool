import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/TopBar";
import { VideoLibrary } from "@/components/VideoLibrary";

/** My Videos (user, 2026-11-20): all videos of every video tool — watch, download, delete to free the disk. */
export const Route = createFileRoute("/my-videos")({
  component: MyVideosPage,
});

function MyVideosPage() {
  let tool = "";
  try { tool = new URLSearchParams(window.location.search).get("tool") || ""; } catch { /* no window */ }
  return (
    <div>
      <PageHeader icon="📁" title="My Videos" sub="Every video the app made — watch it, download it, or delete it to free space on your computer." />
      <div className="mx-auto max-w-4xl">
        <VideoLibrary initialTool={tool} />
      </div>
    </div>
  );
}
