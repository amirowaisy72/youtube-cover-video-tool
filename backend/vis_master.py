"""YT Guru — master scenes: finished, hand-designed animations of common money ideas.

Called from Script mode scene code with the video's own numbers, e.g.
    compound(start=1000, rate=0.08, years=30, when_words={"start": "invest a thousand", "result": "ten thousand"})
Each one fills the whole scene: the app does the maths, every step ("beat") starts on its narration words
(or the steps are spread over the scene), it has its sounds, and it comes in a few looks (variant=0/1/2).

The maths and number formatting are plain functions at the top (tested without drawing anything).
"""
from __future__ import annotations

import math
import re

import vis_master2

# ================================================================== numbers (no Manim needed)


def money(v: float, currency: str = "$", like: float | None = None) -> str:
    """$950 · $12,400 · $1.5M · $2.35B. `like` fixes the unit (a counter keeps one unit while it counts)."""
    ref = abs(v if like is None else like)
    sign = "-" if v < 0 else ""
    v = abs(v)
    for limit, unit, digits in ((1e12, "T", 2), (1e9, "B", 2), (1e6, "M", 1)):
        if ref >= limit:
            text = f"{v / limit:,.{digits}f}"
            if like is None or abs(v - ref) < 1e-6:  # the finished figure: no useless zeros
                text = text.rstrip("0").rstrip(".")
            return f"{sign}{currency}{text}{unit}"
    if ref < 100 and abs(ref - round(ref)) > 0.004:
        return f"{sign}{currency}{v:,.2f}"
    return f"{sign}{currency}{v:,.0f}"


def percent(x: float) -> str:
    """0.08 -> "8%", 0.125 -> "12.5%"."""
    p = round(x * 100, 1)
    return f"{p:.0f}%" if abs(p - round(p)) < 0.05 else f"{p:.1f}%"


def compound_value(start: float, rate: float, years: float, monthly: float = 0.0) -> float:
    """Yearly compounding; with monthly deposits, monthly compounding (the usual savings calculator)."""
    if not monthly:
        return start * (1 + rate) ** years
    r, n = rate / 12, years * 12
    if abs(r) < 1e-12:
        return start + monthly * n
    return start * (1 + r) ** n + monthly * ((1 + r) ** n - 1) / r


def buying_power(amount: float, rate: float, years: float) -> float:
    """What the same money buys after inflation, in today's money."""
    return amount / (1 + rate) ** years


def as_rate(x) -> float:
    """0.08 and 8 both mean 8%."""
    x = float(x)
    return x / 100 if abs(x) >= 1 else x


def read_items(items) -> list[dict]:
    """[("Studio", 0.4), {"name": .., "value": .., "color": .., "icon": ..}] or {name: value} -> dicts."""
    if isinstance(items, dict):
        items = list(items.items())
    out = []
    for it in items or []:
        if isinstance(it, dict):
            name, value, extra = it.get("name") or it.get("label"), it.get("value", it.get("share", it.get("amount"))), it
        else:
            it = list(it)
            name, value = (it + [None, None])[:2]
            extra = {}
            for more in it[2:]:  # a colour (#.. or a colour word) or an icon name
                extra["color" if str(more).startswith("#") or str(more).lower() in _COLOUR_WORDS else "icon"] = more
        try:
            value = float(value)
        except (TypeError, ValueError):
            continue
        if name is None or not math.isfinite(value) or value < 0:
            continue
        out.append({"name": str(name)[:22], "value": value, "color": extra.get("color"), "icon": extra.get("icon")})
    return out


_COLOUR_WORDS = {"cream", "orange", "teal", "gold", "yellow", "blue", "red", "slate", "green", "purple", "pink", "brown",
                 "grey", "gray", "white"}


def split_parts(total: float, parts) -> tuple[list[dict], str]:
    """Parts as shares (0..1, or percentages) or as amounts -> [{name, value, share}], with an "Other" part
    for what is left over. The text is a warning when the parts do not fit the total."""
    got = read_items(parts)
    if not got or total <= 0:
        return [], "give a total above 0 and parts like [(\"Theaters\", 0.5), (\"Studio\", 0.4)]"
    values = [p["value"] for p in got]
    if all(v <= 1 for v in values):
        shares = values
    elif sum(values) <= 100.5 and total > 1000:
        shares = [v / 100 for v in values]
    else:
        shares = [v / total for v in values]
    warn = ""
    s = sum(shares)
    if s > 1.005:
        warn = f"the parts add up to {percent(s)} of the total — check the numbers"
    for p, share in zip(got, shares):
        p["share"], p["value"] = share, share * total
    if s < 0.995:
        got.append({"name": "Other", "value": (1 - s) * total, "share": 1 - s, "color": "grey", "icon": None})
    return got, warn


def beat_times(found: list, start: float, total: float) -> list[float]:
    """A start time for every step: the spoken time when known, the others spread evenly around them.
    Always in order and inside the scene."""
    n = len(found)
    last = max(start + 0.2, total * 0.72)
    if not any(t is not None for t in found):
        return [round(start + (last - start) * i / max(1, n - 1), 3) for i in range(n)]
    out = list(found)
    known = [i for i, t in enumerate(out) if t is not None]
    for i in range(n):
        if out[i] is None:
            a = max((k for k in known if k < i), default=None)
            b = min((k for k in known if k > i), default=None)
            lo_i, lo = (a, found[a]) if a is not None else (-1, start - (found[b] - start) / max(1, b + 1))
            hi_i, hi = (b, found[b]) if b is not None else (n, max(total - 0.8, lo + 0.5))
            out[i] = lo + (hi - lo) * (i - lo_i) / (hi_i - lo_i)
    prev = start - 0.45
    for i in range(n):
        out[i] = round(min(max(out[i], prev + 0.45, start), max(start, total - 0.7)), 3)
        prev = out[i]
    return out


