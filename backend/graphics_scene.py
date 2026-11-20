"""YT Guru motion graphics (Manim + Pymunk), user 2026-11-19.

One generic Manim scene that draws a GRAPHIC SPEC (JSON) made of building blocks —
the app / the AI only fills data (numbers, words, icons, when they appear), never
code. Look = the "Why are you always broke?" sample the user liked: dark background,
Poppins, big counting numbers, bars, cards with icons, a stamp, a timeline.

Run (the app does this):  python -m manim render graphics_scene.py Graphic
with YTG_SPEC=<spec.json>. Blocks (all optional, "at" = seconds from the start):

  headline  {text, accent}                      big title (accent word in colour)
  money     {label, currency, start, steps:[{at, value, note, icon}]}   counter + bar + cards (+ day calendar)
  counter   {label, from, to, prefix, suffix, at, dur}
  compare   {items:[{label, value, icon}], unit, at}
  list      {items:[{text, icon, value, at}]}
  steps     {items:[{text, at}]}                 boxes joined by arrows
  timeline  {from, to, unit, label_to, at, dur}  dot crawling + "N days to go"
  meter     {label, from, to, at, dur}           0-100 % bar (comedy meters)
  stars     {count, at}
  countdown {from, at}
  chat      {messages:[{who, text, at, me}]}
  map       {stops:[...], at, dur}
  physics   {kind: pile|fall|topple|scatter|bounce|scale, icon, count, label, at,
             left:{label,value,icon}, right:{...}}   real physics (Pymunk)
  stamp     {text, at, color}
"""
import json
import math
import os
import random
from pathlib import Path

from manim import (BOLD, DOWN, LEFT, NORMAL, ORIGIN, PI, RIGHT, TAU, UP, Arc, Arrow, Circle, Create, Dot,
                   FadeIn, FadeOut, Flash, GrowFromCenter, GrowFromEdge, Group, ImageMobject, Line, Polygon, Rectangle,
                   RoundedRectangle, Scene, SurroundingRectangle, SVGMobject, Text, ValueTracker, VGroup,
                   Wiggle, Write, always_redraw, config, rate_functions)

SPEC = json.loads(Path(os.environ.get("YTG_SPEC", "spec.json")).read_text(encoding="utf-8"))
HERE = Path(__file__).resolve().parent
try:  # the app's own font (Poppins) when it is there
    import manimpango
    for f in (HERE / "fonts").glob("Poppins-*.ttf"):
        manimpango.register_font(str(f))
    FONT = "Poppins" if "Poppins" in manimpango.list_fonts() else "Sans"
except Exception:  # noqa: BLE001
    FONT = "Sans"

BG = SPEC.get("bg") or "#0b1020"
GREEN, YELLOW, ORANGE, RED, BLUE, PINK = "#22c55e", "#facc15", "#fb923c", "#ef4444", "#38bdf8", "#f472b6"
INK, MUTED, CARD, LINE = "#f8fafc", "#94a3b8", "#111827", "#334155"
COLORS = {"red": RED, "green": GREEN, "yellow": YELLOW, "orange": ORANGE, "blue": BLUE, "pink": PINK}
config.background_color = BG
if SPEC.get("transparent"):
    config.background_opacity = 0.0
W_UNITS = config.frame_width
H_UNITS = config.frame_height
TALL = H_UNITS > W_UNITS  # a Reel


def T(s, size=40, color=INK, weight=BOLD, maxw=None):
    t = Text(str(s), font=FONT, font_size=size, color=color, weight=weight)
    if maxw and t.width > maxw:
        t.scale_to_fit_width(maxw)
    return t


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def fmt(v, prefix="", suffix=""):
    v = num(v)
    s = f"{int(round(v)):,}" if abs(v) >= 100 or float(v).is_integer() else f"{v:,.1f}"
    return f"{prefix}{s}{suffix}"


def icon(word, size=0.9):
    """A picture for a word: the icon file the app found (OpenMoji / your library), or a simple badge."""
    path = (SPEC.get("icons") or {}).get(str(word or "").lower())
    if path and Path(path).exists():
        try:
            m = SVGMobject(path) if path.endswith(".svg") else ImageMobject(path)
            m.scale_to_fit_height(size)
            if m.width > size * 1.15:
                m.scale_to_fit_width(size * 1.15)
            return m
        except Exception:  # noqa: BLE001
            pass
    w = str(word or "?").strip() or "?"
    c = Circle(size / 2, fill_color=BLUE, fill_opacity=1, stroke_width=0)
    return VGroup(c, T(w[0].upper(), int(size * 40), BG).move_to(c))


