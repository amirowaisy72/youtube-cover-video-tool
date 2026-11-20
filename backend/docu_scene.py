"""YT Guru — Documentary Explainer look (user, 2026-11-19).

The calm "research documentary" style the user showed: a slate-blue background with a
soft diagonal band, cream paper cards with elegant serif numbers, small-caps labels,
minimal beige world maps with orange routes and highlighted countries, clean news
clippings with the key line highlighted, and a slow camera push on everything.

Like graphics_scene.py this is ONE generic scene that draws a JSON spec (YTG_SPEC) made
of building blocks; the app / AI only fills data, never code.

  chapter   {kicker, text}                               chapter title on the background
  stat      {big, label, note, source}                   one big number on a paper card (counts up)
  years     {items:[...], label}                         a row of years / dates, one by one
  icons_row {icon, count, big, left, right, note}        a row of the same icon (e.g. 34 trucks = 440 miles)
  people    {total, highlight, label, big}               a grid of people, some highlighted (1 in 3 ...)
  split     {title, left:{label,count,icon}, right:{...}, source}   one cause, two outcomes
  bars      {title, items:[{label,value}], unit, source} a clean bar chart
  list      {title, items:[{text, at}]}                  points appearing one by one
  map       {title, sub, highlight:[countries], points:[{name,lat,lon}],
             routes:[{from,to}], date, box:{title, items:[...]}, focus:[...] | "world"}
  source    {outlet, headline, date, quote}              a news clipping, its key line highlighted
"""
import json
import math
import os
import re
from pathlib import Path

from manim import (DOWN, LEFT, NORMAL, ORIGIN, RIGHT, UP, ArcBetweenPoints, Circle, Create, Dot, FadeIn, GrowFromEdge,
                   Group, ImageMobject, LaggedStart, Line, MovingCameraScene, Polygon, Rectangle, RoundedRectangle,
                   SVGMobject, Text, ValueTracker, VGroup, VMobject, Write, always_redraw, config, rate_functions)

SPEC = json.loads(Path(os.environ.get("YTG_SPEC", "spec.json")).read_text(encoding="utf-8"))
HERE = Path(__file__).resolve().parent

SERIF, SANS = "Serif", "Sans"
try:
    import manimpango
    for f in list((HERE / "fonts").glob("*.ttf")):
        manimpango.register_font(str(f))
    have = set(manimpango.list_fonts())
    SERIF = "DM Serif Display" if "DM Serif Display" in have else ("Cormorant Garamond" if "Cormorant Garamond" in have else "Serif")
    SANS = "Poppins" if "Poppins" in have else "Sans"
except Exception:  # noqa: BLE001
    pass

BG, BAND = "#243040", "#2d3b4e"
PAPER, PAPER_EDGE, SHADOW = "#ece6d8", "#d8cfbc", "#111821"
INK, SOFT, LIGHT, ACC = "#1d2430", "#5f6876", "#f1ece1", "#d4622a"
WATER, LAND, BORDER = "#c9d2da", "#efe9dc", "#d3c8b2"
config.background_color = BG
if SPEC.get("transparent"):
    config.background_opacity = 0.0
W = config.frame_width
H = config.frame_height
TALL = H > W
CARD_W = min(W * 0.86, 8.8)