# ================================================================== drawing
NAMES = ("compound", "inflation", "revenue_split", "big_number_compare", "money_timeline") + vis_master2.NAMES
_ICON_FOR = (("theat", "ticket"), ("cinema", "ticket"), ("studio", "clapper"), ("tax", "bank_building"),
             ("actor", "theatre"), ("cast", "theatre"), ("star", "sparkle_star"), ("market", "megaphone"), ("ad", "megaphone"),
             ("store", "store_front"), ("shop", "store_front"), ("developer", "desktop"), ("music", "music_note"),
             ("artist", "art_palette"), ("salar", "briefcase"), ("ship", "delivery_truck"))


def _icon_for(name: str) -> str | None:
    low = name.lower()
    return next((icon for key, icon in _ICON_FOR if re.search(r"\b" + key, low)), None)


class Stage:
    """What the master scenes draw with. One VGroup holds everything, so it is redrawn while it animates."""

    def __init__(self, S, api: dict, narration: str):
        import manim as M

        import icon_pack
        import vis_kit as K
        import vis_people as P
        import vis_scene as V
        self.M, self.K, self.P, self.V, self.icons = M, K, P, V, icon_pack
        self.S, self.api = S, api
        self.tall, self.floor = M.config.pixel_height > M.config.pixel_width, V.GROUND_Y
        self.top = 8.2 if self.tall else 3.55     # a Short is tall: columns and words use the height
        self.k = 1.5 if self.tall else 1.0        # and its text must be bigger on a phone
        self.seed = sum(map(ord, narration or ""))
        self.G = M.VGroup()
        self._texts: dict = {}

    # ---------------------------------------------------------- start, time, sound
    def begin(self, variant, settings: tuple, setting=None) -> int:
        """Clears the stage and sets the background (unless the code already chose one). -> the variant 0..2"""
        v = int(variant) % 3 if variant is not None else self.seed % 3
        if self.S.t > 0.05:
            self.api["clear"](0.3)
        if setting is not None:
            if str(setting) != "none":
                self.api["setting"](setting)
        elif not self.S.scenery:
            self.api["setting"](settings[v % len(settings)])
        self.S.speed = 1.0
        self.S.add(self.G)
        return v

    def beats(self, names: list[str], when_words) -> list[float]:
        given: dict = {}
        if isinstance(when_words, dict):
            given = {str(k).strip().lower(): w for k, w in when_words.items()}
        elif isinstance(when_words, (list, tuple)):
            given = {names[i].lower(): w for i, w in enumerate(when_words[:len(names)])}
        elif isinstance(when_words, str):
            given = {names[0].lower(): when_words}
        unknown = [k for k in given if k not in [n.lower() for n in names]]
        if unknown:
            self.S.warnings.append(f"when_words: unknown step {', '.join(unknown)} — the steps are: {', '.join(names)}")
        found = []
        for n in names:
            t, w = None, given.get(n.lower())
            if w:
                before = len(self.S.warnings)
                t = self.api["at"](str(w))
                if any("not found" in x for x in self.S.warnings[before:]):
                    t = None
            found.append(t)
        times = beat_times(found, self.S.t + 0.1, self.S.total)
        times[0] = min(times[0], self.S.t + 0.8)  # the first step always starts at once: never an empty stage
        return times

    def go(self, t: float) -> None:
        self.api["wait_until"](t)

    def room(self, nxt: float | None, most: float) -> float:
        """How long a step may take: until the next one, at most `most` seconds."""
        end = nxt if nxt is not None else self.S.total - 0.35
        return max(0.35, min(most, end - self.S.t - 0.08))

    def anim(self, dur: float, draw) -> None:
        """draw(a) for a = 0..1 over `dur` seconds."""
        dur = min(dur, self.S.total - self.S.t - 0.05)
        if dur < 0.12:
            draw(1.0)
            return
        self.S.play(self.M.UpdateFromAlphaFunc(self.G, lambda _m, a: draw(a)), run_time=dur,
                    rate_func=self.M.rate_functions.linear)
        self.S.t += dur
        draw(1.0)

    @staticmethod
    def stepped(a: float, dur: float) -> float:
        """a (0..1) in about 12 steps a second, for counting numbers: building new text is the slow part of a
        frame, and the eye cannot tell the difference."""
        n = max(1, round(dur * 12))
        return 1.0 if a >= 1 else math.floor(a * n) / n

    def snd(self, kind: str, delay: float = 0.0) -> None:
        self.S.snd(kind, delay)

    def ticks(self, dur: float, every: float = 0.13) -> None:
        for i in range(1, int(dur / every)):
            self.snd("tick", i * every)

    # ---------------------------------------------------------- pieces
    def text(self, s: str, size: float, color=None, serif: bool = True, max_width: float = 12.0):
        """size = height of a capital letter in stage units (about)."""
        key = (s, round(size, 3), color, serif, round(max_width, 2))
        if key not in self._texts:
            t = self.M.Text(s, font=self.K.SERIF if serif else self.K.FONT, font_size=int(100 * size * self.k),
                            color=color or self.K.CREAM, weight="NORMAL" if serif else "BOLD")
            if t.width > max_width:
                t.scale_to_fit_width(max_width)
            self._texts[key] = t
        return self._texts[key].copy()

    def box(self, w, h, color, r=0.16, opacity=1.0):
        r = min(r, w / 2.2, max(0.02, h / 2.2))
        return self.M.RoundedRectangle(width=max(0.05, w), height=max(0.05, h), corner_radius=r, fill_color=color,
                                       fill_opacity=opacity, stroke_width=0)

    def dot(self, r, color, opacity=1.0):
        return self.M.Circle(radius=max(0.01, r), fill_color=color, fill_opacity=opacity, stroke_width=0)

    def icon(self, name: str | None, height: float):
        key = self.icons.key_of(name or "")
        if key:
            return self.icons.mob(key).scale_to_fit_height(height)
        lib = self.K.resolve(name or "")
        if lib:
            m = self.K.build(lib)
            return m.scale_to_fit_height(height)
        return None

    def person(self, who: str, pose: str, height: float, x: float):
        p = self.P.Person(who if who in self.P.CAST else "sam", pose, height=height)
        p.shift([x, self.floor, 0])
        return p

    def change(self, p, frm: str, to: str, a: float) -> None:
        a = max(0.0, min(1.0, a))
        p.show(self.P.between(self.P.POSES[frm], self.P.POSES[to], a))

    def note(self, s: str, x: float = 0.0, y: float | None = None, max_width: float = 9.0):
        """A small line for the assumption or the source."""
        t = self.text(s, 0.2, "#b8c2d6", serif=False, max_width=min(max_width, 2 * (6.9 - abs(x))))
        return t.move_to([x, self.top - 0.95 * self.k if y is None else y, 0])


