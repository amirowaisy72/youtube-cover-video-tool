"""YT Guru — data_chart(): real figures (downloaded by tools_data.py) drawn as an animated line.

The line draws on while the value and date count along, a key point is lit on cue, and "Source: ..."
stays on screen. Without data the scene stops with a clear message: nothing is ever made up.
"""
from __future__ import annotations

import math

import tools_data as td


def number(v: float, prefix: str = "", suffix: str = "", decimals=None, like: float | None = None) -> str:
    from vis_master import money
    ref = abs(v if like is None else like)
    if decimals is None and ref >= 1e6:
        return money(v, prefix, like) + suffix
    if decimals is None:
        decimals = 0 if ref >= 1000 else 1 if ref >= 100 else 2
    sign = "-" if v < 0 else ""
    return f"{sign}{prefix}{abs(v):,.{int(decimals)}f}{suffix}"


def ticks(bottom: float, top: float, most: int = 5) -> list[float]:
    """Round numbers for the axis, covering bottom..top."""
    span = max(top - bottom, 1e-12)
    raw = span / (most - 1)
    power = 10 ** math.floor(math.log10(raw))
    step = next(m * power for m in (1, 2, 2.5, 5, 10) if m * power >= raw - 1e-12)
    first, last = math.floor(bottom / step + 1e-9), math.ceil(top / step - 1e-9)
    return [round(k * step, 10) for k in range(first, last + 1)]


def axis_range(values: list) -> tuple[float, float, bool]:
    """(bottom, top, starts at zero): from zero unless that would flatten the line."""
    lo, hi = min(values), max(values)
    if lo >= 0 and (hi <= 0 or lo / hi < 0.6):
        return 0.0, hi * 1.08 or 1.0, True
    if hi <= 0:
        return lo * 1.08, 0.0, True
    pad = (hi - lo) * 0.12 or abs(hi) * 0.1 or 1.0
    bottom = lo - pad
    if lo >= 0:
        bottom = max(0.0, bottom)
    return bottom, hi + pad, bottom == 0