def num(v, d=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def T(s, size=36, color=INK, font=None, weight=NORMAL, maxw=None):
    t = Text(str(s), font=font or SANS, font_size=size, color=color, weight=weight)
    if maxw and t.width > maxw:
        t.scale_to_fit_width(maxw)
    return t


def S(s, size=60, color=INK, maxw=None):
    return T(s, size, color, SERIF, NORMAL, maxw)


def caps(s, size=20, color=INK, maxw=None):
    return T(str(s).upper(), size, color, SANS, "BOLD", maxw)


def paper(w, h):
    shadow = Rectangle(width=w, height=h, fill_color=SHADOW, fill_opacity=0.45, stroke_width=0).shift(RIGHT * 0.09 + DOWN * 0.11)
    card = RoundedRectangle(width=w, height=h, corner_radius=0.06, fill_color=PAPER, fill_opacity=1, stroke_color=PAPER_EDGE, stroke_width=1.5)
    return VGroup(shadow, card)


def icon(word, size=0.6):
    path = (SPEC.get("icons") or {}).get(str(word or "").lower())
    if path and Path(path).exists():
        try:
            m = SVGMobject(path) if path.endswith(".svg") else ImageMobject(path)
            m.scale_to_fit_height(size)
            if m.width > size * 1.3:
                m.scale_to_fit_width(size * 1.3)
            return m
        except Exception:  # noqa: BLE001
            pass
    return pictogram(size, INK)


def pictogram(size=0.6, color=INK, opacity=1.0):
    """A plain person sign (no file needed)."""
    head = Circle(radius=size * 0.17, fill_color=color, fill_opacity=opacity, stroke_width=0).shift(UP * size * 0.3)
    body = RoundedRectangle(width=size * 0.5, height=size * 0.48, corner_radius=size * 0.16, fill_color=color,
                            fill_opacity=opacity, stroke_width=0).shift(DOWN * size * 0.12)
    return VGroup(head, body)


def split_number(s):
    """'Over 100 million' -> ('Over ', 100.0, ' million', decimals)."""
    m = re.match(r"^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$", str(s))
    if not m:
        return None
    raw = m.group(2).replace(",", "")
    dec = len(raw.split(".")[1]) if "." in raw else 0
    return m.group(1), float(raw), m.group(3), dec, "," in m.group(2)


def fmt(v, dec, commas):
    s = f"{v:,.{dec}f}" if commas else f"{v:.{dec}f}"
    return s


class Docu(MovingCameraScene):
    def construct(self):
        self.t = 0.0
        self.total = max(1.0, num(SPEC.get("duration")) or 5.0)
        if not SPEC.get("transparent"):
            band = Polygon([W * 0.05, H / 2 + 0.2, 0], [W / 2 + 0.2, H / 2 + 0.2, 0], [W / 2 + 0.2, -H / 2 - 0.2, 0],
                           [W * 0.32, -H / 2 - 0.2, 0], fill_color=BAND, fill_opacity=1, stroke_width=0)
            self.add(band)
        frame = self.camera.frame
        push = float(SPEC.get("push", 0.045))
        rate = push / self.total
        frame.add_updater(lambda m, dt: m.scale(1 - rate * dt))  # the slow documentary push-in
        self.slot = 0
        blocks = list(SPEC.get("blocks") or [])
        self.n_blocks = len(blocks)
        events = []
        for i, b in enumerate(blocks):
            fn = getattr(self, "b_" + str(b.get("type", "")), None)
            if fn:
                events.extend(fn(b, i) or [])
        events.sort(key=lambda e: (e[0], e[1]))
        for at, _, play in events:
            if at > self.t + 0.02:
                self.wait(at - self.t)
                self.t = at
            self.t += play() or 0.0
        if self.total > self.t + 0.02:
            self.wait(self.total - self.t)

    def run(self, *anims, rt=0.7, **kw):
        self.play(*anims, run_time=rt, **kw)
        return rt

    def clear_stage(self):
        """A new card replaces the old one (documentary cards come one at a time)."""
        old = getattr(self, "current", None)
        if old is not None:
            self.play(FadeIn(old, rate_func=lambda t: 1 - t), run_time=0.35)
            self.remove(old)
            self.current = None
            return 0.35
        return 0.0

    def show(self, group, rt=0.7):
        used = self.clear_stage()
        self.current = group
        self.play(FadeIn(group, shift=UP * 0.25), run_time=rt, rate_func=rate_functions.ease_out_cubic)
        return used + rt

    # ------------------------------------------------------------ chapter
    def b_chapter(self, b, i):
        def go():
            kicker = caps(b.get("kicker") or "", 22, ACC) if b.get("kicker") else None
            title = S(b.get("text") or "", 84 if not TALL else 64, LIGHT, maxw=W * 0.82)
            line = Line(LEFT * 0.9, RIGHT * 0.9, color=ACC, stroke_width=4)
            parts = ([kicker] if kicker else []) + [title, line]
            g = VGroup(*parts).arrange(DOWN, buff=0.35)
            used = self.clear_stage()
            self.current = g
            anims = ([FadeIn(kicker)] if kicker else []) + [Write(title), Create(line)]
            self.play(*anims, run_time=1.1)
            return used + 1.1
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ stat card
    def b_stat(self, b, i):
        def go():
            big = str(b.get("big") or "")
            h = 4.4 if b.get("note") or b.get("source") else 3.6
            card = paper(CARD_W, h)
            tick = Line(LEFT * 0.35, RIGHT * 0.35, color=ACC, stroke_width=4).move_to(card).shift(UP * (h / 2 - 0.45))
            parts = [card, tick]
            sp = split_number(big)
            size = 120 if not TALL else 88
            if sp:
                pre, val, post, dec, commas = sp
                tr = ValueTracker(0)
                anchor = card.get_center() + UP * (0.55 if h > 4 else 0.35)
                number = always_redraw(lambda: S(f"{pre}{fmt(tr.get_value(), dec, commas)}{post}", size, INK, maxw=CARD_W * 0.88).move_to(anchor))
            else:
                tr, val, number = None, 0, S(big, size, INK, maxw=CARD_W * 0.88).move_to(card.get_center() + UP * (0.55 if h > 4 else 0.35))
            label = caps(b.get("label") or "", 24, INK, maxw=CARD_W * 0.8).next_to(number, DOWN, buff=0.45) if b.get("label") else None
            note = T(b.get("note") or "", 20, SOFT, maxw=CARD_W * 0.8) if b.get("note") else None
            src = T(f"Source: {b['source']}" if b.get("source") else "", 16, SOFT, maxw=CARD_W * 0.8) if b.get("source") else None
            bottom = card.get_bottom() + UP * 0.45
            if src:
                src.move_to(bottom)
            if note:
                note.move_to(bottom + (UP * 0.42 if src else ORIGIN))
            g = VGroup(*parts)
            used = self.show(g, 0.6)
            self.current = Group(g, number, *[x for x in (label, note, src) if x])
            self.add(number)
            if tr is not None:
                self.play(tr.animate.set_value(val), run_time=1.3, rate_func=rate_functions.ease_out_cubic)
                used += 1.3
            extra = [FadeIn(x) for x in (label, note, src) if x]
            if extra:
                self.play(*extra, run_time=0.5)
                used += 0.5
            return used
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ years
    def b_years(self, b, i):
        items = [str(x.get("text") if isinstance(x, dict) else x) for x in (b.get("items") or [])][:5]
        if not items:
            return []
        def go():
            n = len(items)
            tw = min(2.6, (W * 0.84) / n - 0.15)
            tiles = VGroup(*[VGroup(Rectangle(width=tw, height=1.7, fill_color="#3a4859", fill_opacity=1, stroke_color="#56657a", stroke_width=1.5),
                                    S(t, 76 if not TALL else 54, LIGHT, maxw=tw * 0.85)) for t in items]).arrange(RIGHT, buff=0.15)
            for tile in tiles:
                tile[1].move_to(tile[0])
            line = Line(tiles.get_left(), tiles.get_right(), color=ACC, stroke_width=2).next_to(tiles, DOWN, buff=0.35)
            label = caps(b.get("label") or "", 22, LIGHT, maxw=W * 0.8).next_to(line, DOWN, buff=0.3) if b.get("label") else None
            used = self.clear_stage()
            self.current = VGroup(tiles, line, *([label] if label else []))
            self.play(LaggedStart(*[FadeIn(t, shift=UP * 0.2) for t in tiles], lag_ratio=0.45), run_time=0.6 + 0.35 * n)
            self.play(Create(line), *([FadeIn(label)] if label else []), run_time=0.6)
            return used + 1.2 + 0.35 * n
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ a row of the same icon
    def b_icons_row(self, b, i):
        def go():
            n = int(max(2, min(30, num(b.get("count"), 12))))
            h = 4.2
            card = paper(CARD_W, h)
            big = S(b.get("big") or "", 84 if not TALL else 64, INK, maxw=CARD_W * 0.85).move_to(card.get_center() + UP * 1.0)
            size = min(0.55, (CARD_W * 0.88) / n / 1.1)
            row = Group(*[icon(b.get("icon") or "box", size) for _ in range(n)]).arrange(RIGHT, buff=size * 0.1)
            if row.width > CARD_W * 0.9:
                row.scale_to_fit_width(CARD_W * 0.9)
            row.move_to(card.get_center() + DOWN * 0.35)
            ends = []
            if b.get("left"):
                ends.append(caps(b["left"], 16, INK).next_to(row, UP, buff=0.12).align_to(row, LEFT))
            if b.get("right"):
                ends.append(caps(b["right"], 16, INK).next_to(row, UP, buff=0.12).align_to(row, RIGHT))
            note = T(b.get("note") or "", 16, SOFT, maxw=CARD_W * 0.85).move_to(card.get_bottom() + UP * 0.4) if b.get("note") else None
            used = self.show(card, 0.6)
            self.current = Group(card, row, *ends, *([note] if note else []))
            self.play(LaggedStart(*[FadeIn(x, shift=RIGHT * 0.15) for x in row], lag_ratio=0.25), run_time=min(2.4, 0.4 + 0.08 * n))
            used += min(2.4, 0.4 + 0.08 * n)
            more = [Write(big)] if b.get("big") else []
            more += [FadeIn(x) for x in ends] + ([FadeIn(note)] if note else [])
            if more:
                self.current = Group(self.current, big)
                self.play(*more, run_time=0.8)
                used += 0.8
            return used
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ people grid
    def b_people(self, b, i):
        def go():
            total = int(max(4, min(40, num(b.get("total"), 20))))
            hi = int(max(0, min(total, num(b.get("highlight"), total // 3))))
            cols = min(10, total)
            rows = math.ceil(total / cols)
            size = min(0.62, 3.2 / rows)
            people = VGroup(*[pictogram(size, INK) for _ in range(total)]).arrange_in_grid(rows, cols, buff=size * 0.22)
            card = paper(CARD_W, people.height + 2.2)
            people.move_to(card.get_center() + DOWN * 0.15)
            big = S(b.get("big") or "", 64, INK, maxw=CARD_W * 0.8).next_to(people, UP, buff=0.3) if b.get("big") else None
            label = caps(b.get("label") or "", 20, INK, maxw=CARD_W * 0.85).next_to(people, DOWN, buff=0.3) if b.get("label") else None
            used = self.show(card, 0.5)
            self.current = Group(card, people, *[x for x in (big, label) if x])
            self.play(LaggedStart(*[FadeIn(p, scale=0.6) for p in people], lag_ratio=0.04), run_time=1.0)
            self.play(*[people[k].animate.set_fill(ACC) for k in range(hi)],
                      *[people[k].animate.set_fill(INK, opacity=0.18) for k in range(hi, total)], run_time=0.8)
            more = [FadeIn(x) for x in (big, label) if x]
            if more:
                self.play(*more, run_time=0.5)
            return used + 1.8 + (0.5 if more else 0)
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ one cause, two outcomes
    def b_split(self, b, i):
        def go():
            card = paper(CARD_W, 4.4)
            title = S(b.get("title") or "", 46, INK, maxw=CARD_W * 0.85).move_to(card.get_top() + DOWN * 0.7)
            cols = []
            for k, side in enumerate(("left", "right")):
                s = b.get(side) if isinstance(b.get(side), dict) else {}
                n = int(max(1, min(8, num(s.get("count"), 3))))
                lab = caps(s.get("label") or side, 20, INK, maxw=CARD_W * 0.4)
                row = Group(*[icon(s.get("icon") or "box", 0.5) for _ in range(n)]).arrange(RIGHT, buff=0.08)
                if row.width > CARD_W * 0.4:
                    row.scale_to_fit_width(CARD_W * 0.4)
                col = Group(lab, row).arrange(DOWN, buff=0.25, aligned_edge=LEFT)
                col.move_to(card.get_center() + DOWN * 0.3 + (LEFT if k == 0 else RIGHT) * CARD_W * 0.24)
                cols.append((col, row))
            src = T(f"Source: {b['source']}", 15, SOFT).move_to(card.get_bottom() + UP * 0.35) if b.get("source") else None
            used = self.show(Group(card, title), 0.7)
            self.current = Group(card, title, *[c for c, _ in cols], *([src] if src else []))
            for col, row in cols:
                self.play(FadeIn(col[0]), LaggedStart(*[FadeIn(x, shift=UP * 0.2) for x in row], lag_ratio=0.3), run_time=0.9)
                used += 0.9
            if src:
                self.play(FadeIn(src), run_time=0.3)
                used += 0.3
            return used
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ bars
    def b_bars(self, b, i):
        items = [x for x in (b.get("items") or []) if isinstance(x, dict)][:6]
        if not items:
            return []
        def go():
            n = len(items)
            card = paper(CARD_W, 1.6 + n * 0.75)
            title = S(b.get("title") or "", 40, INK, maxw=CARD_W * 0.85).move_to(card.get_top() + DOWN * 0.55)
            top = max(num(x.get("value")) for x in items) or 1
            unit = str(b.get("unit") or "")
            lab_w, bar_w = CARD_W * 0.3, CARD_W * 0.5
            rows, bars, vals = [], [], []
            for k, x in enumerate(items):
                y = title.get_bottom()[1] - 0.6 - k * 0.72
                lab = T(x.get("label") or "", 20, INK, maxw=lab_w).move_to([card.get_left()[0] + 0.4, y, 0], aligned_edge=LEFT)
                w = max(0.05, bar_w * num(x.get("value")) / top)
                bar = Rectangle(width=w, height=0.38, fill_color=ACC if k == 0 else "#8a95a5", fill_opacity=1, stroke_width=0)
                bar.move_to([card.get_left()[0] + 0.4 + lab_w + 0.2, y, 0], aligned_edge=LEFT)
                v = num(x.get("value"))
                val = S(f"{v:,.0f}{unit}" if v >= 100 or v.is_integer() else f"{v:,.1f}{unit}", 30, INK).next_to(bar, RIGHT, buff=0.15)
                rows.append(lab)
                bars.append(bar)
                vals.append(val)
            src = T(f"Source: {b['source']}", 15, SOFT).move_to(card.get_bottom() + UP * 0.3) if b.get("source") else None
            used = self.show(Group(card, title, *rows), 0.6)
            self.current = Group(card, title, *rows, *bars, *vals, *([src] if src else []))
            self.play(LaggedStart(*[GrowFromEdge(r, LEFT) for r in bars], lag_ratio=0.25), run_time=1.2)
            self.play(*[FadeIn(v) for v in vals], *([FadeIn(src)] if src else []), run_time=0.5)
            return used + 1.7
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ list
    def b_list(self, b, i):
        items = [x for x in (b.get("items") or [])][:5]
        if not items:
            return []
        n = len(items)
        card_h = 1.5 + n * 0.8
        state = {}

        def head():
            card = paper(CARD_W, card_h)
            title = S(b.get("title") or "", 44, INK, maxw=CARD_W * 0.85).move_to(card.get_top() + DOWN * 0.6)
            state["card"], state["title"] = card, title
            used = self.show(Group(card, title), 0.6)
            return used
        ev = [(num(b.get("at")), i, head)]
        for k, x in enumerate(items):
            text = x.get("text") if isinstance(x, dict) else x
            at = num(x.get("at"), num(b.get("at")) + 0.8 + k) if isinstance(x, dict) else num(b.get("at")) + 0.8 + k

            def one(k=k, text=text):
                card = state.get("card")
                if card is None:
                    return 0
                y = state["title"].get_bottom()[1] - 0.55 - k * 0.78
                sq = Rectangle(width=0.16, height=0.16, fill_color=ACC, fill_opacity=1, stroke_width=0).move_to([card.get_left()[0] + 0.6, y, 0])
                t = T(text, 26, INK, maxw=CARD_W * 0.8).next_to(sq, RIGHT, buff=0.3)
                self.current = Group(self.current, sq, t)
                self.play(FadeIn(sq, scale=0.5), FadeIn(t, shift=RIGHT * 0.2), run_time=0.5)
                return 0.5
            ev.append((at, i * 100 + k + 1, one))
        return ev

    # ------------------------------------------------------------ source clipping
    def b_source(self, b, i):
        def go():
            w, h = min(W * 0.7, 8.6), 5.2
            page = Rectangle(width=w, height=h, fill_color="#ffffff", fill_opacity=1, stroke_width=0)
            shadow = Rectangle(width=w, height=h, fill_color=SHADOW, fill_opacity=0.5, stroke_width=0).shift(RIGHT * 0.1 + DOWN * 0.12)
            bar = Rectangle(width=w, height=0.42, fill_color="#f3f4f6", fill_opacity=1, stroke_width=0).move_to(page.get_top() + DOWN * 0.21)
            outlet = caps(b.get("outlet") or "", 16, INK, maxw=w * 0.6).move_to(bar).align_to(bar, LEFT).shift(RIGHT * 0.3)
            head = T(b.get("headline") or "", 34, INK, SANS, "BOLD", maxw=w * 0.86)
            if head.width > w * 0.86 or len(str(b.get("headline") or "")) > 48:
                words = str(b.get("headline") or "").split()
                mid = len(words) // 2
                head = VGroup(T(" ".join(words[:mid]), 32, INK, SANS, "BOLD", maxw=w * 0.86),
                              T(" ".join(words[mid:]), 32, INK, SANS, "BOLD", maxw=w * 0.86)).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
            head.next_to(bar, DOWN, buff=0.4).align_to(page, LEFT).shift(RIGHT * 0.45)
            lines = VGroup(*[Rectangle(width=w * (0.8 if k % 3 else 0.62), height=0.07, fill_color="#d1d5db", fill_opacity=1, stroke_width=0)
                             for k in range(5)]).arrange(DOWN, aligned_edge=LEFT, buff=0.22).next_to(head, DOWN, buff=0.45).align_to(head, LEFT)
            parts = [shadow, page, bar, outlet, head, lines]
            quote = None
            if b.get("quote"):
                q = T(f"“{b['quote']}”", 22, INK, maxw=w * 0.82)
                mark = Rectangle(width=q.width + 0.3, height=q.height + 0.2, fill_color="#fde68a", fill_opacity=0.0, stroke_width=0).move_to(q)
                quote = VGroup(mark, q).next_to(lines, DOWN, buff=0.35).align_to(head, LEFT)
            cap = VGroup()
            label = ", ".join(x for x in (str(b.get("outlet") or ""), str(b.get("date") or "")) if x)
            if label:
                ct = T(label, 18, LIGHT)
                cap = VGroup(Rectangle(width=ct.width + 0.4, height=ct.height + 0.25, fill_color="#2b3443", fill_opacity=1, stroke_width=0), ct)
                ct.move_to(cap[0])
                cap.move_to(page.get_corner(DOWN + LEFT) + UP * 0.35, aligned_edge=LEFT).shift(RIGHT * 0.1)
            g = VGroup(*parts)
            used = self.show(g, 0.7)
            extra = [x for x in (quote, cap) if x is not None and len(x)]
            self.current = Group(g, *extra)
            if quote is not None:
                self.play(FadeIn(quote[1]), run_time=0.5)
                self.play(quote[0].animate.set_fill(opacity=0.85), run_time=0.5)
                self.bring_to_front(quote[1])
                used += 1.0
            if len(cap):
                self.play(FadeIn(cap, shift=UP * 0.1), run_time=0.4)
                used += 0.4
            return used
        return [(num(b.get("at")), i, go)]

    # ------------------------------------------------------------ map
    def b_map(self, b, i):
        def go():
            m = WorldMap(b)
            used = self.clear_stage()
            self.current = m.group
            self.play(FadeIn(m.base), run_time=0.7)
            used += 0.7
            if m.hi:
                self.play(*[x.animate.set_fill(ACC, opacity=0.85) for x in m.hi], run_time=0.8)
                used += 0.8
            if m.title is not None:
                self.play(FadeIn(m.title, shift=RIGHT * 0.2), run_time=0.4)
                used += 0.4
            d = max(1.0, num(b.get("dur"), 2.0))
            if m.routes:
                self.play(*[Create(r) for r in m.routes], run_time=d, rate_func=rate_functions.ease_in_out_sine)
                used += d
            if m.dots:
                self.play(LaggedStart(*[FadeIn(x, scale=0.5) for x in m.dots], lag_ratio=0.25), run_time=0.6)
                used += 0.6
            if m.box is not None:
                self.play(FadeIn(m.box, shift=LEFT * 0.2), run_time=0.5)
                used += 0.5
            return used
        return [(num(b.get("at")), i, go)]


_WORLD = None


def world():
    global _WORLD
    if _WORLD is None:
        try:
            _WORLD = json.loads((HERE / "data" / "world_countries.json").read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            _WORLD = []
    return _WORLD


def find_country(name):
    n = str(name or "").strip().lower()
    if not n:
        return None
    alias = {"usa": "united states of america", "us": "united states of america", "united states": "united states of america",
             "uk": "united kingdom", "britain": "united kingdom", "uae": "united arab emirates", "russia": "russia",
             "south korea": "south korea", "north korea": "north korea", "congo": "dem. rep. congo", "drc": "dem. rep. congo",
             "ivory coast": "côte d'ivoire", "czech republic": "czechia", "burma": "myanmar"}
    n = alias.get(n, n)
    for c in world():
        if n in (str(c.get("name", "")).lower(), str(c.get("admin", "")).lower(), str(c.get("long", "")).lower(),
                 str(c.get("iso2", "")).lower(), str(c.get("iso3", "")).lower()):
            return c
    return None


def centroid(c):
    ring = max(c["rings"], key=len)
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return (sum(xs) / len(xs), sum(ys) / len(ys))


def find_place(p):
    if isinstance(p, dict) and p.get("lat") is not None and p.get("lon") is not None:
        return (num(p["lon"]), num(p["lat"])), str(p.get("name") or "")
    name = str(p.get("name") if isinstance(p, dict) else p or "")
    low = name.lower()
    try:
        for pl in json.loads((HERE / "data" / "world_places.json").read_text(encoding="utf-8")):
            if pl["name"].lower() == low:
                return (pl["lon"], pl["lat"]), name
    except Exception:  # noqa: BLE001
        pass
    c = find_country(name)
    if c:
        return centroid(c), name
    return None, name


class WorldMap:
    """A minimal beige world (Natural Earth, public domain) zoomed to what the story needs."""

    def __init__(self, b):
        self.hi, self.routes, self.dots = [], [], []
        hi_c = [c for c in (find_country(x) for x in (b.get("highlight") or [])[:30]) if c]
        pts = {}
        for p in (b.get("points") or [])[:12]:
            ll, name = find_place(p)
            if ll:
                pts[name.lower()] = (ll, name)
        route_ll = []
        for r in (b.get("routes") or [])[:6]:
            ends = []
            for key in ("from", "to"):
                v = r.get(key) if isinstance(r, dict) else None
                hit = pts.get(str(v or "").lower())
                if hit is None:
                    ll, name = find_place({"name": v})
                    hit = (ll, name) if ll else None
                ends.append(hit)
            if all(ends):
                route_ll.append((ends[0][0], ends[1][0]))
        focus = b.get("focus")
        boxes = []
        for c in hi_c:
            for ring in c["rings"]:
                boxes += ring
        boxes += [v[0] for v in pts.values()]
        for a, z in route_ll:
            boxes += [a, z]
        for f in (focus if isinstance(focus, list) else []):
            c = find_country(f)
            if c:
                for ring in c["rings"]:
                    boxes += ring
        if focus == "world" or not boxes:
            lon0, lon1, lat0, lat1 = -170, 190, -56, 78
        else:
            xs = [p[0] for p in boxes]
            ys = [p[1] for p in boxes]
            lon0, lon1, lat0, lat1 = min(xs), max(xs), min(ys), max(ys)
            if lon1 - lon0 > 200:  # spans the world
                lon0, lon1, lat0, lat1 = -170, 190, -56, 78
            pad_x = max(4, (lon1 - lon0) * 0.25)
            pad_y = max(3, (lat1 - lat0) * 0.25)
            top = pad_y + ((lat1 - lat0) * 0.3 + 3 if (b.get("title") or b.get("date")) else 0)  # room for the title
            right = pad_x + ((lon1 - lon0) * 0.3 + 4 if isinstance(b.get("box"), dict) else 0)  # room for the box
            lon0, lon1, lat0, lat1 = lon0 - pad_x, lon1 + right, max(-80, lat0 - pad_y), min(84, lat1 + top)
        mid_lat = (lat0 + lat1) / 2
        kx = math.cos(math.radians(max(-60, min(60, mid_lat))))
        span_x = (lon1 - lon0) * kx
        span_y = lat1 - lat0
        scale = min(W / span_x, H / span_y) if span_x and span_y else 1
        cx, cy = (lon0 + lon1) / 2, mid_lat
        self.proj = lambda lon, lat: [(lon - cx) * kx * scale, (lat - cy) * scale, 0]
        view = (cx - W / scale / kx * 0.75, cx + W / scale / kx * 0.75, cy - H / scale * 0.75, cy + H / scale * 0.75)

        water = Rectangle(width=W * 1.3, height=H * 1.3, fill_color=WATER, fill_opacity=1, stroke_width=0)
        land = VGroup()
        hi_ids = {id(c) for c in hi_c}
        for c in world():
            for ring in c["rings"]:
                xs = [p[0] for p in ring]
                ys = [p[1] for p in ring]
                if max(xs) < view[0] or min(xs) > view[1] or max(ys) < view[2] or min(ys) > view[3]:
                    continue
                pts3 = [self.proj(x, y) for x, y in ring]
                if len(pts3) < 3:
                    continue
                v = VMobject(fill_color=LAND, fill_opacity=1, stroke_color=BORDER, stroke_width=0.8)
                v.set_points_as_corners(pts3 + [pts3[0]])
                land.add(v)
                if id(c) in hi_ids:
                    self.hi.append(v)
        self.base = VGroup(water, land)
        for a, z in route_ll:
            p0, p1 = self.proj(*a), self.proj(*z)
            if math.dist(p0, p1) < 0.2:
                continue
            arc = ArcBetweenPoints(p0, p1, angle=-0.5, color=ACC, stroke_width=4)
            self.routes.append(arc)
        for ll, name in pts.values():
            p = self.proj(*ll)
            d = Dot(p, radius=0.07, color=ACC)
            lab = T(name, 18, INK, SANS, "BOLD")
            pill = RoundedRectangle(width=lab.width + 0.25, height=lab.height + 0.16, corner_radius=0.05, fill_color="#f8f5ee",
                                    fill_opacity=0.92, stroke_width=0)
            lab.move_to(pill)
            tag = VGroup(pill, lab).next_to(d, UP, buff=0.1)
            self.dots.append(VGroup(d, tag))
        self.title = None
        if b.get("title") or b.get("date"):
            parts = []
            if b.get("title"):
                t = T(b["title"], 24, INK, SANS, "BOLD", maxw=W * 0.5)
                bar = Line(ORIGIN, RIGHT * min(t.width, 1.4), color=ACC, stroke_width=4).next_to(t, DOWN, buff=0.1).align_to(t, LEFT)
                parts.append(VGroup(t, bar))
            if b.get("date"):
                dt = S(b["date"], 32, INK)
                parts.append(VGroup(Rectangle(width=dt.width + 0.35, height=dt.height + 0.25, fill_color="#f8f5ee", fill_opacity=1,
                                              stroke_color=INK, stroke_width=1.2), dt))
                dt.move_to(parts[-1][0])
            col = VGroup(*parts).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
            back = Rectangle(width=col.width + 0.5, height=col.height + 0.4, fill_color="#f8f5ee", fill_opacity=0.9, stroke_width=0)
            col.move_to(back)
            self.title = VGroup(back, col).to_corner(UP + LEFT, buff=0.3)
        self.box = None
        box = b.get("box") if isinstance(b.get("box"), dict) else None
        if box and (box.get("items") or box.get("title")):
            rows = [caps(box.get("title") or "", 16, ACC)] + [T(str(x), 18, INK, SANS, "BOLD") for x in (box.get("items") or [])[:7]]
            col = VGroup(*rows).arrange(DOWN, aligned_edge=LEFT, buff=0.16)
            bg = Rectangle(width=col.width + 0.5, height=col.height + 0.4, fill_color="#f8f5ee", fill_opacity=0.96, stroke_width=0)
            col.move_to(bg)
            self.box = VGroup(bg, col).to_edge(RIGHT, buff=0.5)
        sub = T(b.get("sub") or "", 14, SOFT, maxw=W * 0.8).to_corner(DOWN + LEFT, buff=0.3) if b.get("sub") else None
        self.group = Group(self.base, *self.routes, *self.dots, *[x for x in (self.title, self.box, sub) if x is not None])
        if sub is not None:
            self.base.add(sub)
