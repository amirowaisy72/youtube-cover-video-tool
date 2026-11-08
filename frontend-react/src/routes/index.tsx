import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-store";
import { SETUP_DOWNLOAD_URL } from "@/lib/setup";
import coverImg from "@/assets/cover-template.jpg";
import scene1 from "@/assets/scene-1.jpg";
import scene2 from "@/assets/scene-2.jpg";
import scene3 from "@/assets/scene-3.jpg";
// One unique banner per tool (user, 2026-11-07): the 4 photos above
// were repeated across all 17 tools. Each tool below now has its
// own image, so no two cards look the same. The images are embedded
// as data URIs in .ts files because the GitHub push is text-only
// and cannot carry .jpg binaries.
import toolThumbnail from "@/assets/tool-thumbnail-data";
import toolDownloader from "@/assets/tool-downloader-data";
import toolTitles from "@/assets/tool-titles-data";
import toolTrimmer from "@/assets/tool-trimmer-data";
import toolSubtitles from "@/assets/tool-subtitles-data";
import toolKeywords from "@/assets/tool-keywords-data";
import toolInspector from "@/assets/tool-inspector-data";
import toolSeo from "@/assets/tool-seo-data";
import toolAudio from "@/assets/tool-audio-data";
import toolMusic from "@/assets/tool-music-data";
import toolScript from "@/assets/tool-script-data";
import toolStock from "@/assets/tool-stock-data";
import toolChannel from "@/assets/tool-channel-data";

export const Route = createFileRoute("/")({
  component: Home,
});

const tools = [
  { to: "/cover", n: "01", title: "Cover Video Generator", desc: "Paste a link, drop a cover, get a finished video inside your green-screen frame.", img: coverImg, cta: "Make a cover video" },
  { to: "/voice", n: "02", title: "Text to Voice", desc: "Turn up to 10,000 characters into natural English or Urdu voiceovers.", img: scene2, cta: "Create a voice" },
  { to: "/auto-video", n: "03", title: "Auto Video from Title", desc: "Type a title, pick a length — we build every scene for you.", img: scene3, cta: "Build a video" },
  { to: "/thumbnail", n: "04", title: "Thumbnail Maker", desc: "Upload a background, pick a template, type a headline — get a 1280×720 thumbnail.", img: toolThumbnail, cta: "Make a thumbnail" },
  { to: "/shorts", n: "05", title: "Shorts Maker", desc: "Cut your long video into a vertical 9:16 Short — blurred background, 1080x1920.", img: scene1, cta: "Make a Short" },
  { to: "/downloader", n: "06", title: "Video / MP3 Downloader", desc: "Paste a YouTube link and get the video as MP4 or just the audio as MP3.", img: toolDownloader, cta: "Download a video" },
  { to: "/titles", n: "07", title: "Title + Tags Generator", desc: "Type a topic — get 10 clickable titles, a ready description, and tags.", img: toolTitles, cta: "Generate titles" },
  { to: "/trimmer", n: "08", title: "Video Trimmer", desc: "Paste a YouTube link, pick start and end — download only that section, nothing else.", img: toolTrimmer, cta: "Trim a video" },
  { to: "/subtitles", n: "09", title: "Subtitle Generator", desc: "Turn any video or audio into accurate subtitles — free, on your computer.", img: toolSubtitles, cta: "Make subtitles" },
  { to: "/keywords", n: "10", title: "Keyword Research", desc: "Find what people actually search for on YouTube — real autocomplete suggestions for any seed keyword.", img: toolKeywords, cta: "Research keywords" },
  { to: "/inspector", n: "11", title: "Competitor Inspector", desc: "Paste any video link — see every detail: title, tags, views, likes, comments and more.", img: toolInspector, cta: "Inspect a video" },
  { to: "/seo", n: "12", title: "SEO Score Checker", desc: "Score your title, description and tags before you publish — and fix what is weak.", img: toolSeo, cta: "Check my SEO" },
  { to: "/audio", n: "13", title: "Audio Extractor", desc: "Turn any video — or a YouTube link — into a clean MP3.", img: toolAudio, cta: "Extract audio" },
  { to: "/music", n: "14", title: "Royalty-Free Music", desc: "Free music and sound effects for your YouTube videos — preview, then download.", img: toolMusic, cta: "Find music" },
  { to: "/script", n: "15", title: "Script Generator", desc: "Type a topic — get a full ready-to-record script, hooks and description.", img: toolScript, cta: "Write a script" },
  { to: "/stock", n: "16", title: "Stock Video & B-Roll", desc: "Free stock footage for your YouTube videos — preview, then download.", img: toolStock, cta: "Find B-roll" },
  { to: "/channel", n: "17", title: "Channel Setup Wizard", desc: "Set up a new YouTube channel — SEO names, description, tags, banner and logo.", img: toolChannel, cta: "Set up a channel" },
] as const;

function Home() {
  // Locked until the installed setup (with an active license) is
  // running: the public demo and plain run.bat both show the lock.
  const { unlocked, installed } = useApp();
  const locked = !unlocked;
  return (
    <div>
      <section className="mb-12 text-center">
        <span className="chip mb-5">✦ 17 tools · zero learning curve</span>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight md:text-6xl">
          Make YouTube magic in <span className="text-gradient">a few clicks</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">Pick a tool below. Each one walks you through, one simple step at a time.</p>
      </section>
      {locked && (
        <div className="glass mx-auto mb-8 max-w-2xl p-6 text-center">
          <h2 className="text-xl font-bold">🔒 Tools are locked</h2>
          {installed ? (
            <>
              <p className="mt-2 text-muted-foreground">Setup is installed. Activate your license to unlock all 17 tools.</p>
              <p className="mt-1 text-sm text-muted-foreground">Click <b>Activate</b> at the top right and enter your license key.</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-muted-foreground">Install YT Guru Setup on your computer to unlock all 17 tools.</p>
              <a className="btn btn-primary mt-4" href={SETUP_DOWNLOAD_URL}>⬇ Install Setup</a>
            </>
          )}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.to} to={t.to} className="glass group overflow-hidden transition hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]">
            <div className="relative aspect-video overflow-hidden">
              <img src={t.img} alt="" width={1280} height={720} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <span className="absolute left-4 top-4 font-display text-4xl font-bold text-gradient">{t.n}</span>
              {locked && (<span className="absolute right-4 top-4 chip">🔒 Locked</span>)}
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold">{t.title}</h2>
              <p className="mt-2 text-muted-foreground">{t.desc}</p>
              <span className="btn btn-primary mt-6 w-full">{locked ? (installed ? "🔒 Locked — Activate license" : "🔒 Locked — Install Setup") : `${t.cta} →`}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