def _ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def _back(t):
    t = max(0.0, min(1.0, t)) - 1
    return 1 + t * t * (2.4 * t + 1.4)


def _part(a, lo, hi):
    """a mapped to 0..1 between lo and hi."""
    return max(0.0, min(1.0, (a - lo) / (hi - lo)))


def make(S, api: dict, narration: str) -> dict:
    """The master-scene functions for scene code."""

    def bad(name, why):
        S.warnings.append(f"{name}(): {why}")
        return 0

    # ================================================================== compound interest snowball
    def compound(start=1000, rate=0.08, years=30, monthly=0, when_words=None, currency="$", who=None, variant=None,
                 setting=None, note=None):
        try:
            start, rate, years, monthly = float(start), as_rate(rate), max(1, min(80, int(years))), max(0.0, float(monthly))
        except (TypeError, ValueError):
            return bad("compound", "start, rate and years must be numbers")
        if start <= 0 and monthly <= 0 or rate <= -0.9:
            return bad("compound", "start (or monthly) must be above 0")
        st = Stage(S, api, narration)
        v = st.begin(variant, ("night", "plain", "street"), setting)
        M, K, G = st.M, st.K, st.G
        side = -1 if v == 1 else 1  # variant 1 rolls the other way
        final, first = compound_value(start, rate, years, monthly), compound_value(start, rate, 0, monthly)
        hill_top = st.floor + (6.8 if st.tall else 3.5)
        p0, p1 = (-7.6, hill_top), (3.0, st.floor)
        flip = lambda pts: [[x * side, y, 0] for x, y in pts]  # noqa: E731
        snow = M.Polygon(*flip([p0, p1, (-7.6, st.floor)]), fill_color="#dfe8f5", fill_opacity=0.96, stroke_width=0)
        shade = M.Polygon(*flip([(-7.6, hill_top - 1.1), (0.6, st.floor), (-7.6, st.floor)]), fill_color="#b9c9e3",
                          fill_opacity=1, stroke_width=0)
        length = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        ux, uy = (p1[0] - p0[0]) / length, (p1[1] - p0[1]) / length
        nx, ny = -uy, ux

        def ball(prog: float, value: float):
            span = max(1e-9, final - first)
            r = (0.4 + (1.35 - 0.4) * math.sqrt(max(0.0, min(1.0, (value - first) / span)))) * (1.3 if st.tall else 1.0)
            d = 0.9 + prog * (length - 5.7)
            cx, cy = p0[0] + ux * d + nx * r, p0[1] + uy * d + ny * r
            c = np_point(cx * side, cy)
            body = M.VGroup(st.dot(r, "#ffffff"), st.dot(r * 0.86, "#eef4ff").shift([0.07 * r, 0.05 * r, 0]))
            body.move_to(c)
            spin = side * (length - 4.8 - d) / max(0.3, r)  # the sign lands upright
            specks = M.VGroup(*[st.dot(r * s, "#c8d7ee").move_to(c + np_point(math.cos(spin + a) * r * q,
                                                                              math.sin(spin + a) * r * q))
                                for a, q, s in ((0.3, 0.72, 0.09), (2.2, 0.66, 0.12), (3.9, 0.74, 0.07), (5.3, 0.6, 0.08))])
            sign = st.text(currency, 0.5, "#d99a22").scale_to_fit_height(r * 0.85).rotate(spin).move_to(c)
            return M.VGroup(body, specks, sign)

        hero = None if who is False else st.person(who or ("sam", "maya", "leo")[v], "thinking", 3.5 if st.tall else 2.4, 5.0 * side)
        tx = 0.0 if st.tall else 3.1 * side  # a Short: the words are centred above the hill
        wx, wide = (0.0, 11.5) if st.tall else (3.5 * side, 5.8)
        ty = st.top - 1.15 * st.k

        def labels(year: float, value: float, big: float = 1.0):
            yr = st.text(f"Year {int(round(year))}", 0.34, "#cfd9ee", serif=False).move_to([tx, ty + 0.85 * st.k, 0])
            val = st.text(money(value, currency, like=final), 0.95, K.GOLD, max_width=6.6).scale(big).move_to([tx, ty, 0])
            return M.VGroup(yr, val)

        what = f"{percent(rate)} a year" + (f" + {money(monthly, currency)} every month" if monthly else "")
        foot = st.note(note or f"{what} · example, not guaranteed", wx, ty - 0.85 * st.k, max_width=11.5 if st.tall else 6.6)
        t_start, t_grow, t_result = st.beats(["start", "grow", "result"], when_words)
        G.add(snow, shade)
        st.go(t_start)
        st.snd("whoosh")
        b, lab = ball(0, first), labels(0, start if not monthly else first)
        slot = M.VGroup(b)
        text = M.VGroup(lab)
        G.add(slot, text)
        if hero:
            G.add(hero)

        def enter(a):
            grow = _back(_part(a, 0, 0.8))
            slot.submobjects = [ball(0, first).scale(max(0.05, grow))]
            text.set_opacity(_ease(a))
        st.anim(st.room(t_grow, 0.7), enter)
        st.go(t_grow)
        dur = st.room(t_result, max(1.5, t_result - t_grow))
        st.snd("riser")
        st.ticks(dur)
        G.add(foot)

        def roll(a):
            value = compound_value(start, rate, years * a, monthly)
            slot.submobjects = [ball(_ease(a) * 0.72 + a * 0.28, value)]
            y = years * st.stepped(a, dur)
            text.submobjects = [labels(y, compound_value(start, rate, y, monthly))]
            if hero:
                st.change(hero, "thinking", "surprised", _part(a, 0.55, 0.75))
        st.anim(dur, roll)
        st.go(t_result)
        st.snd("thud")
        st.snd("ding", 0.12)
        put = start + monthly * 12 * years
        story = (f"{money(start, currency)} grew to {money(final, currency)}" if not monthly else
                 f"You put in {money(put, currency)}, it grew to {money(final, currency)}")
        told = st.text(story, 0.36, K.CREAM, serif=False, max_width=wide).move_to([wx, ty - 1.55 * st.k, 0])
        G.add(told)

        def land(a):
            bump = 1 + 0.28 * math.sin(math.pi * _part(a, 0, 0.7))
            text.submobjects = [labels(years, final, bump)]
            told.set_opacity(_ease(_part(a, 0.2, 0.8)))
            if hero:
                st.change(hero, "surprised", "celebrating", _part(a, 0, 0.45))
        st.anim(st.room(None, 1.0), land)
        return final

    # ================================================================== inflation: the shrinking banknote
    def inflation(amount=100, rate=0.05, years=10, item="bread", item_price=None, when_words=None, currency="$",
                  variant=None, setting=None, note=None):
        try:
            amount, rate, years = float(amount), as_rate(rate), max(1, min(80, int(years)))
            item_price = None if item_price is None else float(item_price)
        except (TypeError, ValueError):
            return bad("inflation", "amount, rate, years and item_price must be numbers")
        if amount <= 0 or rate <= -0.5:
            return bad("inflation", "amount must be above 0")
        st = Stage(S, api, narration)
        v = st.begin(variant, ("shop", "home", "plain"), setting)
        M, K, G = st.M, st.K, st.G
        left = -1 if v != 1 else 1
        later = buying_power(amount, rate, years)
        rise = (1 + rate) ** years
        full_w, full_h = (5.4, 2.8)
        nx = 3.3 * left

        def banknote(scale: float, value: float):
            w, h = full_w * scale, full_h * scale
            note_ = M.VGroup(st.box(w, h, "#3f9d62", 0.2), st.box(w - 0.26 * scale, h - 0.26 * scale, "#5cc27f", 0.14),
                             st.dot(h * 0.31, "#a9e3ba"))
            fig = st.text(money(amount, currency), 0.62, "#12402a").scale_to_fit_height(h * 0.28)
            if fig.width > w * 0.62:
                fig.scale_to_fit_width(w * 0.62)
            note_.add(fig.move_to(note_[2]))
            return note_.move_to([nx, st.floor + 0.06 + h / 2, 0])

        size = 2.8 if st.tall else 2.0
        pic = st.icon(item, size) or st.icon("shopping_bags", size)
        pic.move_to([-nx, st.floor + size / 2 + 0.03, 0])
        tag_low, tag_high = st.floor + size + 0.75, st.floor + (7.0 if st.tall else 4.35)

        def tag(a: float):
            if item_price is not None:
                label = money(item_price * rise ** a, currency, like=item_price * rise)
            else:
                label = "price" if a < 0.02 else f"price +{percent(rise ** a - 1)}"
            t = st.text(label, 0.55, "#ffffff", serif=False)
            plate = st.box(t.width + 0.7, t.height + 0.45, K.RED, 0.18)
            tip = M.Triangle(fill_color=K.RED, fill_opacity=1, stroke_width=0).scale(0.2).rotate(math.pi)
            tip.next_to(plate, M.DOWN, buff=-0.04)
            return M.VGroup(plate, t.move_to(plate), tip).move_to([-nx, tag_low + (tag_high - tag_low) * _ease(a), 0])

        def year(a: float):
            return st.text(f"Year {int(round(years * a))}", 0.5, K.CREAM).move_to([0, st.top - 0.75 * st.k, 0])

        t_money, t_prices, t_result = st.beats(["money", "prices", "result"], when_words)
        money_slot, tag_slot, year_slot = M.VGroup(), M.VGroup(), M.VGroup()
        G.add(money_slot, tag_slot, year_slot)
        st.go(t_money)
        st.snd("pop")
        def arrive(a):
            money_slot.submobjects = [banknote(max(0.05, _back(a)), amount)]
        st.anim(st.room(t_prices, 0.7), arrive)
        st.go(t_prices)
        st.snd("whoosh")
        G.add(pic)
        foot = st.note(note or f"{percent(rate)} inflation a year", 0, st.top - 1.45 * st.k)
        G.add(foot)
        dur = st.room(t_result, max(1.6, t_result - t_prices))
        st.snd("riser", 0.3)
        st.ticks(dur, 0.16)

        def climb(a):
            e = _part(a, 0.12, 1.0)
            pic.set_opacity(_ease(a * 5))
            shown = st.stepped(e, dur)
            year_slot.submobjects = [year(shown)]
            tag_slot.submobjects = [tag(shown).move_to([-nx, tag_low + (tag_high - tag_low) * _ease(e), 0])]
            shrink = (buying_power(amount, rate, years * e) / amount)
            money_slot.submobjects = [banknote(max(0.3, shrink), amount)]
        st.anim(dur, climb)
        st.go(t_result)
        st.snd("swoosh_down")
        st.snd("thud", 0.25)
        words = st.text(f"buys like {money(later, currency)}", 0.56, "#ff9a86", max_width=5.4)
        plate = st.box(words.width + 0.6, words.height + 0.42, "#141b2b", 0.2, 0.92)
        says = M.VGroup(plate, words.move_to(plate))
        says.move_to([nx, st.floor + 0.06 + full_h * max(0.3, later / amount) + 0.75 * st.k, 0])
        G.add(says)
        st.anim(st.room(None, 0.8), lambda a: says.set_opacity(_ease(a * 1.6)))
        return later

    # ================================================================== where the money goes
    def revenue_split(total, parts, title="Where the money goes", highlight=None, when_words=None, currency="$",
                      variant=None, setting=None, note=None):
        try:
            total = float(total)
        except (TypeError, ValueError):
            return bad("revenue_split", "total must be a number")
        got, warn = split_parts(total, parts)
        if not got:
            return bad("revenue_split", warn)
        if warn:
            S.warnings.append(f"revenue_split(): {warn}")
        if len(got) > 5:
            S.warnings.append("revenue_split(): at most 5 parts are shown — the smallest are joined as \"Other\"")
            got.sort(key=lambda p: -p["value"])
            rest = got[4:]
            got = got[:4] + [{"name": "Other", "value": sum(p["value"] for p in rest), "share": sum(p["share"] for p in rest),
                              "color": "grey", "icon": None}]
        st = Stage(S, api, narration)
        v = st.begin(variant, ("plain", "office", "night"), setting)
        M, K, G = st.M, st.K, st.G
        palette = [[K.BLUE, K.GOLD, K.TEAL, K.PURPLE, K.ORANGE], [K.TEAL, K.ORANGE, K.PURPLE, K.GOLD, K.BLUE],
                   [K.PURPLE, K.TEAL, K.GOLD, K.BLUE, K.PINK]][v]
        for i, p in enumerate(got):
            auto = K.RED if re.search(r"(?i)\b(tax|taxes|fee|fees|cost|costs)\b", p["name"]) else palette[i % 5]
            p["c"] = K.col(p["color"], auto)
        n = len(got)
        whole = 11.0
        bar_y, bar_h = st.floor + (3.8 if st.tall else 2.2), 1.9 if st.tall else 1.35
        col_w = min(2.5, 12.2 / n - 0.45)
        xs = [(-(n - 1) / 2 + i) * (12.6 / n) for i in range(n)]
        biggest = max(p["share"] for p in got)
        col_max = (5.2 if st.tall else 2.15)
        head = st.text(title, 0.36, "#cfd9ee", serif=False, max_width=11).move_to([0, st.top - 0.1 * st.k, 0])
        top_y = st.top - 0.95 * st.k
        figure = st.text(money(total, currency), 0.8, K.GOLD).move_to([0, top_y, 0])

        names = ["total"] + [p["name"] for p in got]
        if highlight:
            names.append("highlight")
        times = st.beats(names, when_words)
        bar = st.box(whole, bar_h, K.GOLD, 0.25).move_to([0, bar_y, 0])
        st.go(times[0])
        st.snd("riser")
        G.add(head, bar, figure)

        def appear(a):
            bar.become(st.box(max(0.3, whole * _back(a)), bar_h, K.GOLD, 0.25).move_to([0, bar_y, 0]))
            figure.become(st.text(money(total * _ease(st.stepped(a, 0.9)), currency), 0.8, K.GOLD).move_to([0, top_y, 0]))
            head.set_opacity(_ease(a * 2))
        st.anim(st.room(times[1], 0.9), appear)
        # the cut: segments in proportion, a small gap between them
        scale = whole / max(1.0, sum(p["share"] for p in got))
        edge, segs = -whole / 2, []
        for p in got:
            w = p["share"] * scale
            segs.append((edge + w / 2, w))
            edge += w
        pieces = [st.box(max(0.05, w - 0.02), bar_h, K.GOLD, 0.1).move_to([x, bar_y, 0]) for x, w in segs]
        cut_at = max(S.t, times[1] - 0.7)
        st.go(cut_at)
        G.remove(bar)
        G.add(*pieces)
        for i in range(n - 1):
            st.snd("crack", 0.07 * i)

        def cut(a):
            for i, (x, w) in enumerate(segs):
                shift = (i - (n - 1) / 2) * 0.22 * _ease(a)
                colour = M.interpolate_color(M.ManimColor(K.GOLD), M.ManimColor(got[i]["c"]), _ease(a))
                pieces[i].become(st.box(max(0.05, w - 0.02), bar_h, colour, 0.1).move_to([x + shift, bar_y, 0]))
        st.anim(min(0.55, max(0.3, times[1] - S.t)), cut)
        columns = []
        for i, p in enumerate(got):
            h = max(0.16, col_max * p["share"] / biggest)
            frm = pieces[i].copy()
            fx, fw = pieces[i].get_center()[0], pieces[i].width
            nxt = times[i + 2] if i + 2 < len(times) else None
            st.go(times[i + 1])
            st.snd("swoosh")
            st.snd("coin", 0.35)
            ytop = st.floor + h
            amount_y = ytop + 0.36 * st.k
            name = st.text(f"{p['name']}  {percent(p['share'])}", 0.25, K.CREAM, serif=False, max_width=12.4 / n - 0.15)
            name.move_to([xs[i], amount_y + 0.5 * st.k, 0])
            value = st.text(money(p["value"], currency), 0.46, p["c"], max_width=12.4 / n - 0.15).move_to([xs[i], amount_y, 0])
            icon = st.icon(p["icon"] or _icon_for(p["name"]), min(0.85, col_w * 0.6))
            if icon:
                icon.next_to(name, M.UP, buff=0.14)
            G.add(name, value, *([icon] if icon else []))

            def fly(a, i=i, h=h, fx=fx, fw=fw, name=name, value=value, icon=icon, amount=p["value"], colour=p["c"], ay=amount_y):
                e = _ease(a)
                w = fw + (col_w - fw) * e
                hh = bar_h + (h - bar_h) * e
                x = fx + (xs[i] - fx) * e
                y = bar_y + (st.floor + h / 2 - bar_y) * e + math.sin(math.pi * e) * 0.35
                pieces[i].become(st.box(max(0.05, w), hh, colour, 0.12).move_to([x, y, 0]))
                seen = _ease(_part(a, 0.45, 1.0))
                value.become(st.text(money(amount * _ease(_part(st.stepped(a, 0.8), 0.3, 1)), currency, like=amount), 0.46, colour,
                                     max_width=12.4 / n - 0.15).move_to([xs[i], ay, 0])).set_opacity(seen)
                name.set_opacity(seen)
                if icon:
                    icon.set_opacity(seen)
            fly(0.0)
            st.anim(st.room(nxt, 0.8), fly)
            columns.append(M.VGroup(pieces[i], name, value, *([icon] if icon else [])))
        if highlight:
            want = str(highlight).strip().lower()
            hit = next((i for i, p in enumerate(got) if want in p["name"].lower()), None)
            if hit is None:
                S.warnings.append(f'revenue_split(): highlight "{highlight}" is not one of the parts')
            else:
                st.go(times[-1])
                st.snd("ding")
                glow = st.box(col_w + 0.34, columns[hit].height + 0.35, K.GOLD, 0.3, 0.0).set_stroke(K.GOLD, 6)
                glow.move_to(columns[hit])
                G.add(glow)

                def focus(a):
                    for i, c in enumerate(columns):
                        if i != hit:
                            c.set_opacity(1 - 0.65 * _ease(a))
                    glow.set_stroke(opacity=_ease(a))
                st.anim(st.room(None, 0.6), focus)
        if note:
            G.add(st.note(note, 0, top_y - 0.75 * st.k))
        return total

    # ================================================================== big amounts side by side
    def big_number_compare(items, winner=None, title=None, verdict=None, when_words=None, currency="$", variant=None,
                           setting=None, note=None):
        got = read_items(items)[:3]
        if len(got) < 2 or max(p["value"] for p in got) <= 0:
            return bad("big_number_compare", 'give 2 or 3 amounts: [("Cost", 600e6), ("Earned", 1e9)]')
        st = Stage(S, api, narration)
        v = st.begin(variant, ("plain", "night", "street"), setting)
        M, K, G = st.M, st.K, st.G
        big = max(p["value"] for p in got)
        values = [p["value"] for p in got]
        if isinstance(winner, str) and winner.strip().lower() in ("lowest", "smallest", "min"):
            win = values.index(min(values))
        elif isinstance(winner, str):
            win = next((i for i, p in enumerate(got) if winner.strip().lower() in p["name"].lower()), None)
            if win is None:
                S.warnings.append(f'big_number_compare(): winner "{winner}" is not one of the names')
                win = values.index(big)
        elif isinstance(winner, (int, float)) and not isinstance(winner, bool):
            win = max(0, min(len(got) - 1, int(winner)))
        else:
            win = values.index(big)
        for i, p in enumerate(got):
            low = p["name"].lower()
            auto = (K.RED if re.search(r"\b(cost|costs|spent|budget|debt|lost|loss|paid|fee|tax)\b", low) else
                    K.GREEN if re.search(r"\b(earn|earned|revenue|profit|made|gross|sales|income|worth)\w*", low) else
                    [K.BLUE, K.TEAL, K.PURPLE][(i + v) % 3])
            p["c"] = K.col(p["color"], auto)
        n = len(got)
        xs = [-3.1, 3.1] if n == 2 else [-4.4, 0.0, 4.4]
        col_w = 2.9 if n == 2 else 2.4
        col_max = (5.6 if n == 2 else 5.0) if st.tall else (2.7 if n == 2 else 2.1)
        head = st.text(title, 0.4, "#cfd9ee", serif=False, max_width=11).move_to([0, st.top - 0.1 * st.k, 0]) if title else None
        times = st.beats([p["name"] for p in got] + ["winner"], when_words)
        if head:
            G.add(head)
        columns = []
        for i, p in enumerate(got):
            h = max(0.22, col_max * p["value"] / big)
            st.go(times[i])
            dur = st.room(times[i + 1], 1.3)
            st.snd("riser")
            st.ticks(dur * 0.85)
            slot = M.VGroup()
            name = st.text(p["name"], 0.34, K.CREAM, serif=False, max_width=col_w + 0.9)
            G.add(slot, name)

            def rise(a, i=i, h=h, slot=slot, name=name, p=p, dur=dur):
                e = _ease(a)
                hh = max(0.1, h * e)
                column = st.box(col_w, hh, p["c"], 0.18).move_to([xs[i], st.floor + hh / 2, 0])
                counted = p["value"] * _ease(st.stepped(a, dur))
                number = st.text(money(counted, currency, like=p["value"]), 0.62, p["c"], max_width=col_w + 1.0)
                number.move_to([xs[i], st.floor + hh + 0.45 * st.k, 0])
                slot.submobjects = [column, number]
                name.move_to([xs[i], st.floor + hh + 1.05 * st.k, 0]).set_opacity(_ease(a * 3))
            st.anim(dur, rise)
            columns.append(M.VGroup(slot, name))
        st.go(times[-1])
        st.snd("ding")
        st.snd("coin", 0.2)
        gold_box = columns[win][0][0]
        frame = st.box(gold_box.width + 0.22, gold_box.height + 0.22, K.GOLD, 0.24, 0.0).set_stroke(K.GOLD, 8).move_to(gold_box)
        crown = st.icon("crown", 0.9)
        crown.next_to(columns[win], M.UP, buff=0.1)
        if crown.get_top()[1] > st.top + 0.35:
            crown.next_to(columns[win][1], M.LEFT, buff=0.2)
        words = None
        if verdict == "difference" or verdict == "ratio" or verdict is None:
            others = [x for i, x in enumerate(values) if i != win]
            second = max(others) if values[win] == big else min(others)
            if verdict == "difference":
                words = f"{money(abs(values[win] - second), currency)} {'more' if values[win] >= second else 'less'}"
            elif second > 0 and values[win] > second:
                ratio = values[win] / second
                words = f"{ratio:.1f}× bigger" if ratio >= 1.15 else f"{money(values[win] - second, currency)} more"
        elif verdict:
            words = str(verdict)[:40]
        tag = None
        if words:
            t = st.text(words, 0.4, "#1d2430", serif=False, max_width=5.0)
            plate = st.box(t.width + 0.6, t.height + 0.38, K.GOLD, 0.2)
            tag = M.VGroup(plate, t.move_to(plate)).move_to([0, st.top - (0.95 if head else 0.3) * st.k, 0])
            G.add(tag)
        G.add(frame, crown)

        def crown_it(a):
            frame.set_stroke(opacity=_ease(a))
            crown.set_opacity(_ease(a * 2))
            crown_y = columns[win].get_top()[1] + crown.height / 2 + 0.08
            if crown_y + crown.height / 2 <= st.top + 0.35:
                crown.move_to([xs[win], crown_y + (1 - _back(a)) * 0.8, 0])
            for i, c in enumerate(columns):
                if i != win:
                    c.set_opacity(1 - 0.35 * _ease(a))
            if tag:
                tag.set_opacity(_ease(_part(a, 0.25, 0.9)))
        crown_it(0.0)
        st.anim(st.room(None, 0.9), crown_it)
        if note:
            G.add(st.note(note, 0, st.top - (1.75 if words else 1.0) * st.k))
        return got[win]["value"]

    # ================================================================== an amount growing over time
    def money_timeline(points, title=None, mode="total", when_words=None, currency="$", variant=None, setting=None, note=None):
        """mode="total": each value is the amount reached by then. mode="add": each value is added to the ones before."""
        got = read_items(points)[:7]
        if len(got) < 2:
            return bad("money_timeline", 'give 2 to 7 steps: [("Opening weekend", 150e6), ("Week 2", 230e6)]')
        if str(mode) == "add":
            run = 0.0
            for p in got:
                p["added"] = p["value"]
                run += p["value"]
                p["value"] = run
        big = max(p["value"] for p in got)
        if big <= 0:
            return bad("money_timeline", "the values must be above 0")
        st = Stage(S, api, narration)
        v = st.begin(variant, ("night", "plain", "street"), setting)
        M, K, G = st.M, st.K, st.G
        colour = [K.GOLD, K.GREEN, K.TEAL][v]
        n = len(got)
        gap = 12.4 / n
        xs = [-6.2 + gap * (i + 0.5) for i in range(n)]
        line_y = st.floor + 0.62 * st.k
        col_max = 5.8 if st.tall else 2.35
        col_w = min(1.7, gap * 0.55)
        top_y = st.top - (1.0 if title else 0.55) * st.k
        head = st.text(title, 0.36, "#cfd9ee", serif=False, max_width=11).move_to([0, st.top - 0.05 * st.k, 0]) if title else None
        axis = M.Line([-6.6, line_y, 0], [6.6, line_y, 0], color="#8fa3c4", stroke_width=5)
        times = st.beats([p["name"] for p in got], when_words)
        total_slot = M.VGroup()
        st.go(max(S.t, times[0] - 0.35))
        st.snd("swoosh")
        G.add(axis, total_slot, *([head] if head else []))
        st.anim(0.35, lambda a: axis.become(M.Line([-6.6, line_y, 0], [-6.6 + 13.2 * _ease(a) + 0.01, line_y, 0],
                                                   color="#8fa3c4", stroke_width=5)))
        before = 0.0
        tips: list = []
        for i, p in enumerate(got):
            h = max(0.14, col_max * p["value"] / big)
            st.go(times[i])
            nxt = times[i + 1] if i + 1 < n else None
            dur = st.room(nxt, 1.1)
            st.snd("pop")
            st.ticks(dur * 0.8)
            last = i == n - 1
            bar, node = M.VGroup(), st.dot(0.15, colour).move_to([xs[i], line_y, 0])
            name = st.text(p["name"], 0.23, K.CREAM, serif=False, max_width=gap - 0.15)
            name.move_to([xs[i], st.floor + 0.27 * st.k, 0])
            small = M.VGroup()
            link = M.VGroup()
            G.add(link, bar, node, name, small)

            def step(a, i=i, h=h, bar=bar, small=small, link=link, p=p, start_value=before, last=last, dur=dur):
                e = _ease(a)
                hh = max(0.06, h * e)
                fill = colour if last else M.interpolate_color(M.ManimColor(colour), M.ManimColor(K.SLATE), 0.35)
                bar.submobjects = [st.box(col_w, hh, fill, 0.14).move_to([xs[i], line_y + hh / 2, 0])]
                now = start_value + (p["value"] - start_value) * _ease(st.stepped(a, dur))
                total_slot.submobjects = [st.text(money(now, currency), 0.85, K.GOLD, max_width=9)
                                          .move_to([0, top_y, 0])]
                own = money(p["added"], currency) if "added" in p else money(p["value"], currency)
                label = ("+" if "added" in p and i else "") + own
                small.submobjects = [st.text(label, 0.28, K.CREAM, serif=False, max_width=gap - 0.1)
                                     .move_to([xs[i], line_y + hh + 0.3 * st.k, 0]).set_opacity(_ease(a * 2))]
                if tips:  # the growth line from the step before
                    a0 = tips[-1]
                    b0 = [xs[i], line_y + h + 0.62 * st.k, 0]
                    end = [a0[0] + (b0[0] - a0[0]) * e, a0[1] + (b0[1] - a0[1]) * e, 0]
                    link.submobjects = [M.Line(a0, end, color=K.CREAM, stroke_width=4, stroke_opacity=0.75),
                                        st.dot(0.09, K.CREAM).move_to(end)]
            st.anim(dur, step)
            tips.append([xs[i], line_y + h + 0.62 * st.k, 0])
            if i == 0:
                link.submobjects = [st.dot(0.09, K.CREAM).move_to(tips[0])]
            before = p["value"]
        st.snd("ding")

        def finish(a):
            bump = 1 + 0.25 * math.sin(math.pi * a)
            total_slot.submobjects = [st.text(money(got[-1]["value"], currency), 0.85, K.GOLD, max_width=9).scale(bump)
                                      .move_to([0, top_y, 0])]
        st.anim(st.room(None, 0.7), finish)
        if note:
            G.add(st.note(note, 0, top_y - 0.8 * st.k))
        return got[-1]["value"]

    return {"compound": compound, "inflation": inflation, "revenue_split": revenue_split,
            "big_number_compare": big_number_compare, "money_timeline": money_timeline,
            **vis_master2.make(S, api, narration)}