def make(S, api: dict, narration: str, datasets: list) -> dict:
    from vis_master import Stage, _ease, np_point

    def data_chart(series, country="", from_year=None, to_year=None, change="", highlight="max", title=None,
                   prefix=None, suffix=None, decimals=None, when_words=None, variant=None, setting=None, note=None):
        data = next((d for d in datasets or [] if d.get("series") == str(series) and d.get("country_asked", "") == str(country)),
                    None)
        if not data or not data.get("ok"):
            raise RuntimeError(f'data_chart("{series}"): no data — {(data or {}).get("reason") or "it was not downloaded"}')
        change_ = "yoy" if str(change).lower() in ("yoy", "year", "percent", "change_percent") else ""
        points = td.select(data["points"], from_year, to_year, change_)
        if len(points) < 2:
            raise RuntimeError(f'data_chart("{series}"): no values between those years')
        scale, auto_prefix, auto_suffix = td.units_of(data, change_)
        prefix = auto_prefix if prefix is None else str(prefix)
        suffix = auto_suffix if suffix is None else str(suffix)
        values = [p[1] * scale for p in points]
        mark = td.find_highlight(points, highlight)
        if highlight and mark is None:
            S.warnings.append(f'data_chart(): highlight="{highlight}" is not in the data (use "max", "min", "latest", a year '
                              'or "2022-06")')
        if data.get("restricted"):
            S.warnings.append(f"data_chart(): the owner of {series} restricts re-use — check its FRED page before publishing")
        if data.get("stale"):
            S.warnings.append(f"data_chart(): the download failed, the copy saved on {data.get('fetched')} is shown")
        freq = td.frequency(data["points"])

        st = Stage(S, api, narration)
        v = st.begin(variant, ("plain", "night", "plain"), setting)  # quiet backgrounds: the line must read
        M, K, G = st.M, st.K, st.G
        colour = [K.GOLD, K.GREEN, K.ORANGE][v]
        C = st.top - 1.75 * st.k - st.floor
        name = str(title or data.get("title") or series)
        if change_ and not title:
            name += " — change in a year"
        head = st.text(name, 0.32, "#cfd9ee", serif=False, max_width=12.2).move_to([0, st.top - 0.08 * st.k, 0])
        x0, x1 = -4.9, 6.2
        y0, y1 = st.floor + 0.55 * st.k, st.floor + C * 0.97
        bottom, top, from_zero = axis_range(values)
        marks = ticks(bottom, top)
        bottom, top = marks[0], marks[-1]
        from_zero = bottom <= 0 <= top
        whole = all(abs(m - round(m)) < 1e-9 for m in marks)
        idx = td.thin(points, {mark} if mark is not None else set())
        t = [td._date(points[i][0]).toordinal() for i in idx]
        px = lambda k: x0 + (x1 - x0) * (t[k] - t[0]) / max(1, t[-1] - t[0])  # noqa: E731
        py = lambda v: y0 + (y1 - y0) * (v - bottom) / (top - bottom)  # noqa: E731
        path = [(px(k), py(values[i])) for k, i in enumerate(idx)]
        grid = M.VGroup()
        for g, v in enumerate(marks):
            y = py(v)
            grid.add(M.Line([x0, y, 0], [x1, y, 0], color="#8fa3c4", stroke_width=2, stroke_opacity=0.55 if g == 0 else 0.2))
            label = st.text(number(v, prefix, suffix, 0 if whole else None if abs(top) >= 1e6 else 1, max(abs(top), abs(bottom))),
                            0.17, "#aab6cf", serif=False, max_width=1.5)
            grid.add(label.move_to([x0 - 0.15 - label.width / 2, y, 0]))
        if bottom < 0 < top:
            grid.add(M.Line([x0, py(0), 0], [x1, py(0), 0], color=K.CREAM, stroke_width=2.5, stroke_opacity=0.6))
        years = [td._date(points[i][0]).year for i in (idx[0], idx[-1])]
        step = next(s for s in (1, 2, 5, 10, 20, 25, 50) if (years[1] - years[0]) / s <= (4 if st.tall else 7))
        for year in range(math.ceil(years[0] / step) * step, years[1] + 1, step):
            o = td._date(f"{year}-01-01").toordinal()
            if t[0] <= o <= t[-1]:
                x = x0 + (x1 - x0) * (o - t[0]) / max(1, t[-1] - t[0])
                grid.add(st.text(str(year), 0.18, "#aab6cf", serif=False).move_to([x, st.floor + 0.25 * st.k, 0]))
        foot_text = f"Source: {data['source']} ({data['code']})"
        if not from_zero:
            foot_text += " · axis does not start at zero"
        foot = st.note(note and f"{note} · {foot_text}" or foot_text, 0, st.top - 1.55 * st.k, 12.0)

        t_draw, t_mark, t_res = st.beats(["draw", "highlight", "result"], when_words)
        line_slot, dot_slot, counter = M.VGroup(), M.VGroup(), M.VGroup()
        st.go(t_draw)
        G.add(head, grid, foot, line_slot, dot_slot, counter)
        st.snd("swoosh")

        def readout(i: int, value: float):
            big = st.text(number(value, prefix, suffix, decimals, max(map(abs, values))), 0.62, colour, max_width=5.4)
            when = st.text(td.date_label(points[i][0], freq), 0.26, K.CREAM, serif=False)
            row = M.VGroup(big, when).arrange(M.RIGHT, buff=0.3, aligned_edge=M.DOWN)
            return row.move_to([0, st.top - 0.9 * st.k, 0])

        def partial(f: float):
            at = max(0.0, min(1.0, f)) * (len(path) - 1)
            k = int(at)
            a, b, u = path[k], path[min(k + 1, len(path) - 1)], at - k
            tip = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
            pts = path[:k + 1] + [tip]
            line = M.VMobject()
            line.set_points_as_corners([np_point(*p) for p in pts] if len(pts) > 1 else [np_point(*tip)] * 2)
            area = M.Polygon(*[np_point(*p) for p in [(pts[0][0], y0)] + pts + [(tip[0], y0)]], fill_color=colour,
                             fill_opacity=0.14, stroke_width=0)
            return M.VGroup(area, line.set_stroke(colour, 7).set_fill(opacity=0)), tip, k

        # the line draws as far as the highlighted point (or to the end), then on to the end
        stop = 1.0
        if mark is not None:
            stop = idx.index(mark) / max(1, len(idx) - 1)

        def draw_to(f: float):
            group, tip, k = partial(f)
            line_slot.submobjects = [group]
            dot_slot.submobjects = [st.dot(0.15, colour).move_to(np_point(*tip))]
            near = idx[min(len(idx) - 1, round(max(0.0, min(1.0, f)) * (len(path) - 1)))]
            counter.submobjects = [readout(near, values[near])]
        dur = st.room(t_mark, max(1.6, t_mark - st.S.t))
        st.snd("riser")
        st.ticks(dur, 0.16)
        st.anim(dur, lambda a: draw_to(stop * st.stepped(a, dur) if a < 1 else stop))
        marker = M.VGroup()
        if mark is not None:
            st.go(t_mark)
            mx, my = path[idx.index(mark)]
            ring = M.Circle(radius=0.34, color=K.CREAM, stroke_width=5).move_to(np_point(mx, my))
            drop = M.DashedLine(np_point(mx, y0), np_point(mx, my), color=K.CREAM, stroke_width=3, dash_length=0.14)
            says = f"{td.date_label(points[mark][0], freq)}: {number(values[mark], prefix, suffix, decimals, max(map(abs, values)))}"
            words = st.text(says, 0.28, "#1d2430", serif=False, max_width=5.5)
            plate = M.VGroup(st.box(words.width + 0.5, words.height + 0.34, K.CREAM, 0.16), words)
            words.move_to(plate[0])
            above = my + 0.85 * st.k <= y1 + 0.2
            plate.move_to([max(x0 + plate.width / 2, min(x1 - plate.width / 2, mx + (0 if above else -plate.width / 2 - 0.7))),
                           my + 0.75 * st.k if above else my, 0])
            marker.add(drop, ring, plate)
            G.add(marker)
            st.snd("ding")
            home = ring.copy()

            def light(a):
                ring.become(home.copy().scale(1 + 1.2 * (1 - _ease(a))))
                drop.set_stroke(opacity=_ease(a))
                words.set_opacity(_ease(a))
                plate[0].set_fill(opacity=_ease(a))
            light(0.0)
            st.anim(min(0.5, st.room(t_res, 0.5)), light)
        if stop < 1:
            st.go(max(st.S.t, min(t_res, st.S.total - 1.0)) if mark is None else st.S.t + 0.35)
            dur = max(0.5, min(1.4, st.S.total - st.S.t - 0.7))
            st.snd("riser")
            st.anim(dur, lambda a: draw_to(stop + (1 - stop) * st.stepped(a, dur) if a < 1 else 1.0))
        st.go(t_res)
        st.snd("coin")

        def land(a):
            bump = 1 + 0.2 * math.sin(math.pi * a)
            counter.submobjects = [readout(len(points) - 1, values[-1]).scale(bump)]
        st.anim(st.room(None, 0.6), land)
        return values[-1]

    return {"data_chart": data_chart}


