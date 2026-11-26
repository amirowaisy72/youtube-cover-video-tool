"""One way to download from YouTube (and other sites), used by every tool.

- the same sturdy settings everywhere, with a JavaScript runtime for YouTube's checks (needs yt-dlp-ejs)
- when YouTube asks "Sign in to confirm you're not a bot", one more try with the sign-in kept in your own
  browser: Firefox, then Edge, then Chrome. The cookies are read on this computer by yt-dlp and sent only to
  YouTube; they are never used for other sites and the app does not keep a copy. YTG_NO_BROWSER_COOKIES=1
  switches this off.
- errors in plain words (DownloadProblem), without terminal colour codes
"""
from __future__ import annotations

import os
import re
from urllib.parse import urlparse

BROWSERS = (("firefox", "Firefox"), ("edge", "Microsoft Edge"), ("chrome", "Google Chrome"))
COMMON = {"quiet": True, "no_warnings": True, "noprogress": True, "no_color": True, "noplaylist": True, "socket_timeout": 60,
          "retries": 10, "fragment_retries": 10, "extractor_retries": 3,
          # YouTube hides the video addresses behind a small program: one of these (if installed) runs it
          "js_runtimes": {"deno": {}, "node": {}, "bun": {}}}
_COLOUR = re.compile(r"\x1b?\[[0-9;]{1,12}m")
_SIGN_IN = re.compile(r"sign in to confirm|not a bot|confirm you.?re not|--cookies-from-browser", re.I)
_good: list[str] = []  # the browser that worked last time is tried first


class DownloadProblem(Exception):
    """What went wrong, in words for the user. retry = trying the same thing again may work."""

    def __init__(self, message: str, retry: bool = True, sign_in: bool = False):
        super().__init__(message)
        self.retry = retry
        self.sign_in = sign_in


def clean(text) -> str:
    """The error text without colour codes and yt-dlp's own labels."""
    t = _COLOUR.sub("", str(text or "")).replace("\r", "")
    t = re.sub(r"(?m)^\s*ERROR:\s*", "", t)
    return re.sub(r"^\[[\w:+-]+\]\s+(?:[\w-]{6,}:\s*)?", "", t.strip())


def is_youtube(url: str) -> bool:
    host = (urlparse(str(url or "")).hostname or "").lower()
    return str(url).startswith("ytsearch") or any(host == h or host.endswith("." + h)
                                                  for h in ("youtube.com", "youtu.be", "youtube-nocookie.com"))


def needs_sign_in(exc) -> bool:
    return bool(_SIGN_IN.search(clean(exc)))


# (words in the error, what to tell the user, may a second try help)
_PLAIN = (
    (r"private video", "This video is private. Only people the owner invited can watch it.", False),
    (r"members[- ]only|join this channel", "This video is only for paying members of that channel.", False),
    (r"video (?:is )?(?:unavailable|not available)|has been removed|no longer available|account .*terminated",
     "This video is not available: it was removed, it is blocked in your country, or the link is wrong.", False),
    (r"not available in your country|blocked it in your country|geo.?restrict",
     "This video is blocked in your country.", False),
    (r"premieres in|this live event will begin|is not currently live|live stream recording is not available",
     "This is a live stream or premiere that has not finished yet. Try again later.", False),
    (r"unsupported url", "The app cannot download from this link. Open the video itself and copy its address.", False),
    (r"is not a valid url|incomplete youtube id|truncated", "That link is not complete. Copy the whole address again.", False),
    (r"http error 429|too many requests", "YouTube says too many requests came from your internet connection. Wait an "
                                          "hour (or restart your router) and try again.", False),
    (r"http error 403|forbidden", "YouTube refused to send the video. Try again in a few minutes. If it keeps happening, "
                                  "update yt-dlp.", True),
    (r"requested format is not available", "YouTube offered no usable video for this link. Update yt-dlp and try again.", False),
    (r"ffmpeg(?:/ffprobe)? (?:is )?not (?:found|installed)", "FFmpeg was not found on this computer.", False),
    (r"getaddrinfo|name resolution|timed out|timeout|connection (?:was )?(?:reset|aborted|refused)|10054|10060|"
     r"unreachable|ssl|remote end closed",
     "The connection to the site broke. Check your internet connection and try again.", True),
    (r"no space left|disk full|errno 28", "The disk is full. Free some space and try again.", False),
)


