"""YT Guru — the real world map of Script mode: country shapes, camera flights, lit countries, pins, routes.

    world_map(); fly_to("Pakistan"); light("Pakistan", "green"); pin("Karachi", "Port city")
    route("Karachi", "Dubai")

Map data: Natural Earth (public domain) in data/world_countries.json, places in data/world_places.json.
Borders are drawn as that data has them; some borders in the world are disputed.
The design follows the user's earlier map version (YTGuru-update); for speed, countries outside the
camera's view are not drawn.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAND, BORDER, WATER = "#3a4c68", "#6a7fa6", "#131b29"
LON0, LON1, LAT0, LAT1 = -170.0, 190.0, -58.0, 84.0

ALIASES = {"usa": "united states of america", "us": "united states of america", "u.s.": "united states of america",
           "america": "united states of america", "united states": "united states of america", "uk": "united kingdom",
           "britain": "united kingdom", "great britain": "united kingdom", "england": "united kingdom",
           "uae": "united arab emirates", "congo": "dem. rep. congo", "drc": "dem. rep. congo", "ivory coast": "côte d'ivoire",
           "czech republic": "czechia", "burma": "myanmar", "korea": "south korea", "holland": "netherlands"}
# large cities the places file (mostly capitals) may not have: (longitude, latitude)
CITIES = {"new york": (-74.0, 40.71), "los angeles": (-118.24, 34.05), "san francisco": (-122.42, 37.77), "chicago": (-87.63, 41.88),
          "houston": (-95.37, 29.76), "toronto": (-79.38, 43.65), "vancouver": (-123.12, 49.28), "sao paulo": (-46.63, -23.55),
          "istanbul": (28.98, 41.01), "dubai": (55.27, 25.2), "karachi": (67.01, 24.86), "lahore": (74.34, 31.55),
          "mumbai": (72.88, 19.08), "bangalore": (77.59, 12.97), "kolkata": (88.36, 22.57), "shanghai": (121.47, 31.23),
          "shenzhen": (114.06, 22.54), "hong kong": (114.17, 22.32), "osaka": (135.5, 34.69), "sydney": (151.21, -33.87),
          "melbourne": (144.96, -37.81), "johannesburg": (28.05, -26.2), "lagos": (3.38, 6.52), "frankfurt": (8.68, 50.11),
          "zurich": (8.54, 47.38), "milan": (9.19, 45.46), "barcelona": (2.17, 41.39), "geneva": (6.14, 46.2),
          "hollywood": (-118.33, 34.1), "silicon valley": (-122.05, 37.39), "wall street": (-74.01, 40.707),
          "jeddah": (39.19, 21.49), "doha": (51.53, 25.29), "peshawar": (71.58, 34.01), "faisalabad": (73.08, 31.42)}


@lru_cache(maxsize=1)
def countries() -> list:
    try:
        return json.loads((HERE / "data" / "world_countries.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


@lru_cache(maxsize=1)
def places() -> list:
    try:
        return json.loads((HERE / "data" / "world_places.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def country(name) -> dict | None:
    n = str(name or "").strip().lower()
    n = ALIASES.get(n, n)
    if not n:
        return None
    for key in ("name", "admin", "long", "iso3", "iso2"):  # a full name wins over a code
        for c in countries():
            if str(c.get(key, "")).lower() == n:
                return c
    return None


def lonlat(place) -> tuple[float, float] | None:
    """(longitude, latitude) of a city or country name — or of (lon, lat) given directly."""
    if isinstance(place, (list, tuple)):
        try:
            lon, lat = float(place[0]), float(place[1])
        except (TypeError, ValueError, IndexError):
            return None
        return (lon, lat) if -180 <= lon <= 180 and -90 <= lat <= 90 else None
    low = str(place or "").strip().lower()
    if low in CITIES:
        return CITIES[low]
    for p in places():
        if p["name"].lower() == low:
            return p["lon"], p["lat"]
    c = country(low)
    if c:
        x0, y0, x1, y1 = main_box(c)
        return (x0 + x1) / 2, (y0 + y1) / 2
    return None


def main_box(c: dict) -> tuple[float, float, float, float]:
    """(lon0, lat0, lon1, lat1) of the country's largest part (its mainland, not far islands)."""
    def area(r):
        return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1]))) / 2
    ring = max(c["rings"], key=area)
    xs, ys = [p[0] for p in ring], [p[1] for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def flight(w0: float, w1: float, distance: float, a: float) -> float:
    """The view's width at moment a (0..1) of a flight: from w0 to w1, rising higher for a long trip."""
    base = math.exp(math.log(w0) + (math.log(w1) - math.log(w0)) * a)
    rise = max(0.0, min(1.6, distance / max(w0, w1) - 0.55))
    return base * (1 + rise * math.sin(math.pi * a))


# ================================================================== drawing
def make(S, api: dict) -> dict:
    """The map tools for scene code."""
    import manim as M
    import numpy as np

    import vis_kit as K
    import vis_scene as V
    import vis_text

    frame = S.camera.frame
    state: dict = {"map": None, "caption": None}
    tall = M.config.pixel_height > M.config.pixel_width
    full_w = float(V.W)
    scale = (13.6 if not tall else 14.0) / (LON1 - LON0)
    centre_y = 0.55 if not tall else 1.0

    def at(lon, lat):
        lon = lon + 360 if lon < LON0 - 5 else lon
        return np.array([(lon - (LON0 + LON1) / 2) * scale, centre_y + (lat - (LAT0 + LAT1) / 2) * scale, 0.0])

    def zoom_now() -> float:
        return float(frame.width) / full_w  # 1 = the whole stage, small = close up

    def build():
        group = M.VGroup()
        sea = M.Rectangle(width=80, height=80, fill_color=WATER, fill_opacity=1, stroke_width=0)
        land = M.VGroup()
        index, boxes = {}, []
        for c in countries():
            parts = M.VGroup()
            for ring in c["rings"]:
                if len(ring) < 3 or max(p[1] for p in ring) < LAT0:  # Antarctica stays out
                    continue
                shift = 360 if min(p[0] for p in ring) < LON0 else 0
                pts = [at(lon + shift, lat) for lon, lat in ring]
                shape = M.VMobject(fill_color=LAND, fill_opacity=1, stroke_color=BORDER, stroke_width=0.7)
                shape.set_points_as_corners(pts + [pts[0]])
                parts.add(shape)
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                boxes.append((min(xs), min(ys), max(xs), max(ys), shape))
            if len(parts):
                index[str(c.get("name", "")).lower()] = parts
        seen = {"key": None}

        def cull(mob, dt=0):  # only what the camera sees is drawn; borders keep their thickness at any zoom
            z = zoom_now()
            cx, cy = float(frame.get_center()[0]), float(frame.get_center()[1])
            hw, hh = float(frame.width) / 2 + 0.1, float(frame.height) / 2 + 0.1
            key = (round(cx, 2), round(cy, 2), round(z, 3))
            if key == seen["key"]:
                return
            seen["key"] = key
            shown = [b[4] for b in boxes if b[2] > cx - hw and b[0] < cx + hw and b[3] > cy - hh and b[1] < cy + hh
                     and max(b[2] - b[0], b[3] - b[1]) > z * 0.012]
            width = max(0.15, 0.7 * z ** 0.9)
            for shape in shown:
                shape.set_stroke(width=width)
            mob.submobjects = shown
        land.submobjects = [b[4] for b in boxes]
        cull(land)
        land.add_updater(cull)
        group.add(sea, land)
        return {"group": group, "land": land, "index": index, "shapes": boxes}

    def need() -> dict:
        if state["map"] is None:
            world_map(0.6)
        return state["map"]

    def world_map(dur=1.0):
        """The whole earth. Then fly_to(), light(), route(), pin(), map_home(), map_caption()."""
        if state["map"] is not None:
            return map_home(dur)
        S.remove(*[m for m in list(S.mobjects)])
        S.scenery = []
        frame.clear_updaters()
        frame.move_to([0, 0, 0]).set(width=full_w)
        made = build()
        state["map"] = made
        S.snd("swoosh")
        sea, land = made["group"][0], made["land"]
        S.add(sea, land)
        S.floor_rect = sea  # clear() keeps the map
        S.scenery = [sea, land]
        length = max(0.0, min(float(dur), S.total - S.t - 0.1))
        if length > 0.15:
            veil = M.Rectangle(width=80, height=80, fill_color=WATER, fill_opacity=1, stroke_width=0)
            S.add(veil)
            api["play"](M.FadeOut(veil), run_time=length)
            S.remove(veil)

    def fly(target, width, dur, sound="whoosh"):
        start, w0 = frame.get_center().copy(), float(frame.width)
        distance = float(np.linalg.norm(target - start))

        def step(mob, a):
            e = a * a * (3 - 2 * a)
            mob.move_to(start + (target - start) * e)
            mob.set(width=flight(w0, width, distance, e))
        return api["play"](M.UpdateFromAlphaFunc(frame, step), run_time=dur, rate_func=M.rate_functions.linear, sound=sound)

    def fly_to(place, zoom=None, dur=1.6):
        """The camera flies to a country or city. zoom 1 = the whole earth; without it the country fills the view."""
        need()
        c = None if isinstance(place, (list, tuple)) or str(place).strip().lower() in CITIES else country(place)
        if c is not None:
            x0, y0, x1, y1 = main_box(c)
            a, b = at(x0, y0), at(x1, y1)
            target = (a + b) / 2
            aspect = float(M.config.pixel_width) / float(M.config.pixel_height)
            fit = max((b[0] - a[0]) * 1.9, (b[1] - a[1]) * 1.9 * aspect, full_w / 11)
            width = min(full_w, fit) if zoom is None else full_w / max(1.0, min(14.0, V.num(zoom, 3.0)))
        else:
            ll = lonlat(place)
            if ll is None:
                S.warnings.append(f'fly_to("{place}"): place not found')
                return 0
            target = at(*ll)
            width = full_w / max(1.0, min(14.0, V.num(zoom, 6.0)))
        return fly(target, width, dur)

    def map_home(dur=1.4):
        need()
        return fly(np.array([0.0, 0.0, 0.0]), full_w, dur, "swoosh")

    def light(place, color="orange", dur=0.8):
        """One country (or a list of countries) lights up in a colour."""
        made = need()
        names = list(place) if isinstance(place, (list, tuple)) else [place]
        shapes = []
        for name in names:
            c = country(name)
            parts = made["index"].get(str(c.get("name", "")).lower()) if c else None
            if parts is None:
                S.warnings.append(f'light("{name}"): country not found')
            else:
                shapes.extend(parts)
        if not shapes:
            return 0
        shade = M.ManimColor(K.col(color, K.ORANGE))
        base = [s.get_fill_color() for s in shapes]
        proxy = M.VGroup()  # animated so the lit countries are redrawn

        def step(_m, a):
            for s, b in zip(shapes, base):
                s.set_fill(M.interpolate_color(b, shade, a), opacity=1)
        S.add(proxy)
        used = api["play"](M.UpdateFromAlphaFunc(made["land"], step, suspend_mobject_updating=False), run_time=dur, sound="pop")
        step(None, 1.0)
        S.remove(proxy)
        return used

    def route(a, b, color="gold", dur=1.6, bend=-0.6):
        """A curved route from one place to another, with a dot travelling along it."""
        need()
        la, lb = lonlat(a), lonlat(b)
        if la is None or lb is None:
            S.warnings.append(f'route("{a}", "{b}"): place not found')
            return None
        p0, p1 = at(*la), at(*lb)
        if np.linalg.norm(p1 - p0) < 1e-3:
            return None
        z = zoom_now()
        shade = K.col(color, K.GOLD)
        angle = V.num(bend, -0.6)
        if (p1[0] < p0[0]) == (angle < 0):  # the curve always bulges upward
            angle = -angle
        arc = M.ArcBetweenPoints(p0, p1, angle=angle, color=shade, stroke_width=max(0.8, 6 * z ** 0.9))
        head = M.Dot(p0, radius=0.1 * z, color=K.CREAM)
        line = arc.copy()
        S.add(line, head)

        def step(mob, alpha):
            mob.pointwise_become_partial(arc, 0, max(0.001, alpha))
            head.move_to(arc.point_from_proportion(max(0.0, min(1.0, alpha))))
        api["play"](M.UpdateFromAlphaFunc(line, step), run_time=dur, rate_func=M.rate_functions.ease_in_out_sine, sound="whoosh")
        S.remove(head)

        def keep_thin(mob, dt=0):  # the line keeps its thickness on screen at any zoom
            mob.set_stroke(width=max(0.8, 6 * zoom_now() ** 0.9))
        line.add_updater(keep_thin)
        return line

    def label_group(words, size, ink=None):
        ink = ink or K.CREAM
        text = vis_text.number(words, K.FONT, "BOLD", size, ink) if vis_text.can(words) else None
        if text is None:
            text = M.Text(words, font=K.FONT, weight="BOLD", font_size=size, color=ink)
        pill = M.RoundedRectangle(width=text.width + 0.34, height=text.height + 0.24, corner_radius=0.1, fill_color=K.INK,
                                  fill_opacity=0.9, stroke_width=0)
        return M.VGroup(pill, text.move_to(pill))

    def pin(place, text_="", color="orange", side="up"):
        """A pin drops on a place, with an optional label (side "up", "down", "left", "right")."""
        need()
        ll = lonlat(place)
        if ll is None:
            S.warnings.append(f'pin("{place}"): place not found')
            return None
        p, z = at(*ll), zoom_now()
        shade = K.col(color, K.ORANGE)
        mark = M.VGroup(M.Circle(radius=0.22, color=shade, stroke_width=max(1.0, 4 * z ** 0.9)),
                        M.Dot(radius=0.11, color=shade)).scale(z * (1.6 if tall else 1.0), about_point=[0, 0, 0]).shift(p)
        group = M.VGroup(mark)
        if text_:
            label = label_group(str(text_)[:30], 30).scale(z * (1.7 if tall else 1.0))
            direction = {"down": M.DOWN, "left": M.LEFT, "right": M.RIGHT}.get(str(side), M.UP)
            label.next_to(mark, direction, buff=0.08 * z)
            # keep the label inside the picture: turn it to the other side, or slide it in
            cx, half = float(frame.get_center()[0]), float(frame.width) / 2 - 0.1 * z
            if direction[0] > 0 and label.get_right()[0] > cx + half:
                label.next_to(mark, M.LEFT, buff=0.08 * z)
            elif direction[0] < 0 and label.get_left()[0] < cx - half:
                label.next_to(mark, M.RIGHT, buff=0.08 * z)
            over = label.get_right()[0] - (cx + half)
            under = (cx - half) - label.get_left()[0]
            if direction[0] == 0 and over > 0:
                label.shift(M.LEFT * over)
            elif direction[0] == 0 and under > 0:
                label.shift(M.RIGHT * under)
            group.add(label)
        api["play"](M.FadeIn(group, shift=M.DOWN * 0.35 * z), run_time=0.45, sound="thud")
        size = {"z": z}

        def keep_size(mob, dt=0):  # a pin stays the same size on screen while the camera zooms
            now = zoom_now()
            if abs(now - size["z"]) > 1e-4:
                mob.scale(now / size["z"], about_point=p)
                size["z"] = now
                if len(mob) > 1:  # zoomed far out, the labels would pile up: only the pins stay
                    shown = 1.0 if now < z * 2.2 else 0.0
                    mob[1][0].set_fill(opacity=0.9 * shown)
                    mob[1][1].set_opacity(shown)
        group.add_updater(keep_size)
        return group

    def map_caption(words, color=None):
        """A title that stays at the top of the screen while the camera moves."""
        need()
        if state["caption"] is not None:
            S.remove(state["caption"])
        base = label_group(str(words)[:44], 40 if not tall else 52, K.col(color, K.GOLD))
        holder = M.VGroup(base.copy())

        def follow(mob, dt=0):
            z = zoom_now()
            c = frame.get_center()
            top = c[1] + (frame.height / 2 - 0.65 * z if not tall else 7.6 * z)
            mob.submobjects = [base.copy().scale(z, about_point=base.get_center()).move_to([c[0], top, 0])]
        follow(holder)
        holder.add_updater(follow)
        state["caption"] = holder
        api["play"](M.FadeIn(holder), run_time=0.35, sound="pop")
        return holder

    return {"world_map": world_map, "fly_to": fly_to, "map_home": map_home, "light": light, "route": route, "pin": pin,
            "map_caption": map_caption}


GUIDE = r'''WORLD MAP — real country shapes, a camera that flies, countries that light up, pins and routes. Use it when the
story is about places (where a company earns, a country's economy, money moving between cities). The map is the whole
scene: do not mix it with thing(), person(), setting() or a master scene.
  world_map()                              the whole earth (call it first)
  fly_to("Pakistan")                       the camera flies there; a country fills the view. fly_to("Tokyo", zoom=6)
  light("India", "orange")                 or light(["India", "China"], "red")
  pin("Karachi", "Port city", "gold")      a pin with a 1-3 word label (side="up"/"down"/"left"/"right")
  route("New York", "London", "gold")      a curved line with a travelling dot
  map_home()                               back to the whole earth
  map_caption("Where the money goes")      a title that stays on screen
  Places: country names, capitals and large cities, or (longitude, latitude). Time each step with when():
      world_map()
      when("in Japan", -1.0)
      fly_to("Japan")
      light("Japan", "red")
      pin("Tokyo", "$40B sales")
  Keep labels apart: pin at most 3 places in one view. Do not show disputed borders as a point of the story.

'''