GUIDE = r'''REAL DATA CHARTS — data_chart() draws real figures the app downloads itself (never type data yourself). It fills
the whole scene, like a master scene. The line draws on, the value counts, one point is lit, "Source: …" shows on screen.
  data_chart("fred:CPIAUCNS", from_year=2000, change="yoy", highlight="2022", title="US inflation",
             when_words={"draw": "prices", "highlight": "twenty twenty two", "result": "today"})
  data_chart("worldbank:FP.CPI.TOTL.ZG", country="PK", from_year=2000, highlight="max")
  change="yoy" shows the % change in a year (for price or money indexes). highlight = "max", "min", "latest", a year
  ("2022") or a month ("2022-06"). steps for when_words: draw, highlight, result. Only literal text for the series.
  Use only series ids you are sure of, for example —
    FRED (US): CPIAUCNS consumer prices (an index: use change="yoy" = the inflation rate quoted in the news),
      UNRATE unemployment %, FEDFUNDS interest rate %,
      MORTGAGE30US mortgage rate %, DGS10 10-year yield %, GDP, GASREGW gas price, MSPUS median house price,
      MEHOINUSA672N median household income, PSAVERT saving rate %, TOTALSL consumer credit, REVOLSL card debt,
      M2SL money supply
    World Bank (any country="US", "PK", "IN", "GB", "WLD"…): NY.GDP.MKTP.CD GDP, NY.GDP.PCAP.CD GDP per person,
      FP.CPI.TOTL.ZG inflation %, SL.UEM.TOTL.ZS unemployment %, SP.POP.TOTL population
  The narration's numbers must agree with the data (yearly World Bank figures can lag a year or two). There is no
  stock-price source: do not use data_chart for share prices.

HEADLINES — headlines() slams 2-4 REAL headlines from the video's source pages onto the screen, one after another.
  headlines(["https://page-one", "https://page-two", "https://page-three"],
            when_words=["words for the first", "words for the second", "words for the third"])
  Use ONLY links from the SOURCES list. The app photographs each page's own headline; never write headlines yourself.
  It fills the screen, then leaves (or stays to the end). At most once or twice in a video.

'''