def explain(exc) -> DownloadProblem:
    if isinstance(exc, DownloadProblem):
        return exc
    text = clean(exc)
    for pattern, words, retry in _PLAIN:
        if re.search(pattern, text, re.I):
            return DownloadProblem(words, retry)
    first = text.split("\n")[0][:300] or exc.__class__.__name__
    return DownloadProblem(f"The download failed: {first}")


def _why_browser(name: str, exc) -> str:
    """Why one browser's sign-in did not help."""
    text = clean(exc).lower()
    if re.search(r"could not find .*cookies|no such file|profile.*not (?:be )?found|unsupported platform", text):
        return f"{name}: not installed, or never used."
    if re.search(r"could not copy|database is locked|permission denied|being used by another", text):
        return f"{name}: its cookies are locked while it is open. Close {name} completely and try again."
    if re.search(r"dpapi|decrypt|app.?bound", text):
        return f"{name}: Windows does not let other programs read its sign-in (a protection in new versions)."
    if _SIGN_IN.search(text):
        return f"{name}: YouTube still asks. Open {name}, sign in to youtube.com, play any video, then try again."
    return f"{name}: {explain(exc)}"


def sign_in_message(tried: list[str]) -> str:
    lines = "\n".join(f"• {t}" for t in tried)
    return ("YouTube asked to confirm that you are not a robot, and the app could not get past it.\n" + (lines + "\n" if lines else "")
            + "What works best: install Firefox, sign in to youtube.com in it, play a video, then try again. "
              "(A spare Google account is safer for this than your channel's account.) "
              "You can also upload the video or audio file, or paste the transcript, where the tool offers it.")


def cookies_allowed() -> bool:
    return not os.environ.get("YTG_NO_BROWSER_COOKIES")


def _once(url: str, opts: dict, call):
    import yt_dlp
    with yt_dlp.YoutubeDL(opts) as ydl:
        return call(ydl) if call else ydl.extract_info(url, download=True)


def run(url: str, opts: dict | None = None, call=None, note=None):
    """Do one yt-dlp job: call(ydl), or download `url`. note(text) tells the user when a browser is tried.
    Raises DownloadProblem (ImportError passes through: yt-dlp is not installed)."""
    settings = {**COMMON, **(opts or {})}
    try:
        return _once(url, settings, call)
    except ImportError:
        raise
    except Exception as exc:  # noqa: BLE001
        if not (needs_sign_in(exc) and is_youtube(url)):
            raise explain(exc) from exc
        if not cookies_allowed():
            raise DownloadProblem(sign_in_message([]), retry=False, sign_in=True) from exc
    tried = []
    for key, name in sorted(BROWSERS, key=lambda b: b[0] not in _good):
        if note:
            note(f"YouTube asked to confirm you are not a robot. Trying again with your {name} sign-in…")
        try:
            result = _once(url, {**settings, "cookiesfrombrowser": (key,)}, call)
            _good[:] = [key]
            return result
        except Exception as exc:  # noqa: BLE001
            tried.append(_why_browser(name, exc))
    raise DownloadProblem(sign_in_message(tried), retry=False, sign_in=True)


def info(url: str, opts: dict | None = None, note=None) -> dict:
    """What the site says about a video (nothing is downloaded)."""
    return run(url, {"skip_download": True, **(opts or {})}, lambda ydl: ydl.extract_info(url, download=False), note) or {}