def card(text, value="", ic=None, width=None, color=RED):
    width = width or min(W_UNITS * 0.62, 9.6)
    box = RoundedRectangle(width=width, height=1.1, corner_radius=0.2, fill_color=CARD, fill_opacity=1, stroke_color=LINE, stroke_width=3)
    parts = [box]
    left = box.get_left() + RIGHT * 0.35
    if ic is not None:
        ic.move_to(left + RIGHT * 0.45)
        parts.append(ic)
        left = ic.get_right() + RIGHT * 0.35
    val = T(value, 32, color) if value else None
    room = width - (left[0] - box.get_left()[0]) - (val.width + 0.7 if val else 0.4)
    lab = T(text, 30, INK, NORMAL, maxw=max(1.0, room))
    lab.move_to(left, aligned_edge=LEFT)
    parts.append(lab)
    if val:
        val.move_to(box.get_right() + LEFT * (0.35 + val.width / 2))
        parts.append(val)
    return Group(*parts)


class Graphic(Scene):
    def construct(self):
        self.t = 0.0
        self.total = max(1.0, num(SPEC.get("duration")) or 5.0)
        self.top = UP * (H_UNITS / 2 - 0.6)
        blocks = list(SPEC.get("blocks") or [])
        events = []  # (time, order, fn)
        for i, b in enumerate(blocks):
            fn = getattr(self, "b_" + str(b.get("type", "")), None)
            if fn:
                events.extend(fn(b, i) or [])
        events.sort(key=lambda e: (e[0], e[1]))
        for at, _, play in events:
            if at > self.t + 0.02:
                self.wait(at - self.t)
                self.t = at
            used = play() or 0.0
            self.t += used
        if self.total > self.t + 0.02:
            self.wait(self.total - self.t)

    # every block returns [(time, order, function that plays and returns its seconds)]
    def run(self, *anims, rt=0.6, **kw):
        self.play(*anims, run_time=rt, **kw)
        return rt

    # ---------------------------------------------------------------- headline
    def b_headline(self, b, i):
        text, accent = str(b.get("text") or ""), str(b.get("accent") or "")
        def go():
            words = [T(text, 64 if not TALL else 56, INK, maxw=W_UNITS * 0.9)]
            if accent:
                words.append(T(accent, 110 if not TALL else 90, RED, maxw=W_UNITS * 0.9))
            g = VGroup(*words).arrange(DOWN, buff=0.15)
            main = b.get("solo", len(SPEC.get("blocks") or []) == 1)
            if not main:
                g.scale(0.55).to_edge(UP, buff=0.4)
            self.headline = g
            return self.run(Write(words[0]), *([GrowFromCenter(words[1])] if accent else []), rt=0.9)
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- money (the sample)
    def b_money(self, b, i):
        cur = str(b.get("currency") or "Rs") + " "
        start = num(b.get("start"))
        steps = list(b.get("steps") or [])
        full = max([start] + [num(s.get("value")) for s in steps] + [1])
        bal = ValueTracker(0)
        day = ValueTracker(num(steps[0].get("day")) if steps and steps[0].get("day") else 1)
        has_day = any(s.get("day") for s in steps)

        def col(v):
            f = v / full
            return GREEN if f > 0.62 else YELLOW if f > 0.31 else ORANGE if f > 0.12 else RED
        head = T(b.get("label") or "Your money", 34, MUTED, NORMAL).to_corner(UP + LEFT, buff=0.6)
        number = always_redraw(lambda: T(cur + fmt(bal.get_value()), 96 if not TALL else 80, col(bal.get_value())).next_to(head, DOWN, buff=0.2, aligned_edge=LEFT))
        tw = min(7.2, W_UNITS * 0.6)
        track = RoundedRectangle(width=tw, height=0.42, corner_radius=0.21, fill_color="#1e293b", fill_opacity=1, stroke_width=0).next_to(head, DOWN, buff=1.9, aligned_edge=LEFT)

        def bar():
            f = max(0.0, min(1.0, bal.get_value() / full))
            return RoundedRectangle(width=max(0.05, tw * f), height=0.42, corner_radius=0.21, fill_color=col(bal.get_value()), fill_opacity=1, stroke_width=0).align_to(track, LEFT).align_to(track, UP)
        fill = always_redraw(bar)
        cal = None
        if has_day:
            box = RoundedRectangle(width=2.2, height=2.2, corner_radius=0.25, fill_color=CARD, fill_opacity=1, stroke_color=MUTED, stroke_width=3)
            top = Rectangle(width=2.2, height=0.55, fill_color=RED, fill_opacity=1, stroke_width=0)
            cal = VGroup(box, top).to_corner(UP + RIGHT, buff=0.7)
            top.align_to(box, UP)
            lbl = T("DAY", 24).move_to(top)
            dn = always_redraw(lambda: T(str(int(day.get_value())), 84).move_to(box.get_center() + DOWN * 0.28))
            cal = VGroup(cal, lbl, dn)
        self.cards = Group()
        ev = []

        def intro():
            anims = [FadeIn(head), FadeIn(number), FadeIn(track), FadeIn(fill)] + ([FadeIn(cal)] if cal else [])
            self.play(*anims, run_time=0.4)
            self.play(bal.animate.set_value(start), run_time=1.2, rate_func=rate_functions.ease_out_cubic)
            return 1.6
        ev.append((num(b.get("at")), i, intro))
        for k, s in enumerate(steps):
            def step(s=s):
                v = num(s.get("value"))
                anims = [bal.animate.set_value(v)]
                if s.get("day"):
                    anims.append(day.animate.set_value(num(s.get("day"))))
                note = str(s.get("note") or "")
                if note:
                    diff = v - bal.get_value()
                    c = card(note, ("+ " if diff > 0 else "- ") + cur + fmt(abs(diff)), icon(s.get("icon") or note, 0.7),
                             color=GREEN if diff > 0 else RED)
                    if len(self.cards) >= 3:
                        self.play(FadeOut(self.cards[0]), self.cards[1:].animate.shift(UP * 1.32), run_time=0.25)
                        self.cards.remove(self.cards[0])
                    if len(self.cards):
                        c.next_to(self.cards[-1], DOWN, buff=0.22, aligned_edge=LEFT)
                    else:
                        c.next_to(track, DOWN, buff=0.45, aligned_edge=LEFT)
                    self.cards.add(c)
                    anims += [FadeIn(c, shift=LEFT), Flash(c[-1], color=c[-1].color, line_length=0.25)]
                self.play(*anims, run_time=0.9, rate_func=rate_functions.ease_out_cubic)
                return 0.9
            ev.append((num(s.get("at")), i * 100 + k + 1, step))
        return ev

    # ---------------------------------------------------------------- counter
    def b_counter(self, b, i):
        v = ValueTracker(num(b.get("from")))
        pre, suf = str(b.get("prefix") or ""), str(b.get("suffix") or "")
        lab = T(b.get("label") or "", 40, MUTED, NORMAL, maxw=W_UNITS * 0.85)
        big = always_redraw(lambda: T(fmt(v.get_value(), pre, suf), 150 if not TALL else 110, YELLOW, maxw=W_UNITS * 0.9).next_to(lab, DOWN, buff=0.3))
        def go():
            VGroup(lab).move_to(UP * 1.2)
            self.play(FadeIn(lab), FadeIn(big), run_time=0.4)
            d = max(0.6, num(b.get("dur")) or 1.8)
            self.play(v.animate.set_value(num(b.get("to"))), run_time=d, rate_func=rate_functions.ease_out_cubic)
            return 0.4 + d
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- compare (bars)
    def b_compare(self, b, i):
        items = list(b.get("items") or [])[:5]
        if not items:
            return []
        mx = max(num(x.get("value")) for x in items) or 1
        unit = str(b.get("unit") or "")
        def go():
            n = len(items)
            maxh = H_UNITS * 0.5
            barw = min(1.6, W_UNITS * 0.7 / n)
            base_y = -H_UNITS / 2 + 1.6
            xs = [(k - (n - 1) / 2) * (W_UNITS * 0.8 / n) for k in range(n)]
            pal = [BLUE, PINK, GREEN, YELLOW, ORANGE]
            for k, it in enumerate(items):
                h = max(0.08, maxh * num(it.get("value")) / mx)
                r = Rectangle(width=barw, height=h, fill_color=pal[k % 5], fill_opacity=1, stroke_width=0)
                r.move_to([xs[k], base_y + h / 2, 0])
                ic = icon(it.get("icon") or it.get("label"), 0.7).next_to(r, DOWN, buff=0.15)
                lb = T(it.get("label") or "", 28, INK, NORMAL, maxw=W_UNITS * 0.8 / n - 0.2).next_to(ic, DOWN, buff=0.1)
                vl = T(fmt(it.get("value"), "", unit), 34, pal[k % 5]).next_to(r, UP, buff=0.15)
                self.play(FadeIn(ic), FadeIn(lb), GrowFromEdge(r, DOWN), FadeIn(vl, shift=UP * 0.3), run_time=0.55)
            return 0.55 * n
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- list / cards
    def b_list(self, b, i):
        items = list(b.get("items") or [])[:6]
        self.lcards = Group()
        ev = []
        for k, it in enumerate(items):
            def go(it=it):
                c = card(it.get("text") or "", str(it.get("value") or ""), icon(it.get("icon") or it.get("text"), 0.7), color=YELLOW)
                if len(self.lcards):
                    c.next_to(self.lcards[-1], DOWN, buff=0.22)
                else:
                    c.move_to(UP * (H_UNITS / 2 - 2.3))
                if len(self.lcards) >= 5:
                    self.play(FadeOut(self.lcards[0]), self.lcards[1:].animate.shift(UP * 1.32), run_time=0.25)
                    self.lcards.remove(self.lcards[0])
                    c.next_to(self.lcards[-1], DOWN, buff=0.22)
                self.lcards.add(c)
                return self.run(FadeIn(c, shift=LEFT * 1.2), rt=0.6)
            ev.append((num(it.get("at", b.get("at"))) + k * (0 if it.get("at") is not None else 0.8), i * 100 + k, go))
        return ev

    # ---------------------------------------------------------------- steps (flow)
    def b_steps(self, b, i):
        items = [str(x.get("text") if isinstance(x, dict) else x) for x in (b.get("items") or [])][:5]
        ats = [num(x.get("at")) if isinstance(x, dict) and x.get("at") is not None else num(b.get("at")) + k * 0.9 for k, x in enumerate(b.get("items") or [])]
        n = len(items)
        if not n:
            return []
        ev = []
        self.prev_box = None
        for k, s in enumerate(items):
            def go(k=k, s=s):
                w = min(3.2, W_UNITS * 0.85 / n - 0.5)
                box = RoundedRectangle(width=w, height=1.5, corner_radius=0.2, fill_color=CARD, fill_opacity=1, stroke_color=[BLUE, PINK, GREEN, YELLOW, ORANGE][k % 5], stroke_width=5)
                x = (k - (n - 1) / 2) * (W_UNITS * 0.85 / n)
                box.move_to([x, 0, 0]) if not TALL else box.move_to([0, (n - 1) / 2 * 1.9 - k * 1.9, 0])
                tx = T(s, 26, INK, NORMAL, maxw=w - 0.3).move_to(box)
                nb = T(str(k + 1), 30, [BLUE, PINK, GREEN, YELLOW, ORANGE][k % 5]).next_to(box, UP, buff=0.15)
                anims = [FadeIn(VGroup(box, tx, nb), shift=UP * 0.3)]
                if self.prev_box is not None:
                    a = Arrow(self.prev_box.get_right() if not TALL else self.prev_box.get_bottom(), box.get_left() if not TALL else box.get_top(), buff=0.1, color=MUTED, stroke_width=6)
                    anims.insert(0, Create(a))
                self.prev_box = box
                return self.run(*anims, rt=0.6)
            ev.append((ats[k], i * 100 + k, go))
        return ev

    # ---------------------------------------------------------------- timeline
    def b_timeline(self, b, i):
        a, z = num(b.get("from") or 1), num(b.get("to") or 30)
        unit = str(b.get("unit") or "days")
        cur = ValueTracker(a)
        def go():
            y = -H_UNITS / 2 + 1.7
            line = Line(LEFT * W_UNITS * 0.42, RIGHT * W_UNITS * 0.42, color=LINE, stroke_width=10).shift(UP * y)
            s_l = T(f"{unit[:-1].capitalize() if unit.endswith('s') else unit} {int(a)}", 28, MUTED, NORMAL).next_to(line.get_left(), DOWN, buff=0.3)
            end = Dot(line.get_right(), radius=0.22, color=GREEN)
            e_l = T(str(b.get("label_to") or f"{int(z)}"), 28, GREEN, maxw=W_UNITS * 0.4).next_to(end, DOWN, buff=0.3).align_to(end, RIGHT)
            you = Dot(line.get_left(), radius=0.2, color=RED)
            togo = always_redraw(lambda: T(f"{int(round(z - cur.get_value()))} {unit} to go...", 44, ORANGE).next_to(line, UP, buff=0.5))
            self.play(Create(line), FadeIn(s_l), FadeIn(end), FadeIn(e_l), FadeIn(you), FadeIn(togo), run_time=0.5)
            d = max(1.0, num(b.get("dur")) or 3.0)
            self.play(you.animate.move_to(line.get_right()), cur.animate.set_value(z), run_time=d, rate_func=rate_functions.linear)
            self.play(Flash(end, color=GREEN), run_time=0.4)
            return 0.9 + d
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- meter (comedy)
    def b_meter(self, b, i):
        v = ValueTracker(num(b.get("from") if b.get("from") is not None else 90))
        def go():
            lab = T(b.get("label") or "Level", 46, INK, maxw=W_UNITS * 0.8).move_to(UP * 1.4)
            tw = min(9.0, W_UNITS * 0.8)
            track = RoundedRectangle(width=tw, height=0.8, corner_radius=0.4, fill_color="#1e293b", fill_opacity=1, stroke_color=LINE, stroke_width=4)
            def bar():
                f = max(0.0, min(100.0, v.get_value())) / 100
                c = GREEN if f > 0.6 else YELLOW if f > 0.35 else RED
                return RoundedRectangle(width=max(0.08, tw * f), height=0.8, corner_radius=0.4, fill_color=c, fill_opacity=1, stroke_width=0).align_to(track, LEFT)
            fill = always_redraw(bar)
            pct = always_redraw(lambda: T(f"{int(round(v.get_value()))}%", 80, INK).next_to(track, DOWN, buff=0.4))
            self.play(FadeIn(lab), FadeIn(track), FadeIn(fill), FadeIn(pct), run_time=0.4)
            d = max(0.6, num(b.get("dur")) or 1.6)
            self.play(v.animate.set_value(num(b.get("to"))), run_time=d, rate_func=rate_functions.ease_in_out_cubic)
            if num(b.get("to")) <= 10:
                self.play(Wiggle(track, scale_value=1.05), run_time=0.5)
                return 0.9 + d
            return 0.4 + d
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- stars
    def b_stars(self, b, i):
        n = int(max(1, min(5, num(b.get("count") or 3))))
        def go():
            stars = VGroup()
            for k in range(5):
                pts = [[math.cos(PI / 2 + a * TAU / 10) * (0.7 if a % 2 == 0 else 0.3), math.sin(PI / 2 + a * TAU / 10) * (0.7 if a % 2 == 0 else 0.3), 0] for a in range(10)]
                s = Polygon(*pts, fill_color=YELLOW if k < n else "#1e293b", fill_opacity=1, stroke_color=INK if k < n else LINE, stroke_width=4)
                stars.add(s)
            stars.arrange(RIGHT, buff=0.35).move_to(UP * 0.4)
            self.add(*[s for k, s in enumerate(stars) if k >= n])
            for k in range(n):
                self.play(GrowFromCenter(stars[k]), run_time=0.3)
            return 0.3 * n
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- countdown
    def b_countdown(self, b, i):
        n = int(max(1, min(20, num(b.get("from") or 5))))
        def go():
            ring = Circle(1.6, color=RED, stroke_width=14)
            self.play(Create(ring), run_time=0.3)
            for k in range(n, 0, -1):
                d = T(str(k), 150, INK).move_to(ring)
                self.play(FadeIn(d, scale=1.6), run_time=0.25)
                self.wait(0.5)
                self.remove(d)
            go_t = T(str(b.get("end") or "GO!"), 120, GREEN).move_to(ring)
            self.play(GrowFromCenter(go_t), Flash(ring, color=GREEN), run_time=0.4)
            return 0.3 + n * 0.75 + 0.4
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- chat
    def b_chat(self, b, i):
        msgs = list(b.get("messages") or [])[:6]
        phone = RoundedRectangle(width=4.6 if not TALL else 6, height=H_UNITS * 0.85, corner_radius=0.5, fill_color="#0f172a", fill_opacity=1, stroke_color=MUTED, stroke_width=6)
        self.bubbles = VGroup()
        ev = [(num(b.get("at")), i * 100, lambda: self.run(FadeIn(phone, shift=UP), rt=0.4))]
        for k, m in enumerate(msgs):
            def go(m=m):
                me = bool(m.get("me"))
                txt = T(m.get("text") or "", 24, INK if me else "#0f172a", NORMAL, maxw=phone.width * 0.62)
                bub = RoundedRectangle(width=txt.width + 0.5, height=txt.height + 0.4, corner_radius=0.2, fill_color=GREEN if me else INK, fill_opacity=1, stroke_width=0)
                txt.move_to(bub)
                who = T(m.get("who") or "", 18, MUTED, NORMAL).next_to(bub, UP, buff=0.05, aligned_edge=RIGHT if me else LEFT)
                g = VGroup(bub, txt, who)
                if len(self.bubbles):
                    g.next_to(self.bubbles[-1], DOWN, buff=0.25)
                else:
                    g.move_to(phone.get_top() + DOWN * 1.0)
                g.align_to(phone, RIGHT if me else LEFT).shift((LEFT if me else RIGHT) * 0.3)
                if g.get_bottom()[1] < phone.get_bottom()[1] + 0.4:
                    shift = phone.get_bottom()[1] + 0.4 - g.get_bottom()[1]
                    self.play(self.bubbles.animate.shift(UP * shift), run_time=0.2)
                    g.shift(UP * shift)
                self.bubbles.add(g)
                return self.run(FadeIn(g, shift=UP * 0.3, scale=0.8), rt=0.4)
            ev.append((num(m.get("at", num(b.get("at")) + 0.6 + k * 1.2)), i * 100 + k + 1, go))
        return ev

    # ---------------------------------------------------------------- map
    def b_map(self, b, i):
        stops = [str(s) for s in (b.get("stops") or [])][:6]
        if len(stops) < 2:
            return []
        def go():
            rnd = random.Random(len("".join(stops)))
            pts = []
            n = len(stops)
            for k in range(n):
                x = -W_UNITS * 0.38 + k * (W_UNITS * 0.76 / (n - 1))
                y = (rnd.random() - 0.5) * H_UNITS * 0.35
                pts.append([x, y, 0])
            dots = VGroup(*[Dot(p, radius=0.18, color=YELLOW) for p in pts])
            labels = VGroup(*[T(s, 28, INK, maxw=3).next_to(d, UP if k % 2 == 0 else DOWN, buff=0.2) for k, (s, d) in enumerate(zip(stops, dots))])
            path = VGroup(*[Line(pts[k], pts[k + 1], color=MUTED, stroke_width=5).set_opacity(0.6) for k in range(n - 1)])
            self.play(FadeIn(dots), FadeIn(labels), Create(path), run_time=0.8)
            car = Dot(pts[0], radius=0.26, color=RED)
            self.add(car)
            d = max(1.0, num(b.get("dur")) or 2.5)
            for k in range(n - 1):
                self.play(car.animate.move_to(pts[k + 1]), run_time=d / (n - 1), rate_func=rate_functions.ease_in_out_sine)
                self.play(Flash(dots[k + 1], color=YELLOW, line_length=0.2), run_time=0.15)
            return 0.8 + d + 0.15 * (n - 1)
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- stamp
    def b_stamp(self, b, i):
        def go():
            c = COLORS.get(str(b.get("color") or "red"), RED)
            s = T(str(b.get("text") or "BROKE").upper(), 120 if not TALL else 90, c, maxw=W_UNITS * 0.7).rotate(-0.22)
            box = SurroundingRectangle(s, color=c, stroke_width=10, buff=0.2, corner_radius=0.15)
            g = VGroup(s, box).move_to(RIGHT * W_UNITS * 0.17 + DOWN * 0.8 if not TALL else DOWN * 1.5)
            self.play(FadeIn(g, scale=2.2), run_time=0.35, rate_func=rate_functions.rush_into)
            self.play(Wiggle(g, scale_value=1.04, rotation_angle=0.02 * TAU), run_time=0.5)
            return 0.85
        return [(num(b.get("at")), i, go)]

    # ---------------------------------------------------------------- physics (Pymunk)
    def b_physics(self, b, i):
        kind = str(b.get("kind") or "pile")
        if kind == "scale":
            return self.scale_block(b, i)
        def go():
            sim = simulate(kind, int(max(1, min(40, num(b.get("count") or 12)))), W_UNITS, H_UNITS)
            word = b.get("icon") or "coin"
            objs = Group()
            for _ in sim["bodies"]:
                objs.add(icon(word, sim["size"]))
            lab = T(b.get("label") or "", 44, INK, maxw=W_UNITS * 0.8).to_edge(UP, buff=0.5) if b.get("label") else None
            floor = Line(LEFT * W_UNITS / 2, RIGHT * W_UNITS / 2, color=LINE, stroke_width=6).move_to([0, sim["floor"], 0])
            extra = [jar for jar in sim.get("shapes_draw", [])]
            jar = VGroup(*[Line(a, c, color=MUTED, stroke_width=8) for a, c in extra])
            self.add(floor, jar)
            if lab:
                self.play(FadeIn(lab), run_time=0.3)
            frames = sim["frames"]
            k = {"f": 0}

            def upd(m, dt):
                k["f"] = min(len(frames) - 1, k["f"] + 1)
                for o, (x, y, a, on) in zip(m, frames[k["f"]]):
                    o.move_to([x, y, 0])
                    o.set_opacity(1 if on else 0)
                    o.rotate(a - getattr(o, "_ang", 0))
                    o._ang = a
            for o, (x, y, a, on) in zip(objs, frames[0]):
                o.move_to([x, y, 0]).set_opacity(1 if on else 0)
                o._ang = 0
            objs.add_updater(upd)
            self.add(objs)
            dur = len(frames) / config.frame_rate
            self.wait(dur)
            objs.clear_updaters()
            return dur + (0.3 if lab else 0)
        return [(num(b.get("at")), i, go)]

    def scale_block(self, b, i):
        L, R = b.get("left") or {}, b.get("right") or {}
        lv, rv = num(L.get("value") or 1), num(R.get("value") or 1)
        def go():
            ang = max(-0.35, min(0.35, (lv - rv) / max(lv, rv, 1) * 0.35))
            post = Line(DOWN * 2.2, UP * 0.6, color=MUTED, stroke_width=10)
            beam = Line(LEFT * 3.6, RIGHT * 3.6, color=INK, stroke_width=10).move_to(UP * 0.6)
            pl = VGroup(Line(LEFT * 3.6 + UP * 0.6, LEFT * 3.6 + DOWN * 0.6, color=MUTED), Arc(radius=1.0, start_angle=PI, angle=PI, color=INK, stroke_width=8).move_to(LEFT * 3.6 + DOWN * 1.0))
            pr = VGroup(Line(RIGHT * 3.6 + UP * 0.6, RIGHT * 3.6 + DOWN * 0.6, color=MUTED), Arc(radius=1.0, start_angle=PI, angle=PI, color=INK, stroke_width=8).move_to(RIGHT * 3.6 + DOWN * 1.0))
            li = icon(L.get("icon") or L.get("label"), 0.9).move_to(pl[1].get_center() + UP * 0.35)
            ri = icon(R.get("icon") or R.get("label"), 0.9).move_to(pr[1].get_center() + UP * 0.35)
            lt = T(f"{L.get('label') or ''}", 30, INK, NORMAL, maxw=3.4).next_to(pl, DOWN, buff=0.3)
            rt_ = T(f"{R.get('label') or ''}", 30, INK, NORMAL, maxw=3.4).next_to(pr, DOWN, buff=0.3)
            left_g, right_g = Group(pl, li, lt), Group(pr, ri, rt_)
            self.play(FadeIn(post), FadeIn(beam), FadeIn(left_g), FadeIn(right_g), run_time=0.5)
            self.play(beam.animate.rotate(ang), left_g.animate.shift(DOWN * math.sin(ang) * 3.6), right_g.animate.shift(UP * math.sin(ang) * 3.6),
                      run_time=1.0, rate_func=rate_functions.ease_out_bounce)
            return 1.5
        return [(num(b.get("at")), i, go)]


