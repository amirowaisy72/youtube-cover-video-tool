"""Story Animator — title + minutes in, finished cartoon video out
(Phase 2 of the Stickman Story Animator).

Free tool: no license/credit calls. Pipeline (one background job):

  1. Story   — the free Pollinations text API writes an outline and
               then the dialogue of each scene, using the user's own
               saved characters (Character Studio). Or the user writes
               their own script. Optional review/edit step.
  2. Voices  — every line is spoken in the character's voice: an Edge
               voice (Text to Voice) or a Voice Cloner voice.
  3. Scenes  — a background per scene: Pixabay illustrations (free
               key, cartoon look) -> Pollinations image -> plain
               gradient, so a video is always produced.
  4. Drawing — the BROWSER draws every needed character pose/mouth
               (same stickman.ts as Character Studio, so characters
               look identical) and uploads them as PNG sprites.
  5. Render  — Pillow puts sprites on the backgrounds frame by frame
               (mouths move with the voice = lip-sync, eyes blink),
               FFmpeg encodes MP4 with the voice track + subtitles.

Endpoints (all under /api/animator):
  POST /start                        -> {job_id}
  GET  /jobs/{id}                    -> job status / progress
  GET  /jobs/{id}/script             -> the story (scenes + lines)
  PUT  /jobs/{id}/script             -> save an edited story
  POST /jobs/{id}/continue           -> voices + backgrounds after review
  GET  /jobs/{id}/sprites            -> sprites the browser must draw
  POST /jobs/{id}/sprites/{key}      -> one PNG sprite
  POST /jobs/{id}/render             -> start the final render
  GET  /jobs/{id}/video              -> the MP4
  GET  /jobs/{id}/background/{idx}   -> a scene background (preview)

Wire-up (in backend/main.py):
    import tools_animator  # noqa: E402
    app.include_router(tools_animator.router)
"""

from __future__ import annotations

import datetime
import json
import math
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import wave
from array import array
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parent))

from video import no_window_kwargs  # noqa: E402

router = APIRouter(prefix="/api/animator")

BASE_DIR = Path(__file__).resolve().parent.parent
ANIM_DIR = BASE_DIR / "animations"
ANIM_DIR.mkdir(exist_ok=True)
CHAR_DIR = BASE_DIR / "characters"

FPS = 24
SAMPLE_RATE = 24000
FORMATS = {"long": (1280, 720), "reel": (720, 1280)}
LANGUAGES = {"en": "English", "ur": "Urdu"}
EXPRESSIONS = ["normal", "happy", "angry", "sad", "surprised", "suspicious"]
POSES = ["idle", "wave", "hips", "point", "think", "shrug"]
WORDS_PER_MINUTE = 140      # spoken dialogue incl. small pauses
LINE_GAP = 0.12             # silence between lines (sec) — short, cartoons are snappy
SCENE_GAP = 0.35            # pause at a scene change (sec)
LEAD_IN = 0.4
MAX_ON_SCREEN = 4
WALK_FRAMES = 24            # walking into the scene (1 sec)

# Drawn places (frontend-react/src/lib/environment.ts draws them).
PLACES = ["park", "street", "home", "office", "classroom", "kitchen",
          "bedroom", "shop", "restaurant", "police", "plain",
          "jungle", "forest", "beach", "desert", "cave", "mountain", "snow", "farm", "village", "space",
          "underwater", "hospital", "library", "stage", "gym", "bus", "train", "car", "plane", "custom"]
# Words that pick a drawn place, most specific first (user: a script can
# go ANYWHERE; anything not here becomes a "custom" place built from its words).
PLACE_PATTERNS = [
    ("street", r"bus stop|bus station|taxi stand|car park|parking"),
    ("bus", r"\b(inside|in|on|board(ing)?)\s+(the\s+|a\s+)?(school\s+)?bus\b|\bbus\b"),
    ("train", r"\btrain|railway|metro|subway"),
    ("plane", r"\b(aero)?plane|airplane|aircraft|flight\b|cockpit"),
    ("car", r"\b(inside|in)\s+(the\s+|a\s+)?(car|taxi|jeep)|\bcar ride|road trip"),
    ("jungle", r"jungle|rainforest|safari|wild\b|tropical"),
    ("forest", r"forest|woods|woodland"),
    ("beach", r"beach|sea\s*side|seashore|shore|island|coast|ocean side"),
    ("underwater", r"under\s*water|under the sea|sea bed|ocean floor|aquarium"),
    ("desert", r"desert|sahara|sand dunes|dunes"),
    ("cave", r"\bcave|tunnel|dungeon|\bmine\b|underground"),
    ("snow", r"\bsnow|\bice\b|winter|arctic|igloo|north pole|glacier"),
    ("mountain", r"mountain|\bhill|cliff|peak|valley|camping|camp\b"),
    ("space", r"\bspace|\bmoon|\bmars\b|planet|galaxy|rocket|spaceship"),
    ("farm", r"\bfarm|\bbarn|\bfield|\bfields|orchard"),
    ("village", r"village|\bgaon|\bgoth\b|countryside"),
    ("hospital", r"hospital|clinic|doctor|\bward\b|dentist"),
    ("library", r"library|bookstore|book shop"),
    ("stage", r"\bstage|theat(er|re)|concert|auditorium|\bshow\b|cinema"),
    ("gym", r"\bgym|fitness|workout"),
]
# What characters sit on in each place ("" = they stand).
SEATS = {"park": "bench", "street": "bench", "home": "sofa", "office": "chair",
         "classroom": "chair", "kitchen": "chair", "bedroom": "bed", "shop": "",
         "restaurant": "chair", "police": "chair", "plain": "bench",
         "jungle": "bench", "forest": "bench", "beach": "bench", "desert": "bench", "cave": "bench",
         "mountain": "bench", "snow": "bench", "farm": "bench", "village": "bench", "space": "",
         "underwater": "", "hospital": "bed", "library": "chair", "stage": "chair", "gym": "bench",
         "bus": "chair", "train": "chair", "car": "chair", "plane": "chair", "custom": "chair"}
# Extra furniture between seated characters.
TABLES = {"office": "desk", "restaurant": "table", "police": "desk", "kitchen": "table"}
PLACE_WORDS = {
    "park": ["park", "garden", "bench", "playground", "lawn"],
    "classroom": ["class", "school", "college", "teacher", "exam", "university"],
    "office": ["office", "boss", "work", "meeting", "interview", "bank"],
    "kitchen": ["kitchen", "cook", "biryani", "food", "stove"],
    "bedroom": ["bedroom", "bed", "sleep"],
    "restaurant": ["restaurant", "cafe", "café", "hotel", "dhaba", "canteen", "dinner", "lunch"],
    "shop": ["shop", "store", "market", "bazaar", "bazar", "mall", "counter"],
    "police": ["police", "thana", "station", "jail", "court", "arrest"],
    "home": ["home", "house", "living", "room", "ghar", "sofa", "tv"],
    "street": ["street", "road", "gali", "outside", "city", "town", "chowk", "bus"],
}
# Character drawing geometry — must match stickman.ts (FLOOR_Y, SEAT_TOP).
FLOOR_Y_UNITS = 377
SEAT_TOP_UNITS = 334
SIT_DROP_UNITS = 56

# The free Pollinations text API allows about one request per 15 s
# without a key (2026). Calls are spaced out, and a refused call is
# retried after a longer wait, instead of failing in seconds.
AI_GAP = 16.0
_AI = {"last": 0.0, "last_error": "", "gemini_model": "", "gemini_only": False}
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash-lite"]
_AI_LOCK = threading.Lock()

UA = {"User-Agent": "YT-Guru/1.0 (free local tool)"}
_ID_RE = re.compile(r"^[0-9a-f]{12}$")
_KEY_RE = re.compile(r"^[a-z0-9_-]{1,120}$")

# ------------------------------------------------------------ acting
# Inline actions in a line, e.g.
#   Master: Deal. Chapter one… {turn-page} {sniff} Is that a samosa smell?
# The line is split into "say" and "act" segments: Master says the
# first part, turns a page (page sound), sniffs (sniff sound), then
# says the rest. This is what makes characters ACT instead of just
# reading the script (user, 2026-11-16).
#   frames  : how long the action takes (24 = 1 second)
#   pose(s) : arm pose (a list = cycles through, 6 frames each)
#   expr    : face; mouth(s): mouth shapes; emote: icon above the head
#   flags   : tears / sweat / smell; motion: body movement
#   sfx     : sound effect; vocal: said in the character's OWN voice
#   camera  : "zoom" (punch in) or "shake"; persist: state that stays
ACTIONS: dict[str, dict] = {
    "read":       {"frames": 36, "pose": "read"},
    "turn-page":  {"frames": 22, "poses": ["read", "page", "page", "read"], "sfx": "page"},
    "sniff":      {"frames": 30, "expr": "suspicious", "flags": {"smell": True}, "motion": "sniff", "sfx": "sniff"},
    "laugh":      {"frames": 44, "pose": "belly", "expr": "happy", "mouths": ["grin", "talk-open"],
                   "motion": "shake-y", "vocal": "Ha ha ha ha ha!"},
    "giggle":     {"frames": 30, "pose": "belly", "expr": "happy", "mouths": ["grin", "talk-half"],
                   "motion": "shake-y", "vocal": "Hee hee hee!"},
    "cry":        {"frames": 44, "pose": "cover", "expr": "sad", "flags": {"tears": True},
                   "motion": "shake-y", "vocal": "Waaah! Waaah!"},
    "gasp":       {"frames": 22, "expr": "surprised", "mouth": "o", "emote": "exclaim",
                   "motion": "jump-small", "vocal": "Huh?!", "camera": "zoom"},
    "shock":      {"frames": 28, "expr": "surprised", "mouth": "o", "emote": "exclaim",
                   "motion": "jump", "sfx": "boing", "camera": "zoom"},
    # Little voice sounds in the character's own voice (user: "Haaan..",
    # "Hmmm..", "Ohoooo", "Ahhhh.." bring a cartoon to life). "stretch"
    # slows the sound down so the vowel is held long.
    "hmm":        {"frames": 20, "pose": "think", "expr": "suspicious", "vocal": "Hmmmm.", "stretch": 0.75},
    "haan":       {"frames": 16, "expr": "surprised", "emote": "question", "motion": "jump-small",
                   "vocal": "Haan?!", "stretch": 0.85},
    "ohoo":       {"frames": 20, "pose": "point", "expr": "happy", "vocal": "Oh hooo!", "stretch": 0.8},
    "aah":        {"frames": 24, "expr": "surprised", "mouth": "o", "motion": "shake-x",
                   "vocal": "Aaaaah!", "stretch": 0.7, "camera": "shake"},
    "uff":        {"frames": 18, "pose": "facepalm", "expr": "sad", "vocal": "Uff!", "stretch": 0.9},
    "wow":        {"frames": 20, "expr": "happy", "mouth": "o", "emote": "love", "motion": "jump-small",
                   "vocal": "Wooow!", "stretch": 0.8},
    "oops":       {"frames": 18, "pose": "shrug", "expr": "surprised", "vocal": "Oops!", "emote": "exclaim"},
    "yay":        {"frames": 24, "pose": "wave", "expr": "happy", "motion": "jump", "vocal": "Yaaay!", "stretch": 0.85},
    "idea":       {"frames": 32, "pose": "wave", "expr": "happy", "emote": "idea", "sfx": "ding"},
    "think":      {"frames": 36, "pose": "think", "expr": "suspicious", "emote": "question", "vocal": "Hmmm…"},
    "facepalm":   {"frames": 30, "pose": "facepalm", "expr": "sad", "sfx": "slap"},
    "angry":      {"frames": 30, "pose": "hips", "expr": "angry", "emote": "angry", "motion": "shake-x",
                   "vocal": "Grrr!", "camera": "shake"},
    "eat":        {"frames": 36, "pose": "eat", "mouths": ["talk-half", "flat"], "sfx": "eat"},
    "drink":      {"frames": 32, "pose": "drink", "sfx": "pop"},
    "phone":      {"frames": 32, "pose": "phone", "sfx": "phone"},
    "sleep":      {"frames": 48, "sfx": "snore", "persist": "sleep"},
    "wake":       {"frames": 22, "expr": "surprised", "emote": "exclaim", "motion": "jump-small",
                   "persist": "awake", "vocal": "Huh?!"},
    "jump":       {"frames": 20, "expr": "happy", "motion": "jump", "sfx": "boing"},
    "nod":        {"frames": 16, "motion": "nod"},
    "shake-head": {"frames": 18, "motion": "shake-x"},
    "clap":       {"frames": 30, "poses": ["clap", "clap2"], "expr": "happy", "sfx": "applause"},
    "dance":      {"frames": 48, "poses": ["wave", "shrug", "hips", "shrug"], "expr": "happy", "motion": "bounce"},
    "scared":     {"frames": 30, "expr": "surprised", "flags": {"sweat": True}, "motion": "shake-x",
                   "vocal": "Aaaah!"},
    "sweat":      {"frames": 26, "expr": "suspicious", "flags": {"sweat": True}},
    "love":       {"frames": 30, "expr": "happy", "emote": "love", "sfx": "magic"},
    "dizzy":      {"frames": 36, "expr": "sad", "emote": "dizzy", "motion": "sway"},
    "look-around": {"frames": 36, "looks": ["left", "right", "left", "right"], "emote": "question"},
    "fall":       {"frames": 34, "expr": "surprised", "motion": "fall", "emote": "dizzy", "sfx": "crash",
                   "camera": "shake"},
    "walk-out":   {"frames": 30, "persist": "gone", "sfx": "footsteps"},
    # Moving around (user, 2026-11-16: "they always stand in one place").
    "walk-to":    {"frames": 18},                       # walks up to the other character (while talking)
    "step-back":  {"frames": 14, "expr": "surprised"},  # backs away
    "pace":       {"frames": 30, "pose": "think"},      # walks a few steps, thinking
    "run":        {"frames": 54, "expr": "surprised", "sfx": "footsteps"},           # runs off and back
    "chase":      {"frames": 72, "expr": "angry", "sfx": "footsteps"},               # chases the other one around
    "fight":      {"frames": 60, "expr": "angry", "emote": "angry"},                 # punches
    "kick":       {"frames": 30, "expr": "angry", "motion": "jump-small"},
    "push":       {"frames": 26, "pose": "point", "expr": "angry"},
    "hug":        {"frames": 40, "pose": "shrug", "expr": "happy", "emote": "love", "sfx": "magic"},
    "high-five":  {"frames": 28, "pose": "wave", "expr": "happy", "sfx": "applause"},
    "climb":      {"frames": 74, "poses": ["wave", "point"], "expr": "happy"},          # climbs up and down
    "jump-rope":  {"frames": 56, "pose": "shrug", "expr": "happy"},                  # skipping rope
    "light-fire": {"frames": 40, "pose": "point", "expr": "happy", "sfx": "whoosh"},  # lights a fire (stays)
    "throw":      {"frames": 20, "poses": ["wave", "point"], "sfx": "whoosh"},
    "hide":       {"frames": 30, "pose": "cover", "expr": "surprised", "flags": {"sweat": True}},
    "swim":       {"frames": 40, "poses": ["wave", "point"], "motion": "sway"},
}
# More little acts the AI writers use a lot (user, 2026-11-18: "{shrug}",
# "{meow}", "{stretch}"… were skipped silently).
ACTIONS.update({
    "wave":       {"frames": 24, "pose": "wave", "expr": "happy"},
    "point":      {"frames": 22, "pose": "point"},
    "shrug":      {"frames": 22, "pose": "shrug", "expr": "normal"},
    "stretch":    {"frames": 30, "pose": "wave", "expr": "happy", "motion": "jump-small", "vocal": "Aaah…", "stretch": 0.8},
    "rub-eyes":   {"frames": 28, "pose": "cover", "expr": "sad", "vocal": "Mmm…", "stretch": 0.8},
    "yawn":       {"frames": 28, "pose": "cover", "expr": "sad", "mouth": "o", "vocal": "Haaaw…", "stretch": 0.7},
    "sigh":       {"frames": 22, "pose": "facepalm", "expr": "sad", "vocal": "Haah…", "stretch": 0.85},
    "smile":      {"frames": 18, "expr": "happy"},
    "blush":      {"frames": 22, "expr": "happy", "emote": "love"},
    "cheer":      {"frames": 26, "pose": "wave", "expr": "happy", "motion": "jump", "vocal": "Wooo!"},
    "bow":        {"frames": 22, "motion": "nod", "expr": "happy"},
    "tiptoe":     {"frames": 24, "expr": "suspicious", "motion": "sway"},
})
# Animal sounds, in the speaker's own voice.
for _snd, _say in {"meow": "Meow!", "purr": "Purrr…", "hiss": "Hsss!", "bark": "Woof woof!", "woof": "Woof!", "growl": "Grrr…",
                   "moo": "Moooo!", "quack": "Quack quack!", "oink": "Oink oink!", "baa": "Baaa!", "neigh": "Neigh!",
                   "roar": "Roooar!", "chirp": "Tweet tweet!", "tweet": "Tweet!", "croak": "Ribbit!", "ribbit": "Ribbit!",
                   "squeak": "Squeak!", "howl": "Awooo!", "cluck": "Cluck cluck!", "buzz": "Bzzzz!"}.items():
    ACTIONS[_snd] = {"frames": 20, "expr": "happy", "motion": "jump-small", "vocal": _say, "stretch": 0.9}
# A tag the app doesn't have → the nearest one it does (never skipped silently).
TAG_SYNONYMS = {
    "crunch": "eat", "munch": "eat", "chew": "eat", "nom": "eat", "gobble": "eat", "bite": "eat", "slurp": "drink", "sip": "drink",
    "grin": "smile", "smirk": "smile", "happy": "yay", "celebrate": "cheer", "hooray": "yay", "excited": "yay", "joy": "yay",
    "sob": "cry", "weep": "cry", "tears": "cry", "sad": "uff", "upset": "uff", "groan": "uff", "huff": "uff", "pout": "uff",
    "shout": "aah", "yell": "aah", "scream": "aah", "panic": "aah", "shriek": "aah", "freak-out": "aah",
    "surprised": "shock", "shocked": "shock", "stunned": "shock", "jaw-drop": "shock", "startle": "shock", "startled": "shock",
    "nervous": "sweat", "worried": "sweat", "gulp": "sweat", "anxious": "sweat", "shiver": "scared", "tremble": "scared",
    "shake": "scared", "afraid": "scared", "fear": "scared", "frightened": "scared", "cower": "hide", "duck": "hide",
    "mad": "angry", "furious": "angry", "rage": "angry", "stomp": "angry", "fume": "angry", "frown": "angry", "glare": "angry",
    "grumble": "angry", "shamp": "angry", "hmph": "angry", "humph": "angry",
    "ponder": "think", "wonder": "think", "puzzled": "think", "confused": "think", "scratch-head": "think", "curious": "hmm",
    "suspicious": "hmm", "squint": "hmm", "peer": "look-around", "glance": "look-around", "search": "look-around", "look": "look-around",
    "lookaround": "look-around", "look-left": "look-around", "look-right": "look-around",
    "chuckle": "giggle", "snicker": "giggle", "lol": "laugh", "haha": "laugh", "hehe": "giggle", "cackle": "laugh",
    "yes": "nod", "agree": "nod", "no": "shake-head", "disagree": "shake-head", "refuse": "shake-head",
    "hi": "wave", "hello": "wave", "bye": "wave", "goodbye": "wave", "greet": "wave", "salute": "wave",
    "highfive": "high-five", "hi-five": "high-five", "fist-bump": "high-five", "embrace": "hug", "cuddle": "hug",
    "dance-move": "dance", "spin": "dance", "twirl": "dance", "hop": "jump", "leap": "jump", "bounce": "jump",
    "sleepy": "yawn", "tired": "yawn", "doze": "sleep", "nap": "sleep", "snore": "sleep", "wake-up": "wake", "wakeup": "wake",
    "rub-eye": "rub-eyes", "rubeyes": "rub-eyes", "eye-rub": "rub-eyes", "stretches": "stretch",
    "slip": "fall", "trip": "fall", "tumble": "fall", "faint": "fall", "collapse": "fall",
    "sneak": "tiptoe", "creep": "tiptoe", "tip-toe": "tiptoe", "sneaky": "tiptoe",
    "smell": "sniff", "sniffs": "sniff", "facepalms": "facepalm", "slap-forehead": "facepalm",
    "lightbulb": "idea", "aha": "idea", "eureka": "idea", "ding": "idea",
    "applaud": "clap", "claps": "clap", "punch": "fight", "hit": "fight", "flee": "run", "escape": "run", "dash": "run", "rush": "run",
    "sprint": "run", "pointing": "point", "points": "point", "shrugs": "shrug", "sighs": "sigh", "meows": "meow", "barks": "bark",
    "kiss": "love", "heart": "love", "hearts": "love", "dizzy-spin": "dizzy",
}
# How a line is said, from a tag: {whisper} = the line is whispered.
TONE_TAGS = {"whisper": "whisper", "whispers": "whisper", "quietly": "whisper", "softly": "whisper", "hush": "whisper", "shh": "whisper",
             "shush": "whisper", "loud": "shout", "shouting": "shout", "yelling": "shout", "calmly": "calm", "excitedly": "excited"}


def _nearest_tag(verb: str) -> str:
    """A tag the app doesn't know → the closest one it does ('' = none)."""
    v = verb.strip().lower()
    if v in TAG_SYNONYMS:
        return TAG_SYNONYMS[v]
    for end in ("ing", "es", "s", "ed"):
        if v.endswith(end) and len(v) - len(end) >= 3:
            base = v[: -len(end)]
            for b in (base, base + "e"):
                if b in ACTIONS and not b.startswith("w-"):
                    return b
                if b in TAG_SYNONYMS:
                    return TAG_SYNONYMS[b]
    import difflib
    names = [n for n in ACTIONS if not n.startswith("w-")] + list(TAG_SYNONYMS)
    hit = difflib.get_close_matches(v, names, n=1, cutoff=0.8)
    if hit:
        return TAG_SYNONYMS.get(hit[0], hit[0])
    for part in re.split(r"[-\s]+", v):  # "happy-dance" → dance
        if part in ACTIONS and not part.startswith("w-") and len(part) > 2:
            return part
        if part in TAG_SYNONYMS:
            return TAG_SYNONYMS[part]
    return ""


# Actions that move a character across the screen / need another character.
MOVE_ACTIONS = {"walk-to", "step-back", "pace", "run", "chase", "fight", "kick", "push", "hug", "high-five"}
ACTION_NAMES = list(ACTIONS)
# 3D living worlds (user, 2026-11-17): "{climb:mango tree}", "{pick:mango}",
# "{swim:river}"… — in 3D the character walks to the thing, faces it and
# really does it (the tree, fruit, river… are built automatically). Frames
# and sound moments are shared with frontend-react/src/lib/world/types.ts
# (WACTS) so every sound lands on the right picture. "look" = how the 2D
# tool shows it.
WORLD_ACTS = {
    "go": {"n": 48, "sfx": [(0, "footsteps")], "look": "w-walk"},
    "return": {"n": 40, "sfx": [(0, "footsteps")], "look": "w-walk"},
    "cross": {"n": 96, "sfx": [(0, "footsteps"), (48, "footsteps")], "look": "w-walk"},
    "climb": {"n": 96, "sfx": [(30, "rustle"), (58, "rustle"), (84, "rustle")], "look": "climb"},
    "climb-down": {"n": 60, "sfx": [(14, "rustle"), (52, "thud")], "look": "w-walk"},
    "pick": {"n": 56, "sfx": [(40, "pop")], "look": "w-reach"},
    "carry": {"n": 56, "sfx": [(40, "pop")], "look": "w-reach"},
    "shake": {"n": 76, "sfx": [(24, "rustle"), (44, "rustle"), (46, "thud"), (56, "thud"), (66, "thud")], "look": "w-work"},
    "cut": {"n": 90, "sfx": [(40, "chop"), (54, "chop"), (68, "chop"), (70, "rustle"), (84, "thud")], "look": "w-work"},
    "chop": {"n": 120, "sfx": [(40, "chop"), (54, "chop"), (68, "chop"), (82, "chop"), (92, "rustle"), (106, "crash")], "look": "w-work"},
    "eat": {"n": 56, "sfx": [(34, "eat")], "look": "eat"},
    "throw": {"n": 40, "sfx": [(16, "whoosh"), (34, "thud")], "look": "throw"},
    "give": {"n": 48, "sfx": [(36, "pop")], "look": "w-reach"},
    "drop": {"n": 24, "sfx": [(18, "thud")], "look": "w-reach"},
    "swim": {"n": 144, "sfx": [(30, "splash"), (50, "swim"), (74, "swim"), (98, "swim"), (126, "splash")], "look": "swim"},
    "fish": {"n": 156, "sfx": [(34, "whoosh"), (44, "plop"), (100, "splash"), (104, "whoosh"), (116, "pop")], "look": "w-reach"},
    "drink": {"n": 72, "sfx": [(38, "splash"), (50, "sip")], "look": "drink"},
    "sit": {"n": 40, "sfx": [], "look": "w-walk"},
    "stand-up": {"n": 18, "sfx": [], "look": "w-walk"},
    "open": {"n": 40, "sfx": [(30, "creak")], "look": "w-reach"},
    "close": {"n": 36, "sfx": [(26, "creak"), (32, "door")], "look": "w-reach"},
    "enter": {"n": 64, "sfx": [(26, "creak"), (56, "door")], "look": "w-walk"},
    "exit": {"n": 56, "sfx": [(2, "creak"), (44, "door")], "look": "w-walk"},
    "light": {"n": 60, "sfx": [(34, "magic"), (40, "fire")], "look": "w-reach"},
    "push": {"n": 76, "sfx": [(30, "footsteps"), (32, "thud")], "look": "w-work"},
    "kick": {"n": 44, "sfx": [(30, "punch")], "look": "w-reach"},
    "hide": {"n": 44, "sfx": [(0, "footsteps")], "look": "hide"},
    "look": {"n": 30, "sfx": [], "look": "w-reach"},
}
WORLD_ALIASES = {"walk": "go", "walk-to": "go", "run": "go", "goto": "go", "run-to": "go", "jump": "swim",
                 "dive": "swim", "grab": "pick", "take": "pick", "collect": "pick", "pluck": "pick", "bite": "eat",
                 "sit-on": "sit", "get-in": "enter", "go-inside": "enter", "go-in": "enter", "come-out": "exit",
                 "get-out": "exit", "climb-up": "climb", "get-down": "climb-down", "jump-down": "climb-down",
                 "burn": "light", "stand": "stand-up", "peek": "hide", "watch": "look", "point-at": "look",
                 "lift": "carry", "roll": "push", "chop-down": "chop", "cut-down": "chop", "saw": "cut"}
# How the 2D tool shows them (not offered to the AI).
ACTIONS.update({
    "w-walk": {"frames": 40, "pose": "idle"},
    "w-reach": {"frames": 40, "poses": ["point", "wave"]},
    "w-work": {"frames": 60, "poses": ["point", "hips"], "motion": "bounce"},
    "w-cast": {"frames": 54, "poses": ["point", "point", "wave"], "expr": "happy"},
})
# A line's [.., laugh] sound effect is acted, in the speaker's own voice.
VOCAL_SFX = {"laugh": "laugh", "giggle": "giggle", "gasp": "gasp", "cry": "cry", "scream": "scared",
             "angry": "angry", "snore": "sleep"}
HOLD_ITEMS = {"book": "read", "phone": "phone"}

# How a line SOUNDS (user, 2026-11-16: "Give me that phone!" must be
# shouted in anger, not read flat). Edge voices get rate / pitch /
# volume per emotion; cloned voices get more or less "exaggeration".
TONES = ["shout", "whisper", "excited", "calm"]
_TONE_TABLE = {
    #            rate  pitch(Hz) volume  clone exaggeration
    "normal":    (0,    0,        0,     0.45),
    "happy":     (8,    14,       10,    0.75),
    "excited":   (14,   22,       20,    1.0),
    "angry":     (12,   -4,       35,    1.1),
    "shout":     (16,   18,       50,    1.5),
    "sad":       (-16,  -14,      -15,   0.35),
    "surprised": (12,   26,       20,    0.9),
    "suspicious": (-10, -8,       -10,   0.5),
    "whisper":   (-12,  -6,       -45,   0.3),
    "calm":      (-6,   -4,       -5,    0.35),
    "cry":       (-10,  10,       -5,    0.8),
    "scared":    (8,    16,       0,     0.7),
}
TONES = TONES + ["cry", "scared", "sad", "happy", "angry"]

# Whisper made from ANY voice: the sound keeps its shape but loses its
# pitch (the trick from FFmpeg's own manual).
_WHISPER = ("afftfilt=real='hypot(re,im)*cos((random(0)*2-1)*2*3.14)':"
            "imag='hypot(re,im)*sin((random(0)*2-1)*2*3.14)':win_size=256:overlap=0.75,highpass=f=300")


def _tone_for(line: dict, text: str) -> tuple[str, dict]:
    """(label, prosody) for one spoken part, from the line's tone tag,
    its expression and its punctuation."""
    tone = line.get("tone") or ""
    expr = line.get("expression", "normal")
    acts = {seg.get("act") for seg in line.get("segments", [])}
    if not tone and expr == "angry" and "!" in text:
        tone = "shout"  # angry + exclamation = shouting
    if not tone and "cry" in acts:
        tone = "cry"
    elif not tone and acts & {"scared", "sweat", "aah"} and expr in ("surprised", "sad", "normal"):
        tone = "scared"
    label = tone or expr
    if label not in _TONE_TABLE:
        label = "normal"
    rate, pitch, volume, exag = _TONE_TABLE[label]
    if "!" in text and label not in ("shout", "whisper"):
        volume += 12
        rate += 4
    if text.rstrip().endswith("?"):
        pitch += 6
    # Sound treatment on top of ANY engine: shouting is pushed hard and
    # compressed (sounds like yelling), whispers are thin and quiet.
    fx = {
        "shout": "highpass=f=140,acompressor=threshold=-24dB:ratio=8:attack=3:release=60,volume=7dB,alimiter=limit=0.95",
        "angry": "acompressor=threshold=-22dB:ratio=5:attack=5:release=80,volume=4dB,alimiter=limit=0.95",
        "excited": "acompressor=threshold=-20dB:ratio=3,volume=3dB,alimiter=limit=0.95",
        "whisper": _WHISPER + ",volume=-3dB",
        "sad": "lowpass=f=6000,volume=-2dB",
        # crying: a wobbly, shaky, slightly higher voice
        "cry": "vibrato=f=6.5:d=0.45,tremolo=f=4.5:d=0.35",
        # scared: a trembling voice
        "scared": "vibrato=f=9:d=0.3,tremolo=f=7:d=0.2",
    }.get(label, "")
    return label, {"rate": f"{rate:+d}%", "pitch": f"{pitch:+d}Hz", "volume": f"{min(100, max(-90, volume)):+d}%",
                   "exaggeration": exag, "fx": fx, "label": label}


# Voices that can really ACT (user, 2026-11-16: "abhi bhi reading lagta hai").
# Gemini TTS takes a plain-English direction; ElevenLabs v3 takes [tags].
_ACTING = {
    "shout": ("SHOUTING at the top of the voice, furious and very loud, like a cartoon character yelling", "[shouts]"),
    "angry": ("angry and annoyed, sharp, forceful, raising the voice", "[angry]"),
    "happy": ("happy and cheerful, smiling while talking, bouncy", "[happily]"),
    "excited": ("super excited, fast and full of energy, almost squealing", "[excited]"),
    "sad": ("sad and disappointed, slow, with a sigh in the voice", "[sad]"),
    "surprised": ("shocked and surprised, high-pitched, gasping", "[surprised]"),
    "suspicious": ("suspicious and sly, slow, a little sarcastic", "[suspiciously]"),
    "whisper": ("whispering a secret, very quiet and breathy", "[whispers]"),
    "calm": ("calm and relaxed, laid-back", "[calmly]"),
    "normal": ("natural and lively, expressive", ""),
}
GEMINI_TTS_MODEL = "gemini-3.8-flash-tts"
_gemini_lock = threading.Lock()
_gemini_state = {"last": 0.0, "blocked_until": 0.0}