def np_point(x: float, y: float):
    import numpy as np
    return np.array([x, y, 0.0])


# ================================================================== what the AI is told
GUIDE = r'''MASTER SCENES — finished, designed animations for common money stories. One call makes the WHOLE scene (its own
background, characters, sounds); the app does the maths. Use one when the scene's idea really is that story, and then
write nothing else on stage (only the idea line, the call, and a transition() if wanted). At most one per scene; not
in two scenes in a row; at most 2 times each in a video.
  Common options: when_words={step: "exact narration words"} (every step starts on its words; copy them exactly, in
  order), currency="$", variant=0|1|2 (a different look), note="Estimate" or "Source: ..." (small line), setting="...".
  Numbers: 600e6 = 600 million, 1.2e9 = 1.2 billion. Use ONLY numbers from the narration or the sources — never invent.

  compound(start=1000, rate=0.08, years=30, monthly=0, who="sam")      steps: start, grow, result
      a snowball of money rolls downhill and grows with the years.
      compound(start=1000, rate=0.08, years=30, when_words={"start": "a thousand dollars", "grow": "every year",
               "result": "ten thousand"})
  inflation(amount=100, rate=0.07, years=10, item="bread", item_price=2)      steps: money, prices, result
      the banknote shrinks while the item's price climbs. Leave item_price out if the narration gives no price.
      inflation(amount=100, rate=0.07, years=10, when_words={"money": "hundred dollars", "result": "half"})
  revenue_split(total, parts, title="Where the money goes", highlight="Studio")      steps: total, <each part name>, highlight
      one amount is cut into parts (2-5). parts: shares (0.5) or amounts; what is missing is shown as "Other".
      revenue_split(1e9, [("Theaters", 0.5), ("Studio", 0.4), ("Taxes", 0.1)], title="Box office", highlight="Studio",
                    when_words={"total": "one billion", "Theaters": "theaters keep", "Studio": "the studio"})
  big_number_compare(items, winner=None, title=None, verdict=None)      steps: <each name>, winner
      2-3 amounts rise side by side, then one is crowned (the biggest, or winner="name" / winner="lowest").
      verdict: "difference" shows the gap, or your own 1-4 words; by default "1.7× bigger".
      big_number_compare([("Cost", 600e6), ("Earned", 1e9)], title="Avengers", verdict="difference",
                         when_words={"Cost": "cost six hundred", "Earned": "earned a billion", "winner": "profit"})
  money_timeline(points, title=None, mode="total")      steps: <each point name>
      an amount grows over days, weeks or years (2-7 points). mode="total": each value is the total by then;
      mode="add": each value is what was added.
      money_timeline([("Opening", 150e6), ("Week 2", 230e6), ("Total", 410e6)], title="Box office",
                     when_words={"Opening": "opening weekend", "Week 2": "second week", "Total": "in total"})

'''
GUIDE = GUIDE.rstrip("\n") + "\n" + vis_master2.GUIDE