def simulate(kind, n, W, H):
    """Real 2D physics with Pymunk: positions of every thing on every frame."""
    import pymunk
    fps = int(config.frame_rate)
    space = pymunk.Space()
    space.gravity = (0, -22)
    floor_y = -H / 2 + 1.0
    size = 0.7 if n <= 15 else 0.55
    r = size / 2
    st = space.static_body
    segs = [pymunk.Segment(st, (-W, floor_y), (W, floor_y), 0.05),
            pymunk.Segment(st, (-W / 2, floor_y), (-W / 2, H), 0.05), pymunk.Segment(st, (W / 2, floor_y), (W / 2, H), 0.05)]
    draw = []
    if kind == "pile":  # into a jar
        jx = 0
        jl, jr, jb, jt = jx - 2.2, jx + 2.2, floor_y, floor_y + 3.8
        segs += [pymunk.Segment(st, (jl, jb), (jl, jt), 0.06), pymunk.Segment(st, (jr, jb), (jr, jt), 0.06)]
        draw = [((jl, jb, 0), (jl, jt, 0)), ((jr, jb, 0), (jr, jt, 0)), ((jl, jb, 0), (jr, jb, 0))]
    for s in segs:
        s.friction, s.elasticity = 0.8, 0.3
    space.add(*segs)
    rnd = random.Random(n * 7 + len(kind))
    bodies, born = [], []
    for k in range(n):
        body = pymunk.Body(1, pymunk.moment_for_circle(1, 0, r))
        if kind in ("pile", "fall"):
            body.position = (rnd.uniform(-1.6, 1.6) if kind == "pile" else rnd.uniform(-W * 0.4, W * 0.4), H / 2 + r + k * 0.05)
            born.append(int(k * fps * (0.12 if kind == "pile" else 0.08)))
        elif kind == "topple":  # a tall stack that leans and falls over
            body = pymunk.Body(1, pymunk.moment_for_box(1, (size, size)))
            body.position = (-1.0 + k * 0.035, floor_y + r + k * size * 1.01)
            born.append(0)
        elif kind == "scatter":  # flying apart from the middle
            body.position = (rnd.uniform(-0.4, 0.4), floor_y + 1 + rnd.uniform(0, 0.5))
            a = rnd.uniform(0.3, math.pi - 0.3)
            body.velocity = (math.cos(a) * rnd.uniform(3, 7), math.sin(a) * rnd.uniform(6, 10))
            born.append(0)
        else:  # bounce
            body.position = (rnd.uniform(-W * 0.35, W * 0.35), rnd.uniform(0, H * 0.4))
            body.velocity = (rnd.uniform(-3, 3), rnd.uniform(-2, 4))
            born.append(0)
        shape = pymunk.Poly.create_box(body, (size, size)) if kind == "topple" else pymunk.Circle(body, r)
        shape.friction = 0.7
        shape.elasticity = 0.85 if kind == "bounce" else 0.25
        bodies.append((body, shape))
    if kind == "topple":
        bodies[0][0].apply_impulse_at_local_point((0, 0))
    total = int(fps * (3.2 if kind != "topple" else 2.6))
    added = set()
    frames = []
    for f in range(total):
        for k, (body, shape) in enumerate(bodies):
            if k not in added and f >= born[k]:
                space.add(body, shape)
                added.add(k)
                if kind == "topple" and k == len(bodies) - 1:
                    pass
        if kind == "topple" and f == int(fps * 0.35):
            for body, _ in bodies[len(bodies) // 2:]:
                body.apply_impulse_at_local_point((2.5, 0))
        for _ in range(3):
            space.step(1 / (fps * 3))
        frames.append([(b.position.x, b.position.y, b.angle, k in added) for k, (b, _) in enumerate(bodies)])
    return {"frames": frames, "bodies": bodies, "size": size, "floor": floor_y, "shapes_draw": draw}