def _gemini_tts(text: str, voice: str, key: str, label: str, out_wav: Path) -> None:
    """Google Gemini TTS with a delivery direction per line. The free
    tier allows about 3 requests a minute, so calls are spaced out;
    after a daily-quota error it is skipped for an hour."""
    import base64
    if time.time() < _gemini_state["blocked_until"]:
        raise RuntimeError("Gemini voice quota used up for now.")
    style = ("Speak as an animated cartoon character in a funny short video. Delivery: "
             + _ACTING.get(label, _ACTING["normal"])[0] + ".")
    body = json.dumps({
        "model": GEMINI_TTS_MODEL,
        "input": [{"type": "user_input", "content": [{
            "type": "text", "text": text,
            "annotations": [{"type": "speech_metadata", "style": style}]}]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": voice or "Puck"}]},
    }).encode("utf-8")
    with _gemini_lock:
        wait = 21 - (time.time() - _gemini_state["last"])
        if wait > 0:
            time.sleep(wait)
        _gemini_state["last"] = time.time()
        req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions", data=body,
                                     headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")[:300]
            if exc.code == 429:
                _gemini_state["blocked_until"] = time.time() + (3600 if "per_day" in detail.lower() or "PerDay" in detail else 60)
            raise RuntimeError(f"Gemini TTS {exc.code}: {detail}") from exc
    audio = None
    for step in data.get("steps", []):
        for part in step.get("content", []) or []:
            if part.get("type") == "audio" and part.get("data"):
                audio = part["data"]
    if not audio:
        raise RuntimeError("Gemini TTS returned no audio.")
    raw = base64.b64decode(audio)
    tmp = out_wav.with_suffix(".gem")
    if raw[:4] == b"RIFF":
        tmp.write_bytes(raw)
        src = ["-i", str(tmp)]
    else:  # raw 16-bit PCM, 24 kHz mono
        tmp.write_bytes(raw)
        src = ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", str(tmp)]
    try:
        _run_ffmpeg(src + ["-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(out_wav)])
    finally:
        tmp.unlink(missing_ok=True)


def _eleven_v3(text: str, voice: str, key: str, label: str, out_wav: Path) -> None:
    """ElevenLabs v3 with an audio tag for the emotion ([shouts], [whispers]…)."""
    tag = _ACTING.get(label, _ACTING["normal"])[1]
    body = json.dumps({"text": f"{tag} {text}".strip(), "model_id": "eleven_v3"}).encode("utf-8")
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}", data=body,
                                 headers={"Content-Type": "application/json", "Accept": "audio/mpeg",
                                          "xi-api-key": key})
    mp3 = out_wav.with_suffix(".el.mp3")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            mp3.write_bytes(resp.read())
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"ElevenLabs v3 {exc.code}: {exc.read().decode('utf-8', 'ignore')[:200]}") from exc
    if mp3.stat().st_size < 800:
        mp3.unlink(missing_ok=True)
        raise RuntimeError("ElevenLabs v3 returned no audio.")
    try:
        _run_ffmpeg(["-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(out_wav)])
    finally:
        mp3.unlink(missing_ok=True)
_SCREEN_RE = re.compile(r"\{\s*screen\s*:\s*([^{}]{1,160})\}", re.I)
_TAG_RE = re.compile(r"\{\s*([a-zA-Z][a-zA-Z' _\-]*(?:\s*:\s*[a-zA-Z0-9][a-zA-Z0-9' _\-]*){0,2})\s*\}")

# Your own actions (user, 2026-11-18: "if the app cannot show something, it
# must ASK me — never skip it"). Made in the Action Builder; a few come
# ready-made. Each: walk to the thing, a body pose, maybe hold / ride
# something, an effect (sparks, smoke…), and what happens to the thing
# (breaks, gets fixed, falls, disappears…). The 3D brain plays them.
ACTIONS_FILE = BASE_DIR / "animator_actions.json"
DEFAULT_CUSTOM = {
    "ride": {"label": "ride a motorcycle / bike / horse", "words": ["ride", "riding", "rode"],
             "frames": 96, "go": True, "body": "sit", "arms": "drive", "ride": True, "rideDist": 9, "effect": "dust",
             "change": "", "sound": "horn", "closeup": False, "thing": "motorcycle"},
    "drive": {"label": "drive a car / truck / bus", "words": ["drive", "driving", "drove"], "frames": 96, "go": True,
              "body": "sit", "arms": "drive", "ride": True, "rideDist": 12, "effect": "dust", "change": "", "sound": "horn", "thing": "car"},
    "weld": {"label": "weld / join metal (sparks)", "words": ["weld", "welding", "welded", "solder"], "frames": 84, "go": True,
             "body": "kneel", "arms": "work", "hold": "welding torch", "effect": "sparks", "change": "fix", "sound": "fire", "closeup": True},
    "fix": {"label": "fix / repair something", "words": ["fix", "fixed", "fixing", "repair", "repaired", "repairing", "mend"],
            "frames": 72, "go": True, "body": "kneel", "arms": "hammer", "hold": "hammer", "effect": "sparkle", "change": "fix",
            "sound": "thud", "closeup": True},
    "break": {"label": "break something (it stays broken)", "words": ["break", "broke", "breaks", "smash", "smashed"],
              "frames": 48, "go": True, "body": "stand", "arms": "hammer", "effect": "dust", "change": "break", "sound": "crash", "closeup": True},
    "broken": {"label": "a thing is already broken (from the start of the scene)", "words": ["broken", "cracked", "damaged", "toota", "tuta"],
               "frames": 24, "go": False, "body": "", "arms": "", "effect": "dust", "change": "break", "atStart": True, "sound": "", "closeup": True},
    "explode": {"label": "something explodes", "words": ["explode", "exploded", "explosion", "blast", "blew up"], "frames": 60,
                "go": False, "body": "stand", "arms": "up", "effect": "fire", "change": "hide", "sound": "crash", "closeup": False},
    "crash": {"label": "something crashes / falls over", "words": ["crash", "crashed", "derail", "derailed", "tipped over", "fell over"],
              "frames": 60, "go": False, "body": "stand", "arms": "up", "effect": "dust", "change": "fall", "sound": "crash"},
    "cook": {"label": "cook (smoke from the pan)", "words": ["cook", "cooking", "cooked", "fry", "frying"], "frames": 72, "go": True,
             "body": "stand", "arms": "work", "hold": "frying pan", "effect": "smoke", "change": "", "sound": "fire"},
    "dig": {"label": "dig the ground", "words": ["dig", "digging", "dug"], "frames": 72, "go": True, "body": "stand", "arms": "hammer",
            "hold": "shovel", "effect": "dust", "change": "", "sound": "thud"},
    "paint": {"label": "paint something (it changes colour)", "words": ["paint", "painting", "painted"], "frames": 72, "go": True,
              "body": "stand", "arms": "work", "hold": "brush", "effect": "sparkle", "change": "color", "color": "#f472b6", "sound": "magic"},
    "build": {"label": "build something (it appears)", "words": ["build", "built"], "frames": 84, "go": True,
              "body": "kneel", "arms": "hammer", "hold": "hammer", "effect": "dust", "change": "show", "sound": "thud"},
}


def _custom_spec(name: str) -> dict:
    """Frames + sounds of a custom action (the 3D brain uses the same numbers)."""
    a = custom_actions().get(name) or {}
    n = int(max(12, min(240, a.get("frames", 72))))
    walk = 30 if a.get("go") else 0
    sfx = [(0, "footsteps")] if walk else []
    if a.get("sound") in SFX_NAMES:
        sfx.append((walk + max(4, (n - walk) // 3), a["sound"]))
    return {"n": n, "sfx": sfx, "look": "w-work"}


def custom_actions() -> dict:
    out = dict(DEFAULT_CUSTOM)
    try:
        mine = json.loads(ACTIONS_FILE.read_text(encoding="utf-8"))
        if isinstance(mine, dict):
            out.update({k: v for k, v in mine.items() if isinstance(v, dict)})
    except (OSError, ValueError):
        pass
    return out


def _custom_of(verb: str) -> str:
    """The custom action a verb / word means ("welding" → weld)."""
    acts = custom_actions()
    if verb in acts:
        return verb
    for k, a in acts.items():
        if verb in (a.get("words") or []):
            return k
    return ""


# Transformations (user, 2026-11-17: "the story is that Teddy becomes a
# frog by magic, but you never SEE a frog"): {become:frog} turns the
# speaker into a frog, {turn:Teddy:frog} turns Teddy (a spell), and
# {become:back} / {turn:Teddy:back} undoes it. Puff, sparkles, the new
# body stays (also in the next scenes) until it is turned back.
MORPH_VERBS = {"become", "turn", "turn-into", "transform", "morph", "change", "magic", "spell", "zap", "curse"}
MORPH_BACK = {"back", "normal", "human", "person", "himself", "herself", "themselves", "again", "boy", "girl"}
MORPH_FRAMES = 54
MORPH_SWAP = 22  # the frame of the puff, when the body changes


_LOOK_RE = re.compile(r"\b(?:look|looks|see|watch|check)\s+(?:at\s+)?(?:the|that|this|my|your|our|a|an)\s+([a-z]+(?:\s+(?:tree|building|tank|house|station|train|clock|boat|bridge|river))?)", re.I)
_LOOK_SKIP = {"way", "time", "sky", "side", "bright", "thing", "things", "same", "other", "first", "last", "end", "best",
              "worst", "big", "little", "whole", "rest", "world", "news", "point", "moment", "difference", "future", "past",
              # things you "watch" that are not objects in the place
              "magic", "trick", "tricks", "show", "move", "moves", "skills", "plan", "idea", "face", "dance", "step",
              "steps", "video", "game", "match", "movie", "mouth", "language", "attitude", "back", "power", "powers"}


def _auto_look(segs: list[dict]) -> list[dict]:
    """"Look at the clock!" with no action: the character really turns and
    points at the clock (in 3D the clock is there — added if it was not)."""
    if any(s.get("wact") for s in segs):
        return segs
    text = " ".join(s.get("say", "") for s in segs).replace("*", "")
    m = _LOOK_RE.search(text)
    if not m or m.group(1).lower().split()[0] in _LOOK_SKIP:
        return segs
    return [{"wact": "look", "obj": m.group(1).lower()[:40]}] + segs


# Motion-graphic inserts in a cartoon (user, 2026-11-19): a small graphic panel over the
# film for a few seconds — drawn with Manim (tools_graphics), same look as Auto Video.
INSERT_TAGS = {"meter", "map", "countdown", "chat", "stars", "money", "counter", "pile", "topple", "scatter", "fall",
               "bounce", "stamp", "chapter", "steps", "list", "compare"}
INSERT_SECS = {"meter": 3.0, "map": 4.0, "chat": 3.5, "stars": 2.6, "money": 3.2, "counter": 3.0, "pile": 3.6,
               "topple": 3.2, "scatter": 3.2, "fall": 3.4, "bounce": 3.4, "stamp": 1.8, "chapter": 2.6, "steps": 3.6,
               "list": 3.6, "compare": 3.4}


def _insert_spec(kind: str, raw: str) -> dict | None:
    """The tag's words → a graphic spec (blocks)."""
    parts = [p.strip() for p in raw.split(":")]
    rest = parts[-1] if parts else ""

    def nums(t: str) -> list[float]:
        return [float(x.replace(",", "")) for x in re.findall(r"-?\d[\d,]*(?:\.\d+)?", t)]
    b: dict | None = None
    if kind == "meter":
        label = parts[0] if len(parts) > 1 else "Level"
        v = nums(rest) or [90, 5]
        b = {"type": "meter", "label": label[:40], "from": v[0] if len(v) > 1 else 100, "to": v[-1]}
    elif kind == "map":
        stops = [x.strip() for x in re.split(r">|->|,", raw) if x.strip()]
        b = {"type": "map", "stops": stops[:6]} if len(stops) >= 2 else None
    elif kind == "countdown":
        b = {"type": "countdown", "from": int((nums(raw) or [3])[0])}
    elif kind == "chat":
        who, _, text = raw.partition(":")
        b = {"type": "chat", "messages": [{"who": who.strip()[:16], "text": (text or who).strip()[:60]}]} if raw else None
    elif kind == "stars":
        b = {"type": "stars", "count": int((nums(raw) or [3])[0])}
    elif kind in ("money", "counter"):
        cur = re.match(r"\s*([$₹£€]|rs\.?)", rest, re.I)
        v = nums(rest) or [0, 100]
        label = parts[0] if len(parts) > 1 else ("Money" if kind == "money" else "")
        if kind == "money":
            b = {"type": "money", "label": label[:40], "currency": (cur.group(1) if cur else "Rs").replace(".", "").title(),
                 "start": v[0], "steps": [{"value": x} for x in v[1:4]]}
        else:
            b = {"type": "counter", "label": label[:40], "from": v[0] if len(v) > 1 else 0, "to": v[-1],
                 "prefix": (cur.group(1) if cur else "")}
    elif kind in ("pile", "topple", "scatter", "fall", "bounce"):
        b = {"type": "physics", "kind": kind, "icon": (parts[0] or "coin")[:24], "count": int((nums(raw) or [12])[0]),
             "label": parts[1][:40] if len(parts) > 1 else ""}
    elif kind == "stamp":
        b = {"type": "stamp", "text": (raw or "WOW")[:14]}
    elif kind == "chapter":
        b = {"type": "headline", "text": (raw or "Chapter 1")[:50], "solo": True}
    elif kind in ("steps", "list"):
        items = [x.strip() for x in re.split(r">|->|,", raw) if x.strip()]
        b = {"type": kind, "items": [{"text": x[:30]} for x in items[:5]]} if len(items) >= 2 else None
    elif kind == "compare":
        items = []
        for x in re.split(r",|\bvs\b", raw):
            lab, _, val = x.partition("=")
            if lab.strip() and nums(val):
                items.append({"label": lab.strip()[:20], "value": nums(val)[0]})
        b = {"type": "compare", "items": items} if len(items) >= 2 else None
    if not b:
        return None
    return {"kind": kind, "blocks": [b], "secs": INSERT_SECS.get(kind, 3.0), "text": raw[:80]}


INSERT_FPS = 12
_INSERT_RE = re.compile(r"\{\s*(" + "|".join(sorted(INSERT_TAGS, key=len, reverse=True)) + r")\s*(?::([^{}]{0,160}))?\}", re.I)


def _render_inserts(job: dict, jdir: Path, inserts: list[dict], timeline: dict) -> list[dict]:
    """Every {meter:…}/{map:…}… panel drawn once with Manim as picture frames. Without the free
    graphics engine the panel's words are shown on a screen instead (never lost)."""
    if not inserts:
        return []
    out: list[dict] = []
    try:
        import tools_graphics
        ok = tools_graphics.available()
    except Exception:  # noqa: BLE001
        ok = False
    for i, ins in enumerate(inserts):
        spec = ins["spec"]
        secs = (ins["end"] - ins["start"]) / FPS
        if not ok:
            timeline.setdefault("screens", []).append({"start": ins["start"], "end": ins["end"], "text": f"{spec['kind'].upper()}: {spec['text']}"})
            continue
        _update(job, message=f"Drawing the graphics… {i + 1} of {len(inserts)}")
        d = jdir / "inserts" / f"{i:02d}"
        try:
            if not (d / "0000.png").exists():
                blocks = [dict(b, at=0.2) for b in spec["blocks"]]
                for b in blocks:
                    if b["type"] == "money":
                        b["steps"] = [dict(st, at=1.0 + k * 0.7) for k, st in enumerate(b.get("steps") or [])]
                    if b["type"] in ("map", "timeline"):
                        b["dur"] = max(1.2, secs - 1.6)
                    if b["type"] in ("meter", "counter"):
                        b["dur"] = max(0.8, secs - 1.4)
                tools_graphics.render({"blocks": blocks, "duration": secs}, d / "x.mp4", 640, 360, fps=INSERT_FPS, png_dir=d, timeout=300)
            n = len(list(d.glob("*.png")))
            if n:
                out.append({"start": ins["start"], "end": ins["end"], "dir": f"{i:02d}", "n": n, "fps": INSERT_FPS, "kind": spec["kind"]})
        except Exception as exc:  # noqa: BLE001
            _VOICE_PROBLEMS.append(f"graphic {spec['kind']}: {str(exc)[:120]}")
            timeline.setdefault("screens", []).append({"start": ins["start"], "end": ins["end"], "text": f"{spec['kind'].upper()}: {spec['text']}"})
    return out


def _pack_aliases() -> dict:
    try:
        import tools_planner
        return tools_planner.aliases()
    except Exception:  # noqa: BLE001
        return {}


def _segments(raw_text: str) -> list[dict]:
    """'Deal. {turn-page} {sniff} Samosa?' -> say / act / act / say."""
    # {screen:Installing GTA 6 — 99%}: a computer / TV / phone screen shows this
    # text (2026-11-18); its text keeps capitals, numbers and punctuation.
    im_ = _INSERT_RE.search(raw_text or "")
    if im_:
        spec_ = _insert_spec(im_.group(1).lower(), (im_.group(2) or "").strip())
        return (_segments(raw_text[:im_.start()]) + ([{"insert": spec_}] if spec_ else [])
                + _segments(raw_text[im_.end():]))
    sm_ = _SCREEN_RE.search(raw_text or "")
    if sm_:
        return (_segments(raw_text[:sm_.start()]) + [{"screen": sm_.group(1).strip()[:120]}]
                + _segments(raw_text[sm_.end():]))
    segs: list[dict] = []
    pos = 0
    for m in _TAG_RE.finditer(raw_text):
        said = raw_text[pos:m.start()].strip()
        if re.search(r"\w", said):
            segs.append({"say": said})
        name = re.sub(r"\s+", " ", m.group(1).lower().replace("_", " ")).strip()
        verb, _, obj = name.partition(":")
        verb, obj = verb.strip(), obj.strip()
        # an add-on pack says what a new tag means ({sprint} = {run}, {surf} = {swim:sea}) (2026-11-19)
        al = _pack_aliases().get(verb.replace(" ", "-"))
        if al:
            av, _, ao = al.partition(":")
            verb, obj = av.strip(), (obj or ao.strip())
            name = verb + (":" + obj if obj else "")
        # Script doctor (user, 2026-11-18: the AI wrote "{frog}", "{become frog}"…):
        # loose words inside a tag still mean the right thing.
        if " " in verb and not obj and verb.replace(" ", "-") in ACTIONS:
            verb = name = verb.replace(" ", "-")  # {look around} = {look-around}
        if " " in verb and not obj:
            first, _, rest = verb.partition(" ")
            first = {"turns": "turn", "turned": "turn", "becomes": "become", "became": "become",
                     "transforms": "transform", "transformed": "transform"}.get(first, first)
            if first in MORPH_VERBS:
                verb, obj = ("become" if re.match(r"(?:into|to)\s", rest) else first), re.sub(r"^(?:into|to)\s+", "", rest)
            elif first in WORLD_ACTS or first in ACTIONS:
                verb, obj = first, re.sub(r"^(?:the|a|an|to|on|at|in|into)\s+", "", rest)
            else:
                verb = verb.replace(" ", "-")
        if verb.replace(" ", "-") in INSERT_TAGS:
            # {meter:Patience:90>2} {map:beach>airport} {countdown:3} {chat:Mom:Where are you?} {stars:3}
            # {money:80000>5000} {pile:coin} {topple:coin} {scatter:coin} {stamp:BUSTED} {chapter:Part 2}
            raw_inner = m.group(1).split(":", 1)[1].strip() if ":" in m.group(1) else ""
            spec = _insert_spec(verb.replace(" ", "-"), raw_inner)
            if spec:
                segs.append({"insert": spec})
            pos = m.end()
            continue
        if verb in ("wear", "dress", "put-on", "change-clothes", "outfit"):
            segs.append({"wear": (obj or "vice").strip()[:30]})  # {wear:vice} / {wear:jacket}: new clothes from now on
            pos = m.end()
            continue
        if not obj and verb in TONE_TAGS:
            segs.append({"tone": TONE_TAGS[verb]})  # {whisper}: the whole line is whispered
            pos = m.end()
            continue
        if (verb not in ACTIONS and verb not in WORLD_ACTS and verb not in MORPH_VERBS and not _species_word(verb)
                and not _custom_of(verb) and verb not in WORLD_ALIASES and not verb.startswith("show")
                and verb not in ("closeup", "close-up", "close", "wide", "zoom-in", "zoom-out", "camera", "become", "turn")):
            near = _nearest_tag(verb)
            if near:
                if obj and near in WORLD_ACTS:
                    name = near + ":" + obj
                else:
                    obj = ""
                    name = near
                verb = near
        if not obj and verb not in ACTIONS and verb not in WORLD_ACTS and verb not in MORPH_VERBS and _species_word(verb):
            verb, obj = "become", _species_word(verb)  # "{frog}" = the speaker turns into a frog
        if verb in MORPH_VERBS and obj and (":" in obj or verb != "turn"):
            who, _, form = obj.rpartition(":")
            segs.append({"morph": re.sub(r"^(?:into|a|an)\s+", "", form.strip())[:30], "who": who.strip()[:30]})
            pos = m.end()
            continue
        obj = obj.replace(":", " ")
        if obj or verb not in ACTIONS:
            verb = "fish" if verb == "catch" and "fish" in obj else "pick" if verb == "catch" else WORLD_ALIASES.get(verb, verb)
        if verb in ("closeup", "close-up", "close", "wide", "zoom-in", "zoom-out", "camera"):
            # camera: {closeup:Teddy} (close on Teddy's face), {closeup} (the speaker), {wide} (everyone / the place)
            kind = "wide" if verb in ("wide", "zoom-out") or obj in ("wide", "all", "everyone") else "close"
            segs.append({"cam": kind, "who": "" if obj in ("wide", "all", "everyone", "close") else obj[:30]})
            pos = m.end()
            continue
        cust = _custom_of(verb) if verb not in WORLD_ACTS and verb not in ACTIONS else ""
        if verb in WORLD_ACTS and (obj or verb not in ACTIONS):
            # {climb:mango tree}: done for real in the 3D world
            segs.append({"wact": verb, "obj": obj[:40]})
        elif cust:
            # {weld:track}: one of your own (or the ready-made) actions
            segs.append({"wact": cust, "obj": (obj or str(custom_actions()[cust].get("thing") or ""))[:40], "custom": True})
        elif name in ACTIONS and not name.startswith("w-"):
            segs.append({"act": name})
        elif name.startswith("show"):
            # {show:cat} — the cat comes into the scene right here.
            thing = name.split(":", 1)[1].strip() if ":" in name else ""
            if thing:
                segs.append({"show": thing[:40]})
        elif verb not in ("become", "turn") and not verb.startswith("w-"):
            # never skipped silently: the review lists it until you make / change / skip it
            segs.append({"unknown": verb[:30], "obj": obj[:40]})
        pos = m.end()
    rest = raw_text[pos:].strip()
    if re.search(r"\w", rest):
        segs.append({"say": rest})
    seen_acts: set = set()
    out = []
    for seg in segs:  # "{angry} … {shamp→angry}": the same act once per line
        if seg.get("act"):
            if seg["act"] in seen_acts:
                continue
            seen_acts.add(seg["act"])
        out.append(seg)
    return out


def skipped_tags(story: list[dict]) -> list[str]:
    """Tags nothing could be matched to (shown to you, never hidden)."""
    out: list[str] = []
    for sc in story:
        for ln in sc.get("lines", []):
            for seg in ln.get("segments", []):
                if seg.get("unknown") and seg["unknown"] not in out:
                    out.append(seg["unknown"])
    return out


def _acting_rules(story: str = "") -> str:
    return (
        "Make the characters ACT, not just talk: put actions in curly braces inside a line, exactly "
        "where they happen, e.g. \"Deal. Chapter one… {turn-page} {sniff} Wait, is that samosa?\" or "
        "\"{idea} I have a genius plan!\". Use 1-2 actions in most lines. Actions: "
        + ", ".join("{" + a + "}" for a in ACTION_NAMES if not a.startswith("w-")) + ". "
        "STORY SENSE: a viewer with the sound off must understand the story from the pictures. The first "
        "lines say who wants what; every scene moves that story forward; the end pays it off. SHOW, DON'T "
        "TELL: every important event HAPPENS on screen with an action at that moment, never only talked "
        "about — magic that changes someone: {turn:Name:frog} (they stay a frog, and still talk, until "
        "{turn:Name:back}); changing yourself: {become:frog}; leaving: {walk-out}; falling: {fall}. Right "
        "after a big event the others react ({gasp}, {shock}, {aah}). EVERY physical event is a tag too: "
        "{ride:motorcycle}, {drive:car}, {weld:track}, {fix:door}, {break:window}, {broken:track} (already broken), "
        "{explode:car}, {crash:train}, {cook:pan}, {dig:ground}, {paint:wall}, {build:hut} — any other event also as "
        "{verb:thing}. Mark at most 2-3 key words of the whole "
        "story with *stars* (they pop up). " + STRICT_RULE + _world_rules(story)
    )


def _world_rules(story: str = "") -> str:
    """The 3D world: characters really use the things around them."""
    try:
        import tools_worlds
        mine = tools_worlds.prompt_lines(story)
    except Exception:  # noqa: BLE001
        mine = ""
    return (
        "In outdoor scenes the characters can USE the world (the tool builds it in 3D): write {verb:thing} "
        "where it happens, e.g. \"{climb:mango tree} I can see the river from here!\", \"{pick:mango} "
        "{eat:mango} Yummy!\", \"{swim:river} Come in, the water is cool!\". Verbs: "
        + ", ".join("{" + v + (":thing" if v not in ("climb-down", "stand-up", "return", "exit") else "") + "}"
                    for v in WORLD_ACTS)
        + ". The thing can be anything that belongs there (tree, mango, river, fish, rock, log, hut, door, "
        "campfire, ball, stone, bush, bridge, boat…). Use 1-3 of them per outdoor scene. " + mine
    )


def _world_exact(text: str, world: dict) -> bool:
    try:
        import tools_worlds
        return tools_worlds.world_score(text, world) >= 100
    except Exception:  # noqa: BLE001
        return False


def _world_for(text: str) -> dict | None:
    try:
        import tools_worlds
        return tools_worlds.find_world(text)
    except Exception:  # noqa: BLE001
        return None


# ---------------------------------------------------------------- jobs
def _now() -> str:
    return datetime.datetime.now().isoformat(timespec="seconds")


def _job_dir(job_id: str) -> Path:
    if not _ID_RE.match(job_id or ""):
        raise HTTPException(404, "Video job not found.")
    return ANIM_DIR / job_id


def _read_json(path: Path, default):
    for _ in range(5):
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return default
        except (OSError, ValueError):
            time.sleep(0.1)  # being rewritten right now
    return default


def _write_json(path: Path, data) -> None:
    tmp = path.with_name(f"{path.stem}.{threading.get_ident()}.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    for _ in range(20):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:  # Windows: briefly open by a reader
            time.sleep(0.05)
    tmp.unlink(missing_ok=True)


def _read_job(job_id: str) -> dict:
    job = _read_json(_job_dir(job_id) / "job.json", None)
    if not job:
        raise HTTPException(404, "Video job not found.")
    return job


def _update(job: dict, **fields) -> None:
    job.update(fields)
    _write_json(ANIM_DIR / job["id"] / "job.json", job)


def _run_ffmpeg(args: list[str], cwd: Path | None = None, timeout: int = 600) -> None:
    proc = subprocess.run(["ffmpeg", "-y", *args], cwd=str(cwd) if cwd else None,
                          capture_output=True, text=True, timeout=timeout,
                          **no_window_kwargs())
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {proc.stderr[-600:]}")


# ---------------------------------------------------------- characters
def _load_characters(ids: list[str]) -> list[dict]:
    chars = []
    for cid in ids:
        if not _ID_RE.match(cid or ""):
            continue
        data = _read_json(CHAR_DIR / f"{cid}.json", None)
        if data:
            chars.append(data)
    return chars


# --------------------------------------------------------------- story
def _http_get(url: str, timeout: int = 120) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _ask_ai(prompt: str, timeout: int = 150, attempts: int = 4) -> str:
    """The story writer's AI: your Gemini key first (best, long prompts OK), then the
    free Pollinations AI by POST (long prompts OK), then the old short GET way."""
    key = str(_AI.get("gemini_key") or "")
    if key and _gemini_ready(key):
        try:
            return _gemini_only(prompt, key)
        except Exception:  # noqa: BLE001 — the status box shows why; the free AI answers meanwhile
            if _AI.get("gemini_only"):
                raise
    elif key and _AI.get("gemini_only"):
        raise RuntimeError(_AI_STATUS["gemini_error"] or "Gemini is paused for a moment")
    if len(prompt) > 1800:
        try:
            out = _pollinations_post(prompt)
            _free_ok()
            return out
        except Exception as exc:  # noqa: BLE001
            _AI["last_error"] = f"{type(exc).__name__}: {str(exc)[-200:]}"
            _AI_STATUS["free_error"] = _AI["last_error"][:160]
    out = _ask_ai_get(_shorten_prompt(prompt), timeout, attempts)
    _free_ok()
    return out


def _pollinations_post(prompt: str) -> str:
    """The free AI by POST (long prompts) — two addresses, the newer one first."""
    errs = []
    for url, body in (("https://text.pollinations.ai/", {"messages": [{"role": "user", "content": prompt}], "model": "openai"}),
                      ("https://text.pollinations.ai/openai", {"model": "openai", "messages": [{"role": "user", "content": prompt}]})):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                         headers={"Content-Type": "application/json", "User-Agent": "YTGuru/1.0"})
            with urllib.request.urlopen(req, timeout=150) as res:
                raw = res.read().decode("utf-8", "ignore")
            try:
                data = json.loads(raw)
                if isinstance(data, dict) and data.get("choices"):
                    return str(data["choices"][0]["message"]["content"])
            except ValueError:
                pass
            if raw.strip():
                return raw
        except Exception as exc:  # noqa: BLE001
            errs.append(f"{url}: {str(exc)[:80]}")
    raise RuntimeError(" | ".join(errs))


def _shorten_prompt(prompt: str, limit: int = 3800) -> str:
    """The old GET way has a short limit: swap the long list for the short one, then cut."""
    if len(prompt) <= limit:
        return prompt
    long_caps = capabilities_text()
    if long_caps in prompt:
        prompt = prompt.replace(long_caps, capabilities_short())
    return prompt[:limit]


def _ask_ai_get(prompt: str, timeout: int = 150, attempts: int = 4) -> str:
    """One Pollinations text request, spaced >= AI_GAP seconds from the
    previous one, retried with growing waits (429 / busy / timeout)."""
    url = "https://text.pollinations.ai/" + urllib.parse.quote(prompt) + "?json=true&model=openai"
    last: Exception | None = None
    for attempt in range(attempts):
        with _AI_LOCK:
            wait = _AI["last"] + AI_GAP - time.time()
            if wait > 0:
                time.sleep(wait)
            try:
                return _http_get(url, timeout=timeout).decode("utf-8", "ignore")
            except Exception as exc:  # noqa: BLE001
                last = exc
                _AI["last_error"] = f"{type(exc).__name__}: {str(exc)[-200:]}"
            finally:
                _AI["last"] = time.time()
        if attempt < attempts - 1:
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Free AI not reachable: {_AI['last_error']}") from last


def _extract_json(raw: str):
    """First JSON object/array in an AI reply (it may add prose or ``` fences)."""
    raw = re.sub(r"```(?:json)?", "", raw)
    for opener, closer in (("{", "}"), ("[", "]")):
        start = raw.find(opener)
        end = raw.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(raw[start:end + 1])
            except ValueError:
                continue
    return None


def _scene_count(minutes: float) -> int:
    return max(2, min(14, round(minutes * 2.5)))


def _guess_place(text: str, index: int = 0) -> str:
    """Map a free-text location ("a busy bazaar", "inside the bus", "a haunted
    castle") to a drawn place. Unknown places become "custom": drawn from
    their own words plus pictures of things that belong there."""
    low = f" {str(text).lower()} "
    if low.strip() in PLACES:
        return low.strip()
    for place, pattern in PLACE_PATTERNS:
        if re.search(pattern, low):
            return place
    for place, words in PLACE_WORDS.items():
        if any(w in low for w in words):
            return place
    return "custom" if re.search(r"[a-z]{3,}", low) else ["street", "park", "home"][index % 3]


_INDOOR_WORDS = r"room|house|home|hall|office|shop|store|castle|palace|museum|hotel|lab|factory|bank|school|kitchen|inside|church|mosque|temple|bakery|salon|studio|garage|basement|attic"


def _custom_decor(location: str, seed: int) -> tuple[bool, list[dict]]:
    """(outdoor?, pictures) for a place the tool does not draw itself:
    the place's own words looked up in the Asset Library (a castle gets a
    castle, a haunted house gets a ghost…)."""
    import random
    rng = random.Random(seed)
    low = location.lower()
    outdoor = not re.search(_INDOOR_WORDS, low)
    words = [w for w in re.findall(r"[a-z]{3,}", low) if w not in ("the", "and", "with", "inside", "near", "big", "small", "old", "new")]
    found: list[dict] = []
    seen: set[str] = set()
    for w in words:
        a = _asset_for(w, strong=False)
        if a and a["src"] not in seen:
            seen.add(a["src"])
            found.append(a)
    decor = []
    spots = [0.1, 0.9, 0.25, 0.75, 0.5]
    for i, a in enumerate(found[:4]):
        big = i == 0  # the place itself, big in the back
        decor.append({"src": a["src"], "x": spots[i] if not big else rng.choice([0.12, 0.88]),
                      "y": 0.58 if big else 0.8, "size": 0.42 if big else 0.16})
    return outdoor, decor


# Places the 3D tool builds in detail from ready-made models (frontend world/blueprints.ts)
DETAILED_PLACES = ("city street, neighbourhood, airport, airport terminal (inside), inside a plane / train / bus, railway station, "
                   "railroad by a deep canyon, park, forest camp, beach / harbour, farm, graveyard, castle, space base, desert, "
                   "construction site, bedroom, living room, kitchen, bathroom, classroom, office, restaurant / café, "
                   "shop / supermarket, library, hospital, jungle, waterfall, river, village, mountains, snow")


# What each ready-made place really has (world/blueprints.ts) — the writer uses ONLY these
PLACE_THINGS = {
    "city street": "shops and tall buildings, cars and taxis driving by, traffic lights, street lights, benches, parasols, people walking",
    "neighbourhood": "houses with gardens and fences, a road with cars, street lights, trees",
    "airport": "terminal building, parked airplanes at gates, a plane on the runway, control tower, baggage trucks, cones",
    "airport terminal (inside)": "check-in counters, departure boards, rows of seats, travellers, suitcases",
    "inside a plane / train / bus": "rows of seats, windows with the outside moving",
    "railway station": "platform, rail track, a train that arrives with passengers in the windows, station building with a clock, benches, lamps",
    "railroad by a deep canyon": "a railroad on the edge of a very deep canyon with a river far below, a rail bridge across it, a passing train",
    "park": "trees, a pond, stone paths, benches, a statue, people, dogs and cats",
    "forest camp": "pine trees, tents, a campfire, logs to sit on, a river, rocks, mushrooms",
    "beach / harbour": "sea, palm trees, a wooden dock, a pirate ship, a rowing boat, treasure chest, barrels, crabs, parrots",
    "farm": "red barn, crop fields, fences, cows, pigs, chicks, a horse, a tractor, hay bales",
    "graveyard (night)": "graves, a crypt, iron fence, pumpkins, lanterns, pine trees",
    "castle": "castle walls, towers, a gate, banners, catapults",
    "space base": "a rocket, hangars, satellite dishes, a rover, astronauts, an alien, craters",
    "desert": "cactus, tall rocks, sand",
    "construction site": "cones, barriers, trucks, a building being built",
    "bedroom": "bed, desk, bookcase, teddy bear, rug, lamp", "living room": "sofa, TV, coffee table, bookcase, plants",
    "kitchen": "fridge, stove, sink, cupboards, microwave, dining table with food", "bathroom": "bathtub, toilet, sink, mirror, shower",
    "classroom": "blackboard, teacher's desk, school desks", "office": "desks with computers, office chairs, bookcases, coffee machine",
    "restaurant / café": "counter, round tables with chairs and food (pizza, burgers, cake…)", "shop / supermarket": "shelves with food, counter",
    "library": "bookshelves, reading tables", "hospital": "beds, side tables, a wheelchair",
    "jungle / forest": "mango / apple / banana trees with fruit, big trees to climb, bushes to hide, a river with fish, logs, rocks, monkeys, birds",
    "waterfall / river": "a waterfall, a river or pond with fish, rocks, a boat, a bridge",
    "village": "huts, a well, trees with fruit, a river, a boat, a campfire, animals",
    "mountains / snow": "hills, pine trees, snow, rocks, a campfire, a tent",
}
STRICT_RULE = ("VERY IMPORTANT — the app can only show what it HAS. Build the whole story ONLY from the places, things "
               "and actions listed here; never write an event, thing or place that is not in these lists (it would not "
               "appear in the video). ")


def capabilities_text(story: str = "") -> str:
    """Everything the animation app can really show — so the story fits it (user, 2026-11-18)."""
    places = "; ".join(f"{k}: {v}" for k, v in PLACE_THINGS.items())
    acts = ", ".join("{" + a + "}" for a in ACTION_NAMES if not a.startswith("w-"))
    wacts = ", ".join("{" + v + ":thing}" for v in WORLD_ACTS)
    custom = ", ".join("{" + k + ":" + str(a.get("thing") or "thing") + "}" for k, a in custom_actions().items())
    mine = ""
    try:
        import tools_worlds
        mine = tools_worlds.prompt_lines(story)
    except Exception:  # noqa: BLE001
        pass
    return (STRICT_RULE + f"PLACES and what is in them: {places}. "
            f"Body / face actions: {acts}. Things done in the world: {wacts} (with a thing that is in that place). "
            f"Story actions: {custom} (ride a motorcycle / bicycle, drive a car, weld or fix something, something "
            "breaks / is already broken, explodes, crashes, cooking, digging, painting, building). "
            "Magic: {turn:Name:frog} turns someone into an animal (cat, dog, frog, monkey, lion, pig, chicken, fish…) "
            "until {turn:Name:back}. Animals that can appear or talk: cat, dog, monkey, lion, tiger, elephant, cow, pig, "
            "horse, rabbit, frog, duck, chicken, parrot, fish, crab, bear, fox, deer, penguin, giraffe. "
            "Camera: {closeup:Name}, {wide}. " + _pack_caps() + (mine or ""))


def _pack_caps() -> str:
    """Clothes, screens and add-on pack things (2026-11-19)."""
    extra = ""
    try:
        import tools_planner
        p = tools_planner.pack()
        extra = ", ".join("{wear:" + k + "}" for k in (p.get("outfits") or {}))
        if p.get("aliases"):
            extra += (", " if extra else "") + ", ".join("{" + k + "}" for k in p["aliases"])
    except Exception:  # noqa: BLE001
        pass
    return ("Clothes: {wear:vice} (loud shirt + shades), {wear:jacket}, {wear:suit}, {wear:police}, {wear:normal}"
            + (", " + extra if extra else "") + ". A TV / computer / phone screen shows text: {screen:BREAKING NEWS}. "
            "Motion-graphic panels (a small animated graphic over the film for a few seconds — use about one per minute, at "
            "funny or important moments): {meter:Teddy's patience:90>2}, {map:beach>airport>jungle}, {countdown:3}, "
            "{chat:Mom:Where are you?}, {stars:3} (wanted level), {money:Rs 80000>5000}, {counter:Views:0>1000000}, "
            "{pile:coin} (things pile up), {topple:books} (a stack falls), {scatter:money} (flies apart), "
            "{compare:Spending=9, Saving=2}, {steps:Plan>Steal>Run}, {stamp:BUSTED}, {chapter:Part 2 — The Heist}. ")


def capabilities_short() -> str:
    """The same list, short (for the free AI's short way)."""
    return (STRICT_RULE + "PLACES: " + ", ".join(PLACE_THINGS) + ". STORY ACTIONS: ride a motorcycle/bicycle, drive a car, weld, "
            "fix, break, explode, crash, cook, dig, paint, build, climb trees, pick and eat fruit, swim, fish, light a campfire, "
            "kick a ball, enter a hut / building, hide, sit, magic that turns someone into an animal and back, animals appear and talk, "
            "a train arrives at a station, cars drive by, planes at an airport.")


def _place_rules(story: str = "") -> str:
    return (capabilities_text(story) + ' Use SEVERAL different places: when the story moves, the scene moves (a new place for most scenes, each '
            f'one fitting that moment). Places built in full detail: {DETAILED_PLACES}. '
            '"place" is where the scene happens, in a few words — ANY place: a jungle, a cave, inside a bus, '
            f'a haunted castle… (these look best: {", ".join(p for p in PLACES if p != "custom")}). '
            '"sitting" is true when the characters sit (bench, sofa, chairs, bed), else false. '
            '"holding" says what a character holds the whole scene: "book" (studying/reading), '
            '"phone", or leave it out. "time_skip" is a short card shown BEFORE the scene when '
            'time passes, e.g. "Two hours later…", else empty. ' + _acting_rules(story))


def _full_story(title: str, names: list[str], count: int, words: int, language: str) -> list[dict]:
    """Short videos: the whole story in ONE request (the free API allows
    about one request per 15 seconds, so fewer calls = faster + safer)."""
    lang_rule = ("Write every dialogue line in Urdu script (اردو)." if language == "ur"
                 else "Write every dialogue line in simple English.")
    prompt = (
        f'Write a short, funny animated cartoon story for YouTube titled "{title}". '
        f"The only characters are: {', '.join(names)}. Exactly {count} scenes, about {words} words "
        f"of dialogue in total, short lines (max 20 words each), with a clear setup, a twist and a "
        f"funny ending, like a viral cartoon short. {lang_rule} {_place_rules(title)} "
        'Reply with ONLY JSON: {"scenes":[{"place":"...","sitting":false,"time_skip":"",'
        '"holding":{"name":"book"},'
        '"location":"short place description","characters":["names in this scene"],'
        '"lines":[{"speaker":"name","text":"what they say, with {actions} inside",'
        f'"expression":"one of {"|".join(EXPRESSIONS)}","pose":"one of {"|".join(POSES)}",'
        f'"tone":"empty, or how it is said: {"|".join(TONES)}",'
        f'"sfx":"empty, or a funny sound effect for this moment: one of {"|".join(SFX_NAMES)}"}}]}}]}}'
    )
    data = _extract_json(_ask_ai(prompt))
    scenes = data.get("scenes") if isinstance(data, dict) else data
    return [s for s in scenes if isinstance(s, dict)] if isinstance(scenes, list) else []


def _outline(title: str, names: list[str], count: int) -> list[dict]:
    prompt = (
        f'Plan a funny animated cartoon story titled "{title}" for YouTube. '
        f"The only characters are: {', '.join(names)}. Split it into exactly {count} scenes "
        f"with a clear beginning, twists and a funny ending. {_place_rules(title)} "
        'Reply with ONLY JSON: {"scenes":[{"place":"...","sitting":false,"time_skip":"",'
        '"holding":{"name":"book"},'
        '"location":"short place description","characters":["names in this scene"],'
        '"summary":"what happens in one sentence"}]}'
    )
    data = _extract_json(_ask_ai(prompt))
    scenes = data.get("scenes") if isinstance(data, dict) else data
    return [s for s in scenes if isinstance(s, dict)][:count] if isinstance(scenes, list) else []


def _batch_lines(title: str, names: list[str], batch: list[tuple[int, dict]], total: int,
                 story_so_far: str, words: int, language: str) -> dict[int, list[dict]]:
    """Dialogue for up to 3 scenes in one request (long videos)."""
    lang_rule = ("Write every line in Urdu script (اردو)." if language == "ur"
                 else "Write every line in simple English.")
    wanted = " ".join(
        f"Scene {i + 1}: at {s.get('location', '')}; {s.get('summary', '')}; "
        f"characters: {', '.join(s.get('characters') or names)}." for i, s in batch)
    prompt = (
        f'Write the dialogue of these scenes (of {total}) of the funny animated cartoon story '
        f'"{title}". Story so far: {story_so_far or "this is the beginning"}. {wanted} '
        f"About {words} words per scene, short lines (max 20 words each), natural and funny. {lang_rule} "
        f"{_acting_rules(title)}"
        'Reply with ONLY JSON: {"scenes":[{"scene":1,"lines":[{"speaker":"name","text":"... with {actions}",'
        f'"expression":"one of {"|".join(EXPRESSIONS)}","pose":"one of {"|".join(POSES)}",'
        f'"tone":"empty, or how it is said: {"|".join(TONES)}",'
        f'"sfx":"empty, or a funny sound effect: one of {"|".join(SFX_NAMES)}"}}]}}]}}'
    )
    data = _extract_json(_ask_ai(prompt))
    out: dict[int, list[dict]] = {}
    scenes = data.get("scenes") if isinstance(data, dict) else data
    if not isinstance(scenes, list):
        return out
    for pos, item in enumerate(scenes):
        if not isinstance(item, dict):
            continue
        try:
            idx = int(item.get("scene")) - 1
        except (TypeError, ValueError):
            idx = batch[pos][0] if pos < len(batch) else -1
        lines = [l for l in item.get("lines") or [] if isinstance(l, dict)]
        if idx >= 0 and lines:
            out[idx] = lines
    return out


# ------------------------------------------------- automatic characters
# (user, 2026-11-16: "the system must build the characters the story
# needs"). A speaker who is not one of your saved characters — the
# Teacher, Mom, a talking Monkey — is created on the spot: animals get
# an animal body, people a stickman with a look and voice that fit.
SPECIES_WORDS = {
    "cat", "kitten", "kitty", "billi", "dog", "puppy", "kutta", "lion", "sher", "tiger", "leopard", "cheetah",
    "elephant", "haathi", "monkey", "bandar", "gorilla", "ape", "bear", "panda", "penguin", "crocodile", "croc",
    "alligator", "snake", "cobra", "python", "parrot", "tota", "bird", "sparrow", "crow", "pigeon", "eagle", "owl",
    "duck", "chicken", "hen", "rooster", "chick", "horse", "pony", "donkey", "zebra", "cow", "bull", "buffalo", "goat",
    "sheep", "lamb", "pig", "rabbit", "bunny", "mouse", "rat", "fox", "wolf", "deer", "giraffe", "camel", "kangaroo",
    "squirrel", "frog", "turtle", "tortoise", "dinosaur", "dino", "fish", "shark", "dolphin", "whale", "hippo", "rhino",
}
_FEMALE = (r"\b(mom|mommy|mummy|mother|ammi|amma|maa|sister|sis|aunt|aunty|auntie|madam|miss|mrs|ms|lady|girl|"
           r"queen|princess|wife|grandma|granny|nani|dadi|baji|aapa|she|daughter|bride|woman|nurse)\b")


def _species_word(name: str) -> str:
    for w in re.findall(r"[a-z]+", name.lower()):
        if w in SPECIES_WORDS:
            return w
        if w.endswith("s") and w[:-1] in SPECIES_WORDS:
            return w[:-1]
    return ""


def _auto_char(name: str) -> dict:
    """A character the script needs but you did not make."""
    import hashlib
    clean = re.sub(r"\s+", " ", name).strip()[:40]
    slug = re.sub(r"[^a-z0-9]+", "-", clean.lower()).strip("-")[:30] or "extra"
    h = int(hashlib.md5(clean.lower().encode()).hexdigest()[:6], 16)
    species = _species_word(clean)
    female = bool(re.search(_FEMALE, clean.lower()))
    if species:
        small = species in {"cat", "kitten", "kitty", "billi", "mouse", "rat", "bird", "sparrow", "parrot", "tota", "chick",
                            "rabbit", "bunny", "squirrel", "frog", "duck", "chicken", "hen", "puppy", "fish", "penguin"}
        voice_id = "en-US-AriaNeural" if (small or female) else ("en-US-ChristopherNeural" if h % 2 else "en-US-GuyNeural")
    else:
        voice_id = (["en-US-AriaNeural", "en-GB-SoniaNeural"] if female
                    else ["en-US-GuyNeural", "en-GB-RyanNeural", "en-US-ChristopherNeural"])[h % (2 if female else 3)]
    return {"id": f"auto-{slug}", "name": clean, "auto": True, "species": species, "female": female, "config": {},
            "voice": {"type": "edge", "id": voice_id, "label": "Female" if (female or voice_id == "en-US-AriaNeural") else "Male"}}


def _job_characters(job: dict) -> list[dict]:
    """Your selected characters + the ones the story created."""
    return _load_characters(job["character_ids"]) + [dict(c) for c in job.get("auto_chars") or []]



# ---- nothing is skipped silently (user, 2026-11-18) -------------------------
# Story-event words. If a line SAYS one and the app has an action for it, the
# tag is added to the line (you see it in the review); if the app has none,
# the review lists it and the video waits until you make it / change it / skip it.
_EVENT_WORDS = {
    "fly": ["fly", "flying", "flew"], "melt": ["melt", "melting", "melted"], "freeze": ["freeze", "froze", "frozen"],
    "burn": ["burn", "burning", "burnt", "on fire"], "sink": ["sink", "sinking", "sank"], "shrink": ["shrink", "shrinking"],
    "grow": ["grow", "growing", "grew"], "float": ["float", "floating"], "teleport": ["teleport", "vanish", "vanished", "disappear", "disappeared"],
    "cheer": ["cheer", "cheering"], "shoot": ["shoot", "shooting"],
}
_OBJ_WORDS = ("track", "rail", "railway", "door", "car", "bike", "motorcycle", "motorbike", "cycle", "bicycle", "horse", "wall", "bridge",
              "pipe", "roof", "fence", "train", "wheel", "engine", "boat", "house", "pan", "pot", "road", "window", "machine", "robot",
              "rocket", "plane", "bus", "truck", "tree", "box", "table", "chair", "bench", "signal", "pole", "lamp")


def _guess_obj(texts: list[str], fallback: str) -> str:
    for t in texts:
        for w in re.findall(r"[a-z]+", t.lower().replace("*", "")):
            w1 = w[:-1] if w.endswith("s") and w[:-1] in _OBJ_WORDS else w
            if w1 in _OBJ_WORDS:
                return w1
    return fallback


def _doctor_events(story: list[dict]) -> None:
    """Said-only events get their action tag when the app has one."""
    acts = custom_actions()
    for sc in story:
        for li, ln in enumerate(sc["lines"]):
            low = " " + ln["text"].lower().replace("*", "") + " "
            have = {seg.get("wact") for seg in ln["segments"] if seg.get("wact")} | {seg.get("unknown") for seg in ln["segments"] if seg.get("unknown")}
            for name, a in acts.items():
                if name in have or not a.get("words"):
                    continue
                if any(re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", low) for w in a["words"] + [name]):
                    if name == "break" and "broken" in have:
                        continue
                    prev = [x["text"] for x in sc["lines"][max(0, li - 2):li]][::-1]
                    # the thing right after the verb ("weld the track"), or — for "it / this" — the one talked about before
                    w0 = next((w for w in a["words"] + [name] if re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", low)), name)
                    after = low.split(w0, 1)[1] if w0 in low else ""
                    nxt = re.findall(r"[a-z]+", after)[:3]
                    if nxt and nxt[0] in ("it", "this", "that", "them", "these"):
                        obj = _guess_obj(prev + [ln["text"]], str(a.get("thing") or ""))
                    else:
                        obj = _guess_obj([after] + prev + [ln["text"]], str(a.get("thing") or ""))
                    tag = "{" + name + (":" + obj if obj else "") + "}"
                    seg = {"wact": name, "obj": obj, "custom": True}
                    if a.get("atStart"):  # a state ("the track is broken"): already so when the line starts
                        ln["text"] = (tag + " " + ln["text"])[:400]
                        ln["segments"].insert(0, seg)
                    else:  # an action: said first ("we must weld it!"), then done
                        ln["text"] = (ln["text"] + " " + tag)[:400]
                        ln["segments"].append(seg)
                    ln.setdefault("added", []).append(tag)
                    have.add(name)


def missing_actions(story: list[dict], ignored: list[str] | None = None) -> list[dict]:
    """What the script needs that the app cannot show yet (the review asks you)."""
    ign = set(ignored or [])
    out: dict[str, dict] = {}
    for si, sc in enumerate(story):
        for li, ln in enumerate(sc["lines"]):
            low = " " + ln["text"].lower().replace("*", "") + " "
            for seg in ln["segments"]:
                if seg.get("unknown") and seg["unknown"] not in ign:
                    e = out.setdefault(seg["unknown"], {"verb": seg["unknown"], "obj": seg.get("obj", ""), "kind": "unknown", "lines": []})
                    e["lines"].append([si, li, ln["text"][:120]])
            tagged = {seg.get("wact") or seg.get("act") or seg.get("unknown") for seg in ln["segments"]}
            for verb, words in _EVENT_WORDS.items():
                if verb in ign or verb in tagged or _custom_of(verb):
                    continue
                if any(re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", low) for w in words):
                    e = out.setdefault(verb, {"verb": verb, "obj": _guess_obj([ln["text"]], ""), "kind": "said", "lines": []})
                    e["lines"].append([si, li, ln["text"][:120]])
    return list(out.values())


def added_tags(story: list[dict]) -> list[dict]:
    return [{"tag": t, "line": [si, li], "text": ln["text"][:120]}
            for si, sc in enumerate(story) for li, ln in enumerate(sc["lines"]) for t in ln.get("added", [])]


# Plain words that MEAN a transformation (user, 2026-11-18: "You turned into a
# frog!" was in the script but nobody became a frog). Only when the script
# itself has no {turn:…} at all.
_MORPH_SAID = [
    re.compile(r"\b(?P<who>[a-z]+)\s+(?:has\s+|have\s+|just\s+)?(?:turned|changed|transformed|became|become)\s+(?:into\s+)?(?:a|an)\s+(?P<form>[a-z]+)"),
    re.compile(r"\b(?:turn(?:ed|s)?|chang(?:ed|es)|transform(?:ed|s)?)\s+(?P<who>[a-z]+)\s+into\s+(?:a|an)\s+(?P<form>[a-z]+)"),
    re.compile(r"\b(?P<who>i'm|i am|you're|you are|he's|he is|she's|she is|[a-z]+ is)\s+(?:now\s+|still\s+)?(?:a|an)\s+(?P<form>[a-z]+)(?:\s+now)?\b"),
]
_MORPH_BACK = re.compile(r"\b(back to normal|(?:myself|me) again|turned (?:you |me |her |him )?back|i'm me again|normal again|i'm human again|i am human again)\b")


def _doctor_story(story: list[dict], chars: list[dict]) -> None:
    if any(seg.get("morph") for sc in story for ln in sc["lines"] for seg in ln["segments"]):
        return
    names = {c["id"]: c["name"] for c in chars}
    by_name = {c["name"].lower(): c["id"] for c in chars}
    formed: dict[str, str] = {}
    prev_speaker: str | None = None
    last_line: dict | None = None
    for sc in story:
        for li, ln in enumerate(sc["lines"]):
            low = ln["text"].lower().replace("*", "")
            spk = ln["speaker"]
            others = [c for c in sc["characters"] if c != spk]
            if formed and _MORPH_BACK.search(low) and not re.search(r"\b(if|will|can|could|when|until|unless|maybe)\b", low):
                cid = spk if spk in formed else next(iter(formed))
                ln["segments"].insert(0, {"morph": "back", "who": names.get(cid, cid)})
                formed.pop(cid, None)
                prev_speaker = spk
                last_line = ln
                continue
            for rx in _MORPH_SAID:
                m = rx.search(low)
                if not m:
                    continue
                form = _species_word(m.group("form")) or (m.group("form") if m.group("form") in ("statue", "stone", "monster", "ghost", "robot", "zombie") else "")
                if not form:
                    continue
                w = m.group("who").replace("'m", "").replace("'re", "").replace("'s", "").replace(" is", "").replace(" am", "").replace(" are", "").strip()
                if w in ("i",):
                    cid = spk
                elif w in ("you", "he", "she"):
                    cid = prev_speaker if prev_speaker and prev_speaker != spk else (others[0] if others else None)
                else:
                    cid = by_name.get(w)
                if not cid or cid in formed:
                    continue
                formed[cid] = form
                seg = {"morph": form, "who": names.get(cid, cid)}
                # it happens just BEFORE the line that reveals it (the reaction comes right after)
                before = sc["lines"][li - 1] if li > 0 else last_line
                if before is not None:
                    before["segments"].append(seg)
                else:
                    ln["segments"].insert(0, seg)
                break
            prev_speaker = spk
            last_line = ln


def _normalize_story(scenes: list[dict], chars: list[dict]) -> list[dict]:
    """Map names -> character ids, clean places/expressions/poses, drop empty lines."""
    by_name = {c["name"].lower(): c["id"] for c in chars}
    ids = [c["id"] for c in chars]

    def resolve(name) -> str | None:
        key = str(name or "").strip().lower()
        if key in by_name:
            return by_name[key]
        if key in ids:
            return key
        for n, cid in by_name.items():  # "Inspector Khan" vs "Khan"
            if key and (key in n or n in key):
                return cid
        return None

    def resolve_or_create(name) -> str | None:
        cid = resolve(name)
        raw = str(name or "").strip()
        if cid or not re.search(r"[A-Za-z]{2,}", raw) or len(raw) > 40:
            return cid
        auto = _auto_char(raw)  # a new character the story needs
        chars.append(auto)
        by_name[auto["name"].lower()] = auto["id"]
        ids.append(auto["id"])
        return auto["id"]

    out = []
    for s_idx, raw in enumerate(scenes):
        lines = []
        for line in raw.get("lines") or []:
            text = re.sub(r"\s+", " ", str(line.get("text", ""))).strip().strip('"')
            if not text:
                continue
            speaker = resolve_or_create(line.get("speaker")) or ids[len(lines) % len(ids)]
            expr = str(line.get("expression", "normal")).lower()
            pose = str(line.get("pose", "idle")).lower()
            sfx = str(line.get("sfx") or "").lower().strip()
            sfx = sfx if sfx in SFX_NAMES else ""
            # AI sometimes writes (laughs) / *laughs* instead of {laugh}.
            text = re.sub(r"[\(\*]\s*(laughs?|giggles?|gasps?|cries|sniffs?|sighs?)\s*[\)\*]",
                          lambda m: "{" + {"laughs": "laugh", "giggles": "giggle", "gasps": "gasp",
                                           "cries": "cry", "sniffs": "sniff", "sighs": "sweat"}.get(
                              m.group(1).lower(), m.group(1).lower()) + "}", text, flags=re.I)
            segs = _auto_look(_segments(text))
            if sfx in VOCAL_SFX and not any(seg.get("act") == VOCAL_SFX[sfx] for seg in segs):
                # A laugh / gasp / cry is ACTED in the speaker's own voice.
                segs.append({"act": VOCAL_SFX[sfx]})
                sfx = ""
            if not segs:
                continue
            tone = str(line.get("tone") or "").lower().strip()
            tone = tone or next((seg["tone"] for seg in segs if seg.get("tone")), "")
            segs = [seg for seg in segs if not seg.get("tone")]
            if not segs:
                continue
            lines.append({
                "speaker": speaker, "text": text[:400],
                "expression": expr if expr in EXPRESSIONS else "normal",
                "pose": pose if pose in POSES else "idle",
                "sfx": sfx, "tone": tone if tone in TONES else "", "segments": segs,
            })
        if not lines:
            continue
        on_screen = [cid for cid in (resolve(n) for n in raw.get("characters") or []) if cid]
        for line in lines:  # every speaker must be on screen
            if line["speaker"] not in on_screen:
                on_screen.append(line["speaker"])
        location = str(raw.get("location", ""))[:120]
        place = str(raw.get("place", "")).lower().strip()
        blueprint = re.sub(r"[^a-z_]", "", str(raw.get("blueprint") or "").lower())[:40]
        # chosen in the review: a ready-made place wins over a saved world; "-" = no saved world
        chosen = str(raw.get("world") or "").strip()
        world = None if blueprint or chosen == "-" else (
            _world_for(chosen) if chosen else _world_for(f"{raw.get('place') or ''} {location}"))
        if place not in PLACES:
            place = _guess_place(f"{place} {location}", s_idx)
        if world and world.get("kind") in PLACES:
            place = world["kind"]  # your own 3D world (the 2D tool draws the closest place)
        sitting = raw.get("sitting")
        sitting = (sitting is True or str(sitting).lower() in ("true", "yes", "1")) and bool(SEATS.get(place))
        holding: dict[str, str] = {}
        raw_hold = raw.get("holding") or {}
        if isinstance(raw_hold, str):  # "book" = everyone holds a book
            raw_hold = {n: raw_hold for n in (raw.get("characters") or [])} or {"*": raw_hold}
        if isinstance(raw_hold, dict):
            for name, item in raw_hold.items():
                item = str(item or "").lower().strip().rstrip("s")
                targets = on_screen if name == "*" else [resolve(name)]
                for cid in targets:
                    if cid in on_screen and item in HOLD_ITEMS:
                        holding[cid] = item
        out.append({
            "place": place, "sitting": sitting, "location": location, "world": world["name"] if world else "",
            "blueprint": blueprint,
            "calm": bool(raw.get("calm")),
            # your world by its exact name / your own choice — else a ready-made place may fit better
            "world_exact": bool(world) and (bool(chosen) or _world_exact(f"{raw.get('place') or ''} {location}", world)),
            "time_skip": re.sub(r"\s+", " ", str(raw.get("time_skip") or "")).strip()[:60],
            "clock": str(raw.get("clock") or "") if raw.get("clock") in ("night", "day") else "",
            "holding": holding,
            "background": str(raw.get("background") or location or place)[:80],
            "characters": list(dict.fromkeys(on_screen))[:MAX_ON_SCREEN],
            "lines": lines,
        })
    out = _tidy_scenes(out)
    # {show:cookie} / {show:fish}: a small thing is SHOWN in the hand (or put
    # down by an animal), it does not walk in like a cat would (user, 2026-11-18:
    # a giant fish floated in the kitchen).
    animal_ids = {c["id"] for c in chars if c.get("species") or _species_word(str(c.get("name") or ""))}
    for sc in out:
        for ln in sc["lines"]:
            for k, seg in enumerate(ln["segments"]):
                if seg.get("show") and _small_thing(seg["show"]):
                    ln["segments"][k] = {"place": seg["show"]} if ln["speaker"] in animal_ids else {"hold": seg["show"]}
    _doctor_story(out, chars)
    _doctor_events(out)
    return out


_TIME_WORDS = re.compile(r"\b(later|minutes?|hours?|days?|weeks?|months?|years?|next|morning|noon|afternoon|evening|night|midnight|"
                         r"dawn|sunrise|sunset|tomorrow|yesterday|meanwhile|soon|after|before|ago|o'?clock|bedtime|lunch|dinner|breakfast)\b", re.I)
_CARD_PLACES = re.compile(r"\b(hall(?:way)?|kitchen|bedroom|bathroom|living room|garden|yard|street|road|park|school|classroom|house|"
                          r"home|shop|market|forest|jungle|beach|river|station|airport|office|city|village|farm|mountain|cave|"
                          r"neighbou?rhood|outside|inside|downstairs|upstairs|roof|basement|garage)\b", re.I)


_SMALL_RE = re.compile(r"\b(cookies?|cakes?|cupcakes?|fish|bones?|apples?|bananas?|mangoe?s?|oranges?|sandwich(?:es)?|burgers?|pizzas?|candy|candies|"
                       r"sweets?|chocolates?|bread|eggs?|milk|cups?|mugs?|bottles?|balls?|keys?|coins?|money|letters?|books?|phones?|flowers?|"
                       r"toys?|jars?|box(?:es)?|bags?|gifts?|presents?|rings?|maps?|notes?|tickets?|pillows?|sticks?|rocks?|stones?|crumbs?|"
                       r"snacks?|treats?|ice ?cream|lollipops?|donuts?|biscuits?|carrots?|cheese|samosas?|laddoos?|wand|torch|flashlight|"
                       r"umbrella|hat|glasses|card|paper|pencil|pen|brush|spoon|plate|bowl)\b", re.I)


def _small_thing(word: str) -> bool:
    return bool(_SMALL_RE.search(word or ""))


def _same_place(a: dict, b: dict) -> bool:
    la, lb = str(a.get("location") or "").lower().strip(), str(b.get("location") or "").lower().strip()
    return (bool(la) and la == lb and a.get("place") == b.get("place") and a.get("world") == b.get("world")
            and (a.get("clock") or "") == (b.get("clock") or ""))


def _tidy_scenes(scenes: list[dict]) -> list[dict]:
    """(user, 2026-11-18: 8 time cards in 2 minutes, some in the middle of
    one kitchen.) The same place again right away = one scene, no card —
    unless the time of day changes. A card is kept for a real jump in time,
    or for a new place when there have been a few lines since the last card;
    a card that names a different place than the scene is dropped."""
    out: list[dict] = []
    for sc in scenes:
        prev = out[-1] if out else None
        if prev and _same_place(prev, sc) and set(sc.get("characters") or []) <= set(prev.get("characters") or []) and not (_TIME_WORDS.search(sc.get("time_skip") or "") and
                                                   _clock_of(sc.get("time_skip") or "") not in ("", _clock_of(prev.get("time_skip") or "") or "x")):
            prev["lines"].extend(sc["lines"])
            for cid in sc.get("characters") or []:
                if cid not in prev["characters"] and len(prev["characters"]) < MAX_ON_SCREEN:
                    prev["characters"].append(cid)
            for cid, item in (sc.get("holding") or {}).items():
                prev.setdefault("holding", {}).setdefault(cid, item)
            continue
        if prev and _same_place(prev, sc):
            # still in the same room: whoever was there is still there
            for cid in prev.get("characters") or []:
                if cid not in sc["characters"] and len(sc["characters"]) < MAX_ON_SCREEN:
                    sc["characters"].append(cid)
        out.append(sc)
    since = 99
    for i, sc in enumerate(out):
        card = str(sc.get("time_skip") or "")
        if card and i > 0:
            names = {m.group(1).lower() for m in _CARD_PLACES.finditer(card)}
            here = (str(sc.get("location") or "") + " " + str(sc.get("place") or "")).lower()
            wrong = names and not any(n.split()[0][:5] in here for n in names)
            timely = bool(_TIME_WORDS.search(card))
            again = _same_place(out[i - 1], sc)  # same room, someone new walks in: a cut, no card
            if wrong or (not timely and (since < 4 or again)):
                sc["time_skip"] = ""
        if sc.get("time_skip"):
            since = 0
        since += len(sc.get("lines") or [])
    return out


def write_story(title: str, minutes: float, chars: list[dict], language: str,
                progress=None) -> tuple[list[dict], str]:
    names = [c["name"] for c in chars]
    count = _scene_count(minutes)
    total_words = int(minutes * WORDS_PER_MINUTE)
    try:
        if minutes <= 2:
            if progress:
                progress(0, 1)
            story = _normalize_story(_full_story(title, names, count, total_words, language), chars)
            if story:
                return story, "ai"
        outline = _outline(title, names, count)
        if not outline:
            raise RuntimeError("The AI returned no story outline.")
        per_scene = max(25, total_words // len(outline))
        lines_by_scene: dict[int, list[dict]] = {}
        indexed = list(enumerate(outline))
        for start in range(0, len(indexed), 3):
            if progress:
                progress(start, len(indexed))
            so_far = " ".join(str(s.get("summary", "")) for _, s in indexed[max(0, start - 3):start])
            lines_by_scene.update(_batch_lines(title, names, indexed[start:start + 3], len(indexed),
                                               so_far, per_scene, language))
        story = _normalize_story([{**s, "lines": lines_by_scene.get(i, [])} for i, s in indexed], chars)
        if story:
            return story, "ai"
    except Exception as exc:  # noqa: BLE001
        _AI["last_error"] = str(exc)[-300:]
    # No silent template story any more: the same canned story every
    # time was confusing (user, 2026-11-16). Say what failed instead.
    raise RuntimeError(
        f"The free story AI could not write this story ({_AI['last_error'] or 'empty answer'}). "
        "Try again in a minute — or press 📋 Copy AI prompt, paste it into ChatGPT / Claude / Gemini, "
        "and paste the answer under 'I will write my own script'.")


def parse_custom_script(text: str, chars: list[dict]) -> list[dict]:
    """The user's own script, in this simple format:

        # Time skip: Two hours later…          (optional card before the next scene)
        # Scene: classroom (sitting, books)    (sitting / books / phones optional)
        Ali: Deal. {turn-page} {sniff} Samosa? [suspicious, think, ding]
        Sara: Hi Ali.
    """
    names = {c["name"].lower(): c["name"] for c in chars}
    scenes: list[dict] = []
    unknown: set[str] = set()
    pending_skip = ""
    for raw_line in text.splitlines():
        # Forgiving: chat apps often turn "# Scene:" into a heading and drop
        # the "#", or add **bold** — all of these still work.
        line = raw_line.replace("**", "").replace("__", "").strip().lstrip("*>-").strip()
        if not line:
            continue
        skip = re.match(r"^#*\s*time\s*skip\s*:?\s*(.*)$", line, re.I)
        if skip:
            pending_skip = skip.group(1).strip() or "Later…"
            continue
        head = re.match(r"^#+\s*(?:scene\s*:?)?\s*(.*)$", line, re.I) or \
            re.match(r"^scene\s*\d*\s*:\s*(.*)$", line, re.I)
        if head:
            location, _, bg = head.group(1).partition("|")
            options = " ".join(re.findall(r"\(([^)]*)\)", location)).lower()
            location = re.sub(r"\([^)]*\)", "", location).strip(" ,-")
            sitting = bool(re.search(r"\bsit(ting)?\b", options + " " + location.lower()))
            hold = "book" if re.search(r"\bbooks?\b", options) else \
                   "phone" if re.search(r"\bphones?\b", options) else ""
            location = re.sub(r"\bsit(ting)?\b", "", location, flags=re.I).strip(" ,-")
            scenes.append({"location": location or "a street",
                           "place": _guess_place(location, len(scenes)), "sitting": sitting,
                           "holding": hold, "time_skip": pending_skip,
                           # "(night)" / "(sunset)" in the scene line: the time of day you asked for
                           "clock": _clock_of(options) or ("day" if re.search(r"\b(sunset|dusk|golden hour)\b", options) else ""),
                           "background": (bg.strip() or location or "cartoon street"),
                           "characters": [], "lines": []})
            pending_skip = ""
            continue
        m = re.match(r"^([^:：]{1,40})[:：]\s*(.+)$", line)
        if not m:
            continue
        name, said = m.group(1).strip(), m.group(2).strip()
        if name.lower() not in names:
            if not re.search(r"[A-Za-z]{2,}", name) or len(name) > 40 or re.match(r"^(note|tip|title|narrator)$", name, re.I):
                unknown.add(name)
                continue
            names[name.lower()] = name  # a character the story needs: made automatically
        expr, pose, sfx, tone = "normal", "idle", "", ""
        tag = re.search(r"\[([^\]]*)\]\s*$", said)
        if tag:
            said = said[:tag.start()].strip()
            for word in re.split(r"[,\s]+", tag.group(1).lower()):
                word = word.replace("sfx:", "").strip()
                if word in EXPRESSIONS:
                    expr = word
                elif word in POSES:
                    pose = word
                elif word in TONES:
                    tone = word
                elif word in SFX_NAMES:
                    sfx = word
                elif word in ACTIONS and not word.startswith("w-") and "{" + word not in said:
                    # "[sad, facepalm]": an action written in the brackets is still acted (2026-11-19)
                    said = "{" + word + "} " + said
        if not scenes:
            scenes.append({"location": "a street", "place": "street", "sitting": False,
                           "background": "cartoon street", "characters": [], "lines": []})
        scenes[-1]["lines"].append({"speaker": names[name.lower()], "text": said,
                                    "expression": expr, "pose": pose, "sfx": sfx, "tone": tone})
    if unknown and not any(s["lines"] for s in scenes):
        raise ValueError("These names are not characters: " + ", ".join(sorted(unknown)) + ".")
    story = _normalize_story(scenes, chars)
    if not story:
        raise ValueError('No dialogue found. Write lines like "Ali: Hello!"')
    return story


# -------------------------------------------------------------- voices
EDGE_DEFAULTS = {
    "en": ("en-US-GuyNeural", "en-US-AriaNeural"),
    "ur": ("ur-PK-AsadNeural", "ur-PK-AyeshaNeural"),
}


def _edge_voice_for(char: dict, language: str, index: int) -> str:
    """The character's own Edge voice when it fits the story language;
    otherwise a default voice of the same gender (or alternating
    male/female when the gender is unknown, e.g. a cloned voice)."""
    import tts as tts_module
    voice = char.get("voice") or {}
    vid, label = str(voice.get("id", "")), str(voice.get("label", "")).lower()
    male, fem = EDGE_DEFAULTS[language]
    if voice.get("type") == "edge" and vid in tts_module.VOICE_IDS:
        if (language == "ur") == vid.startswith("ur-"):
            return vid
        return fem if "female" in label else male
    return male if index % 2 == 0 else fem


def _edge_prosody(text: str, voice: str, prosody: dict, out_mp3: Path) -> None:
    """Edge voice with the emotion's rate / pitch / volume."""
    import asyncio
    import edge_tts

    async def run() -> None:
        com = edge_tts.Communicate(text, voice, rate=prosody["rate"], pitch=prosody["pitch"],
                                   volume=prosody["volume"])
        await com.save(str(out_mp3))
    asyncio.run(run())
    if not out_mp3.exists() or out_mp3.stat().st_size < 200:
        raise RuntimeError("Edge returned no audio.")


_INTERJECTIONS = [  # long sounds written the way engines can SAY them
    (r"\b[Hh]m{2,}\b", "Hmm"), (r"\b[Mm]{3,}\b", "Mmm"), (r"\b([Aa])a+h+\b", "Aah"),
    (r"\b([Oo])o+h+\b", "Ooh"), (r"\b([Ww])o{2,}w+\b", "Wow"), (r"\b([Yy])a{2,}y+\b", "Yay"),
    (r"\b([Hh])a{2,}n+\b", "Haan"), (r"\b([Uu])+f{2,}\b", "Uff"), (r"\b([Nn])o{3,}\b", "Noo"),
]


def _speakable(text: str) -> str:
    """Text as a TTS engine should get it: SHOUTED words in normal case
    (some engines spell capitals out letter by letter), ellipses as a
    short pause, and always a full stop at the end."""
    out = re.sub(r"[A-Za-z']{2,}", lambda m: m.group(0).lower() if m.group(0).replace("'", "").isupper()
                 else m.group(0), text.replace("*", ""))
    out = out.replace("…", ",").replace("...", ",")
    for pat, rep_ in _INTERJECTIONS:
        out = re.sub(pat, rep_, out)
    out = re.sub(r"([A-Za-z])\1{2,}", r"\1\1", out)  # "sooooo" -> "soo"
    out = re.sub(r"\s+", " ", out).strip(" ,")
    if out and out[-1] not in ".!?":
        out += "."
    return out[:1].upper() + out[1:]


_TOKEN_CAP: dict = {"n": 0}
_REF_CONDS: dict = {}  # reference voice file -> its prepared voice (Chatterbox "conds")


def _speed_up(model) -> None:
    """Long videos (user, 2026-11-19: 3 hours for a third of the lines).
    Chatterbox always allows 1000 speech tokens (40 s): cap each take at
    what the sentence can need."""
    t3 = getattr(model, "t3", None)
    if t3 is None or getattr(t3, "_ytguru_capped", False):
        return
    orig = t3.inference

    def inference(*args, **kwargs):
        cap = _TOKEN_CAP.get("n") or 0
        if cap and kwargs.get("max_new_tokens"):
            kwargs["max_new_tokens"] = min(int(kwargs["max_new_tokens"]), cap)
        return orig(*args, **kwargs)
    try:
        t3.inference = inference
        t3._ytguru_capped = True
    except Exception:  # noqa: BLE001 — just slower
        pass


def _ref_prompt(model, ref: Path, exaggeration: float):
    """Chatterbox re-reads and re-analyses the reference voice for EVERY
    line (several seconds on a CPU). Prepare each voice once, then reuse
    it: returns None (= use the prepared voice) or the path (old way)."""
    try:
        key = (str(ref), ref.stat().st_mtime)
        if key in _REF_CONDS:
            model.conds = _REF_CONDS[key]
        else:
            model.prepare_conditionals(str(ref), exaggeration=exaggeration)
            if len(_REF_CONDS) > 80:
                _REF_CONDS.clear()
            _REF_CONDS[key] = model.conds
        return None
    except Exception:  # noqa: BLE001 — the normal (slower) way
        return str(ref)


_COLAB_STATE: dict = {"dead_until": 0.0, "sent": set()}
# Where the voices are being made RIGHT NOW (user, 2026-11-19: "show me if it runs on
# Google or on my CPU, why not on Google, when it retries and what the retry gave").
_ENGINE: dict = {"where": "", "reason": "", "retry_at": 0.0, "last_retry": "",
                 "avg": {"colab": 0.0, "cpu": 0.0}, "n": {"colab": 0, "cpu": 0}, "updated": 0.0}


def _engine_note(where: str, secs: float | None = None, reason: str | None = None) -> None:
    import time
    _ENGINE["where"] = where
    _ENGINE["updated"] = time.time()
    if reason is not None:
        _ENGINE["reason"] = reason
    if secs is not None and where in _ENGINE["avg"]:
        n = min(_ENGINE["n"][where], 19)
        _ENGINE["avg"][where] = (_ENGINE["avg"][where] * n + secs) / (n + 1)  # about the last 20 lines
        _ENGINE["n"][where] += 1


def voice_engine_status() -> dict:
    import time
    f = BASE_DIR / "colab_voice.txt"
    colab_set = f.exists() and f.read_text(encoding="utf-8", errors="ignore").strip().startswith("http")
    wait = max(0, int(_ENGINE["retry_at"] - time.time())) if colab_set and _ENGINE["where"] != "colab" else 0
    return {"where": _ENGINE["where"], "reason": _ENGINE["reason"] if _ENGINE["where"] != "colab" else "",
            "retry_in": wait, "last_retry": _ENGINE["last_retry"], "colab_set": colab_set,
            "avg_colab": round(_ENGINE["avg"]["colab"], 1), "avg_cpu": round(_ENGINE["avg"]["cpu"], 1),
            "gpu": round(float(_ENGINE.get("gpu") or 0), 1), "link": round(float(_ENGINE.get("link") or 0), 1),
            "age": int(time.time() - _ENGINE["updated"]) if _ENGINE["updated"] else None}


def _colab_target() -> tuple[str, str] | None:
    """colab_voice.txt in the project folder: "<url> <token>" printed by
    the YTGuru Colab notebook. Read on every line, so it can be added,
    changed or removed while a video is being made."""
    import time
    f = BASE_DIR / "colab_voice.txt"
    if time.time() < _COLAB_STATE["dead_until"] or not f.exists():
        return None
    parts = f.read_text(encoding="utf-8", errors="ignore").split()
    if len(parts) < 2 or not parts[0].startswith("http"):
        return None
    return parts[0].rstrip("/"), parts[1]


def _colab_log(msg: str) -> None:
    """colab_voice.log in the project folder: every Colab line (time / error), to see what is slow."""
    import time
    try:
        f = BASE_DIR / "colab_voice.log"
        if f.exists() and f.stat().st_size > 400_000:
            f.write_text("", encoding="utf-8")
        with f.open("a", encoding="utf-8") as fh:
            fh.write(time.strftime("%H:%M:%S ") + msg + "\n")
    except OSError:
        pass


def _colab_failed(exc: Exception) -> None:
    import time
    _COLAB_STATE["dead_until"] = time.time() + 20  # try Colab again soon
    _ENGINE["retry_at"] = _COLAB_STATE["dead_until"]
    _ENGINE["reason"] = "Google did not answer: " + _colab_reason(exc)
    _ENGINE["last_retry"] = time.strftime("%H:%M:%S") + " ✗ " + _colab_reason(exc)


def _colab_reason(exc: Exception) -> str:
    """The error in simple words."""
    t = str(exc)
    low = t.lower()
    if "403" in t:
        return "wrong code — paste the whole line from Colab again in the Dashboard"
    if "timed out" in low or "timeout" in low:
        return "it took too long (the free link was slow)"
    if any(x in t for x in ("502", "530", "1033")) or "refused" in low or "getaddrinfo" in low or "name or service" in low:
        return "the Colab link is closed — is the Colab tab still running?"
    if "500" in t:
        return "the voice server on Colab had an error"
    return t[:120]
    _VOICE_PROBLEMS.append(f"Colab voice: {str(exc)[:150]} (this computer made the line)")


def _colab_post(remote: tuple[str, str], path: str, body: dict, timeout: int = 90) -> dict:
    import urllib.request
    req = urllib.request.Request(remote[0] + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "X-Token": remote[1],
                                          "User-Agent": "YTGuru"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def _colab_best(remote: tuple[str, str], text: str, ref: Path, exag: float, expected: float, cap: int):
    """The whole line in ONE call (newer Colab notebook): the same takes and the same
    clean-take check, done on Colab. None = an older notebook (use one call per take)."""
    import base64
    import hashlib
    import urllib.error
    import numpy as np
    if _COLAB_STATE.get("no_best"):
        return None
    data = ref.read_bytes()
    sha = hashlib.sha1(data).hexdigest()
    body = {"text": text, "sha": sha, "language_id": "en", "exag": exag, "expected": expected, "max_new_tokens": cap}
    for _ in range(2):
        if sha not in _COLAB_STATE["sent"]:
            _colab_post(remote, "/ref", {"sha": sha, "wav_b64": base64.b64encode(data).decode()})
            _COLAB_STATE["sent"].add(sha)
        try:
            out = _colab_post(remote, "/best", body, timeout=150)
            sig = np.frombuffer(base64.b64decode(out["wav_b64"]), dtype="<f4").astype(np.float32)
            return sig, int(out["sr"]), float(out.get("gpu_secs") or 0), int(out.get("takes") or 1)
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                detail = exc.read().decode("utf-8", "ignore")
                if "voice sample" in detail:
                    _COLAB_STATE["sent"].discard(sha)
                    continue
                _COLAB_STATE["no_best"] = True  # an older notebook
                return None
            raise
    raise RuntimeError("Colab did not accept the voice sample")


def _colab_take(remote: tuple[str, str], text: str, ref: Path, settings: dict, cap: int):
    import base64
    import hashlib
    import urllib.error
    import numpy as np
    data = ref.read_bytes()
    sha = hashlib.sha1(data).hexdigest()
    body = {"text": text, "sha": sha, "language_id": "en", "max_new_tokens": cap, **settings}
    for _ in range(2):
        if sha not in _COLAB_STATE["sent"]:
            _colab_post(remote, "/ref", {"sha": sha, "wav_b64": base64.b64encode(data).decode()})
            _COLAB_STATE["sent"].add(sha)
        try:
            out = _colab_post(remote, "/gen", body)
            sig = np.frombuffer(base64.b64decode(out["wav_b64"]), dtype="<f4").astype(np.float32)
            return sig, int(out["sr"])
        except urllib.error.HTTPError as exc:
            if exc.code == 404:  # Colab restarted and forgot the voice: send it again
                _COLAB_STATE["sent"].discard(sha)
                continue
            raise
    raise RuntimeError("Colab did not accept the voice sample")


def _clone_clean(vc, text: str, ref: Path, prosody: dict | None) -> array:
    """A cloned voice WITHOUT stray sounds (user, 2026-11-16).
    Chatterbox sometimes keeps "talking" after the sentence (mumbles,
    breaths, odd noises), mostly when pushed hard. So: moderate
    emotion settings, a calmer sampler, up to 3 takes, keep the take
    whose length fits the words, and cut anything after a pause past
    the end of the sentence. The liveliness stays: emotion is still
    raised per line, and shout/angry get their sound treatment after."""
    import numpy as np
    words = max(1, len(re.findall(r"[A-Za-z']+", text)))
    expected = 0.25 + words * 0.36  # seconds, normal talking pace
    exag = min(0.85, float((prosody or {}).get("exaggeration", 0.45)))
    remote = _colab_target()
    why = ""
    if remote is None:
        import time as _t0
        if not (BASE_DIR / "colab_voice.txt").exists():
            why = "Google GPU is not connected"
        elif _t0.time() < _COLAB_STATE["dead_until"]:
            why = _ENGINE["reason"] or "Google did not answer — waiting to try again"
        else:
            why = "the Colab line in the Dashboard is not complete"
    cap0 = int(25 * (expected * 2.0 + 1.5)) + 40
    if remote:
        # newer Colab notebook: the whole line (all takes) in one call
        import time as _tb
        for attempt_b in range(3):
            try:
                t0 = _tb.time()
                res = _colab_best(remote, _speakable(text), ref, exag, expected, cap0)
                if res is None:
                    break
                sig, sr, gpu, takes = res
                if sr != SAMPLE_RATE:
                    idx = np.linspace(0, len(sig) - 1, int(len(sig) * SAMPLE_RATE / sr))
                    sig = np.interp(idx, np.arange(len(sig)), sig).astype(np.float32)
                total = _tb.time() - t0
                _colab_log(f"ok {total:.1f}s (gpu {gpu:.1f}s, {takes} take(s), link {max(0.0, total - gpu):.1f}s) {len(text)} chars")
                if _ENGINE["where"] == "cpu" or attempt_b:
                    _ENGINE["last_retry"] = _tb.strftime("%H:%M:%S") + " ✓ Google answered again"
                _engine_note("colab", total, "")
                _ENGINE["gpu"] = gpu
                _ENGINE["link"] = max(0.0, total - gpu)
                peak = float(np.max(np.abs(sig))) if len(sig) else 1.0
                sig = sig if len(sig) else np.zeros(SAMPLE_RATE // 4, dtype=np.float32)
                return array("h", (sig / (peak or 1.0) * 0.9 * 32767).astype(np.int16).tobytes())
            except Exception as exc:  # noqa: BLE001
                _colab_log(f"line try {attempt_b + 1} failed: {str(exc)[:200]}")
                if attempt_b < 2:
                    _tb.sleep(3 + attempt_b * 5)
                else:
                    _colab_failed(exc)
                    why = _ENGINE["reason"]
                    remote = None
    model = None if remote else vc._get_model()
    if model is not None:
        _speed_up(model)
    best: tuple[float, np.ndarray] | None = None
    for attempt in range(3):
        kwargs = {"exaggeration": max(0.3, exag - 0.12 * attempt),
                  "cfg_weight": 0.4 if exag >= 0.7 else 0.5}
        settings = {"temperature": 0.65 - 0.1 * attempt, "repetition_penalty": 1.6, **kwargs}
        # Speech is ~25 tokens a second: never let a take run on far past
        # the sentence (a runaway take could be 40 s of mumbling).
        cap = int(25 * (expected * 2.0 + 1.5)) + 40
        got = None
        if remote:
            # The SAME Chatterbox model on Google Colab's free GPU (user,
            # 2026-11-19): same settings, same takes, same cleaning below.
            # A hiccup of the free link is retried (Colab is ~4x faster than this
            # computer, so waiting a few seconds beats making the line here).
            import time as _t
            for attempt_c in range(3):
                try:
                    t0 = _t.time()
                    got = _colab_take(remote, _speakable(text), ref, settings, cap)
                    _colab_log(f"ok {(_t.time() - t0):.1f}s {len(text)} chars")
                    if _ENGINE["where"] == "cpu" or attempt_c:
                        _ENGINE["last_retry"] = _t.strftime("%H:%M:%S") + " ✓ Google answered again"
                    _engine_note("colab", _t.time() - t0, "")
                    break
                except Exception as exc:  # noqa: BLE001
                    _colab_log(f"try {attempt_c + 1} failed: {str(exc)[:200]}")
                    if attempt_c < 2:
                        _t.sleep(3 + attempt_c * 5)
                    else:
                        _colab_failed(exc)  # this computer makes the line; Colab is tried again soon
                        why = _ENGINE["reason"]
                        remote = None
        if got is None:
            if model is None:
                model = vc._get_model()
                _speed_up(model)
            import time as _t1
            t_cpu = _t1.time()
            _engine_note("cpu", None, why or "Google GPU is not connected")
            with vc._gen_lock:
                _TOKEN_CAP["n"] = cap
                prompt = _ref_prompt(model, ref, kwargs["exaggeration"])
                try:
                    wav = model.generate(_speakable(text), language_id="en", audio_prompt_path=prompt, **settings)
                except TypeError:  # older chatterbox without these settings
                    wav = model.generate(_speakable(text), language_id="en", audio_prompt_path=prompt, **kwargs)
                finally:
                    _TOKEN_CAP["n"] = 0
            got = (wav.squeeze().detach().cpu().numpy().astype(np.float32), int(model.sr))
            _engine_note("cpu", _t1.time() - t_cpu)
        sig, sr = got
        if sr != SAMPLE_RATE:
            idx = np.linspace(0, len(sig) - 1, int(len(sig) * SAMPLE_RATE / sr))
            sig = np.interp(idx, np.arange(len(sig)), sig).astype(np.float32)
        sig = _cut_tail(sig, expected)
        dur = len(sig) / SAMPLE_RATE
        score = abs(dur - expected) / expected
        if best is None or score < best[0]:
            best = (score, sig)
        if dur <= expected * 1.7 + 0.5:
            break  # a clean take
    sig = best[1] if best else np.zeros(SAMPLE_RATE // 4, dtype=np.float32)
    peak = float(np.max(np.abs(sig))) or 1.0
    return array("h", (sig / peak * 0.9 * 32767).astype(np.int16).tobytes())


def _cut_tail(sig, expected: float):
    """Drop what comes after a clear pause once the sentence should be
    over — that is where the stray sounds live."""
    import numpy as np
    hop = SAMPLE_RATE // 50  # 20 ms
    if len(sig) < hop * 10:
        return sig
    frames = len(sig) // hop
    rms = np.sqrt(np.mean(sig[: frames * hop].reshape(frames, hop) ** 2, axis=1))
    loud = rms > max(0.01, float(np.max(rms)) * 0.06)
    start_check = int(expected * 0.7 * 50)
    quiet_run = 0
    for i in range(min(start_check, frames), frames):
        quiet_run = quiet_run + 1 if not loud[i] else 0
        if quiet_run >= 18:  # 0.36 s of silence after the words
            return sig[: (i - quiet_run + 6) * hop]
    # Way too long and no pause: keep a sane length (fade out).
    limit = int((expected * 2.0 + 0.6) * SAMPLE_RATE)
    if len(sig) > limit:
        sig = sig[:limit].copy()
        fade = min(len(sig), SAMPLE_RATE // 10)
        sig[-fade:] *= np.linspace(1, 0, fade)
    return sig


_VOICE_PROBLEMS: list[str] = []  # why an acting voice fell back (shown to the user)


# ---------------------------------------------------------- acting voices
# FREE emotion for every voice (user, 2026-11-16: "completely free…
# voices must not read flat"). The Chatterbox engine (installed with the
# Voice Cloner) copies HOW a reference recording sounds. So every
# character gets a reference: its cloned sample, or — for Edge / Unreal /
# Google voices — a sample spoken once by that voice. For each emotion the
# reference itself is turned into an excited / angry / sad / whispering /
# shaky version, and Chatterbox speaks the line in that mood.
VOICEBANK_DIR = BASE_DIR / "voicebank"
REF_TEXT = ("Oh wow, look at this! I can't believe it. Wait, what was that? Hmm, let me think about it. "
            "Ha ha, I knew it! Come on, let's go, quickly!")
_MOOD_FX = {
    "happy": "asetrate=24000*1.06,aresample=24000,atempo=1.06",
    "excited": "asetrate=24000*1.10,aresample=24000,atempo=1.12,volume=3dB",
    "surprised": "asetrate=24000*1.12,aresample=24000,atempo=1.04",
    "angry": "asetrate=24000*0.98,aresample=24000,atempo=1.10,acompressor=threshold=-24dB:ratio=6,volume=6dB",
    "shout": "asetrate=24000*1.04,aresample=24000,atempo=1.12,acompressor=threshold=-26dB:ratio=8,volume=9dB",
    "sad": "asetrate=24000*0.94,aresample=24000,atempo=0.86",
    "cry": "asetrate=24000*1.05,aresample=24000,atempo=0.9,vibrato=f=6.5:d=0.5,tremolo=f=4.5:d=0.4",
    "scared": "asetrate=24000*1.07,aresample=24000,vibrato=f=9:d=0.35",
    "whisper": _WHISPER,
    "suspicious": "atempo=0.9",
    "calm": "atempo=0.92",
}
_acting_state = {"off": "", "checked": False}


def _acting_available() -> bool:
    """Chatterbox installed (Voice Cloner) and its model already downloaded?"""
    if _acting_state["checked"]:
        return not _acting_state["off"]
    _acting_state["checked"] = True
    try:
        import tools_voiceclone as vc
        if not vc._engine_installed():
            _acting_state["off"] = "the Voice Cloner engine is not installed"
        else:
            vc._get_model()
    except Exception as exc:  # noqa: BLE001
        _acting_state["off"] = f"the acting engine could not start ({str(exc)[:120]})"
    return not _acting_state["off"]


def _plain_voice(text: str, char: dict, language: str, index: int, out_wav: Path, work: Path,
                 tts_keys: dict | None) -> str:
    """The character's own voice without any acting (provider or Edge)."""
    import tts as tts_module
    voice = char.get("voice") or {}
    if voice.get("type") == "provider":
        provider = str(voice.get("provider", ""))
        key = (tts_keys or {}).get(provider, "")
        if provider in tts_module.PROVIDERS and key:
            try:
                mp3, engine = tts_module.synthesize_provider(text, provider, str(voice.get("id", "")), key, "+0%", work)
                _run_ffmpeg(["-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(out_wav)])
                mp3.unlink(missing_ok=True)
                return engine
            except Exception:  # noqa: BLE001
                pass
    mp3, engine = tts_module.synthesize(text, _edge_voice_for(char, language, index), "+0%", work)
    _run_ffmpeg(["-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(out_wav)])
    mp3.unlink(missing_ok=True)
    return engine


def _voice_ref(char: dict, language: str, index: int, tts_keys: dict | None) -> Path | None:
    """The reference recording Chatterbox copies for this character."""
    voice = char.get("voice") or {}
    if voice.get("type") == "clone":
        import tools_voiceclone as vc
        ref = vc._voice_wav_path(str(voice.get("id", "")))
        return ref if ref.exists() else None
    name = re.sub(r"[^A-Za-z0-9_-]+", "_", f'{voice.get("type", "edge")}-{voice.get("provider", "")}-'
                                             f'{voice.get("id") or _edge_voice_for(char, language, index)}')[:90]
    ref = VOICEBANK_DIR / f"{name}.wav"
    if not ref.exists():
        VOICEBANK_DIR.mkdir(parents=True, exist_ok=True)
        _plain_voice(REF_TEXT, char, language, index, ref.with_suffix(".tmp.wav"), VOICEBANK_DIR, tts_keys)
        ref.with_suffix(".tmp.wav").replace(ref)
    return ref


def _mood_ref(base: Path, label: str) -> Path:
    """The reference turned into the line's mood (cached)."""
    fx = _MOOD_FX.get(label)
    if not fx:
        return base
    out = VOICEBANK_DIR / "moods" / f"{base.stem}-{label}.wav"
    if not out.exists() or out.stat().st_mtime < base.stat().st_mtime:
        out.parent.mkdir(parents=True, exist_ok=True)
        _run_ffmpeg(["-i", str(base), "-ac", "1", "-ar", "24000", "-af", fx, "-t", "20",
                     "-c:a", "pcm_s16le", str(out)])
    return out


def _voice_line(text: str, char: dict, language: str, index: int, out_wav: Path,
                work: Path, tts_keys: dict | None = None, prosody: dict | None = None,
                acting: bool = True) -> str:
    """Speak one piece of text into out_wav (mono 24 kHz) in the
    character's voice. Returns the engine used. Voice types:
    clone (Voice Cloner), provider (Unreal Speech / ElevenLabs /
    Google, with the user's key), edge (free). Any failure falls back
    to a free Edge voice so the video is still made."""
    voice = char.get("voice") or {}
    vtype = voice.get("type")
    if vtype == "clone" and language == "en":
        try:
            import tools_voiceclone as vc
            ref = vc._voice_wav_path(str(voice.get("id", "")))
            if ref.exists():
                label = (prosody or {}).get("label", "normal")
                pcm = _clone_clean(vc, text, _mood_ref(ref, label) if acting else ref, prosody)
                with wave.open(str(out_wav), "wb") as w:
                    w.setnchannels(1)
                    w.setsampwidth(2)
                    w.setframerate(SAMPLE_RATE)
                    w.writeframes(pcm.tobytes())
                return "clone"
        except Exception:  # noqa: BLE001 — fall back to an Edge voice
            pass
    import tts as tts_module
    if vtype == "provider":
        provider = str(voice.get("provider", ""))
        key = (tts_keys or {}).get(provider, "")
        label = (prosody or {}).get("label", "normal")
        if provider == "gemini" and key:
            try:
                _gemini_tts(_speakable(text), str(voice.get("id", "")), key, label, out_wav)
                return "gemini"
            except Exception as exc:  # noqa: BLE001 — Edge below; remember why
                _VOICE_PROBLEMS.append(str(exc)[:200])
        if provider == "elevenlabs" and key:
            try:
                _eleven_v3(_speakable(text), str(voice.get("id", "")), key, label, out_wav)
                return "elevenlabs-v3"
            except Exception as exc:  # noqa: BLE001 — the older model below
                _VOICE_PROBLEMS.append(str(exc)[:200])
    if acting and language == "en" and vtype != "clone" and _acting_available():
        try:
            import tools_voiceclone as vc
            ref = _voice_ref(char, language, index, tts_keys)
            if ref:
                label = (prosody or {}).get("label", "normal")
                pcm = _clone_clean(vc, text, _mood_ref(ref, label), prosody)
                with wave.open(str(out_wav), "wb") as w:
                    w.setnchannels(1)
                    w.setsampwidth(2)
                    w.setframerate(SAMPLE_RATE)
                    w.writeframes(pcm.tobytes())
                return "acting"
        except Exception as exc:  # noqa: BLE001 — the plain voice below
            _VOICE_PROBLEMS.append(f"acting voice: {str(exc)[:150]}")
    if vtype == "provider":
        provider = str(voice.get("provider", ""))
        key = (tts_keys or {}).get(provider, "")
        if provider in tts_module.PROVIDERS and key:
            try:
                mp3, engine = tts_module.synthesize_provider(_speakable(text), provider, str(voice.get("id", "")),
                                                             key, "+0%", work)
                _run_ffmpeg(["-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE),
                             "-c:a", "pcm_s16le", str(out_wav)])
                mp3.unlink(missing_ok=True)
                return engine
            except Exception:  # noqa: BLE001
                pass
    edge_voice = _edge_voice_for(char, language, index)
    if prosody:
        try:
            mp3 = work / f"{out_wav.stem}-edge.mp3"
            _edge_prosody(_speakable(text), edge_voice, prosody, mp3)
            _run_ffmpeg(["-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(out_wav)])
            mp3.unlink(missing_ok=True)
            return "edge-tts"
        except Exception:  # noqa: BLE001 — plain voice below
            pass
    mp3, engine = tts_module.synthesize(_speakable(text), edge_voice, "+0%", work)
    _run_ffmpeg(["-i", str(mp3), "-ac", "1", "-ar", str(SAMPLE_RATE),
                 "-c:a", "pcm_s16le", str(out_wav)])
    mp3.unlink(missing_ok=True)
    return engine


def _read_pcm(path: Path) -> array:
    with wave.open(str(path), "rb") as w:
        data = array("h")
        data.frombytes(w.readframes(w.getnframes()))
    if sys.byteorder == "big":
        data.byteswap()
    return data


def _mouth_track(pcm: array) -> list[str | None]:
    """One mouth shape per video frame from the loudness of the voice:
    quiet -> closed (None = the expression's own mouth), medium ->
    half open, loud -> open. This is the lip-sync."""
    per_frame = SAMPLE_RATE // FPS
    levels = []
    for start in range(0, len(pcm), per_frame):
        chunk = pcm[start:start + per_frame:4]
        levels.append(math.sqrt(sum(v * v for v in chunk) / len(chunk)) if chunk else 0.0)
    if not levels:
        return []
    peak = sorted(levels)[int(len(levels) * 0.95)] or 1.0
    out: list[str | None] = []
    for lv in levels:
        r = lv / peak
        out.append(None if r < 0.12 else "talk-half" if r < 0.5 else "talk-open")
    return out


# --------------------------------------------------- music + sound effects
# Background music and sound effects bring a cartoon to life (user,
# 2026-11-16: "YE BHOT IMPORTANT HY"). Music: the built-in starter
# pack (backend/music_pack, Kevin MacLeod, CC-BY 4.0 — credit him in
# the description), or Freesound with the user's free key. Sound
# effects: Freesound with the key (real laughs, slaps, gasps…), and a
# few synthesized ones (whoosh, boing, ding, pop, slap, fail) so a
# video still has effects without any key. The music is "ducked"
# (turned down) while someone speaks, so the voice stays clear.
SFX_QUERIES = {
    "laugh": "cartoon laugh", "giggle": "giggle", "gasp": "gasp surprise",
    "boing": "cartoon boing", "slap": "face slap", "punch": "cartoon punch",
    "crash": "cartoon crash", "ding": "ding bell", "whoosh": "whoosh",
    "pop": "cartoon pop", "applause": "applause short", "cry": "cartoon crying",
    "door": "door knock", "phone": "phone ring", "horn": "car horn",
    "cash": "cash register", "fail": "sad trombone", "magic": "magic sparkle",
    "snore": "snoring cartoon", "eat": "eating crunch", "drumroll": "drum roll short",
    "footsteps": "cartoon footsteps", "scream": "cartoon scream", "angry": "angry grunt",
    # the 3D world
    "rustle": "leaves rustle", "chop": "axe chop wood", "thud": "thud wood ground", "splash": "water splash",
    "plop": "water plop small", "creak": "door creak", "fire": "fire whoosh ignite", "swim": "swimming water strokes",
    "sip": "drinking sip",
}
SFX_NAMES = list(SFX_QUERIES)
_SYNTH = {
    "whoosh": "anoisesrc=d=0.7:c=pink:a=0.8,highpass=f=400,lowpass=f=4000,"
              "afade=t=in:d=0.3,afade=t=out:st=0.35:d=0.35",
    "boing": "sine=f=180:d=0.7,vibrato=f=14:d=0.9,afade=t=out:st=0.2:d=0.5",
    "ding": "sine=f=1568:d=1.2,afade=t=out:st=0:d=1.2",
    "pop": "sine=f=900:d=0.08,afade=t=out:st=0:d=0.08",
    "slap": "anoisesrc=d=0.15:c=white:a=0.9,lowpass=f=2500,afade=t=out:st=0:d=0.15",
    "punch": "anoisesrc=d=0.2:c=brown:a=1,lowpass=f=900,afade=t=out:st=0:d=0.2",
    "fail": "aevalsrc='0.5*sin(2*PI*(330-120*t)*t)':d=1.4,afade=t=out:st=0.9:d=0.5",
    "footsteps": "anoisesrc=d=1:c=brown:a=1,lowpass=f=350,"
                 "volume='if(lt(mod(t,0.25),0.06),1,0)':eval=frame",
    "page": "anoisesrc=d=0.35:c=white:a=0.5,highpass=f=1500,afade=t=in:d=0.1,afade=t=out:st=0.15:d=0.2",
    "sniff": "anoisesrc=d=0.6:c=pink:a=0.7,highpass=f=1800,"
             "volume='if(lt(mod(t,0.3),0.16),1,0)':eval=frame",
    "tick": "sine=f=2200:d=0.035,afade=t=out:st=0:d=0.035",
    "tock": "sine=f=1500:d=0.035,afade=t=out:st=0:d=0.035",
    "applause": "anoisesrc=d=1.6:c=pink:a=0.7,bandpass=f=2200:w=1800,"
                "volume='0.5+0.5*random(0)':eval=frame,afade=t=out:st=1.1:d=0.5",
    "phone": "aevalsrc='0.35*(sin(2*PI*440*t)+sin(2*PI*480*t))*lt(mod(t,0.5),0.38)':d=1.4",
    "magic": "aevalsrc='0.3*sin(2*PI*(700+1500*t)*t)':d=0.8,afade=t=out:st=0.4:d=0.4",
    "crash": "anoisesrc=d=0.9:c=brown:a=1,lowpass=f=1400,afade=t=out:st=0.1:d=0.8",
    "door": "anoisesrc=d=0.9:c=brown:a=1,lowpass=f=420,"
            "volume='if(lt(mod(t,0.3),0.05),1,0)':eval=frame",
    "horn": "aevalsrc='0.35*(2*gte(sin(2*PI*420*t),0)-1)':d=0.6,lowpass=f=2000",
    "cash": "sine=f=2093:d=0.6,afade=t=out:st=0:d=0.6",
    "drumroll": "anoisesrc=d=1.5:c=brown:a=0.9,lowpass=f=600,"
                "volume='if(lt(mod(t,0.06),0.03),1,0.25)':eval=frame",
    "snore": "anoisesrc=d=1.6:c=brown:a=0.8,lowpass=f=320,"
             "volume='0.15+0.85*abs(sin(PI*t/0.8))':eval=frame",
    "eat": "anoisesrc=d=0.8:c=white:a=0.6,bandpass=f=3000:w=2000,"
           "volume='if(lt(mod(t,0.2),0.07),1,0)':eval=frame",
    "rustle": "anoisesrc=d=0.9:c=pink:a=0.55,highpass=f=2200,"
              "volume='0.25+0.75*abs(sin(PI*t*7))':eval=frame,afade=t=out:st=0.5:d=0.4",
    "chop": "aevalsrc='0.8*sin(2*PI*190*t)*exp(-t*28)+0.5*(random(0)-0.5)*exp(-t*35)':d=0.3",
    "thud": "aevalsrc='0.9*sin(2*PI*68*t)*exp(-t*13)+0.3*(random(0)-0.5)*exp(-t*40)':d=0.5",
    "splash": "anoisesrc=d=0.9:c=white:a=0.8,bandpass=f=1600:w=2400,afade=t=in:d=0.02,afade=t=out:st=0.1:d=0.8",
    "plop": "aevalsrc='0.7*sin(2*PI*(260+900*t)*t)*exp(-t*16)':d=0.3",
    "creak": "aevalsrc='0.4*sin(2*PI*(210+60*sin(2*PI*3*t))*t)*(0.6+0.4*sin(2*PI*31*t))':d=0.9,"
             "afade=t=out:st=0.6:d=0.3",
    "fire": "anoisesrc=d=1.4:c=brown:a=0.8,highpass=f=250,volume='0.4+0.6*random(0)':eval=frame,"
            "afade=t=in:d=0.25,afade=t=out:st=0.9:d=0.5",
    "swim": "anoisesrc=d=0.5:c=pink:a=0.6,bandpass=f=1100:w=1500,afade=t=in:d=0.1,afade=t=out:st=0.2:d=0.3",
    "sip": "aevalsrc='0.4*sin(2*PI*(480+300*t)*t)*lt(mod(t,0.25),0.12)':d=0.6",
}
SFX_DIR = BASE_DIR / "sfx_cache"
MUSIC_PACK_DIR = BASE_DIR / "backend" / "music_pack"
MUSIC_VOLUME = 0.16  # default bed level (user can change it in the preview)
SFX_VOLUME = 0.75
_FUNNY_WORDS = ["funny", "comedy", "prank", "fail", "laugh", "joke", "silly", "crazy", "hilarious"]


def _freesound_hits(query: str, key: str, max_sec: float) -> list[dict]:
    params = {"query": query, "token": key, "page_size": "8", "sort": "rating_desc",
              "fields": "id,name,duration,previews",
              "filter": f"duration:[0.2 TO {max_sec}]"}
    data = json.loads(_http_get("https://freesound.org/apiv2/search/text/?"
                                + urllib.parse.urlencode(params), timeout=20))
    return [h for h in data.get("results") or []
            if (h.get("previews") or {}).get("preview-hq-mp3")]


def _to_pcm(src: Path, dest: Path, max_sec: float) -> None:
    _run_ffmpeg(["-i", str(src), "-t", str(max_sec), "-ac", "1", "-ar", str(SAMPLE_RATE),
                 "-af", "silenceremove=start_periods=1:start_threshold=-45dB",
                 "-c:a", "pcm_s16le", str(dest)])


def _sfx_variants(name: str, freesound_key: str) -> list[Path]:
    """Up to 5 different recordings of a sound effect, cached on disk,
    so every video does not use the SAME laugh / whoosh (user,
    2026-11-16: videos must not all sound alike)."""
    SFX_DIR.mkdir(exist_ok=True)
    have = sorted(SFX_DIR.glob(f"{name}-v*.wav"))
    if len(have) >= 3 or not (freesound_key and name in SFX_QUERIES):
        if not have:
            synth = SFX_DIR / f"{name}-v0.wav"
            if name in _SYNTH and not synth.exists():
                try:
                    _run_ffmpeg(["-f", "lavfi", "-i", _SYNTH[name], "-ac", "1", "-ar", str(SAMPLE_RATE),
                                 "-c:a", "pcm_s16le", str(synth)])
                except Exception:  # noqa: BLE001
                    return []
            have = [synth] if synth.exists() else []
        return have
    max_sec = 1.2 if name == "footsteps" else 3.0
    try:
        for i, hit in enumerate(_freesound_hits(SFX_QUERIES[name], freesound_key, 5)[:5]):
            target = SFX_DIR / f"{name}-v{i + 1}.wav"
            if target.exists():
                continue
            raw = SFX_DIR / f"{name}-dl.mp3"
            raw.write_bytes(_http_get(hit["previews"]["preview-hq-mp3"], timeout=30))
            _to_pcm(raw, target, max_sec)
            raw.unlink(missing_ok=True)
    except Exception:  # noqa: BLE001 — keep whatever we already have
        pass
    have = sorted(p for p in SFX_DIR.glob(f"{name}-v*.wav") if not p.name.endswith("-v0.wav")) \
        or sorted(SFX_DIR.glob(f"{name}-v*.wav"))
    return have


def _sfx_pcm(path: Path) -> array:
    pcm = _read_pcm(path)
    peak = max((abs(v) for v in pcm), default=0) or 1
    scale = 26000 / peak
    return array("h", (int(v * scale) for v in pcm))


def _mix_into(track: array, pcm: array, at: int, volume: float) -> None:
    end = min(len(track), at + len(pcm))
    for i in range(max(0, at), end):
        v = track[i] + int(pcm[i - at] * volume)
        track[i] = 32767 if v > 32767 else -32768 if v < -32768 else v


def _build_sfx_track(length: int, events: list[tuple[int, str]], freesound_key: str,
                     seed: str = "") -> tuple[array, list[str]]:
    import random
    rng = random.Random(seed)
    track = array("h", [0]) * length
    variants: dict[str, list[Path]] = {}
    pcm_cache: dict[Path, array] = {}
    used: list[str] = []
    for at, name in events:
        if name not in variants:
            variants[name] = _sfx_variants(name, freesound_key)
        if not variants[name]:
            continue
        path = rng.choice(variants[name])  # a different take each time
        if path not in pcm_cache:
            pcm_cache[path] = _sfx_pcm(path)
        _mix_into(track, pcm_cache[path], at, SFX_VOLUME)
        used.append(name)
    return track, sorted(set(used))


# ------------------------------------------------- procedural background music
# A fresh little cartoon tune for every video (user, 2026-11-16: music
# was missing, and every video must not sound the same). No downloads,
# no licences: bass + melody + drums made from the video's seed.
def _make_music(seed: str, mood: str, seconds: float, dest: Path) -> Path:
    import random
    import numpy as np
    rng = random.Random(seed)
    sr = SAMPLE_RATE
    style = {"funny": rng.choice(["bouncy", "bouncy", "march"]), "tense": "sneaky",
             "chill": "chill"}.get(mood, "bouncy")
    bpm = {"bouncy": rng.randint(112, 132), "march": rng.randint(100, 116),
           "sneaky": rng.randint(88, 104), "chill": rng.randint(84, 98)}[style]
    beat = 60.0 / bpm
    root = rng.choice([48, 50, 52, 53, 55, 57])  # C D E F G A (MIDI)
    minor = style == "sneaky"
    scale = [0, 2, 3, 5, 7, 8, 10] if minor else [0, 2, 4, 5, 7, 9, 11]
    progs = [[0, 3, 4, 0], [0, 5, 3, 4], [0, 3, 0, 4], [0, 4, 5, 3]] if not minor else \
        [[0, 5, 6, 4], [0, 3, 4, 0], [0, 6, 5, 4]]
    prog = rng.choice(progs)
    hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)  # noqa: E731
    bar = 4 * beat
    loop_bars = 8
    n = int(loop_bars * bar * sr)
    out = np.zeros(n, dtype=np.float32)

    def tone(freq: float, dur: float, decay: float, harm: tuple, vol: float) -> np.ndarray:
        t = np.arange(int(dur * sr)) / sr
        w = sum(a * np.sin(2 * np.pi * freq * (k + 1) * t) for k, a in enumerate(harm))
        env = np.exp(-t * decay) * np.minimum(1, t * 400)
        return (w * env * vol).astype(np.float32)

    def put(sig: np.ndarray, at: float) -> None:
        i = int(at * sr)
        j = min(n, i + len(sig))
        if i < n:
            out[i:j] += sig[: j - i]

    lead_harm = rng.choice([(1, 0, 0.25, 0, 0.1), (1, 0.3, 0.1), (1, 0, 0, 0.35)])  # marimba / pluck / bell
    noise_rng = np.random.default_rng(abs(hash(seed)) % (2 ** 32))
    motif = [rng.choice([0, 2, 4, 4, 7, 5, None]) for _ in range(8)]
    for b in range(loop_bars):
        deg = prog[b % len(prog)]
        chord_root = root + scale[deg % 7]
        t0 = b * bar
        # Bass
        if style in ("bouncy", "march"):
            for k in range(4):
                note = chord_root - 12 + (7 if k % 2 else 0)
                put(tone(hz(note), beat * 0.9, 9, (1, 0.5, 0.2), 0.32), t0 + k * beat)
        elif style == "sneaky":
            for k in range(8):
                if k % 2 == 0 or rng.random() < 0.3:
                    note = chord_root - 12 + [0, 3, 7, 3][k % 4] if minor else chord_root - 12
                    put(tone(hz(note), beat * 0.3, 18, (1, 0.6, 0.3), 0.3), t0 + k * beat / 2)
        else:
            put(tone(hz(chord_root - 12), bar, 1.5, (1, 0.3), 0.28), t0)
            put(tone(hz(chord_root - 5), bar / 2, 2.5, (1, 0.2), 0.12), t0 + 2 * beat)
        # Chord stabs (off-beats) for the bounce
        if style != "chill":
            for k in range(4):
                for iv in (0, 2, 4):
                    m = root + scale[(deg + iv) % 7] + 12 * ((deg + iv) // 7)
                    put(tone(hz(m), beat * 0.25, 22, (1, 0.2), 0.05), t0 + k * beat + beat / 2)
        # Melody: the motif, varied on the second half
        steps = 8 if style != "chill" else 4
        for k in range(steps):
            d = motif[(k + (b // 4) * 3) % len(motif)]
            if d is None or (style == "chill" and rng.random() < 0.3):
                continue
            if b % 4 == 3 and k > 4:
                continue  # breathe at phrase ends
            m = root + 12 + scale[(deg + d) % 7] + 12 * ((deg + d) // 7)
            put(tone(hz(m), beat * 0.6, 7 if style != "chill" else 3, lead_harm, 0.16),
                t0 + k * (bar / steps))
        # Drums
        for k in range(4):
            tk = t0 + k * beat
            if style != "chill" or k in (0, 2):
                tt = np.arange(int(0.18 * sr)) / sr
                kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18)
                if k % 2 == 0:
                    put((kick * 0.45).astype(np.float32), tk)
            if k % 2 == 1 and style in ("bouncy", "march"):
                tt = np.arange(int(0.12 * sr)) / sr
                put((noise_rng.standard_normal(len(tt)) * np.exp(-tt * 30) * 0.12).astype(np.float32), tk)
            for h in (0, 0.5):
                tt = np.arange(int(0.03 * sr)) / sr
                hat = noise_rng.standard_normal(len(tt))
                hat = np.diff(hat, prepend=0) * np.exp(-tt * 120) * (0.05 if style != "chill" else 0.025)
                put(hat.astype(np.float32), tk + h * beat)
    reps = int(seconds / (n / sr)) + 2
    full = np.tile(out, reps)[: int((seconds + 1) * sr)]
    full = full / (np.max(np.abs(full)) or 1) * 0.8
    pcm = (full * 32767).astype(np.int16)
    _write_wav_pcm(dest, pcm.tobytes())
    return dest


def _write_wav_pcm(path: Path, data: bytes) -> None:
    import wave
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(data)


_MUSIC_MOODS = {
    "funny": ["funny cartoon music", "comedy quirky music", "playful ukulele", "silly cartoon background"],
    "chill": ["light happy background music", "cheerful acoustic", "lofi happy"],
    "tense": ["comedy suspense music", "sneaky cartoon music", "mystery pizzicato"],
}


def _pick_music(choice: str, title: str, freesound_key: str, seed: str = "",
                out_dir: Path | None = None, seconds: float = 60.0) -> tuple[Path | None, str]:
    """(music file, credit line). choice = "auto" | "none" | a pack file name.
    Auto: a DIFFERENT fitting track per video — a random Freesound track
    for the mood (with the user's key), or a random starter-pack track."""
    import random
    rng = random.Random(seed or title)
    if choice == "none":
        return None, ""
    pack = _read_json(MUSIC_PACK_DIR / "pack.json", {}).get("tracks") or []
    available = [t for t in pack if t.get("file") and (MUSIC_PACK_DIR / str(t["file"])).is_file()]
    chosen = next((t for t in available if t["file"] == choice), None)
    if chosen:
        return (MUSIC_PACK_DIR / chosen["file"],
                f'Music: "{chosen.get("name")}" by {chosen.get("artist")} ({chosen.get("license", "")})')
    low = title.lower()
    mood = "tense" if any(w in low for w in ("secret", "mystery", "thief", "police", "caught", "exam", "ghost")) \
        else "funny" if any(w in low for w in _FUNNY_WORDS + ["chaos", "prank", "borrow", "fight"]) else \
        rng.choice(["funny", "funny", "chill"])
    if freesound_key and rng.random() < 0.5:
        try:
            SFX_DIR.mkdir(exist_ok=True)
            query = rng.choice(_MUSIC_MOODS[mood])
            hits = [h for h in _freesound_hits(query, freesound_key, 400) if (h.get("duration") or 0) >= 25]
            if hits:
                hit = rng.choice(hits[:8])
                target = SFX_DIR / f"music-{hit.get('id', 'x')}.mp3"
                if not target.exists():
                    target.write_bytes(_http_get(hit["previews"]["preview-hq-mp3"], timeout=60))
                return target, f'Music: "{hit.get("name", "")}" from Freesound (check its license on freesound.org)'
        except Exception:  # noqa: BLE001
            pass
    if out_dir is not None:  # always works: a brand-new tune for this video
        try:
            return _make_music(seed or title, mood, seconds, out_dir / "music-made.wav"), ""
        except Exception:  # noqa: BLE001 — numpy missing etc.
            pass
    if available:
        chosen = rng.choice(available)
        return (MUSIC_PACK_DIR / chosen["file"],
                f'Music: "{chosen.get("name")}" by {chosen.get("artist")} ({chosen.get("license", "")})')
    return None, ""


# --------------------------------------------------------- backgrounds
def _cover(img, size: tuple[int, int]):
    from PIL import Image
    w, h = size
    scale = max(w / img.width, h / img.height)
    img = img.resize((max(w, round(img.width * scale)), max(h, round(img.height * scale))),
                     Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((left, top, left + w, top + h)).convert("RGB")


def _gradient(size: tuple[int, int], seed: int):
    from PIL import Image, ImageDraw
    palettes = [((135, 206, 250), (224, 255, 255)), ((255, 228, 181), (255, 250, 240)),
                ((176, 224, 230), (240, 248, 255)), ((221, 160, 221), (255, 240, 245))]
    top, bottom = palettes[seed % len(palettes)]
    w, h = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        draw.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)))
    draw.rectangle([0, int(h * 0.82), w, h], fill=(150, 190, 120))  # simple ground
    return img


def _search_backgrounds(query: str, pixabay_key: str, vertical: bool) -> list[dict]:
    """Pixabay cartoon-style illustrations, then vectors, then any image."""
    results: list[dict] = []
    if not pixabay_key:
        return results
    for image_type in ("illustration", "vector", "all"):
        params = {"key": pixabay_key, "q": query[:90], "image_type": image_type,
                  "orientation": "vertical" if vertical else "horizontal",
                  "per_page": "12", "safesearch": "true"}
        try:
            data = json.loads(_http_get("https://pixabay.com/api/?" + urllib.parse.urlencode(params),
                                        timeout=20))
        except Exception:  # noqa: BLE001
            continue
        for hit in data.get("hits") or []:
            if hit.get("largeImageURL"):
                results.append({"url": hit["largeImageURL"], "preview": hit.get("previewURL", ""),
                                "tags": hit.get("tags", ""), "source": "pixabay"})
        if len(results) >= 6:
            break
    return results


def _fetch_background(query: str, size: tuple[int, int], pixabay_key: str, seed: int):
    from io import BytesIO
    from PIL import Image
    vertical = size[1] > size[0]
    for item in _search_backgrounds(query, pixabay_key, vertical)[:3]:
        try:
            return _cover(Image.open(BytesIO(_http_get(item["url"], timeout=30))), size), "pixabay"
        except Exception:  # noqa: BLE001
            continue
    try:
        prompt = f"{query}, flat 2D cartoon illustration background, empty, no people, bright colors"
        url = ("https://image.pollinations.ai/prompt/" + urllib.parse.quote(prompt)
               + f"?width={size[0]}&height={size[1]}&nologo=true&seed={seed}")
        return _cover(Image.open(BytesIO(_http_get(url, timeout=90))), size), "ai"
    except Exception:  # noqa: BLE001
        return _gradient(size, seed), "plain"


# ------------------------------------------------------------ timeline
def _slots(count: int) -> list[float]:
    return {1: [0.5], 2: [0.34, 0.66], 3: [0.22, 0.5, 0.78],
            4: [0.15, 0.38, 0.62, 0.85]}.get(count, [0.5])


def _plan_scenes(story: list[dict], drawn: bool) -> list[dict]:
    """Per scene: the drawn layout (place + furniture), each character's
    spot and stance, and who walks in."""
    plans = []
    prev: set[str] = set()
    for scene in story:
        cast = scene["characters"]
        xs = _slots(len(cast))
        sitting = drawn and scene.get("sitting") and bool(SEATS.get(scene.get("place", "")))
        props: list[dict] = []
        if sitting:
            seat = SEATS[scene["place"]]
            if seat == "chair":
                props += [{"type": "chair", "x": x} for x in xs]
                if len(xs) >= 2 and scene["place"] in TABLES:
                    props.append({"type": TABLES[scene["place"]], "x": round((xs[0] + xs[1]) / 2, 3)})
            else:
                props.append({"type": seat, "x": xs[0], "x2": xs[-1]})
        stance = {cid: ("sit" if sitting else "stand") for cid in cast}
        walkers = [cid for cid in cast if stance[cid] == "stand" and cid not in prev]
        plans.append({
            "layout": {"kind": scene.get("place", "plain") if drawn else "plain", "props": props,
                       "name": str(scene.get("location") or scene.get("place") or "")[:60],
                       "skip": str(scene.get("time_skip") or "")[:60]},
            "x": dict(zip(cast, xs)), "stance": stance, "walkers": walkers, "sitting": bool(sitting),
            "lead": WALK_FRAMES if walkers else int(SCENE_GAP * FPS),
        })
        prev = set(cast)
    return plans


CARD_FRAMES = 60   # "Two hours later…" card: 2.5 s
WIPE_FRAMES = 8    # slide from one scene to the next


def _motion(kind: str, t: int, n: int) -> tuple[float, float, float]:
    """(dx, dy, rotation) in character units / degrees for an action's body movement."""
    if kind == "shake-y":
        return 0, (4 if (t // 3) % 2 else -4), 0
    if kind == "shake-x":
        return (5 if (t // 2) % 2 else -5), 0, 0
    if kind == "jump":
        return 0, -60 * math.sin(math.pi * t / max(1, n)), 0
    if kind == "jump-small":
        return 0, -24 * math.sin(math.pi * min(1.0, t / max(1, n * 0.6))), 0
    if kind == "nod":
        return 0, 6 * math.sin(2 * math.pi * t / 8), 0
    if kind == "bounce":
        return 0, -14 * abs(math.sin(math.pi * t / 8)), 0
    if kind == "sway":
        return 10 * math.sin(2 * math.pi * t / 24), 0, 0
    if kind == "sniff":
        return 0, -4 * abs(math.sin(math.pi * t / 7)), 0
    if kind == "fall":
        return 0, 0, -90 * min(1.0, t / 8)
    return 0, 0, 0


def _loud(pcm: array, target_rms: float = 5200.0) -> array:
    """Every voice clip at the same, clearly loud level (user: voices
    must be louder than the music)."""
    if not pcm:
        return pcm
    peak = max(abs(v) for v in pcm) or 1
    rms = (sum(v * v for v in pcm[:: 4]) / max(1, len(pcm[:: 4]))) ** 0.5 or 1
    gain = min(target_rms / rms, 31000 / peak)
    return array("h", (int(v * gain) for v in pcm))


def _trim(pcm: array, threshold: int = 600, keep: int = 600) -> array:
    """Cut the silence TTS engines put before and after the words
    (often 0.2–0.5 s each) — that was the 'empty delay' between lines."""
    start, end = 0, len(pcm)
    while start < end and abs(pcm[start]) < threshold:
        start += 1
    while end > start and abs(pcm[end - 1]) < threshold:
        end -= 1
    if end <= start:
        return pcm
    return pcm[max(0, start - keep):min(len(pcm), end + keep)]


# Pop-ups (user, 2026-11-16): the moment an important word is SPOKEN,
# its object pops up next to the speaker (samosa, phone, cat…), or the
# word itself pops as comic text — always with a pop sound.
POP_ICONS = {
    "samosa": ["samosa", "samosas", "pakora", "pakoras"],
    "phone": ["phone", "phones", "mobile", "call", "selfie"],
    "cat": ["cat", "cats", "kitten"],
    "dog": ["dog", "dogs", "puppy"],
    "money": ["money", "cash", "rupees", "dollars", "wallet", "salary", "rich", "price", "pay"],
    "book": ["book", "books", "homework", "exam", "test", "study", "studying", "notes", "chapter"],
    "pizza": ["pizza"],
    "burger": ["burger", "burgers", "food", "snack", "snacks", "lunch", "dinner"],
    "cake": ["cake", "birthday", "party"],
    "tea": ["tea", "chai", "coffee"],
    "clock": ["clock", "time", "late", "minute", "minutes", "hour", "hours", "tomorrow", "alarm"],
    "heart": ["love", "heart", "crush", "darling"],
    "car": ["car", "bike", "drive", "taxi"],
    "gift": ["gift", "present", "surprise"],
    "bomb": ["bomb", "disaster", "explode", "boom"],
    "ice": ["ice", "icecream", "ice-cream"],
    "ball": ["ball", "cricket", "football", "match"],
    "star": ["star", "famous", "genius", "best", "champion"],
    "trophy": ["win", "won", "winner", "prize", "trophy"],
    "key": ["key", "keys", "lock", "secret", "password"],
    "bed": ["sleep", "sleeping", "bed", "nap", "pillow"],
    "fire": ["fire", "hot", "spicy", "burn"],
}
_ICON_OF = {w: icon for icon, words in POP_ICONS.items() for w in words}
_NUMBER_WORDS = {"one", "two", "three", "four", "five", "ten", "twelve", "twenty", "hundred", "thousand",
                 "million", "zero", "first", "last"}


def _asset_for(word: str, kinds: set[str] | None = None, strong: bool = True) -> dict | None:
    """A picture for a word from the Asset Library (yours first, then OpenMoji)."""
    try:
        import tools_assets
        return tools_assets.find_asset(word, strong=strong, kinds=kinds)
    except Exception:  # noqa: BLE001 — no internet / no library: just no picture
        return None


def _pop_words(text: str) -> list[tuple[int, str, str]]:
    """(word index, kind, value) for words worth a pop-up: objects get
    an icon; *starred* words, numbers and SHOUTED words get comic text.
    Best first, at most two per sentence (more is noise)."""
    words = re.findall(r"\*?[A-Za-z'][A-Za-z'\-]*\*?|\d+", text)
    caps = [w for w in words if len(w.strip("*")) > 1 and w.strip("*").replace("'", "").isupper()]
    mostly_caps = len(caps) > len(words) / 2
    ranked: list[tuple[int, int, str, str]] = []  # (priority, index, kind, value)
    for i, raw in enumerate(words):
        w = raw.strip("*").replace("_", " ")
        low = w.lower().strip("'")
        if low in _ICON_OF:
            ranked.append((0, i, "icon", _ICON_OF[low]))
        elif (found := _asset_for(low)) is not None:
            ranked.append((0 if raw.startswith("*") else 1, i, "icon", found["src"]))
        elif raw.startswith("*"):
            ranked.append((1, i, "text", w.upper() + "!"))
        elif w.isdigit() or (low in _NUMBER_WORDS and i < len(words) - 1):
            ranked.append((2, i, "text", w.upper()))
        elif w in caps and len(w) >= 3 and (not mostly_caps or len(w) >= 4):
            ranked.append((3 if not mostly_caps else 4, i, "text", w.upper() + "!"))
    out: list[tuple[int, str, str]] = []
    seen: set[str] = set()
    for _, i, kind, value in sorted(ranked):
        if value in seen:
            continue
        seen.add(value)
        out.append((i, kind, value))
        if len(out) == 1:  # one per sentence at most (user: too many pop-ups look like a formula)
            break
    return sorted(out)


def _word_starts(text: str, mouths: list) -> list[int]:
    """Frame (within the clip) where each word starts. The words are
    spread over the VOICED frames in proportion to their length, so a
    pause in the sentence is skipped — close to the real timing for
    every voice engine."""
    words = re.findall(r"\*?[A-Za-z'][A-Za-z'\-]*\*?|\d+", text)
    voiced = [i for i, m in enumerate(mouths) if m and m != "closed"] or list(range(len(mouths)))
    if not words or not voiced:
        return [0] * len(words)
    weights = [len(w.strip("*")) + 2 for w in words]
    total = sum(weights)
    starts, acc = [], 0
    for wgt in weights:
        idx = min(len(voiced) - 1, int(acc / total * len(voiced)))
        starts.append(voiced[idx])
        acc += wgt
    return starts


# Actions that happen WHILE the character keeps talking (no pause):
# everything except the ones with their own sound in the character's
# voice, and the few that need a moment on screen.
SEQUENTIAL_ACTIONS = {"turn-page", "sniff", "sleep", "wake", "walk-out", "fall", "shock", "run", "chase", "fight",
                      "kick", "push", "hug", "high-five", "climb", "jump-rope", "light-fire"}
OVERLAP_LEAD = 5  # frames an overlapping action starts before the next words


def _act_move(name: str, t: int, n_act: int, n: int, cid: str, c: dict, st: dict, x: float, stance: str,
              facing: str, dx: float, dy: float, pose: str, flags: dict, move, go_near, nearest,
              effects: list, events: list, per_frame: int, s_idx: int):
    """Body + position for the moving actions (fight, chase, climb…)."""
    def at_sample(frame: int) -> int:
        return frame * per_frame
    tgt = nearest(cid)
    if name == "walk-to" and t == 0:
        go_near(cid, n, 0.2, n_act)
    elif name == "step-back" and t == 0 and tgt:
        move(cid, c["x"] + (0.12 if c["x"] > st[tgt]["x"] else -0.12), n_act, n)
    elif name == "pace" and t == 0:
        move(cid, c["x"] + (0.1 if c["x"] < 0.5 else -0.1), n_act, n)
    elif name == "run":
        # runs off one side and comes back from the other
        k = t / max(1, n_act)
        out = 1.18 if c["x"] >= 0.5 else -0.18
        back = -0.18 if out > 1 else 1.18
        x = c["x"] + (out - c["x"]) * (k / 0.5) if k < 0.5 else back + (c["x"] - back) * ((k - 0.5) / 0.5)
        stance = "walk-a" if (t // 2) % 2 == 0 else "walk-b"
        facing = "right" if (out > 1) == (k < 0.5) or (out > 1 and k >= 0.5) else "left"
        facing = "right" if out > 1 else "left"
        if t % 8 == 0:
            effects.append({"type": "dust", "scene": s_idx, "frame": n, "x": round(max(0, min(1, x)), 3)})
    elif name == "chase" and tgt:
        # back and forth across the screen: the other one runs away, this one chases
        k = t / max(1, n_act)
        ease = min(1.0, k / 0.12) * min(1.0, (1 - k) / 0.12)  # start / stop smoothly
        ph = k * math.pi * 3
        x = c["x"] + (0.5 + 0.36 * math.sin(ph) - c["x"]) * ease
        rx = st[tgt]["x"] + (0.5 + 0.36 * math.sin(ph + 0.7) - st[tgt]["x"]) * ease
        going_right = math.cos(ph) > 0
        st[tgt]["over"] = {"until": n + 2, "x": rx, "facing": "right" if math.cos(ph + 0.7) > 0 else "left",
                           "expr": "surprised", "emote": "exclaim"}
        stance = "walk-a" if (t // 2) % 2 == 0 else "walk-b"
        facing = "right" if going_right else "left"
        if t % 10 == 0:
            effects.append({"type": "dust", "scene": s_idx, "frame": n, "x": round(max(0, min(1, x)), 3)})
    elif name in ("fight", "kick", "push", "hug", "high-five"):
        gap = {"fight": 0.15, "kick": 0.17, "push": 0.14, "hug": 0.1, "high-five": 0.13}[name]
        if t == 0:
            go_near(cid, n, gap, 10, run=name in ("fight", "kick"))
        if tgt and t >= 10:
            mid = (c["x"] + st[tgt]["x"]) / 2
            if name == "fight":
                pose = "point" if (t // 4) % 2 == 0 else "hips"
                if t in (14, 22, 30, 38, 46):
                    events.append((at_sample(n), "punch" if t % 16 == 14 else "slap"))
                    effects.append({"type": "hit", "scene": s_idx, "frame": n, "x": round(mid, 3)})
                    st[tgt]["over"] = {"until": n + 6, "expr": "surprised", "shake": True, "emote": "dizzy"}
                dx += (8 if (t // 4) % 2 == 0 else 0) * (1 if facing == "right" else -1)
            elif name == "kick" and t == 14:
                events.append((at_sample(n), "punch"))
                effects.append({"type": "hit", "scene": s_idx, "frame": n, "x": round(mid, 3)})
                side = 1 if st[tgt]["x"] > c["x"] else -1
                st[tgt]["over"] = {"until": n + 14, "expr": "surprised", "emote": "dizzy", "shake": True}
                move(tgt, st[tgt]["x"] + side * 0.14, 10, n)
            elif name == "push" and t == 12:
                events.append((at_sample(n), "boing"))
                side = 1 if st[tgt]["x"] > c["x"] else -1
                st[tgt]["over"] = {"until": n + 12, "expr": "surprised"}
                move(tgt, st[tgt]["x"] + side * 0.12, 10, n)
            elif name == "hug":
                st[tgt]["over"] = {"until": n + 2, "pose": "shrug", "expr": "happy", "emote": "love"}
            elif name == "high-five":
                st[tgt]["over"] = {"until": n + 2, "pose": "wave", "expr": "happy"}
                if t == 14:
                    effects.append({"type": "sparkle", "scene": s_idx, "frame": n, "x": round(mid, 3)})
        if name in ("fight", "kick") and t == n_act - 8 and tgt:
            move(cid, c["x"] + (-0.06 if st[tgt]["x"] > c["x"] else 0.06), 8, n)
    elif name == "climb":
        # up a ladder / tree, a moment at the top, and down again
        k = t / max(1, n_act)
        up = min(1.0, k / 0.42) if k < 0.58 else max(0.0, 1 - (k - 0.58) / 0.42)
        dy -= 170 * up
        flags["ladder"] = 1
        if k < 0.42 or k > 0.58:
            pose = "wave" if (t // 5) % 2 == 0 else "point"
    elif name == "jump-rope":
        phase = (t % 12) / 12
        dy -= 34 * max(0.0, math.sin(math.pi * phase * 2)) if phase < 0.5 else 0
        flags["rope"] = round(phase, 2)
    elif name == "light-fire":
        dy += 22 * min(1.0, t / 8)  # bends down
        flags["match"] = 1
        if t == 18:
            side = 1 if facing == "right" else -1
            effects.append({"type": "fire", "scene": s_idx, "frame": n, "x": round(x + side * 0.09, 3)})
            events.append((at_sample(n), "magic"))
    return x, stance, facing, dx, dy, pose, flags


_TAKE_VERBS = {"carry", "pick"}
_LET_GO_VERBS = {"drop", "give", "throw", "eat"}


def _hands_by_line(story: list[dict], title: str = "") -> dict:
    """What each character still holds from an EARLIER scene, line by line
    (user, 2026-11-18: the cookie jar vanished after the kitchen). Inside a
    scene the 3D world carries the real thing; from the next scene on the
    character keeps it in hand until a line lets it go (drop / give / throw /
    eat / picks up something else) or a new day starts."""
    held: dict[str, str] = {}
    clock = _clock_of(title)
    out: dict = {}
    for si, sc in enumerate(story):
        said = " ".join(str(ln.get("text") or "") for ln in sc.get("lines") or [])
        new_clock = _clock_of(" ".join([str(sc.get("time_skip") or ""), str(sc.get("location") or "")])) or _clock_of(said) or clock
        if clock and new_clock != clock:
            held.clear()  # a new day / night: hands are empty again
        clock = new_clock
        carry_in = dict(held)
        for li, ln in enumerate(sc.get("lines") or []):
            spk = ln.get("speaker")
            for seg in ln.get("segments") or []:
                v, obj = seg.get("wact") or seg.get("act") or "", str(seg.get("obj") or "").lower()
                if seg.get("hold"):
                    carry_in[spk] = str(seg["hold"]).lower()  # shown now, for this scene
                elif v in _TAKE_VERBS and obj:
                    held[spk] = obj
                    carry_in.pop(spk, None)
                elif seg.get("wact") and v in _LET_GO_VERBS and spk in held and (
                        obj in held[spk] or held[spk] in obj or (not obj and v in ("drop", "give"))):
                    held.pop(spk, None)
                    carry_in.pop(spk, None)
            out[(si, li)] = dict(carry_in)
    return out


def _direct(job: dict, story: list[dict], plans: list[dict], chars: dict, audio_dir: Path) -> dict:
    """The director: walks through every scene, line, spoken part and
    action, and builds the voice track and the frame-by-frame acting
    TOGETHER — so voice, mouths, actions and sounds can never drift."""
    per_frame = SAMPLE_RATE // FPS
    fmt = job["format"]
    W, H = FORMATS[fmt]
    sw, sh = _sprite_size(fmt)
    u = sh / 400
    feet = _feet_y(fmt)
    order = list(chars)
    tts_keys = job.get("tts_keys") or {}
    frames: list[dict] = []
    cues: list[dict] = []
    events: list[tuple[int, str]] = []
    pops: list[dict] = []
    screens: list[dict] = []  # {screen:…} inserts: [{start, end, text}] in frames
    inserts: list[dict] = []  # motion-graphic panels ({meter:…}, {map:…}…): [{start, end, spec}]
    outfit_now: dict[str, str] = {}  # {wear:…}: clothes stay on until changed
    pop_seen: set[str] = set()  # each thing pops up once per video
    forms: dict[str, str] = {}  # cid -> what they were turned into (frog…), kept across scenes
    morph_words = {seg["morph"].lower() for sc in story for ln in sc["lines"] for seg in ln["segments"] if seg.get("morph")}
    morph_words |= {_species_word(w) for w in morph_words if _species_word(w)}
    morph_now: dict = {}  # the transformation happening right now
    extras: list[dict] = []
    effects: list[dict] = []  # fire, dust, sparkles…
    punch_at: set[int] = set()
    voice = array("h")
    total = sum(len(l["segments"]) for s in story for l in s["lines"]) or 1
    done = [0]

    def speak(text: str, cid: str, name: str, prosody: dict | None = None) -> array:
        import hashlib
        char = chars.get(cid) or {"voice": {}, "name": "?"}
        # The file name holds a hash of text + voice + tone, so an edited
        # line (or a new tone) is voiced again and nothing else is.
        sig = hashlib.md5(json.dumps([text, char.get("voice"), prosody, job["language"], job.get("acting", True)],
                                     sort_keys=True).encode()).hexdigest()[:10]
        out = audio_dir / f"{name}-{sig}.wav"
        if not out.exists():
            engine = _voice_line(text, char, job["language"], order.index(cid) if cid in order else 0,
                                 out, audio_dir, tts_keys, prosody, bool(job.get("acting", True)))
            if prosody and engine in ("gemini", "elevenlabs-v3"):
                # These voices act by themselves: keep only a held vowel (atempo).
                prosody = {**prosody, "fx": ",".join(x for x in str(prosody.get("fx", "")).split(",")
                                                     if x.startswith("atempo"))}
            if prosody and prosody.get("fx"):
                tmp = out.with_suffix(".fx.wav")
                try:
                    _run_ffmpeg(["-i", str(out), "-af", prosody["fx"], "-ac", "1", "-ar", str(SAMPLE_RATE),
                                 "-c:a", "pcm_s16le", str(tmp)])
                    tmp.replace(out)
                except Exception:  # noqa: BLE001 — keep the plain take
                    tmp.unlink(missing_ok=True)
        return _loud(_trim(_read_pcm(out)))

    def tick() -> None:
        done[0] += 1
        _update(job, status="voicing", progress=15 + int(45 * done[0] / total),
                message=f"Voicing and acting… {done[0]} of {total}")

    def silence(n_frames: int) -> None:
        voice.extend(array("h", [0]) * (n_frames * per_frame))

    hands_plan = _hands_by_line(story, str(job.get("title") or ""))
    hand_now: dict[str, str] = {}
    for s_idx, scene in enumerate(story):
        hand_now.clear()
        hand_now.update(hands_plan.get((s_idx, 0), {}))
        plan = plans[s_idx]
        cast = scene["characters"]
        # ---- time-skip card ("Two hours later…") with a ticking clock
        if s_idx:
            events.append((len(voice), "whoosh"))  # every scene change has a transition + whoosh
        if scene.get("time_skip"):
            start = len(frames)
            for i in range(CARD_FRAMES):
                frames.append({"scene": s_idx, "chars": [], "cam": None,
                               "card": {"text": scene["time_skip"], "i": i, "n": CARD_FRAMES}})
                if i % 6 == 0:
                    events.append(((start + i) * per_frame, "tick" if (i // 6) % 2 == 0 else "tock"))
            silence(CARD_FRAMES)
            events.append((len(voice), "whoosh"))
        st = {cid: {"x": plan["x"][cid], "home": plan["x"][cid], "stance": plan["stance"][cid],
                    "expr": "normal", "sleep": False, "gone": False,
                    "hold": scene.get("holding", {}).get(cid, ""), "walk": cid in plan["walkers"],
                    "fallen": False, "move": None, "over": None} for cid in cast}
        scene_start = len(frames)
        cam = {"z": 1.0, "x": W / 2, "y": H / 2}
        # The "camera operator" (user: the more camera movement, the more
        # alive): every line gets a shot — wide, two-shot push, medium or
        # close-up on the speaker, or a cut-away to the listener — and the
        # camera keeps drifting / pushing in. Fast moves get a whoosh.
        shot = {"z": 1.0, "x": W / 2, "y": H / 2, "push": 0.0006, "fast": 0, "punch": 0, "shake": 0}
        overlays: dict[str, dict] = {}  # cid -> action running alongside speech

        said_now = {"text": ""}

        def nearest(cid: str) -> str | None:
            """The other character this one acts on: the one NAMED in the line
            ("Take that, monkey!"), else the closest."""
            others = [o for o in cast if o != cid and not st[o]["gone"] and not st[o]["sleep"]]
            if not others:
                return None
            low = said_now["text"].lower()
            named = [o for o in others if str(chars.get(o, {}).get("name", "")).lower() in low]
            pool = named or others
            return min(pool, key=lambda o: abs(st[o]["x"] - st[cid]["x"]))

        def move(cid: str, to: float, frames_n: int, start: int, run: bool = False) -> None:
            """Walk (or run) a character to a new spot; legs walk, even while talking."""
            to = max(0.08, min(0.92, to))
            if abs(to - st[cid]["x"]) < 0.01:
                return
            st[cid]["move"] = {"from": st[cid]["x"], "to": to, "start": start, "n": max(4, frames_n), "run": run}
            st[cid]["x"] = to  # where it will stand afterwards

        def go_near(cid: str, start: int, gap: float, frames_n: int, run: bool = False) -> str | None:
            tgt = nearest(cid)
            if tgt:
                side = 1 if st[cid]["x"] < st[tgt]["x"] else -1
                move(cid, st[tgt]["x"] - side * gap, frames_n, start, run)
            return tgt

        def head_px(cid: str) -> tuple[float, float]:
            c = st[cid]
            drop = SIT_DROP_UNITS if c["stance"] == "sit" else 0
            return c["x"] * W, feet - sh + (88 + drop) * u

        scene_extras: list[dict] = []

        def bring_extra(word: str, cid: str, at: int, forced: bool) -> None:
            """An animal / vehicle / thing walks, drives or pops into the scene."""
            place = plan["layout"]["kind"]
            outdoor = place in ("park", "street", "plain", "jungle", "forest", "beach", "desert", "mountain", "snow",
                                "farm", "village", "space", "underwater", "custom")
            if not forced and place in ("bus", "train", "car", "plane"):
                return  # nothing walks into a moving bus by itself
            kinds = {"animal", "vehicle"} if outdoor else {"animal"}
            low = word.lower()
            sp_word = _species_word(low)
            if sp_word and any(chars.get(o, {}).get("species") == sp_word for o in cast):
                return  # that animal is already here as a character
            if any(e["word"] == low or e["word"] == low.rstrip("s") for e in scene_extras):
                return
            if not forced and (low in morph_words or low.rstrip("s") in morph_words
                               or (sp_word and sp_word in morph_words)):
                return  # "a frog!" = the friend who was turned into one, not a new frog walking in
            found = _asset_for(low, kinds=None if forced else kinds, strong=not forced)
            if not found and _species_word(low):
                found = {"src": "", "kind": "animal", "name": _species_word(low)}
            if not found and forced and low in _ICON_OF:
                found = {"src": _ICON_OF[low], "kind": "object", "name": low}
            if not found:
                return
            taken = sorted(st[c]["x"] for c in cast if not st[c]["gone"])
            spots = [0.08] + taken + [0.92]
            gaps = sorted(((spots[i + 1] - spots[i], (spots[i] + spots[i + 1]) / 2) for i in range(len(spots) - 1)),
                          reverse=True)
            x = gaps[0][1] if gaps else 0.5
            for e in scene_extras:  # do not stack on another extra
                if abs(e["x"] - x) < 0.1:
                    x = min(0.9, x + 0.14)
            big = {"elephant", "horse", "cow", "camel", "giraffe", "bear", "lion", "tiger", "rhinoceros", "crocodile",
                   "hippopotamus", "ox", "water buffalo", "bison", "gorilla", "dinosaur", "sauropod", "t-rex"}
            small = {"mouse", "rat", "bird", "chick", "baby chick", "bee", "honeybee", "ant", "bug", "butterfly",
                     "spider", "snail", "lady beetle", "cockroach", "mosquito", "fly", "hamster", "frog"}
            name = found["name"]
            if not forced and not outdoor and name in big:
                return  # an elephant only walks into the classroom when the script asks for it
            size = 0.32 if (found["kind"] == "vehicle" or name in big) else 0.09 if name in small else 0.17
            motion = {"animal": "walk", "vehicle": "drive"}.get(found["kind"], "pop")
            if name in small and found["kind"] == "animal" and any(k in name for k in ("bird", "bee", "butterfly", "fly", "mosquito")):
                motion = "fly"
            side = "left" if x < 0.5 else "right"
            extra = {"scene": s_idx, "src": found["src"], "name": name, "word": low, "kind": found["kind"],
                     "enter": at, "x": round(x, 3),
                     "size": size, "motion": motion, "from": side}
            scene_extras.append(extra)
            extras.append(extra)
            events.append((at * per_frame, {"walk": "footsteps", "drive": "horn", "fly": "whoosh"}.get(motion, "pop")))

        def plan_shot(cid: str, line: dict, l_idx: int) -> None:
            import random
            rng = random.Random(f'{job["id"]}-{s_idx}-{l_idx}')
            hx, hy = head_px(cid)
            others = [o for o in cast if o != cid and not st[o]["gone"]]
            loud = line.get("tone") == "shout" or (line["expression"] == "angry" and "!" in line["text"])
            if loud or line["expression"] == "surprised":
                kind = "close"
            elif l_idx == 0:
                kind = "wide"
            else:
                kind = rng.choice(["medium", "medium", "two", "close", "wide", "listener"] if others
                                  else ["medium", "close", "wide"])
            if kind == "listener" and others:
                lx, ly = head_px(rng.choice(others))
                target = (1.3, lx, ly + 70 * u)
            elif kind == "close":
                target = (1.35, hx, hy + 70 * u)
            elif kind == "medium":
                target = (1.2, hx + (W / 2 - hx) * 0.25, hy + 120 * u)
            elif kind == "two" and others:
                ox, _ = head_px(others[0])
                target = (1.1, (hx + ox) / 2, H / 2 + 20 * u)
            else:
                target = (1.0, W / 2, H / 2)
            big = abs(target[0] - shot["z"]) > 0.12 or abs(target[1] - shot["x"]) > W * 0.12
            shot.update(z=target[0], x=target[1], y=target[2], push=rng.choice([0.0008, 0.0012, -0.0005, 0.001]))
            if big:
                shot["fast"] = 8
                events.append((len(frames) * per_frame, "whoosh"))
            if loud:
                shot["shake"] = 14

        def make_frame(speaker: str | None = None, mouth: str | None = None, level: float = 0.0,
                       line: dict | None = None, t_line: int = 0, act: dict | None = None,
                       nod: int = -1) -> None:
            n = len(frames)
            t_scene = n - scene_start
            states = []
            cam_target = (min(1.6, shot["z"] + shot["push"] * t_line), shot["x"], shot["y"])
            shake = (0.0, 0.0)
            if shot["shake"] > 0:  # shouting shakes the picture
                shot["shake"] -= 1
                shake = (((n * 7919) % 17 - 8) * 1.4, ((n * 104729) % 13 - 6) * 1.4)
            visible = [cid for cid in cast if not st[cid]["gone"]]
            for c_idx, cid in enumerate(cast):
                c = st[cid]
                if c["gone"]:
                    continue
                x = c["x"]
                facing = "right" if c["home"] <= 0.5 else "left"
                stance = c["stance"]
                pose = HOLD_ITEMS.get(c["hold"], "idle")
                expr = c["expr"]
                m: str | None = None
                blink = (n + c_idx * 37) % 86 < 3
                dx, dy, rot = 0.0, 0.0, 0.0  # breathing / sway are done by the rig
                flags: dict = {}
                emote = None
                # Eyes: on the speaker, or on the nearest other character.
                others = [o for o in visible if o != cid]
                target = speaker if speaker and speaker != cid and speaker in visible else \
                    (min(others, key=lambda o: abs(st[o]["x"] - x)) if others else None)
                look = ("right" if st[target]["x"] > x else "left") if target else "center"
                if c["walk"] and t_scene < WALK_FRAMES - 4:
                    t = t_scene / (WALK_FRAMES - 4)
                    start_x = -0.12 if c["home"] <= 0.5 else 1.12
                    x = start_x + (c["home"] - start_x) * (1 - (1 - t) ** 2)
                    stance = "walk-a" if (t_scene // 4) % 2 == 0 else "walk-b"
                    facing = "right" if start_x < 0 else "left"
                    look, blink, dy = "center", False, 0
                mv = c["move"]
                if mv and n >= mv["start"]:
                    k = min(1.0, (n - mv["start"]) / mv["n"])
                    e = k * k * (3 - 2 * k)
                    x = mv["from"] + (mv["to"] - mv["from"]) * e
                    if k < 1:
                        step = 2 if mv["run"] else 4
                        stance = "walk-a" if ((n - mv["start"]) // step) % 2 == 0 else "walk-b"
                        facing = "right" if mv["to"] > mv["from"] else "left"
                        if mv["run"] and (n - mv["start"]) % 8 == 0:
                            effects.append({"type": "dust", "scene": s_idx, "frame": n, "x": round(x, 3)})
                    else:
                        c["move"] = None
                elif mv:
                    x = mv["from"]
                if not c["move"] and not c["walk"] and others and stance in ("stand", "sit"):
                    facing = "right" if st[target]["x"] > x else "left"  # face the one you talk with
                ov2 = c["over"]
                if ov2 and n < ov2["until"]:
                    pose = ov2.get("pose", pose)
                    expr = ov2.get("expr", expr)
                    if ov2.get("emote"):
                        emote = (ov2["emote"], (n // 6) % 2)
                    if ov2.get("shake"):
                        dx += 6 if (n // 2) % 2 else -6
                    if ov2.get("x") is not None:
                        x = ov2["x"]
                        stance = "walk-a" if (n // 2) % 2 == 0 else "walk-b"
                        facing = ov2.get("facing", facing)
                if c["sleep"]:
                    stance, pose, blink, m = "lie", "idle", True, "flat"
                    flags["blanket"] = True
                    emote = ("zzz", (n // 10) % 2)
                if cid == speaker and line and not c["sleep"]:
                    expr = line["expression"]
                    m = mouth
                    # Holding a book/phone: keep it, unless the line needs a big gesture.
                    if line["pose"] != "idle" and (not c["hold"] or line["pose"] in ("point", "wave", "shrug")):
                        pose = line["pose"]
                    elif not c["hold"]:
                        pose = "talk" if (t_line // 30) % 2 else "idle"
                elif speaker and line and cid != speaker and not c["sleep"] and t_line > 8:
                    # Listeners react to what they hear (like real comedy
                    # shorts): flinch at shouting, smile along, look worried.
                    said = line["expression"]
                    loud = line.get("tone") == "shout" or (said == "angry" and "!" in line["text"])
                    if loud:
                        expr = "surprised"
                    elif said == "happy" and expr == "normal" and (t_line // 40 + c_idx) % 2 == 0:
                        expr = "happy"
                    elif said == "sad" and expr == "normal":
                        expr = "sad"
                    elif said == "surprised" and expr == "normal" and t_line < 40:
                        expr = "surprised"
                    elif said == "suspicious" and expr == "normal":
                        expr = "suspicious"
                if cid == speaker and line and m and (line.get("tone") == "shout" or
                                                       (line["expression"] == "angry" and "!" in line["text"])):
                    dx += ((n * 7919) % 7 - 3) * 0.8  # trembling with anger
                    dy += ((n * 104729) % 5 - 2) * 0.6
                if morph_now and not c["sleep"]:
                    # everybody SEES the magic: the one changing is shocked, the others stare
                    mt = morph_now["t"]
                    if cid == morph_now["cid"]:
                        expr, m = "surprised", (m if m else "o")
                        if mt < MORPH_SWAP:
                            dx += ((n * 7919) % 7 - 3) * 1.2
                    elif cid != morph_now.get("caster") or mt > MORPH_SWAP:
                        expr = "surprised"
                        if mt > MORPH_SWAP and m is None:
                            m = "o"
                        look = "right" if st[morph_now["cid"]]["x"] > x else "left"
                cur = act if act and act["cid"] == cid else None
                ov = overlays.get(cid)
                if not cur and ov and 0 <= n - ov["start"] < ov["n"]:
                    cur = {**ov, "t": n - ov["start"], "overlay": True}
                if cur:
                    act_here = cur
                    spec, t, n_act = ACTIONS[act_here["name"]], act_here["t"], act_here["n"]
                    talking = cid == speaker and m is not None
                    if "pose" in spec:
                        pose = spec["pose"]
                    if "poses" in spec:
                        pose = spec["poses"][(t // 6) % len(spec["poses"])]
                    if not talking:  # while talking, the face follows the words
                        expr = spec.get("expr", expr)
                        if "mouth" in spec:
                            m = spec["mouth"]
                        if "mouths" in spec:
                            m = spec["mouths"][(t // 4) % len(spec["mouths"])]
                    if act_here.get("mouths") and t < len(act_here["mouths"]) and "mouths" not in spec:
                        m = act_here["mouths"][t] or m  # vocal: mouth follows the sound
                    flags.update(spec.get("flags", {}))
                    if "emote" in spec:
                        emote = (spec["emote"], (t // 6) % 2)
                    if "looks" in spec:
                        look = spec["looks"][min(len(spec["looks"]) - 1, t * len(spec["looks"]) // n_act)]
                    mdx, mdy, mrot = _motion(spec.get("motion", ""), t, n_act)
                    dx, dy, rot = dx + mdx, dy + mdy, rot + mrot
                    if act_here["name"] == "walk-out":
                        side = -0.15 if c["home"] <= 0.5 else 1.15
                        x = c["home"] + (side - c["home"]) * (t / n_act) ** 1.5
                        stance = "walk-a" if (t // 4) % 2 == 0 else "walk-b"
                        facing, look, blink = ("left" if side < 0 else "right"), "center", False
                    if act_here["name"] == "fall":
                        stance = "stand"
                    name_ = act_here["name"]
                    if name_ in MOVE_ACTIONS or name_ in ("climb", "jump-rope", "light-fire"):
                        x, stance, facing, dx, dy, pose, flags = _act_move(
                            name_, t, n_act, n, cid, c, st, x, stance, facing, dx, dy, pose, flags,
                            move, go_near, nearest, effects, events, per_frame, s_idx)
                    if spec.get("camera") == "zoom" and not c["sleep"]:
                        hx, hy = head_px(cid)
                        cam_target = (1.22, hx, hy + 40 * u)
                    if spec.get("camera") == "shake" and t < 10:
                        shake = (((n * 7919) % 17 - 8) * 1.2, ((n * 104729) % 13 - 6) * 1.2)
                elif nod >= 0 and cid != speaker and nod < 16 and not c["sleep"] and stance in ("stand", "sit"):
                    dy += 5 * math.sin(2 * math.pi * nod / 8)
                sprite_stance = "stand" if stance in ("lie",) else stance
                states.append({
                    "cid": cid, "x": round(x, 4), "facing": facing, "stance": stance,
                    "sprite_stance": sprite_stance, "pose": pose, "expr": expr, "mouth": m,
                    "blink": bool(blink), "look": look, "flags": flags,
                    "dx": round(dx, 1), "dy": round(dy, 1), "rot": round(rot / 5) * 5,
                    "emote": list(emote) if emote else None,
                    "act": cur["name"] if cur else None,
                    "wact": ({**cur["wact"], "t": cur["t"]} if cur and cur.get("wact") else None),
                    "form": forms.get(cid) or None,
                    "outfit": outfit_now.get(cid) or None,
                    "hand": hand_now.get(cid) or None,
                    "morph": ({k: morph_now[k] for k in ("t", "n", "to", "was", "swap")}
                              if morph_now.get("cid") == cid else None),
                })
            if morph_now and not st[morph_now["cid"]]["gone"]:
                hx_, hy_ = head_px(morph_now["cid"])
                cam_target = (1.35 if morph_now["t"] < MORPH_SWAP + 14 else 1.1, hx_, hy_ + 60 * u)
                if morph_now["t"] == 0:
                    shot["fast"] = 6
            # Camera: fast moves snap in a few frames (with a whoosh), the
            # rest glides; a hand-held drift keeps it alive; pops punch in.
            z, fx, fy = cam_target
            if n in punch_at:
                shot["punch"] = 6
            if shot["punch"] > 0:
                z += 0.07 * shot["punch"] / 6
                shot["punch"] -= 1
            k = 0.32 if shot["fast"] > 0 else 0.07
            shot["fast"] = max(0, shot["fast"] - 1)
            cam["z"] += (z - cam["z"]) * k
            cam["x"] += (fx - cam["x"]) * k
            cam["y"] += (fy - cam["y"]) * k
            drift = (math.sin(n / 37) * 6 + math.sin(n / 13) * 2) * u, (math.sin(n / 29 + 1) * 4) * u
            shake = (shake[0] + drift[0], shake[1] + drift[1])
            frames.append({"scene": s_idx, "chars": states,
                           "cam": {"z": round(cam["z"], 3), "x": round(cam["x"]), "y": round(cam["y"]),
                                   "sx": round(shake[0]), "sy": round(shake[1])}})

        # ---- characters walk in
        if plan["walkers"]:
            events.append((len(voice) + per_frame * 2, "footsteps"))
        for _ in range(plan["lead"]):
            make_frame()
        silence(plan["lead"])
        # ---- the lines
        for l_idx, line in enumerate(scene["lines"]):
            hand_now.clear()
            hand_now.update(hands_plan.get((s_idx, l_idx), {}))
            speaker = line["speaker"]
            if speaker not in st:
                continue
            if line.get("sfx"):
                events.append((len(voice), line["sfx"]))
            said_now["text"] = line["text"]
            if not st[speaker]["sleep"]:
                plan_shot(speaker, line, l_idx)
            # Walk-and-talk: now and then the speaker steps closer (excited,
            # angry) or wanders a little (thinking) while saying the line.
            import random as _r
            rr = _r.Random(f'{job["id"]}-walk-{s_idx}-{l_idx}')
            sp_st = st[speaker]
            if (sp_st["stance"] == "stand" and not sp_st["sleep"] and not sp_st["move"] and not sp_st["hold"]
                    and not scene.get("calm") and rr.random() < 0.3):
                tgt = nearest(speaker)
                if tgt and abs(st[tgt]["x"] - sp_st["x"]) > 0.24 and line["expression"] in ("angry", "happy", "surprised"):
                    go_near(speaker, len(frames) + 2, 0.2, 18)
                else:
                    move(speaker, sp_st["x"] + rr.choice([-0.07, 0.07]), 20, len(frames) + 2)
            t_line = 0
            for k, seg in enumerate(line["segments"]):
                tick()
                if "say" in seg:
                    said = seg["say"].replace("*", "")
                    pcm = speak(said, speaker, f"{s_idx:02d}-{l_idx:03d}-{k}", _tone_for(line, said)[1])
                    mouths = _mouth_track(pcm)
                    start = len(frames)
                    cues.append({"start": start / FPS, "end": (start + len(mouths)) / FPS, "text": said,
                                 "line": [s_idx, l_idx]})
                    # Pop-ups exactly on their word (2 frames early: the eye is slower than the ear).
                    starts = _word_starts(seg["say"], mouths)
                    hx, hy = head_px(speaker)
                    side = 1 if st[speaker]["x"] <= 0.5 else -1
                    for p_i, (w_idx, kind, value) in enumerate(_pop_words(seg["say"])):
                        at = max(start, start + starts[min(w_idx, len(starts) - 1)] - 2)
                        # Rare = special: only for a really new thing, and never close to the last one.
                        starred = "*" in seg["say"]
                        if pops and at - pops[-1]["frame"] < (FPS * 3 if starred else FPS * 7):
                            continue
                        if kind == "text" and not starred:
                            continue
                        if kind == "icon" and value in pop_seen and not starred:
                            continue
                        pop_seen.add(value)
                        pops.append({"frame": at, "kind": kind, "value": value, "n": 30,
                                     "x": round(hx + side * (170 + 150 * p_i) * u),
                                     "y": round(hy - (40 + 70 * p_i) * u),
                                     "style": len(pops) % 3})
                        events.append((at * per_frame, "pop"))
                        punch_at.add(at)
                    # Talked about = shows up (user: "they talk about a cat, but no cat").
                    for w_idx, word in enumerate(re.findall(r"\*?[A-Za-z'][A-Za-z'\-]*\*?|\d+", seg["say"])):
                        if len(scene_extras) < 3:
                            at = start + starts[min(w_idx, len(starts) - 1)]
                            bring_extra(word.strip("*"), speaker, at, forced=False)
                    for m in mouths:
                        lvl = 1.0 if m == "talk-open" else 0.5 if m == "talk-half" else 0.0
                        make_frame(speaker, m, lvl, line, t_line)
                        t_line += 1
                    pcm.extend(array("h", [0]) * max(0, len(mouths) * per_frame - len(pcm)))
                    voice.extend(pcm[:len(mouths) * per_frame])
                elif "show" in seg:
                    bring_extra(seg["show"], speaker, len(frames), forced=True)
                    continue
                elif "insert" in seg:
                    st0 = len(frames)
                    if inserts and inserts[-1]["end"] > st0:
                        inserts[-1]["end"] = max(inserts[-1]["start"] + int(FPS * 1.2), st0)  # the next one takes over
                        if inserts[-1]["end"] > st0:
                            st0 = inserts[-1]["end"]
                    inserts.append({"start": st0, "end": st0 + int(FPS * seg["insert"]["secs"]), "spec": seg["insert"]})
                    continue
                elif "screen" in seg:
                    st0 = len(frames)
                    if screens and screens[-1]["end"] > st0:
                        screens[-1]["end"] = st0  # the next screen replaces it
                    screens.append({"start": st0, "end": st0 + int(FPS * 3.2), "text": seg["screen"]})
                    continue
                elif "wear" in seg:
                    outfit_now[speaker] = "" if seg["wear"].lower() in ("normal", "own", "usual", "back") else seg["wear"].lower()
                    continue
                elif "unknown" in seg or "hold" in seg or "place" in seg:
                    continue  # skipped / shown by the 3D world (a thing in the hand, a thing put down)
                elif "cam" in seg:
                    # your camera choice for this line (from a {closeup:Teddy} / {wide} tag)
                    who = seg.get("who", "").lower()
                    tgt = next((o for o in cast if str(chars.get(o, {}).get("name", "")).lower() == who or o.lower() == who), None) or speaker
                    if seg["cam"] == "close" and not st[tgt]["gone"]:
                        hx_, hy_ = head_px(tgt)
                        shot.update(z=1.45, x=hx_, y=hy_ + 70 * u, push=0.0006, fast=8)
                    else:
                        shot.update(z=0.95, x=W / 2, y=H / 2, push=-0.0004, fast=8)
                    continue
                elif "morph" in seg:
                    who = seg.get("who", "").lower()
                    target = next((o for o in cast if who and (str(chars.get(o, {}).get("name", "")).lower() == who
                                                                or o.lower() == who)), None) or speaker
                    if st[target]["gone"]:
                        continue
                    form = seg["morph"].lower()
                    own = str(chars.get(target, {}).get("name", "")).lower()
                    back = form in MORPH_BACK or form == own or not form
                    if back and not forms.get(target):
                        continue
                    morph_now.clear()
                    morph_now.update({"cid": target, "caster": speaker if speaker != target else None,
                                      "to": "" if back else form, "was": forms.get(target, ""),
                                      "n": MORPH_FRAMES, "swap": MORPH_SWAP, "t": 0})
                    events.append((len(voice), "magic"))
                    events.append((len(voice) + MORPH_SWAP * per_frame, "boing"))
                    events.append((len(voice) + (MORPH_SWAP - 1) * per_frame, "whoosh"))
                    act = {"cid": speaker, "name": "w-cast" if speaker != target else "shock", "t": 0,
                           "n": MORPH_FRAMES, "mouths": None}
                    for t in range(MORPH_FRAMES):
                        morph_now["t"] = t
                        if t == MORPH_SWAP:
                            if back:
                                forms.pop(target, None)
                            else:
                                forms[target] = form
                        act["t"] = min(t, ACTIONS[act["name"]]["frames"] - 1)
                        make_frame(None, None, 0.0, line, t_line, act)
                        t_line += 1
                    morph_now.clear()
                    silence(MORPH_FRAMES)
                elif "wact" in seg:
                    # {climb:tree}, {swim:river}…: the 3D world plays it; here
                    # the time, the sounds (on the frames the 3D brain uses)
                    # and a simple 2D look.
                    wv = seg["wact"]
                    wspec = WORLD_ACTS.get(wv) or _custom_spec(wv)
                    n_act = wspec["n"]
                    for t_s, s_name in wspec["sfx"]:
                        events.append((len(voice) + t_s * per_frame, s_name))
                    act = {"cid": speaker, "name": wspec["look"], "t": 0, "n": n_act, "mouths": None,
                           "wact": {"v": wv, "o": seg.get("obj", ""), "n": n_act, "id": f"{s_idx}-{l_idx}-{k}"}}
                    for t in range(n_act):
                        act["t"] = t
                        make_frame(None, None, 0.0, line, t_line, act)
                        t_line += 1
                    silence(n_act)
                else:
                    name = seg["act"]
                    spec = ACTIONS[name]
                    n_act = spec["frames"]
                    vocal = None
                    if not spec.get("vocal") and name not in SEQUENTIAL_ACTIONS:
                        # Runs WHILE the character keeps going: no dead air.
                        if spec.get("sfx"):
                            events.append((len(voice), spec["sfx"]))
                        overlays[speaker] = {"cid": speaker, "name": name, "start": len(frames),
                                             "n": n_act, "mouths": None}
                        lead = OVERLAP_LEAD if k == len(line["segments"]) - 1 or k == 0 else 2
                        for _ in range(lead):
                            make_frame(None, None, 0.0, line, t_line)
                            t_line += 1
                        silence(lead)
                        continue
                    if spec.get("vocal"):
                        try:
                            pros = _tone_for({"expression": spec.get("expr", "normal")}, spec["vocal"])[1]
                            if spec.get("stretch"):
                                pros["fx"] = ",".join(x for x in (pros.get("fx"), f"atempo={spec['stretch']}") if x)
                            vocal = speak(spec["vocal"], speaker, f"vocal-{speaker}-{name}", pros)
                            n_act = max(n_act, -(-len(vocal) // per_frame) + 2)
                        except Exception:  # noqa: BLE001
                            vocal = None
                    if spec.get("sfx"):
                        events.append((len(voice), spec["sfx"]))
                    if spec.get("persist") == "sleep":
                        st[speaker]["sleep"] = True
                    if spec.get("persist") == "awake":
                        st[speaker]["sleep"] = False
                    act = {"cid": speaker, "name": name, "t": 0, "n": n_act,
                           "mouths": _mouth_track(vocal) if vocal else None}
                    for t in range(n_act):
                        act["t"] = t
                        make_frame(None, None, 0.0, line, t_line, act)
                        t_line += 1
                    if vocal:
                        vocal.extend(array("h", [0]) * max(0, n_act * per_frame - len(vocal)))
                        voice.extend(vocal[:n_act * per_frame])
                    else:
                        silence(n_act)
                    if spec.get("persist") == "gone":
                        st[speaker]["gone"] = True
                # A breath between parts of one line.
                if k < len(line["segments"]) - 1 and "say" in seg:
                    make_frame(speaker, None, 0.0, line, t_line)
                    t_line += 1
                    silence(1)
            st[speaker]["expr"] = line["expression"] if not st[speaker]["sleep"] else "normal"
            gap = int(LINE_GAP * FPS)
            for g in range(gap):
                make_frame(nod=g if l_idx % 2 == 0 else -1)
            silence(gap)
    if frames:  # hold the last picture a moment
        last = frames[-1]
        hold = int(0.8 * FPS)
        frames += [last] * hold
        silence(hold)
    return {"frames": frames, "cues": cues, "events": events, "voice": voice, "pops": pops, "extras": extras,
            "effects": effects, "screens": screens, "inserts": inserts}


def _sprite_key(s: dict) -> str:
    f = s["flags"]
    flag_code = "".join(k[0] for k in ("tears", "sweat", "smell", "blanket") if f.get(k)) or "n"
    return (f"{s['cid']}_{s['pose']}_{s['expr']}_{s['mouth'] or 'x'}_{int(s['blink'])}_"
            f"{s['facing'][0]}_{s['sprite_stance']}_{s['look'][0]}_{flag_code}")


def _collect_sprites(frames: list[dict]) -> tuple[list[dict], list[dict]]:
    sprites: dict[str, dict] = {}
    emotes: dict[str, dict] = {}
    for f in frames:
        for s in f["chars"]:
            key = _sprite_key(s)
            s["key"] = key
            if key not in sprites:
                sprites[key] = {"key": key, "character_id": s["cid"], "pose": s["pose"],
                                "expression": s["expr"], "mouth": s["mouth"], "blink": s["blink"],
                                "facing": s["facing"], "stance": s["sprite_stance"],
                                "look": s["look"], "flags": s["flags"]}
            if s.get("emote"):
                ekey = f"emote_{s['emote'][0]}_{s['emote'][1]}"
                emotes.setdefault(ekey, {"key": ekey, "name": s["emote"][0], "frame": s["emote"][1]})
    return list(sprites.values()), list(emotes.values())


def _sprite_size(fmt: str) -> tuple[int, int]:
    w, h = FORMATS[fmt]
    char_h = int(h * (0.66 if fmt == "long" else 0.42))
    return char_h // 2, char_h


def _feet_y(fmt: str) -> int:
    return int(FORMATS[fmt][1] * (0.97 if fmt == "long" else 0.80))


def _geometry(fmt: str) -> dict:
    """Pixel geometry shared with environment.ts: where the floor and the seats are."""
    w, h = FORMATS[fmt]
    sw, sh = _sprite_size(fmt)
    unit = sh / 400
    top = _feet_y(fmt) - sh
    return {"width": w, "height": h, "unit": unit,
            "floorY": round(top + (FLOOR_Y_UNITS + 10) * unit, 1),
            "seatY": round(top + (SEAT_TOP_UNITS + 10) * unit, 1)}


# ----------------------------------------------------------- the steps
def _step_story(job: dict, chars: list[dict]) -> None:
    jdir = ANIM_DIR / job["id"]
    if job.get("custom_script"):
        _update(job, status="writing", progress=5, message="Reading your script…")
        story = parse_custom_script(job["custom_script"], chars)
        source = "custom"
    else:
        _update(job, status="writing", progress=2, message="Writing the story outline…")

        def prog(i: int, n: int) -> None:
            _update(job, progress=3 + int(12 * i / max(1, n)),
                    message=f"Writing scene {i + 1} of {n}…")
        if job.get("gemini_key"):  # a job without a key keeps the key the Dashboard gave
            _AI["gemini_key"] = job.get("gemini_key")
        # your own idea goes to the writer with the title (user, 2026-11-18)
        brief = job["title"] + (f' — STORY IDEA FROM THE USER (follow it closely, make it a full, refined story): {job["idea"]}' if job.get("idea") else "")
        story, source = write_story(brief, job["minutes"], chars, job["language"], prog)
    _write_json(jdir / "script.json", {"title": job["title"], "scenes": story})
    left = skipped_tags(story)
    _update(job, story_source=source, skipped_tags=left,
            message="Story ready." + (f" These tags mean nothing to the app and are left out: {', '.join('{' + x + '}' for x in left)}" if left else ""),
            auto_chars=[c for c in chars if c.get("auto")])


def _with_look(job: dict, layout: dict) -> dict:
    """The look of a place for this video: a seed for the drawn styles
    (same place = same room within a video) and, sometimes, one of YOUR
    own backgrounds for that place from the Asset Library."""
    import random
    seed = int(job["id"][:6], 16) % 100000 + sum(ord(ch) * 131 for ch in layout["kind"])
    out = {**layout, "seed": seed}
    try:
        import tools_assets
        mine = tools_assets.place_images(layout["kind"])
    except Exception:  # noqa: BLE001
        mine = []
    rng = random.Random(seed)
    if mine and rng.random() < 0.6:
        pic = rng.choice(mine)
        out.update(image=f"lib:{pic['id']}", floor=float(pic.get("floor", 0.82)), transparent=True)
    elif layout["kind"] == "custom":
        out["outdoor"], out["decor"] = _custom_decor(layout.get("name", ""), seed)
    name = str(layout.get("name", "")).lower()
    if re.search(r"\brain|storm|monsoon|thunder", name):
        out["weather"] = "rain"
    elif layout["kind"] == "snow" or re.search(r"\bsnow", name):
        out["weather"] = "snow"
    if re.search(r"\bnight|midnight|dark\b", name + " " + str(layout.get("skip", "")).lower()):
        out["night"] = True
    return out


_NIGHT_RE = re.compile(r"\b(mid-?night|night|tonight|nighttime|bedtime|moonlight|moon|stars?|dark(?:ness)?|raat|late at night|after dark|evening)\b", re.I)
_DAY_RE = re.compile(r"\b(morning|sunrise|dawn|daylight|daytime|noon|afternoon|next day|the next day|subah|breakfast|sunny|sunshine|woke up the next)\b", re.I)


def _clock_of(text: str) -> str:
    """'night' / 'day' / '' from words (the later word wins: 'all night… by morning' = day)."""
    last, kind = -1, ""
    for rx, k in ((_NIGHT_RE, "night"), (_DAY_RE, "day")):
        for m in rx.finditer(text or ""):
            if m.start() > last:
                last, kind = m.start(), k
    return kind


_SURFACES = r"table|shelf|shelves|floor|counter|bed|sofa|couch|desk|fridge|stove|chair|ground|bench|cabinet|cupboard|tray|plate"
_ON_RE = re.compile(r"\b(?:on|onto|upon|on top of|atop)\s+(?:the|a|this|that|our|my)\s+(?:top\s+|kitchen\s+|big\s+|little\s+)?(" + _SURFACES + r")\b", re.I)
_FILLER = {"is", "was", "are", "were", "right", "still", "out", "up", "down", "just", "there", "here", "sitting", "lying", "left", "fell",
           "falls", "fall", "dropped", "drops", "lies", "sits", "put", "placed", "kept", "now", "all", "be", "been", "being", "lay", "laying",
           "standing", "stands", "hidden", "empty", "full", "big", "small", "little", "sweet", "secret", "old", "new", "open", "whole",
           "tiny", "huge", "shiny", "golden", "magic", "broken", "very", "so", "too", "again", "already"}
_NOT_ITEMS = {"i", "we", "you", "he", "she", "they", "it", "me", "us", "them", "him", "her", "someone", "everyone", "nobody", "who",
              "what", "that", "this", "something", "nothing", "anything", "everything", "one", "ones", "cat", "dog", "mom", "dad"}


def _things_on(text: str) -> list[tuple[str, str]]:
    """'the hidden jar of cookies is right on the top shelf' → [('jar', 'shelf')]."""
    out = []
    for m in _ON_RE.finditer(text or ""):
        before = re.split(r"[.!?,;:]", text[:m.start()])[-1].lower()
        det = list(re.finditer(r"\b(?:the|a|an|our|my|his|her|their|that|this|your)\s", before))
        if not det:
            continue
        phrase = before[det[-1].end():]
        if not phrase.strip() and len(det) > 1:
            phrase = before[det[-2].end():]
        phrase = re.split(r"\b(?:of|with|from|full)\b", phrase)[0]
        words = [w for w in re.findall(r"[a-z]+", phrase) if w not in _FILLER]
        if not words or words[-1] in _NOT_ITEMS or len(words[-1]) < 3:
            continue
        word = " ".join(words[-2:]) if len(words) >= 2 and words[-2] not in _NOT_ITEMS else words[-1]
        out.append((word[:30], m.group(1).lower().rstrip("s") if m.group(1).lower() != "shelves" else "shelf"))
    return out


def _layouts_3d(job: dict, plans: list[dict], story: list[dict]) -> list[dict]:
    """The drawn places + what the 3D world must have in each scene: the
    things the script uses ({climb:mango tree} → a mango tree), your own
    world from the Environment Designer, the scene's own words."""
    out = []
    # Time of day follows the story (user, 2026-11-18: a "midnight snack"
    # video was all sunshine): the title starts it, a card / scene that
    # says morning or night changes it, and it stays until it changes.
    clock = _clock_of(str(job.get("title") or "")) or ""
    for i, p in enumerate(plans):
        lay = _with_look(job, p["layout"])
        sc = story[i] if i < len(story) else {}
        card = " ".join([str(sc.get("time_skip") or ""), str(sc.get("location") or ""), str(p["layout"].get("name") or "")])
        said = " ".join(str(ln.get("text") or "") for ln in sc.get("lines") or [])
        clock = str(sc.get("clock") or "") or _clock_of(card) or _clock_of(said) or clock
        if clock == "night":
            lay["night"] = True
        elif clock == "day":
            lay.pop("night", None)
        need: list[dict] = []
        for line in sc.get("lines") or []:
            for seg in line.get("segments") or []:
                if seg.get("wact"):
                    item = {"verb": seg["wact"], "word": seg.get("obj", "")}
                    if item not in need:
                        need.append(item)
        for line in sc.get("lines") or []:
            for seg in line.get("segments") or []:
                if seg.get("place"):
                    item = {"verb": "look", "word": str(seg["place"]).lower(), "on": "floor"}
                    if item not in need:
                        need.append(item)
            for word, surface in _things_on(str(line.get("text") or "")):
                item = {"verb": "look", "word": word, "on": surface}
                if item not in need:
                    need.append(item)
        if need:
            lay["need"] = need
        # what the story writes on screens also lights up the city's billboards (GTA 6 launch night…)
        signs = [str(seg["screen"]) for ln in sc.get("lines") or [] for seg in ln.get("segments") or [] if seg.get("screen")]
        if signs:
            lay["signs"] = signs[:4]
        # sneaking at night, "dark and quiet", hiding: no strangers walking about
        if clock == "night" or re.search(r"\b(quiet|silent|alone|secret|sneak|sneaking|hide|hiding|empty|deserted|nobody|no one|tiptoe|shh)\b", said, re.I):
            lay["quiet"] = True
        lay["location"] = str(sc.get("location") or "")[:120]
        if sc.get("world"):
            lay["world"] = sc["world"]
        if sc.get("blueprint"):
            lay["blueprint"] = sc["blueprint"]
        if sc.get("world_exact"):
            lay["world_exact"] = True
        out.append(lay)
    return out


def _ambience(length: int, frames: list[dict], layouts: list[dict], seed: str) -> array | None:
    """Quiet sounds of the place under everything (user: "real experience"):
    birds in the jungle / forest / park, a flowing river, waves on the beach,
    wind in the mountains / snow / desert, crickets at night. Made here
    (numpy), no downloads."""
    try:
        import numpy as np
    except Exception:  # noqa: BLE001
        return None
    import random
    if not frames or not layouts:
        return None
    sr = SAMPLE_RATE
    per = sr // FPS
    out = np.zeros(length, dtype=np.float32)
    ranges: dict[int, list[int]] = {}
    for n, f in enumerate(frames):
        r = ranges.setdefault(f.get("scene", 0), [n, n])
        r[1] = n
    any_sound = False
    for sc, (a, b) in ranges.items():
        lay = layouts[sc] if sc < len(layouts) else {}
        kind = str(lay.get("kind", ""))
        words = " ".join([str(lay.get("location", "")), kind] + [str(x.get("word", "")) + " " + str(x.get("verb", ""))
                                                                for x in lay.get("need") or []]).lower()
        outdoor = kind in ("jungle", "forest", "park", "farm", "village", "beach", "mountain", "snow", "desert",
                           "plain", "street") or bool(lay.get("outdoor"))
        if not outdoor:
            continue
        s0, s1 = a * per, min(length, (b + 1) * per)
        n = s1 - s0
        if n <= sr // 2:
            continue
        rng = random.Random(f"{seed}-{sc}")
        t = np.arange(n, dtype=np.float32) / sr
        bed = np.zeros(n, dtype=np.float32)
        noise = np.random.default_rng(rng.randrange(1 << 30)).standard_normal(n).astype(np.float32)

        def lowpass(x, k):  # moving average = a soft low-pass
            c = np.cumsum(np.concatenate([np.zeros(k, dtype=np.float64), x.astype(np.float64)]))
            return ((c[k:] - c[:-k]) / k).astype(np.float32)
        night = bool(lay.get("night"))
        if re.search(r"river|stream|water|fish|swim|nadi|waterfall|lake|pond|drink", words) or kind == "beach":
            if kind == "beach":
                swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 6.5) ** 2
                bed += lowpass(noise, 6) * 0.05 * swell
            else:
                bed += (lowpass(noise, 3) - lowpass(noise, 30)) * 0.07 * (0.8 + 0.2 * np.sin(2 * np.pi * t * 0.7))
        if kind in ("mountain", "snow", "desert") or re.search(r"wind|storm|hill", words):
            bed += lowpass(noise, 120) * 0.25 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 9))
        if night:
            chirp = (np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.3) * (np.sin(2 * np.pi * t / 1.3) > 0.2))
            bed += chirp.astype(np.float32) * 0.012
        elif kind in ("jungle", "forest", "park", "farm", "village", "mountain", "plain"):
            pos = rng.uniform(0.2, 1.0)
            while pos < n / sr - 0.4:
                f0 = rng.uniform(2200, 4200)
                for k_ in range(rng.randint(2, 5)):
                    st = int((pos + k_ * rng.uniform(0.08, 0.14)) * sr)
                    d = int(sr * rng.uniform(0.05, 0.11))
                    if st + d >= n:
                        break
                    tt = np.arange(d, dtype=np.float32) / sr
                    sweep = np.sin(2 * np.pi * (f0 + rng.uniform(-600, 900) * tt / (d / sr)) * tt)
                    bed[st:st + d] += (sweep * np.sin(np.pi * tt / (d / sr)) * 0.035).astype(np.float32)
                pos += rng.uniform(0.7, 2.8 if kind != "jungle" else 1.4)
        fade = np.minimum(1, np.minimum(t / 0.6, (t[-1] - t) / 0.6))
        out[s0:s1] += bed * fade
        any_sound = True
    if not any_sound:
        return None
    pcm = np.clip(out * 32767, -32767, 32767).astype(np.int16)
    return array("h", pcm.tobytes())


def _step_prepare(job: dict) -> None:
    _VOICE_PROBLEMS.clear()
    jdir = ANIM_DIR / job["id"]
    story = _read_json(jdir / "script.json", {}).get("scenes") or []
    if not story:
        raise RuntimeError("The story is empty.")
    chars = {c["id"]: c for c in _job_characters(job)}
    drawn = job.get("backgrounds", "drawn") == "drawn"
    plans = _plan_scenes(story, drawn)
    # Voices + acting (one pass, always in sync) ----------------------
    audio_dir = jdir / "audio"
    audio_dir.mkdir(exist_ok=True)
    directed = _direct(job, story, plans, chars, audio_dir)
    voice_pcm, events = directed["voice"], directed["events"]
    with wave.open(str(jdir / "voice.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        out_pcm = array("h", voice_pcm)
        if sys.byteorder == "big":
            out_pcm.byteswap()
        w.writeframes(out_pcm.tobytes())
    # Sound effects + music -----------------------------------------
    used_sfx: list[str] = []
    sfx_file = jdir / "sfx.wav"
    sfx_file.unlink(missing_ok=True)
    amb = None
    if job.get("sfx", True) and drawn:
        try:
            amb = _ambience(len(voice_pcm), directed["frames"], _layouts_3d(job, plans, story), job["id"])
        except Exception:  # noqa: BLE001 — never stop a video for the birds
            amb = None
    if job.get("sfx", True) and (events or amb):
        _update(job, status="voicing", progress=60, message="Adding sound effects…")
        track, used_sfx = _build_sfx_track(len(voice_pcm), events, job.get("freesound_key", ""), job["id"])
        if amb:
            import numpy as np
            tr = np.frombuffer(track.tobytes(), dtype=np.int16).astype(np.int32)
            am = np.frombuffer(amb.tobytes(), dtype=np.int16).astype(np.int32)
            m_ = min(len(tr), len(am))
            tr[:m_] += am[:m_]
            track = array("h", np.clip(tr, -32768, 32767).astype(np.int16).tobytes())
            used_sfx = sorted(set(used_sfx) | {"ambience"})
        if used_sfx:
            if sys.byteorder == "big":
                track.byteswap()
            with wave.open(str(sfx_file), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(SAMPLE_RATE)
                w.writeframes(track.tobytes())
    music, credit = _pick_music(job.get("music", "auto"), job["title"], job.get("freesound_key", ""), job["id"],
                                jdir, len(directed["frames"]) / FPS)
    used_pics = [p["value"] for p in directed["pops"]] + [e["src"] for e in directed["extras"]]
    if any(str(v).startswith("om:") for v in used_pics):
        credit = " · ".join(x for x in (credit, "Drawings: OpenMoji (openmoji.org), CC BY-SA 4.0") if x)
    _update(job, music_file=str(music) if music else "", music_credit=credit, sound_effects=used_sfx)
    # Backgrounds ---------------------------------------------------
    # Drawn places are drawn by the browser (like the characters);
    # only Pixabay mode downloads pictures here.
    size = FORMATS[job["format"]]
    bg_dir = jdir / "bg"
    bg_dir.mkdir(exist_ok=True)
    for old in bg_dir.glob("*.png"):
        old.unlink(missing_ok=True)  # the story may have been edited
    cache: dict[str, str] = {}
    sources = []
    for s_idx, scene in enumerate(story if not drawn else []):
        _update(job, status="backgrounds", progress=60 + int(10 * s_idx / len(story)),
                message=f"Finding background {s_idx + 1} of {len(story)}…")
        target = bg_dir / f"{s_idx:02d}.jpg"
        query = scene["background"]
        if query in cache:
            target.write_bytes((bg_dir / cache[query]).read_bytes())
            continue
        if not target.exists():
            img, source = _fetch_background(query, size, job.get("pixabay_key", ""), s_idx)
            img.save(target, quality=90)
            sources.append(source)
        cache[query] = target.name
    # Timeline + sprite list -----------------------------------------
    sprites, emotes = _collect_sprites(directed["frames"])
    fmt = job["format"]
    w, h = FORMATS[fmt]
    sw, sh = _sprite_size(fmt)
    used = {seg["wact"] for sc in story for ln in sc["lines"] for seg in ln["segments"] if seg.get("custom")}
    acts = custom_actions()
    timeline = {"actions": {k: acts[k] for k in used if k in acts}, "frames": directed["frames"], "cues": directed["cues"], "pops": directed["pops"],
                "extras": directed["extras"], "effects": directed["effects"], "screens": directed.get("screens") or [],
                "auto_chars": [{"id": c["id"], "name": c["name"], "species": c.get("species", ""),
                                "female": c.get("female", False)} for c in chars.values() if c.get("auto")], "sprites": sprites,
                "emotes": emotes,
                # Each video (and each scene) gets its own colours / time of day / decor.
                "layouts": _layouts_3d(job, plans, story) if drawn else [],
                "fps": FPS, "format": fmt, "size": [sw, sh], "width": w, "height": h,
                "feetY": _feet_y(fmt), "geometry": _geometry(fmt), "scenes": len(story),
                "subtitles": bool(job.get("subtitles", True)),
                "lie": [{"sitting": p["sitting"],
                         "seat_end": next((pr.get("x2", pr["x"]) for pr in p["layout"]["props"]
                                           if pr["type"] in ("bed", "sofa", "bench")), None)}
                        for p in plans]}
    timeline["inserts"] = _render_inserts(job, jdir, directed.get("inserts") or [], timeline)
    _write_json(jdir / "timeline.json", timeline)
    duration = len(directed["frames"]) / FPS
    _update(job, status="voicing", progress=70, message="Mixing voices, sounds and music…")
    _mix_audio(job, jdir, duration)
    _update(job, mix_file="mix.m4a")
    _update(job, status="ready", progress=75,
            message="Preview ready — watch it, then press Render final video."
            + (f" (Some lines used the free voice instead: {_VOICE_PROBLEMS[0]})" if _VOICE_PROBLEMS else ""),
            geometry=_geometry(fmt), sprite_size=[sw, sh], sprite_count=len(sprites) + len(emotes),
            duration=round(len(timeline["frames"]) / FPS, 1),
            background_sources=sources)


def _bg_path(jdir: Path, scene: int) -> Path | None:
    """Drawn place (PNG from the browser) or Pixabay picture (JPG)."""
    for ext in ("png", "jpg"):
        path = jdir / "bg" / f"{scene:02d}.{ext}"
        if path.exists():
            return path
    return None


def _ass_time(seconds: float) -> str:
    cs = int(round(seconds * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _write_ass(path: Path, cues: list[dict], fmt: str) -> None:
    w, h = FORMATS[fmt]
    size = 46 if fmt == "long" else 52
    # Long video: subtitles at the top (characters fill the bottom).
    # Reel: below the characters, above the phone's bottom UI.
    align = 8 if fmt == "long" else 2
    margin = int(h * (0.06 if fmt == "long" else 0.12))
    head = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {w}\nPlayResY: {h}\nWrapStyle: 0\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, "
        "Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, "
        "MarginV, Encoding\n"
        f"Style: Default,Arial,{size},&H00FFFFFF,&H000000FF,&H00000000,&H64000000,"
        f"-1,0,0,0,100,100,0,0,1,4,1,{align},40,40,{margin},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    events = "".join(
        f"Dialogue: 0,{_ass_time(c['start'])},{_ass_time(c['end'] + 0.15)},Default,,0,0,0,,"
        f"{c['text'].replace(chr(10), ' ').replace('{', '(').replace('}', ')')}\n"
        for c in cues)
    path.write_text(head + events, encoding="utf-8-sig")


def _mix_audio(job: dict, jdir: Path, duration: float, out_name: str = "mix.m4a") -> None:
    """voice + sound effects + background music (ducked under speech,
    faded out at the end) -> mix.m4a, used by the preview AND the final video."""
    cmd = ["-i", "voice.wav"]
    parts = ["[0:a]asplit=2[voice][key]"]
    mix = ["[voice]"]
    n = 1
    if (jdir / "sfx.wav").exists():
        cmd += ["-i", "sfx.wav"]
        mix.append(f"[{n}:a]")
        n += 1
    music = Path(job.get("music_file") or "")
    if job.get("music_file") and music.is_file():
        cmd += ["-stream_loop", "-1", "-i", str(music.resolve())]
        parts.append(f"[{n}:a]aformat=sample_rates={SAMPLE_RATE}:channel_layouts=mono,"
                     f"volume={MUSIC_VOLUME * float(job.get('music_level', 1.0)):.3f},"
                     f"afade=t=in:d=1,afade=t=out:st={max(0, duration - 2.5):.2f}:d=2.5[bed]")
        parts.append("[bed][key]sidechaincompress=threshold=0.04:ratio=4:attack=25:release=450[ducked]")
        mix.append("[ducked]")
    else:
        parts.append("[key]anullsink")
    parts.append(f"{''.join(mix)}amix=inputs={len(mix)}:duration=first:normalize=0,alimiter=limit=0.95[aout]")
    _run_ffmpeg([*cmd, "-filter_complex", ";".join(parts), "-map", "[aout]",
                 "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-t", f"{duration:.3f}", out_name], cwd=jdir)


def _font(size: int):
    from PIL import ImageFont
    for path in (r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\segoeuib.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                 "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def _card_image(text: str, i: int, n: int, size: tuple[int, int], cache: dict):
    """'Two hours later…' card: a clock whose hands spin, and the text."""
    from PIL import Image, ImageDraw
    w, h = size
    if "base" not in cache:
        base = Image.new("RGB", size)
        d = ImageDraw.Draw(base)
        for y in range(h):
            t = y / max(1, h - 1)
            d.line([(0, y), (w, y)], fill=(int(30 + 20 * t), int(41 + 30 * t), int(59 + 40 * t)))
        cache["base"] = base
        cache["font"] = _font(int(min(w, h) * 0.075))
    img = cache["base"].copy()
    d = ImageDraw.Draw(img)
    r = int(min(w, h) * 0.17)
    cx, cy = w // 2, int(h * 0.40)
    pop = min(1.0, i / 6)  # the clock pops in
    rr = int(r * (0.6 + 0.4 * pop))
    d.ellipse([cx - rr - 8, cy - rr - 8, cx + rr + 8, cy + rr + 8], fill=(245, 158, 11), outline=(20, 20, 20), width=6)
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(255, 255, 255), outline=(20, 20, 20), width=5)
    for k in range(12):
        a = math.pi * 2 * k / 12
        d.line([(cx + math.sin(a) * rr * 0.82, cy - math.cos(a) * rr * 0.82),
                (cx + math.sin(a) * rr * 0.95, cy - math.cos(a) * rr * 0.95)], fill=(20, 20, 20), width=5)
    t = i / max(1, n)
    for length, angle, width in ((0.75, t * math.pi * 6, 6), (0.5, t * math.pi * 0.5 + 1.0, 9)):
        d.line([(cx, cy), (cx + math.sin(angle) * rr * length, cy - math.cos(angle) * rr * length)],
               fill=(20, 20, 20), width=width)
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(239, 68, 68))
    font = cache["font"]
    shown = text[:max(1, int(len(text) * min(1.0, (i - 6) / 18)))] if i > 6 else ""
    if shown:
        box = d.textbbox((0, 0), shown, font=font)
        tx, ty = (w - (box[2] - box[0])) // 2, int(h * 0.68)
        d.text((tx, ty), shown, font=font, fill=(255, 255, 255), stroke_width=4, stroke_fill=(15, 15, 15))
    return img


def _rotate_point(vx: float, vy: float, deg: float) -> tuple[float, float]:
    """Rotate a vector the same way PIL's Image.rotate turns the picture (CCW on screen)."""
    a = math.radians(deg)
    return vx * math.cos(a) + vy * math.sin(a), -vx * math.sin(a) + vy * math.cos(a)


def _compose(f: dict, bg, sprites: dict, emotes: dict, job: dict, lie_info: list, rot_cache: dict):
    """One video frame: background + characters (moved / rotated) + emotes."""
    from PIL import Image
    fmt = job["format"]
    W, H = FORMATS[fmt]
    sw, sh = job["sprite_size"]
    u = sh / 400
    feet = _feet_y(fmt)
    geo = job.get("geometry") or _geometry(fmt)
    frame = bg.copy()
    overlays = []
    # Lying / falling characters are drawn first (they are "lower").
    for s in sorted(f["chars"], key=lambda c: 0 if c["stance"] == "lie" or c["rot"] else 1):
        img = sprites[s["key"]]
        cx = s["x"] * W + s["dx"] * u
        cy = feet - sh / 2 + s["dy"] * u
        rot = s["rot"]
        if s["stance"] == "lie":
            rot = -90
            info = lie_info[f["scene"]] if f["scene"] < len(lie_info) else {}
            seat = info.get("sitting", False)
            cy = (geo["seatY"] if seat else geo["floorY"] - 4 * u) - 40 * u
            if seat and info.get("seat_end") is not None:
                # Head on the pillow end of the bed / sofa / bench.
                cx = info["seat_end"] * W - 110 * u
        elif rot:
            # Falling: slide from standing to lying on the floor.
            k = min(1.0, abs(rot) / 90)
            cy = cy + ((geo["floorY"] - 40 * u) - cy) * k
        if rot:
            rk = (s["key"], rot)
            if rk not in rot_cache:
                rot_cache[rk] = img.rotate(rot, resample=Image.BICUBIC, expand=True)
            img = rot_cache[rk]
        frame.paste(img, (int(cx - img.width / 2), int(cy - img.height / 2)), img)
        if s.get("emote"):
            ekey = f"emote_{s['emote'][0]}_{s['emote'][1]}"
            if ekey in emotes:
                drop = SIT_DROP_UNITS if s["stance"] == "sit" else 0
                hx, hy = _rotate_point(0, (78 + drop - 190) * u, rot)
                side = 1 if s["facing"] == "right" else -1
                ex, ey = (cx + hx, cy + hy - 80 * u) if abs(rot) > 45 else (cx + hx + side * 50 * u, cy + hy - 95 * u)
                overlays.append((emotes[ekey], ex, ey))
    for img, ex, ey in overlays:
        frame.paste(img, (int(ex - img.width / 2), int(ey - img.height / 2)), img)
    return frame


def _camera(frame, cam: dict | None, size: tuple[int, int]):
    """Punch-in zoom on the face that matters, and a quick shake."""
    from PIL import Image
    if not cam:
        return frame
    W, H = size
    z = max(cam["z"], 1.04 if (cam["sx"] or cam["sy"]) else 1.0)
    if z < 1.005:
        return frame
    cw, ch = W / z, H / z
    x0 = min(max(cam["x"] + cam["sx"] - cw / 2, 0), W - cw)
    y0 = min(max(cam["y"] + cam["sy"] - ch / 2, 0), H - ch)
    return frame.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))


def _step_render(job: dict) -> None:
    from PIL import Image
    jdir = ANIM_DIR / job["id"]
    timeline = _read_json(jdir / "timeline.json", None)
    if not timeline:
        raise RuntimeError("Timeline missing — make the video again.")
    frames = timeline["frames"]
    w, h = FORMATS[job["format"]]
    sw, sh = job["sprite_size"]
    sprite_dir = jdir / "sprites"
    sprites: dict[str, Image.Image] = {}
    for s in timeline["sprites"]:
        path = sprite_dir / f"{s['key']}.png"
        if not path.exists():
            raise RuntimeError("Some character drawings are missing — keep this page open and try again.")
        sprites[s["key"]] = Image.open(path).convert("RGBA").resize((sw, sh))
    emotes: dict[str, Image.Image] = {}
    esize = int(sw * 0.55)
    for e in timeline.get("emotes") or []:
        path = sprite_dir / f"{e['key']}.png"
        if path.exists():
            emotes[e["key"]] = Image.open(path).convert("RGBA").resize((esize, esize))
    backgrounds: dict[int, Image.Image] = {}
    feet_y = _feet_y(job["format"])
    for scene in {f["scene"] for f in frames}:
        if not _bg_path(jdir, scene):
            raise RuntimeError("Some scene drawings are missing — keep this page open and try again.")
    subs = job.get("subtitles", True)
    if subs:
        _write_ass(jdir / "subs.ass", timeline["cues"], job["format"])
    # Audio: voice + sound effects + background music. The music is
    # ducked (sidechain compressor) whenever someone speaks, and fades
    # out at the end.
    duration = len(frames) / FPS
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
           "-r", str(FPS), "-i", "-", "-i", "voice.wav"]
    audio_parts = ["[1:a]asplit=2[voice][key]"]
    mix = ["[voice]"]
    n_inputs = 2
    if (jdir / "sfx.wav").exists():
        cmd += ["-i", "sfx.wav"]
        mix.append(f"[{n_inputs}:a]")
        n_inputs += 1
    music = Path(job.get("music_file") or "")
    if job.get("music_file") and music.is_file():
        cmd += ["-stream_loop", "-1", "-i", str(music.resolve())]
        audio_parts.append(
            f"[{n_inputs}:a]aformat=sample_rates={SAMPLE_RATE}:channel_layouts=mono,"
            f"volume={MUSIC_VOLUME},afade=t=in:d=1,afade=t=out:st={max(0, duration - 2.5):.2f}:d=2.5[bed]")
        audio_parts.append("[bed][key]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[ducked]")
        mix.append("[ducked]")
        n_inputs += 1
    else:
        audio_parts.append("[key]anullsink")
    audio_parts.append(f"{''.join(mix)}amix=inputs={len(mix)}:duration=first:normalize=0,"
                       "alimiter=limit=0.95[aout]")
    video_part = "[0:v]ass=subs.ass[vout]" if subs else "[0:v]null[vout]"
    cmd += ["-filter_complex", ";".join([video_part, *audio_parts]),
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-t", f"{duration:.3f}",
            "-movflags", "+faststart", "video.mp4"]
    log = open(jdir / "ffmpeg.log", "w", encoding="utf-8")  # noqa: SIM115
    proc = subprocess.Popen(cmd, cwd=str(jdir), stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                            stderr=log, **no_window_kwargs())
    started = time.time()
    rot_cache: dict = {}
    card_cache: dict = {}
    lie_info = timeline.get("lie") or []
    prev_img = None      # last picture of the previous scene (for the slide)
    prev_scene = None
    wipe_left = 0
    last_img = None
    try:
        assert proc.stdin is not None
        for n, f in enumerate(frames):
            scene = f["scene"]
            if f.get("card"):
                c = f["card"]
                img = _card_image(c["text"], c["i"], c["n"], (w, h), card_cache)
            else:
                if scene not in backgrounds:
                    backgrounds[scene] = Image.open(_bg_path(jdir, scene)).convert("RGB").resize((w, h))
                img = _compose(f, backgrounds[scene], sprites, emotes, job, lie_info, rot_cache)
                img = _camera(img, f.get("cam"), (w, h))
                if prev_scene is not None and scene != prev_scene and prev_img is not None:
                    wipe_left = WIPE_FRAMES
                if wipe_left and prev_img is not None:
                    # Slide the new scene in over the old one.
                    t = 1 - wipe_left / WIPE_FRAMES
                    off = int(w * (1 - (1 - (1 - t) ** 2)))
                    slide = Image.new("RGB", (w, h))
                    slide.paste(prev_img, (off - w, 0))
                    slide.paste(img, (off, 0))
                    img = slide
                    wipe_left -= 1
                prev_scene = scene
                last_img = img
            if f.get("card"):
                prev_img, prev_scene = None, scene  # a card replaces the slide
            elif n + 1 < len(frames) and frames[n + 1]["scene"] != scene:
                prev_img = last_img
            proc.stdin.write(img.tobytes())
            if n % (FPS * 2) == 0:
                done = n / len(frames)
                elapsed = time.time() - started
                left = elapsed / done - elapsed if done > 0.02 else 0
                _update(job, status="rendering", progress=75 + int(24 * done),
                        message=f"Rendering video… {int(done * 100)}%"
                                + (f" · ~{int(left // 60)}:{int(left % 60):02d} left" if left else ""))
        proc.stdin.close()
        code = proc.wait(timeout=600)
    finally:
        log.close()
    if code != 0 or not (jdir / "video.mp4").exists():
        tail = (jdir / "ffmpeg.log").read_text(encoding="utf-8", errors="ignore")[-600:]
        raise RuntimeError(f"Video encoding failed: {tail}")


# -------------------------------------------------------------- runner
def _run(job_id: str, step: str) -> None:
    job = _read_json(ANIM_DIR / job_id / "job.json", None)
    if not job:
        return
    try:
        if step == "start":
            chars = _load_characters(job["character_ids"])
            if not chars:
                raise RuntimeError("No characters found. Create characters in Character Studio first.")
            _step_story(job, chars)
            if job.get("review"):
                _update(job, status="script_ready", progress=15,
                        message="Story ready — review it, then press Make video.")
                return
            step = "prepare"
        if step == "prepare":
            _step_prepare(job)
            return
        if step == "render":
            _step_render(job)
            _update(job, status="done", progress=100, message="Your video is ready!",
                    finished_at=_now(), video_url=f"/api/animator/jobs/{job_id}/video")
    except Exception as exc:  # noqa: BLE001
        _update(job, status="error", message=f"Failed: {str(exc)[-800:]}")
    finally:
        _queue_next()


def _start_thread(job_id: str, step: str) -> None:
    threading.Thread(target=_run, args=(job_id, step), daemon=True).start()


# ---- the queue (user, 2026-11-19: "submit several scripts, it makes them one by one
# while I am away"). Only ONE video is written / voiced at a time (a weak PC); the
# others wait their turn. The browser films finished ones (3D) one by one.
_BUSY = ("queued", "writing", "voicing", "backgrounds")
_queue_lock = threading.Lock()


def _all_jobs() -> list[dict]:
    out = []
    for f in ANIM_DIR.glob("*/job.json"):
        j = _read_json(f, None)
        if isinstance(j, dict) and j.get("id"):
            out.append(j)
    return sorted(out, key=lambda j: str(j.get("created_at") or ""))


def _busy_job(exclude: str = "") -> dict | None:
    return next((j for j in _all_jobs() if j.get("status") in _BUSY and j.get("id") != exclude), None)


def _queue_next() -> None:
    with _queue_lock:
        if _busy_job():
            return
        waiting = [j for j in _all_jobs() if j.get("status") == "waiting"]
        if not waiting:
            return
        nxt = waiting[0]
        step = nxt.get("queued_step") or "start"
        _update(nxt, status="queued" if step == "start" else "voicing", message="Starting (from the queue)…")
        _start_thread(nxt["id"], step)
    _queue_positions()


def _queue_positions() -> None:
    for i, j in enumerate([j for j in _all_jobs() if j.get("status") == "waiting"]):
        _update(j, message=f"In the queue — #{i + 1}. It starts by itself when the video before it has its voices.")


def _queue_or_start(job: dict, step: str) -> bool:
    """Start now, or wait in the queue when another video is being made. True = queued."""
    with _queue_lock:
        queued = _busy_job(exclude=job["id"]) is not None
        if queued:
            _update(job, status="waiting", queued_step=step)
    if queued:
        _queue_positions()
        return True
    _start_thread(job["id"], step)
    return False


# ----------------------------------------------------------- endpoints
class StartRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    minutes: float = Field(1, ge=0.25, le=90)
    format: str = Field("long", pattern="^(long|reel)$")
    language: str = Field("en", pattern="^(en|ur)$")
    character_ids: list[str] = Field(..., min_length=1, max_length=6)
    review: bool = False
    subtitles: bool = True
    custom_script: str = Field("", max_length=200000)
    backgrounds: str = Field("drawn", pattern="^(drawn|pixabay)$")
    pixabay_key: str = Field("", max_length=100)
    music: str = Field("auto", max_length=80)
    sfx: bool = True
    freesound_key: str = Field("", max_length=100)
    tts_keys: dict[str, str] = Field(default_factory=dict)  # provider -> the user's own key
    acting: bool = True  # free acting voices (Chatterbox) for every character
    idea: str = Field("", max_length=4000)  # your own rough idea / direction for the story
    gemini_key: str = Field("", max_length=100)  # the writer uses it when given (better + longer prompts)
    mode: str = Field("2d", pattern="^(2d|3d)$")  # cartoon or 3D film (the queue films it the same way)


@router.post("/start")
def start(payload: StartRequest) -> dict:
    chars = _load_characters(payload.character_ids)
    if not chars:
        raise HTTPException(400, "Pick at least one saved character (Character Studio).")
    if payload.custom_script.strip():
        try:
            parse_custom_script(payload.custom_script, chars)  # fail fast on typos
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
    job_id = uuid.uuid4().hex[:12]
    (ANIM_DIR / job_id).mkdir(parents=True, exist_ok=True)
    job = {"id": job_id, "status": "queued", "progress": 0, "message": "Starting…",
           "title": payload.title.strip(), "minutes": payload.minutes, "format": payload.format,
           "language": payload.language, "character_ids": [c["id"] for c in chars],
           "review": payload.review, "subtitles": payload.subtitles, "idea": payload.idea.strip(), "gemini_key": payload.gemini_key.strip(),
           "custom_script": payload.custom_script.strip(), "pixabay_key": payload.pixabay_key.strip(),
           "backgrounds": payload.backgrounds, "music": payload.music, "sfx": payload.sfx,
           "acting": payload.acting,
           "freesound_key": payload.freesound_key.strip(),
           "tts_keys": {k: str(v).strip()[:200] for k, v in payload.tts_keys.items()
                        if k in ("google", "unreal", "elevenlabs") and v},
           "mode": payload.mode, "created_at": _now()}
    _write_json(ANIM_DIR / job_id / "job.json", job)
    queued = _queue_or_start(job, "start")
    if not queued:
        _update(job, status="queued")
    return {"job_id": job_id, "queued": queued}


def _public(job: dict) -> dict:
    return {k: v for k, v in job.items()
            if k not in ("pixabay_key", "freesound_key", "custom_script", "music_file", "tts_keys")}


@router.get("/jobs")
def list_jobs() -> dict:
    """My videos: every video, newest first (open any of them again)."""
    keep = ("id", "title", "status", "progress", "message", "format", "mode", "created_at", "finished_at", "video_url")
    return {"jobs": [{k: j.get(k) for k in keep} for j in reversed(_all_jobs())][:80]}


@router.post("/jobs/{job_id}/unqueue")
def unqueue(job_id: str) -> dict:
    job = _read_job(job_id)
    if job.get("status") == "waiting":
        _update(job, status="error", message="Taken out of the queue. Press ↻ Try again to add it back.")
        _queue_positions()
    return {"ok": True}


@router.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    out = _public(_read_job(job_id))
    if out.get("status") == "voicing":
        out["voice_engine"] = voice_engine_status()  # Google GPU or this computer, and why
    return out


class CustomAction(BaseModel):
    label: str = Field("", max_length=80)
    words: list[str] = Field(default_factory=list)
    frames: int = Field(72, ge=12, le=240)
    go: bool = True
    body: str = Field("stand", max_length=20)
    arms: str = Field("work", max_length=20)
    hold: str = Field("", max_length=60)
    ride: bool = False
    rideDist: float = Field(8, ge=0, le=60)
    effect: str = Field("", max_length=20)
    change: str = Field("", max_length=20)
    color: str = Field("", max_length=10)
    atStart: bool = False
    sound: str = Field("", max_length=30)
    closeup: bool = False
    thing: str = Field("", max_length=40)


# ---- AI engine status (user, 2026-11-19): which AI answered, why Gemini did not, when it retries.
_AI_STATUS = {"engine": "", "model": "", "ok_at": 0.0, "last_try": 0.0, "gemini_error": "", "gemini_error_at": 0.0,
              "retry_at": 0.0, "fails": 0, "free_error": ""}


def _gemini_reason(text: str) -> tuple[str, float]:
    """A plain reason for a Gemini failure, and how long to wait before trying Gemini again."""
    t = text.lower()
    if "api key not valid" in t or "api_key_invalid" in t or "permission_denied" in t or "403" in t:
        return "Your Gemini key is not valid (check it in the Dashboard).", 600
    if "perday" in t.replace(" ", "") or "per day" in t or "daily" in t:
        return "Gemini's free daily limit is used up — it resets tomorrow.", 3600
    if "429" in t or "resource_exhausted" in t or "quota" in t or "rate" in t:
        return "Gemini is busy (too many requests per minute on the free plan).", 60 * min(5, 1 + _AI_STATUS["fails"])
    if "timed out" in t or "timeout" in t:
        return "Gemini did not answer in time.", 20
    if "503" in t or "500" in t or "overloaded" in t or "unavailable" in t:
        return "Google's Gemini servers are overloaded right now.", 45
    return "Gemini error: " + text[:140], 30


def _gemini_only(prompt: str, gemini_key: str) -> str:
    """One answer from Gemini (several models), or an exception with the reason. Records the status."""
    import urllib.error
    now = time.time()
    _AI_STATUS["last_try"] = now
    errs = []
    chosen = str(_AI.get("gemini_model") or "").strip()
    for model in ([chosen] if chosen else GEMINI_MODELS):
        try:
            body = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.4}}).encode("utf-8")
            req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key="
                                         + urllib.request.quote(gemini_key.strip()), data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as res:
                data = json.loads(res.read().decode("utf-8", "ignore"))
            text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
            if text.strip():
                _AI_STATUS.update(engine="gemini", model=model, ok_at=time.time(), gemini_error="", retry_at=0.0, fails=0)
                return text
            errs.append(f"{model}: empty answer")
        except urllib.error.HTTPError as exc:
            try:
                detail = exc.read().decode("utf-8", "ignore")[:300]
            except Exception:  # noqa: BLE001
                detail = ""
            errs.append(f"{model}: HTTP {exc.code} {detail}")
            if exc.code in (400, 403):
                break  # a bad key fails the same on every model
        except Exception as exc:  # noqa: BLE001
            errs.append(f"{model}: {str(exc)[:120]}")
    reason, wait = _gemini_reason(" | ".join(errs))
    _AI_STATUS.update(gemini_error=reason, gemini_error_at=time.time(), retry_at=time.time() + wait, fails=_AI_STATUS["fails"] + 1)
    raise RuntimeError(reason)


def _gemini_ready(gemini_key: str) -> bool:
    return bool(gemini_key.strip()) and time.time() >= _AI_STATUS["retry_at"]


def _free_ok():
    _AI_STATUS.update(engine="pollinations", model="free", ok_at=time.time(), free_error="")


def ai_status() -> dict:
    key = str(_AI.get("gemini_key") or "")
    now = time.time()
    using = "gemini" if key and now >= _AI_STATUS["retry_at"] else ("waiting" if key and _AI.get("gemini_only") else "pollinations")
    reason = ""
    if not key:
        reason = "No Gemini key yet — add your free key in the Dashboard (aistudio.google.com/apikey)."
    elif now < _AI_STATUS["retry_at"]:
        reason = _AI_STATUS["gemini_error"]
    return {"using": using, "has_key": bool(key), "last_engine": _AI_STATUS["engine"], "last_model": _AI_STATUS["model"],
            "last_ok_ago": round(now - _AI_STATUS["ok_at"]) if _AI_STATUS["ok_at"] else None,
            "last_try_ago": round(now - _AI_STATUS["last_try"]) if _AI_STATUS["last_try"] else None,
            "reason": reason, "retry_in": max(0, round(_AI_STATUS["retry_at"] - now)) if key else None,
            "free_error": _AI_STATUS["free_error"], "model": str(_AI.get("gemini_model") or ""), "gemini_only": bool(_AI.get("gemini_only"))}


def gemini_models(key: str) -> list[dict]:
    """The Gemini models this key can really use (from Google), for the model switcher."""
    import urllib.error
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + urllib.request.quote(key.strip()))
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.loads(res.read().decode("utf-8", "ignore"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(_gemini_reason(f"HTTP {exc.code} " + exc.read().decode("utf-8", "ignore")[:200])[0]) from None
    out = []
    for m in data.get("models") or []:
        name = str(m.get("name", "")).replace("models/", "")
        if "gemini" not in name or "generateContent" not in (m.get("supportedGenerationMethods") or []):
            continue
        if any(x in name for x in ("embedding", "image", "tts", "audio", "live", "vision")):
            continue
        out.append({"id": name, "label": m.get("displayName") or name})
    return out


def gemini_test(key: str, model: str) -> dict:
    """One tiny request to one model: does it answer, and how fast."""
    old = _AI.get("gemini_model")
    snap = dict(_AI_STATUS)
    _AI["gemini_model"] = model
    t = time.time()
    try:
        _gemini_only('Reply with only the word: OK', key)
        return {"ok": True, "seconds": round(time.time() - t, 1)}
    except Exception as exc:  # noqa: BLE001
        _AI_STATUS.update(snap)  # a failed test does not pause the real work
        return {"ok": False, "error": str(exc)[:200]}
    finally:
        _AI["gemini_model"] = old


def ai_retry_now() -> dict:
    _AI_STATUS.update(retry_at=0.0, fails=0)
    return ai_status()


def _ai_text(prompt: str, gemini_key: str = "") -> str:
    """Your Gemini key first (the best free one), else the free Pollinations AI."""
    errs = []
    if gemini_key.strip() and _gemini_ready(gemini_key):
        try:
            return _gemini_only(prompt, gemini_key)
        except Exception as exc:  # noqa: BLE001
            errs.append(str(exc)[:160])
    elif gemini_key.strip():
        errs.append(_AI_STATUS["gemini_error"] or "Gemini paused")
    else:
        errs.append("no Gemini key")
    if _AI.get("gemini_only") and gemini_key.strip():
        raise HTTPException(503, "Gemini only (your setting): " + " | ".join(errs)[:300] + " — try again in a minute.")
    try:
        out = _pollinations_post(prompt)
        _free_ok()
        return out
    except Exception as exc:  # noqa: BLE001
        errs.append(f"free AI (long): {str(exc)[:120]}")
    try:
        out = _ask_ai_get(_shorten_prompt(prompt), 120, 2)
        _free_ok()
        return out
    except Exception as exc:  # noqa: BLE001
        errs.append(f"free AI (short): {str(exc)[:120]}")
        _AI_STATUS["free_error"] = str(exc)[:160]
    raise HTTPException(502, "No AI answered (" + " | ".join(errs)[:500] + "). Add a free Gemini key in the Dashboard (aistudio.google.com/apikey), or try again in a minute.")


def _json_in(text: str):
    """JSON from an AI answer — forgiving: code fences, // comments, trailing commas, curly quotes."""
    t = str(text or "").replace("\u201c", '"').replace("\u201d", '"').replace("\u2018", "'").replace("\u2019", "'")
    t = re.sub(r"```(?:json)?", "", t)
    m = re.search(r"[\{\[].*[\}\]]", t, re.S)
    if not m:
        return None
    raw = m.group(0)
    for cand in (raw, re.sub(r",\s*([\}\]])", r"\1", re.sub(r"(?m)^\s*//.*$|\s//[^\n\"]*$", "", raw))):
        try:
            v = json.loads(cand)
            return {"changes": v} if isinstance(v, list) else v
        except ValueError:
            continue
    return None


def action_prompt(description: str, name: str = "", thing: str = "") -> str:
    return (
        "I make 3D cartoon videos. Turn this action into settings for my animation tool. ACTION: "
        f"\"{description}\"" + (f" (its one-word name: {name})" if name else "") + (f" (usually done to: {thing})" if thing else "") + ". "
        "Reply with ONLY JSON, no other text, with exactly these keys: "
        '{"name":"one english word, lowercase","label":"short description","words":["other words for it"],'
        '"go":true if the character first walks up to the thing,"atStart":true only if nobody does it and the thing is just already like that when the scene starts,'
        '"body":"stand|kneel|crouch|sit","arms":"work|hammer|reach|point|up|wave|drive|none",'
        '"hold":"what is in the hand (hammer, welding torch, shovel, brush, frying pan, wrench, stick, sword, or any simple thing) or empty",'
        '"ride":true if the character gets on the thing and rides / drives it away,"rideDist":metres,'
        '"effect":"sparks|smoke|fire|dust|sparkle|splash or empty",'
        '"change":"break|fix|fall|hide|show|glow|color or empty (what happens to the thing)","color":"#hex if change is color",'
        f'"sound":"one of {"|".join(SFX_NAMES)} or empty","frames":length at 24 per second (24-192),"closeup":true or false,'
        '"thing":"the thing it is done to (one or two words)"}'
    )


class ActionAiRequest(BaseModel):
    description: str = Field(..., min_length=3, max_length=600)
    name: str = Field("", max_length=30)
    thing: str = Field("", max_length=40)
    gemini_key: str = Field("", max_length=100)


@router.post("/actions/prompt")
def get_action_prompt(req: ActionAiRequest) -> dict:
    return {"prompt": action_prompt(req.description, req.name, req.thing)}


@router.post("/actions/ai")
def action_from_words(req: ActionAiRequest) -> dict:
    """'Weld the track, kneeling, sparks' → the action's settings (the form fills itself)."""
    data = _json_in(_ai_text(action_prompt(req.description, req.name, req.thing), req.gemini_key))
    if not isinstance(data, dict):
        raise HTTPException(502, "The AI answer had no settings in it — try again or use ChatGPT.")
    return {"action": data}


# ---- fix a finished video from the timeline (user, 2026-11-18): pause at the
# bad moment, say what is wrong in simple words, the script there is changed.
def fix_prompt(story: list[dict], chars: dict, scene: int, line: int, said: str, instruction: str) -> str:
    names = {cid: c.get("name", cid) for cid, c in chars.items()}
    lines = []
    for si, sc in enumerate(story):
        lines.append(f"# Scene {si}: {sc.get('location') or sc.get('place')}" + (f" (time card: {sc['time_skip']})" if sc.get("time_skip") else ""))
        for li, ln in enumerate(sc["lines"]):
            mark = "   <<< HERE" if si == scene and li == line else ""
            lines.append(f"[{si}.{li}] {names.get(ln['speaker'], ln['speaker'])}: {ln['text']}{mark}")
    acts = ", ".join("{" + a + "}" for a in ACTION_NAMES if not a.startswith("w-"))
    wacts = ", ".join("{" + v + ":thing}" for v in WORLD_ACTS)
    custom = ", ".join("{" + k + ":thing}" for k in custom_actions())
    return (
        "You edit the script of my animated cartoon. The video was made from this script; the viewer paused at the line "
        f"marked <<< HERE (scene {scene}, line {line}, while this was said: \"{said}\") and says what must change there:\n"
        f"INSTRUCTION (it may be written in Urdu or English — understand it): {instruction}\n\nSCRIPT:\n" + "\n".join(lines) + "\n\n"
        "How the script works: inside a line, tags in curly braces are acted where they stand. Actions: " + acts + ". "
        "World actions: " + wacts + ". Story actions: " + custom + ". Magic: {turn:Name:frog}, {turn:Name:back}. "
        "Camera for the line: {closeup:Name} (close on that face), {wide} (whole place). {show:thing} brings a thing in. "
        "*star* around a word makes it pop up (remove the stars to remove a pop-up). Places are the scene titles. "
        "Change ONLY what the instruction asks, as near to the marked line as possible. Keep every other line exactly.\n"
        'Reply with ONLY JSON: {"summary":"what you changed, in simple words","changes":['
        '{"op":"edit","scene":0,"line":0,"text":"the full new line text with tags"},'
        '{"op":"insert","scene":0,"after":0,"speaker":"Name","text":"..."},'
        '{"op":"delete","scene":0,"line":0},'
        '{"op":"place","scene":0,"location":"new place words"},'
        '{"op":"calm","scene":0} (the characters stop walking around while they talk; {"op":"lively"} undoes it),'
        '{"op":"speaker","scene":0,"line":0,"speaker":"Name"}]}'
    )


class FixRequest(BaseModel):
    instruction: str = Field(..., min_length=3, max_length=1000)
    time: float = Field(0, ge=0)
    gemini_key: str = Field("", max_length=100)
    answer: str = Field("", max_length=20000)  # ChatGPT's answer, pasted


def _moment(job_id: str, t: float) -> tuple[int, int, str]:
    tl = _read_json(_job_dir(job_id) / "timeline.json", {}) or {}
    best = None
    for c in tl.get("cues") or []:
        if c.get("line") and c["start"] - 0.4 <= t:
            best = c
    if best:
        return int(best["line"][0]), int(best["line"][1]), str(best.get("text", ""))
    frames = tl.get("frames") or []
    fps = tl.get("fps") or FPS
    sc = frames[min(len(frames) - 1, int(t * fps))]["scene"] if frames else 0
    return int(sc), 0, ""


@router.post("/jobs/{job_id}/fix/prompt")
def fix_get_prompt(job_id: str, req: FixRequest) -> dict:
    job = _read_job(job_id)
    data = _read_json(_job_dir(job_id) / "script.json", {"scenes": []})
    si, li, said = _moment(job_id, req.time)
    chars = {c["id"]: c for c in _job_characters(job)}
    return {"prompt": fix_prompt(data["scenes"], chars, si, li, said, req.instruction), "scene": si, "line": li}


def _apply_changes(story: list[dict], changes: list[dict], chars: dict) -> tuple[list[dict], list[str]]:
    by_name = {str(c.get("name", "")).lower(): cid for cid, c in chars.items()}
    out = json.loads(json.dumps(story))
    told: list[str] = []
    for ch in sorted(changes, key=lambda c: -(int(c.get("line", c.get("after", 0)) or 0))):
        try:
            op, si = str(ch.get("op")), int(ch.get("scene", 0))
            sc = out[si]
            if op == "edit":
                li = int(ch["line"]); old = sc["lines"][li]["text"]
                sc["lines"][li]["text"] = str(ch["text"])[:400]
                told.append(f"Scene {si + 1}, line {li + 1}: “{old[:60]}” → “{str(ch['text'])[:80]}”")
            elif op == "insert":
                li = int(ch.get("after", -1))
                spk = by_name.get(str(ch.get("speaker", "")).lower(), sc["lines"][max(0, li)]["speaker"] if sc["lines"] else "")
                sc["lines"].insert(li + 1, {"speaker": spk, "text": str(ch["text"])[:400], "expression": "normal", "pose": "idle", "sfx": "", "tone": ""})
                told.append(f"Scene {si + 1}: new line after line {li + 1}: “{str(ch['text'])[:80]}”")
            elif op == "delete":
                li = int(ch["line"]); old = sc["lines"].pop(li)
                told.append(f"Scene {si + 1}: removed “{old['text'][:70]}”")
            elif op == "place":
                sc["location"] = str(ch.get("location", ""))[:120]; sc["place"] = ""; sc["world"] = ""; sc["blueprint"] = ""
                told.append(f"Scene {si + 1}: the place is now “{sc['location']}”")
            elif op in ("calm", "still", "no_wander"):
                sc["calm"] = True
                told.append(f"Scene {si + 1}: the characters stay calm — no walking around while they talk")
            elif op in ("lively", "wander"):
                sc["calm"] = False
                told.append(f"Scene {si + 1}: the characters may move around while they talk")
            elif op == "speaker":
                li = int(ch["line"]); spk = by_name.get(str(ch.get("speaker", "")).lower())
                if spk:
                    sc["lines"][li]["speaker"] = spk
                    told.append(f"Scene {si + 1}, line {li + 1}: now said by {ch.get('speaker')}")
        except (KeyError, IndexError, ValueError, TypeError):
            continue
    return out, told


@router.post("/jobs/{job_id}/fix")
def fix_moment(job_id: str, req: FixRequest) -> dict:
    """The instruction → changes to the script (not saved yet: you see them first)."""
    job = _read_job(job_id)
    data = _read_json(_job_dir(job_id) / "script.json", {"scenes": []})
    si, li, said = _moment(job_id, req.time)
    chars = {c["id"]: c for c in _job_characters(job)}
    text = req.answer.strip() or _ai_text(fix_prompt(data["scenes"], chars, si, li, said, req.instruction), req.gemini_key)
    plan = _json_in(text)
    if isinstance(plan, dict) and not isinstance(plan.get("changes"), list):
        for k in ("edits", "change", "patch", "operations", "ops"):
            if isinstance(plan.get(k), list):
                plan["changes"] = plan[k]
                break
    if not isinstance(plan, dict) or not isinstance(plan.get("changes"), list) or not plan["changes"]:
        raise HTTPException(502, "The answer has no list of changes in it. Paste ChatGPT's WHOLE reply (from { to }), "
                                 "or say it a little differently and press ✨ Fix it again.")
    new_story, told = _apply_changes(data["scenes"], plan["changes"], chars)
    if not told:
        raise HTTPException(502, "The AI's changes did not fit the script — try again.")
    return {"summary": str(plan.get("summary", ""))[:300], "changes": plan["changes"], "told": told, "scene": si, "line": li}


class FixApply(BaseModel):
    changes: list[dict] = Field(..., min_length=1, max_length=200)


@router.post("/jobs/{job_id}/fix/apply")
def fix_apply(job_id: str, req: FixApply) -> dict:
    """Save the changes and make the video again — only new / changed lines get new voices."""
    job = _read_job(job_id)
    if job.get("status") not in ("ready", "done", "error", "script_ready"):
        raise HTTPException(400, "The video is being made right now — wait a moment.")
    jdir = _job_dir(job_id)
    data = _read_json(jdir / "script.json", {"scenes": []})
    chars_l = _job_characters(job)
    chars = {c["id"]: c for c in chars_l}
    new_story, told = _apply_changes(data["scenes"], req.changes, chars)
    story = _normalize_story(new_story, chars_l)
    data = {**data, "scenes": story}
    _write_json(jdir / "script.json", data)
    miss = missing_actions(story, data.get("ignored") or [])
    if miss:
        _update(job, status="script_ready", progress=15,
                message=f"⚠ The fix needs {len(miss)} action(s) the app can't show yet — make them below.")
        return {"ok": True, "missing": miss, "told": told}
    _update(job, status="voicing", progress=15, message="Fixing… (only the changed lines get new voices)")
    _start_thread(job_id, "prepare")
    return {"ok": True, "missing": [], "told": told}


# ---- (user, 2026-11-20) the preview's "Want to fix this part?": many parts are marked one by one (each with
# the AI's answer), then "Fix all the modified parts" changes them all at once — one new voicing for all.
class FixMark(BaseModel):
    instruction: str = Field(..., min_length=2, max_length=1000)
    time: float = Field(0, ge=0)
    answer: str = Field(..., min_length=2, max_length=20000)


def _pending_file(job_id: str) -> Path:
    return _job_dir(job_id) / "pending_fixes.json"


def _pending(job_id: str) -> list[dict]:
    d = _read_json(_pending_file(job_id), [])
    return d if isinstance(d, list) else []


@router.post("/jobs/{job_id}/fix/mark")
def fix_mark(job_id: str, req: FixMark) -> dict:
    """The AI's answer for one paused moment: checked against the script and kept (not applied yet)."""
    job = _read_job(job_id)
    data = _read_json(_job_dir(job_id) / "script.json", {"scenes": []})
    si, li, said = _moment(job_id, req.time)
    chars = {c["id"]: c for c in _job_characters(job)}
    plan = _json_in(req.answer)
    if isinstance(plan, dict) and not isinstance(plan.get("changes"), list):
        for k in ("edits", "change", "patch", "operations", "ops"):
            if isinstance(plan.get(k), list):
                plan["changes"] = plan[k]
                break
    if not isinstance(plan, dict) or not isinstance(plan.get("changes"), list) or not plan["changes"]:
        raise HTTPException(400, "The answer has no list of changes in it — paste the AI's WHOLE reply (from { to }).")
    _new, told = _apply_changes(data["scenes"], plan["changes"], chars)
    if not told:
        raise HTTPException(400, "The AI's changes do not fit the script (wrong scene or line numbers) — ask it again.")
    items = _pending(job_id)
    items.append({"id": f"p{int(time.time() * 1000) % 10_000_000}", "time": round(req.time, 2), "scene": si, "line": li,
                  "said": said[:200], "instruction": req.instruction[:300], "summary": str(plan.get("summary", ""))[:300],
                  "changes": plan["changes"][:40], "told": told})
    _write_json(_pending_file(job_id), items)
    return {"ok": True, "told": told, "pending": items}


@router.get("/jobs/{job_id}/fix/pending")
def fix_pending(job_id: str) -> dict:
    return {"pending": _pending(job_id)}


@router.delete("/jobs/{job_id}/fix/pending/{pid}")
def fix_unmark(job_id: str, pid: str) -> dict:
    items = [p for p in _pending(job_id) if p.get("id") != pid]
    _write_json(_pending_file(job_id), items)
    return {"pending": items}


@router.post("/jobs/{job_id}/fix/apply-all")
def fix_apply_all(job_id: str) -> dict:
    """All the marked parts at once (their line numbers all point at the same script, so they are applied
    together), then the video is made again — only the changed lines get new voices."""
    items = _pending(job_id)
    if not items:
        raise HTTPException(400, "No part is marked to fix yet.")
    changes = [c for p in items for c in p.get("changes") or []]
    res = fix_apply(job_id, FixApply(changes=changes[:200]))
    _write_json(_pending_file(job_id), [])
    return {**res, "parts": len(items)}


THEMES = ["a funny misunderstanding", "a race against time", "a magic trick that goes wrong", "a lost thing they must find",
          "a prank that backfires", "a rescue", "a contest / competition", "a secret plan", "a first day somewhere new",
          "a scary night that turns out funny", "helping someone in trouble", "a treasure hunt", "a big surprise party",
          "a broken thing that must be fixed in time", "a trip that keeps going wrong", "a pet that causes chaos"]


class TitlesRequest(BaseModel):
    character_ids: list[str] = Field(default_factory=list)
    count: int = Field(6, ge=1, le=10)
    language: str = Field("en", pattern="^(en|ur)$")
    gemini_key: str = Field("", max_length=100)
    avoid: list[str] = Field(default_factory=list)  # titles already shown


@router.post("/titles")
def suggest_titles(req: TitlesRequest) -> dict:
    """Fresh story titles the app can REALLY make (built from its own places, things and actions)."""
    import random
    chars = _load_characters(req.character_ids) if req.character_ids else []
    names = ", ".join(c["name"] for c in chars) or "Teddy, Peddy"
    rnd = random.Random()
    places = rnd.sample(list(PLACE_THINGS), k=min(8, len(PLACE_THINGS)))
    themes = rnd.sample(THEMES, k=4)
    prompt = (
        f"Suggest {req.count} short, catchy, funny titles for animated cartoon YouTube videos starring {names}. "
        + capabilities_short()
        + f" For variety, use some of these places: {', '.join(places)}; and story types like: {', '.join(themes)}. "
        "Every title must be a story that these places, things and actions can show — each one different. "
        + ("Write the titles and ideas in simple English (the video may be in Urdu). " if req.language == "ur" else "")
        + (f"Do NOT repeat these: {'; '.join(req.avoid[-30:])}. " if req.avoid else "")
        + 'Reply with ONLY JSON: {"titles":[{"title":"...","idea":"2-3 sentences: who wants what, what happens (using the '
        'actions above), the funny ending","places":["the places it uses"]}]}'
    )
    data = _json_in(_ai_text(prompt, req.gemini_key))
    items = (data or {}).get("titles") if isinstance(data, dict) else None
    if not isinstance(items, list) or not items:
        raise HTTPException(502, "The AI did not suggest titles — press the button again.")
    out = [{"title": str(t.get("title", ""))[:120], "idea": str(t.get("idea", ""))[:600],
            "places": [str(p)[:40] for p in (t.get("places") or [])][:4]}
           for t in items if isinstance(t, dict) and t.get("title")]
    return {"titles": out[:req.count]}


@router.get("/capabilities")
def get_capabilities() -> dict:
    """The list of what the app can show (also goes into the ChatGPT prompt)."""
    return {"text": capabilities_text()}


@router.get("/actions")
def list_actions() -> dict:
    mine = {}
    try:
        mine = json.loads(ACTIONS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass
    return {"actions": custom_actions(), "mine": sorted(mine) if isinstance(mine, dict) else [],
            "builtin": sorted(set(WORLD_ACTS) | set(a for a in ACTIONS if not a.startswith("w-"))), "sounds": SFX_NAMES}


@router.put("/actions/{name}")
def save_action(name: str, a: CustomAction) -> dict:
    name = re.sub(r"[^a-z\-]", "", name.lower())[:30]
    if not name or name in WORLD_ACTS or name in ACTIONS:
        raise HTTPException(400, "Give the action a new one-word name (e.g. weld).")
    try:
        mine = json.loads(ACTIONS_FILE.read_text(encoding="utf-8"))
        mine = mine if isinstance(mine, dict) else {}
    except (OSError, ValueError):
        mine = {}
    d = a.model_dump()
    d["words"] = [w.lower().strip()[:30] for w in d["words"] if w.strip()][:12]
    mine[name] = d
    ACTIONS_FILE.write_text(json.dumps(mine, indent=1), encoding="utf-8")
    return {"ok": True, "name": name}


@router.delete("/actions/{name}")
def delete_action(name: str) -> dict:
    try:
        mine = json.loads(ACTIONS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        mine = {}
    if isinstance(mine, dict) and name in mine:
        mine.pop(name)
        ACTIONS_FILE.write_text(json.dumps(mine, indent=1), encoding="utf-8")
    return {"ok": True}


@router.get("/jobs/{job_id}/script")
def get_script(job_id: str) -> dict:
    _read_job(job_id)
    data = _read_json(_job_dir(job_id) / "script.json", {"scenes": []})
    return {**data, "missing": missing_actions(data.get("scenes") or [], data.get("ignored") or []),
            "added": added_tags(data.get("scenes") or [])}


class ScriptLine(BaseModel):
    speaker: str
    text: str = Field(..., max_length=400)
    expression: str = "normal"
    pose: str = "idle"
    sfx: str = ""
    tone: str = ""


class ScriptScene(BaseModel):
    place: str = ""
    world: str = Field("", max_length=80)  # your own 3D world, chosen in the review
    blueprint: str = Field("", max_length=40)  # or a ready-made place (city, airport, classroom…)
    calm: bool = False  # no walking around while talking
    sitting: bool = False
    holding: dict[str, str] = Field(default_factory=dict)
    time_skip: str = Field("", max_length=60)
    location: str = ""
    background: str = Field("cartoon background", max_length=80)
    characters: list[str] = []
    lines: list[ScriptLine]


class ScriptPayload(BaseModel):
    scenes: list[ScriptScene] = Field(..., min_length=1, max_length=40)
    ignored: list[str] = Field(default_factory=list)  # missing actions you chose to skip


@router.put("/jobs/{job_id}/script")
def put_script(job_id: str, payload: ScriptPayload) -> dict:
    job = _read_job(job_id)
    if job.get("status") not in ("script_ready", "error"):
        raise HTTPException(400, "The story can only be edited before the video is made.")
    chars = _job_characters(job)
    story = _normalize_story([s.model_dump() for s in payload.scenes], chars)
    _update(job, auto_chars=[c for c in chars if c.get("auto")])
    if not story:
        raise HTTPException(400, "The story has no dialogue lines.")
    data = {"title": job["title"], "scenes": story, "ignored": [str(x)[:30] for x in payload.ignored][:50]}
    _write_json(_job_dir(job_id) / "script.json", data)
    return {**data, "missing": missing_actions(story, data["ignored"]), "added": added_tags(story)}


class ContinueRequest(BaseModel):
    pixabay_key: str = Field("", max_length=100)
    freesound_key: str = Field("", max_length=100)
    tts_keys: dict[str, str] = Field(default_factory=dict)


@router.post("/jobs/{job_id}/continue")
def continue_job(job_id: str, payload: ContinueRequest) -> dict:
    job = _read_job(job_id)

    if job.get("status") not in ("script_ready", "error", "ready", "done", "waiting"):
        raise HTTPException(400, "This video is already being made.")
    _update(job, status="voicing", progress=15, message="Starting voices…",
            pixabay_key=payload.pixabay_key.strip() or job.get("pixabay_key", ""),
            freesound_key=payload.freesound_key.strip() or job.get("freesound_key", ""),
            tts_keys={**(job.get("tts_keys") or {}),
                      **{k: str(v).strip()[:200] for k, v in payload.tts_keys.items()
                         if k in ("google", "unreal", "elevenlabs") and v}})
    queued = _queue_or_start(job, "prepare")
    return {"ok": True, "queued": queued}


@router.get("/jobs/{job_id}/sprites")
def get_sprites(job_id: str) -> dict:
    job = _read_job(job_id)
    timeline = _read_json(_job_dir(job_id) / "timeline.json", None)
    if not timeline:
        raise HTTPException(400, "Not ready for drawing yet.")
    jdir = _job_dir(job_id)
    have = {p.stem for p in (jdir / "sprites").glob("*.png")}
    return {"size": job.get("sprite_size"), "geometry": job.get("geometry"),
            "sprites": [s for s in timeline["sprites"] if s["key"] not in have],
            "emotes": [e for e in timeline.get("emotes") or [] if e["key"] not in have],
            "environments": [{"index": i, "layout": layout}
                             for i, layout in enumerate(timeline.get("layouts") or [])
                             if not (jdir / "bg" / f"{i:02d}.png").exists()]}


@router.post("/jobs/{job_id}/sprites/{key}")
async def put_sprite(job_id: str, key: str, file: UploadFile = File(...)) -> dict:
    _read_job(job_id)
    if not _KEY_RE.match(key):
        raise HTTPException(400, "Bad sprite name.")
    data = await file.read()
    if len(data) > 3 * 1024 * 1024 or not data.startswith(b"\x89PNG"):
        raise HTTPException(400, "Sprite must be a PNG.")
    sprite_dir = _job_dir(job_id) / "sprites"
    sprite_dir.mkdir(exist_ok=True)
    (sprite_dir / f"{key}.png").write_bytes(data)
    return {"ok": True}


@router.post("/jobs/{job_id}/background/{idx}")
async def put_background(job_id: str, idx: int, file: UploadFile = File(...)) -> dict:
    _read_job(job_id)
    if not 0 <= idx < 100:
        raise HTTPException(400, "Bad scene number.")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024 or not data.startswith(b"\x89PNG"):
        raise HTTPException(400, "Scene drawing must be a PNG.")
    bg_dir = _job_dir(job_id) / "bg"
    bg_dir.mkdir(exist_ok=True)
    (bg_dir / f"{idx:02d}.png").write_bytes(data)
    return {"ok": True}


@router.get("/jobs/{job_id}/timeline")
def get_timeline(job_id: str) -> dict:
    """Everything the browser needs to draw the cartoon (preview + final video)."""
    job = _read_job(job_id)
    timeline = _read_json(_job_dir(job_id) / "timeline.json", None)
    if not timeline:
        raise HTTPException(400, "Not ready yet.")
    keep = ("actions", "frames", "cues", "pops", "extras", "effects", "screens", "inserts", "auto_chars", "layouts", "lie", "fps", "format", "size", "width", "height",
            "feetY", "geometry", "scenes", "subtitles")
    out = {**{k: timeline.get(k) for k in keep}, "character_ids": job.get("character_ids", [])}
    for ins in out.get("inserts") or []:
        ins["url"] = f"/api/animator/jobs/{job_id}/insert/{ins['dir']}/"
    try:  # add-on packs: outfits and the looks of side characters (2026-11-19)
        import tools_planner
        out["pack"] = tools_planner.player_pack()
    except Exception:  # noqa: BLE001
        pass
    return out


@router.get("/jobs/{job_id}/insert/{d}/{k}")
def insert_frame(job_id: str, d: str, k: str):
    from fastapi.responses import FileResponse
    if not re.fullmatch(r"\d{2}", d) or not re.fullmatch(r"\d{4}\.png", k):
        raise HTTPException(404, "No such picture.")
    p = _job_dir(job_id) / "inserts" / d / k
    if not p.exists():
        raise HTTPException(404, "No such picture.")
    return FileResponse(p, media_type="image/png", headers={"Cache-Control": "max-age=86400"})


@router.get("/jobs/{job_id}/audio")
def get_audio(job_id: str) -> FileResponse:
    path = _job_dir(job_id) / (_read_job(job_id).get("mix_file") or "mix.m4a")
    if not path.exists():
        path = _job_dir(job_id) / "mix.m4a"
    if not path.exists():
        raise HTTPException(404, "Audio not ready.")
    return FileResponse(path, media_type="audio/mp4", headers={"Cache-Control": "no-store"})


def _check_sound(path: Path) -> None:
    """Fail loudly if the finished video has no (or silent) sound."""
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-map", "0:a:0", "-af", "volumedetect",
                           "-f", "null", "-"], capture_output=True, text=True, timeout=300, **no_window_kwargs())
    m = re.search(r"max_volume:\s*(-?[\d.]+|-inf) dB", proc.stderr)
    if proc.returncode != 0 or not m:
        raise RuntimeError("The finished video has no sound track. " + proc.stderr[-300:])
    if m.group(1) == "-inf" or float(m.group(1)) < -60:
        raise RuntimeError("The finished video's sound is silent.")


class RemixRequest(BaseModel):
    music_level: float = Field(1.0, ge=0.0, le=4.0)


@router.post("/jobs/{job_id}/remix")
def remix(job_id: str, req: RemixRequest) -> dict:
    """Music louder / quieter (preview slider): only the sound is mixed again."""
    job = _read_job(job_id)
    jdir = _job_dir(job_id)
    if not (jdir / "voice.wav").exists():
        raise HTTPException(400, "The preview is not ready yet.")
    _update(job, music_level=req.music_level)
    tl = _read_json(jdir / "timeline.json", {})
    # A NEW file each time: on Windows the preview may still hold the old one open.
    name = f"mix-{int(time.time() * 1000)}.m4a"
    _mix_audio(_read_job(job_id), jdir, len(tl.get("frames") or []) / FPS, name)
    _update(_read_job(job_id), mix_file=name)
    for old in jdir.glob("mix-*.m4a"):
        if old.name != name:
            try:
                old.unlink()
            except OSError:
                pass
    return {"ok": True, "music_level": req.music_level}


@router.get("/jobs/{job_id}/capcut")
def capcut_pack(job_id: str) -> FileResponse:
    """Everything as separate layers for CapCut (or any editor): drop
    every file on the timeline at 0:00 and they line up exactly."""
    import zipfile
    job = _read_job(job_id)
    jdir = _job_dir(job_id)
    if not (jdir / "video.mp4").exists():
        raise HTTPException(400, "Render the final video first.")
    tl = _read_json(jdir / "timeline.json", {})
    duration = len(tl.get("frames") or []) / FPS
    layers = jdir / "capcut"
    layers.mkdir(exist_ok=True)
    _run_ffmpeg(["-i", "video.mp4", "-map", "0:v", "-c", "copy", "-an", "capcut/1-video-no-sound.mp4"], cwd=jdir)
    _run_ffmpeg(["-i", "voice.wav", "-c:a", "pcm_s16le", "capcut/2-voices.wav"], cwd=jdir)
    if (jdir / "sfx.wav").exists():
        _run_ffmpeg(["-i", "sfx.wav", "-c:a", "pcm_s16le", "capcut/3-sound-effects.wav"], cwd=jdir)
    music = Path(job.get("music_file") or "")
    if music.is_file():
        level = MUSIC_VOLUME * float(job.get("music_level", 1.0))
        _run_ffmpeg(["-i", "voice.wav", "-stream_loop", "-1", "-i", str(music.resolve()), "-filter_complex",
                     f"[1:a]aformat=sample_rates={SAMPLE_RATE}:channel_layouts=mono,volume={level:.3f},"
                     f"afade=t=in:d=1,afade=t=out:st={max(0, duration - 2.5):.2f}:d=2.5[bed];"
                     "[bed][0:a]sidechaincompress=threshold=0.04:ratio=4:attack=25:release=450[m]",
                     "-map", "[m]", "-t", f"{duration:.3f}", "-c:a", "pcm_s16le", "capcut/4-music.wav"], cwd=jdir)
    srt = []
    for i, cue in enumerate(tl.get("cues") or tl.get("subtitles") or []):
        a, b = float(cue.get("start", 0)), float(cue.get("end", 0))  # seconds
        text = cue.get("text", "")
        if not text:
            continue
        stamp = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(t * 1000 % 1000):03d}"  # noqa: E731
        srt.append(f"{len(srt) + 1}\n{stamp(a)} --> {stamp(b)}\n{text}\n")
    (layers / "5-subtitles.srt").write_text("\n".join(srt), encoding="utf-8")
    (layers / "READ ME.txt").write_text(
        "CapCut: New project -> Import all files -> drag each one onto the timeline at 0:00 (one per track).\n"
        "1 = picture, 2 = character voices, 3 = sound effects, 4 = background music (already ducked under voices),\n"
        "5 = subtitles (Text -> Local captions -> import .srt). Then edit anything you like.\n"
        + (job.get("music_credit") or ""), encoding="utf-8")
    safe = re.sub(r"[^A-Za-z0-9 _-]", "", job.get("title", "cartoon"))[:60].strip() or "cartoon"
    out = jdir / "capcut.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(layers.iterdir()):
            z.write(f, f"{safe}/{f.name}")
    return FileResponse(out, media_type="application/zip", filename=f"{safe} - CapCut layers.zip",
                        headers={"Cache-Control": "no-store"})


@router.post("/jobs/{job_id}/video-upload")
async def video_upload(job_id: str, file: UploadFile = File(...)) -> dict:
    """The browser-encoded H.264 picture + the mixed audio -> video.mp4 (no re-encoding)."""
    job = _read_job(job_id)
    jdir = _job_dir(job_id)
    raw = jdir / "video.h264"
    with raw.open("wb") as out:
        while True:
            block = await file.read(4 * 1024 * 1024)
            if not block:
                break
            out.write(block)
    if raw.stat().st_size < 1000:
        raise HTTPException(400, "The video from the browser is empty.")
    _update(job, status="rendering", progress=97, message="Joining picture and sound…")
    try:
        # The sound is mixed AGAIN from its parts for the final video (a
        # fresh file: never one the preview player still has open), then
        # checked — a video without sound is an error, not a result.
        tl = _read_json(jdir / "timeline.json", {})
        duration = len(tl.get("frames") or []) / FPS
        _mix_audio(_read_job(job_id), jdir, duration, "final-mix.m4a")
        _run_ffmpeg(["-f", "h264", "-r", str(FPS), "-i", "video.h264",
                     "-i", "final-mix.m4a", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                     "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-t", f"{duration:.3f}",
                     "-movflags", "+faststart", "video.mp4"], cwd=jdir, timeout=900)
        _check_sound(jdir / "video.mp4")
    except Exception as exc:  # noqa: BLE001
        _update(job, status="ready", message=f"Could not join picture and sound: {str(exc)[-300:]}")
        raise HTTPException(500, str(exc)[-500:]) from exc
    raw.unlink(missing_ok=True)
    # A fresh address every render, so the browser never shows an older copy.
    url = f"/api/animator/jobs/{job_id}/video?v={int(time.time())}"
    _update(job, status="done", progress=100, message="Your video is ready!", finished_at=_now(), video_url=url)
    return {"ok": True, "video_url": url}


@router.post("/jobs/{job_id}/render")
def render(job_id: str) -> dict:
    job = _read_job(job_id)
    if job.get("status") not in ("need_sprites", "error", "done"):
        raise HTTPException(400, "Not ready to render yet.")
    _update(job, status="rendering", progress=75, message="Rendering video…")
    _start_thread(job_id, "render")
    return {"ok": True}


@router.get("/options")
def options() -> dict:
    """Music tracks and sound effects the UI can offer."""
    pack = _read_json(MUSIC_PACK_DIR / "pack.json", {}).get("tracks") or []
    tracks = [{"file": t["file"], "name": t.get("name", t["file"]), "artist": t.get("artist", "")}
              for t in pack if t.get("file") and (MUSIC_PACK_DIR / str(t["file"])).is_file()]
    return {"music": tracks, "sfx": SFX_NAMES, "synth_sfx": list(_SYNTH), "actions": ACTION_NAMES,
            "places": PLACES, "expressions": EXPRESSIONS, "poses": POSES}


@router.get("/jobs/{job_id}/video")
def get_video(job_id: str) -> FileResponse:
    job = _read_job(job_id)
    path = _job_dir(job_id) / "video.mp4"
    if not path.exists():
        raise HTTPException(404, "Video not ready.")
    safe = re.sub(r"[^A-Za-z0-9 _-]", "", job.get("title", "cartoon"))[:60].strip() or "cartoon"
    return FileResponse(path, media_type="video/mp4", filename=f"{safe}.mp4", headers={"Cache-Control": "no-store"})


@router.get("/jobs/{job_id}/background/{idx}")
def get_background(job_id: str, idx: int) -> FileResponse:
    path = _bg_path(_job_dir(job_id), idx) if 0 <= idx < 100 else None
    if not path:
        raise HTTPException(404, "Background not ready.")
    return FileResponse(path)


# The free 3D model library (/api/models/…) rides along with this router,
# so main.py needs no change.
try:
    import tools_models as _tools_models  # noqa: E402
    router.routes.extend(_tools_models.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("3D model library not loaded:", _exc)
# Auto Video's studio presenter (2026-11-18) rides along too.
try:
    import tools_studio as _tools_studio  # noqa: E402
    router.routes.extend(_tools_studio.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Studio presenter not loaded:", _exc)
# Topic Research Lab + New Channel Wizard (2026-11-19).
try:
    import tools_research as _tools_research  # noqa: E402
    router.routes.extend(_tools_research.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Research tools not loaded:", _exc)
# Channel Doctor + CPM estimates (2026-11-19).
try:
    import tools_doctor as _tools_doctor  # noqa: E402
    router.routes.extend(_tools_doctor.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Channel Doctor not loaded:", _exc)
# Visual Explainer (2026-11-19).
try:
    import tools_visual as _tools_visual  # noqa: E402
    router.routes.extend(_tools_visual.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Visual Explainer not loaded:", _exc)
# Visual Explainer — Script mode: the user's own AI-written scene code (2026-11-20).
try:
    import tools_script as _tools_script  # noqa: E402
    router.routes.extend(_tools_script.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Script mode not loaded:", _exc)
# Visual Explainer — whole-video preview + "fix this part" (2026-11-20).
try:
    import tools_preview as _tools_preview  # noqa: E402
    router.routes.extend(_tools_preview.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Preview not loaded:", _exc)
# Auto Video — Script mode: the user's AI plans the footage of every scene (2026-11-20).
try:
    import tools_avscript as _tools_avscript  # noqa: E402
    router.routes.extend(_tools_avscript.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Auto Video script mode not loaded:", _exc)
# My Videos — every tool's videos in one list, with delete to free the disk (2026-11-20).
try:
    import tools_library as _tools_library  # noqa: E402
    router.routes.extend(_tools_library.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("My Videos not loaded:", _exc)
# Motion graphics engine status / install (2026-11-19).
try:
    import tools_graphics as _tools_graphics  # noqa: E402
    router.routes.extend(_tools_graphics.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Motion graphics not loaded:", _exc)
# Script Planner + add-on packs (2026-11-19).
try:
    import tools_planner as _tools_planner  # noqa: E402
    router.routes.extend(_tools_planner.router.routes)
    _tools_planner.apply_sounds()
except Exception as _exc:  # noqa: BLE001
    print("Script Planner not loaded:", _exc)
# Dashboard settings kept on this computer (Colab voice link…) (2026-11-19).
try:
    import tools_config as _tools_config  # noqa: E402
    router.routes.extend(_tools_config.router.routes)
except Exception as _exc:  # noqa: BLE001
    print("Dashboard settings not loaded:", _exc)


# A video that was being made when the app was closed / restarted (user,
# 2026-11-18: "70 voices done, I don't want to lose them"): its thread is
# gone, so it is marked stopped and "↻ Try again" carries on. Finished
# voices are files on disk and are reused — only the missing ones are made.
def _recover_interrupted_jobs() -> None:
    for job_file in ANIM_DIR.glob("*/job.json"):
        try:
            job = _read_json(job_file, None)
            if job and job.get("status") in ("queued", "writing", "voicing", "backgrounds", "rendering"):
                job.update(status="error", message="Stopped because the app was restarted. Press ↻ Try again — "
                                                   "the voices already made are kept, only the rest are made.")
                _write_json(job_file, job)
        except Exception:  # noqa: BLE001
            continue


_recover_interrupted_jobs()
threading.Timer(4.0, _queue_next).start()  # waiting videos carry on after a restart
