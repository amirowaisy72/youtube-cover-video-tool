"""YT Guru — Visual Explainer object library (user, 2026-11-19).

Flat illustrated objects drawn in code (no images, no stock footage), all in ONE calm
palette so every scene looks drawn by the same artist. Each builder returns a VGroup at a
natural size; the scene scales it to the size the AI asked for.

Find an object by name with build(name, color=None) — it understands many words
(ALIASES: "company" -> factory, "money" -> cash, "investor" -> person ...).
User-drawn shapes (My Shapes, a small JSON recipe) are built by recipe_mob().
"""
import math
import random

from manim import (DOWN, LEFT, ORIGIN, RIGHT, UP, Arc, Circle, Ellipse, Line, Polygon, Rectangle, RoundedRectangle,
                   Text, VGroup)

BG = "#1b2433"
GROUND = "#26324a"
CREAM, ORANGE, TEAL, GOLD, BLUE, RED, SLATE, INK = "#f1ece1", "#e0782f", "#2a9d8f", "#f2c14e", "#5b8def", "#e05a47", "#3a4a5f", "#1d2430"
GREEN, PURPLE, PINK, BROWN, GREY, WHITE_ = "#5cb85c", "#9b7bd4", "#e88aa8", "#8c5a3c", "#9aa5b5", "#ffffff"
SKIN = "#f4c9a0"
WINDOW = "#ffd98a"
FONT = "Poppins"
SERIF = "DM Serif Display"
COLORS = {"cream": CREAM, "orange": ORANGE, "teal": TEAL, "gold": GOLD, "yellow": GOLD, "blue": BLUE, "red": RED, "slate": SLATE,
          "green": GREEN, "purple": PURPLE, "pink": PINK, "brown": BROWN, "grey": GREY, "gray": GREY, "white": WHITE_, "ink": INK,
          "black": INK}


def col(c, default):
    if not c:
        return default
    c = str(c).strip().lower()
    if c.startswith("#") and len(c) in (4, 7):
        return c
    return COLORS.get(c, default)


def R(w, h, c, r=0.0, **kw):
    if r:
        return RoundedRectangle(width=w, height=h, corner_radius=r, fill_color=c, fill_opacity=1, stroke_width=0, **kw)
    return Rectangle(width=w, height=h, fill_color=c, fill_opacity=1, stroke_width=0, **kw)


def C(r, c, **kw):
    return Circle(radius=r, fill_color=c, fill_opacity=1, stroke_width=0, **kw)


def P(pts, c):
    return Polygon(*[[x, y, 0] for x, y in pts], fill_color=c, fill_opacity=1, stroke_width=0)


def T(s, size=30, color=CREAM, weight="BOLD", font=None):
    return Text(str(s), font=font or FONT, font_size=size, color=color, weight=weight)


# ------------------------------------------------------------------ buildings & places
def building(color=None, w=1.0, h=2.5, lit=0.45, seed=0):
    rnd = random.Random(seed)
    body = R(w, h, col(color, SLATE))
    wins = VGroup()
    cols = max(2, int(w / 0.28))
    rows = max(2, int(h / 0.36))
    for r in range(rows):
        for c in range(cols):
            win = R(w / cols * 0.45, 0.16, WINDOW if rnd.random() < lit else "#2b3850")
            win.move_to(body.get_corner(UP + LEFT) + RIGHT * (w / cols) * (c + 0.5) + DOWN * (0.3 + r * (h - 0.4) / rows))
            wins.add(win)
    return VGroup(body, wins)


def skyline(color=None, n=10, seed=3):
    rnd = random.Random(seed)
    tones = ["#3a4a5f", "#425470", "#34445a", "#4a5d7a"]
    g = VGroup(*[building(tones[k % 4], 0.9, 1.4 + rnd.random() * 1.6, 0.5, seed + k) for k in range(n)])
    g.arrange(RIGHT, buff=0.1, aligned_edge=DOWN)
    return g


def house(color=None):
    body = R(2.0, 1.4, col(color, "#e0b77a"))
    roof = P([(-1.25, 0.7), (1.25, 0.7), (0, 1.6)], "#a8432f")
    door = R(0.45, 0.75, "#6b3b25").move_to(body.get_bottom() + UP * 0.375)
    w1 = R(0.45, 0.4, WINDOW).move_to(body.get_center() + LEFT * 0.55 + UP * 0.1)
    w2 = w1.copy().move_to(body.get_center() + RIGHT * 0.55 + UP * 0.1)
    return VGroup(roof, body, door, w1, w2)


def factory(color=None):
    c = col(color, "#c8553d")
    body = R(3.0, 1.4, c)
    teeth = VGroup(*[P([(-1.5 + k, 0.7), (-1.5 + k, 1.3), (-0.5 + k, 0.7)], "#a8432f") for k in range(3)])
    chimney = R(0.35, 1.3, "#8c3a29").move_to([1.1, 1.35, 0])
    door = R(0.5, 0.7, "#5b2a20").move_to(body.get_bottom() + UP * 0.35)
    wins = VGroup(*[R(0.4, 0.3, WINDOW) for _ in range(4)]).arrange(RIGHT, buff=0.25).move_to(body.get_center() + UP * 0.25)
    g = VGroup(chimney, teeth, body, door, wins)
    g.body = body
    return g


def shop(color=None):
    body = R(2.4, 1.6, col(color, CREAM))
    awning = VGroup(*[R(0.3, 0.4, RED if k % 2 == 0 else WHITE_) for k in range(8)]).arrange(RIGHT, buff=0).next_to(body, UP, buff=0)
    win = R(1.1, 0.7, "#9fd3e8").move_to(body.get_center() + LEFT * 0.45 + DOWN * 0.1)
    door = R(0.5, 0.95, "#6b3b25").move_to(body.get_bottom() + UP * 0.475 + RIGHT * 0.7)
    sign = R(1.6, 0.35, ORANGE, 0.05).next_to(awning, UP, buff=0.05)
    return VGroup(body, awning, win, door, sign)


def bank(color=None):
    base = R(3.0, 0.25, col(color, CREAM))
    cols_ = VGroup(*[R(0.25, 1.4, CREAM) for _ in range(5)]).arrange(RIGHT, buff=0.35).next_to(base, UP, buff=0)
    top = R(3.0, 0.25, CREAM).next_to(cols_, UP, buff=0)
    roof = P([(-1.6, 0), (1.6, 0), (0, 0.8)], CREAM).next_to(top, UP, buff=0)
    sign = T("$", 30, INK).move_to(roof.get_center() + DOWN * 0.1)
    return VGroup(base, cols_, top, roof, sign)


def warehouse(color=None):
    body = R(3.2, 1.5, col(color, GREY))
    roof = P([(-1.75, 0.75), (1.75, 0.75), (0, 1.35)], "#6b7a90")
    door = VGroup(*[R(1.2, 0.08, "#5d6878") for _ in range(8)]).arrange(DOWN, buff=0.06).move_to(body.get_bottom() + UP * 0.55)
    return VGroup(body, roof, door)


def tree(color=None):
    trunk = R(0.25, 0.8, BROWN)
    crown = VGroup(C(0.55, col(color, GREEN)).shift(UP * 0.9), C(0.45, col(color, GREEN)).shift(UP * 0.7 + LEFT * 0.4),
                   C(0.45, col(color, GREEN)).shift(UP * 0.7 + RIGHT * 0.4))
    return VGroup(trunk, crown)


def sun(color=None):
    c = col(color, GOLD)
    rays = VGroup(*[R(0.08, 0.35, c).shift(UP * 0.85).rotate(k * math.pi / 6, about_point=ORIGIN) for k in range(12)])
    return VGroup(rays, C(0.55, c))


def cloud(color=None):
    c = col(color, CREAM)
    return VGroup(C(0.45, c).shift(LEFT * 0.5), C(0.6, c).shift(UP * 0.2), C(0.45, c).shift(RIGHT * 0.55), R(1.9, 0.5, c, 0.2).shift(DOWN * 0.2))


def globe(color=None):
    sea = C(1.0, col(color, BLUE))
    land = VGroup(Ellipse(width=0.8, height=0.5, fill_color=GREEN, fill_opacity=1, stroke_width=0).shift(LEFT * 0.3 + UP * 0.35),
                  Ellipse(width=0.6, height=0.8, fill_color=GREEN, fill_opacity=1, stroke_width=0).shift(RIGHT * 0.35 + DOWN * 0.25),
                  Ellipse(width=0.35, height=0.25, fill_color=GREEN, fill_opacity=1, stroke_width=0).shift(LEFT * 0.45 + DOWN * 0.5))
    ring = Circle(radius=1.0, stroke_color=CREAM, stroke_width=3)
    return VGroup(sea, land, ring)


# ------------------------------------------------------------------ transport
def ship(color=None):
    hull = P([(-1.6, 0), (1.6, 0), (1.25, -0.55), (-1.35, -0.55)], col(color, "#2f3e56"))
    cs = [ORANGE, TEAL, GOLD, BLUE, RED]
    boxes = VGroup(*[Rectangle(width=0.5, height=0.3, fill_color=cs[(r * 2 + c) % 5], fill_opacity=1, stroke_color=BG, stroke_width=1.5)
                     .move_to([-1.1 + c * 0.52, 0.16 + r * 0.31, 0]) for r in range(2) for c in range(5)])
    bridge = R(0.35, 0.6, CREAM).move_to([1.25, 0.3, 0])
    return VGroup(hull, boxes, bridge)


def truck(color=None):
    box = R(2.0, 1.0, col(color, CREAM)).shift(LEFT * 0.35 + UP * 0.2)
    cab = R(0.8, 0.75, ORANGE, 0.1).next_to(box, RIGHT, buff=0.05).align_to(box, DOWN)
    win = R(0.35, 0.3, "#9fd3e8").move_to(cab.get_center() + UP * 0.15 + RIGHT * 0.1)
    wheels = VGroup(*[VGroup(C(0.2, INK), C(0.08, GREY)).move_to([x, -0.4, 0]) for x in (-1.0, -0.2, 0.75)])
    return VGroup(box, cab, win, wheels)


def car(color=None):
    body = R(2.0, 0.55, col(color, RED), 0.15)
    top = P([(-0.55, 0.27), (0.55, 0.27), (0.35, 0.7), (-0.35, 0.7)], col(color, RED))
    win = P([(-0.4, 0.3), (0.4, 0.3), (0.25, 0.6), (-0.25, 0.6)], "#9fd3e8")
    wheels = VGroup(*[VGroup(C(0.2, INK), C(0.08, GREY)).move_to([x, -0.3, 0]) for x in (-0.6, 0.6)])
    return VGroup(top, body, win, wheels)


def plane(color=None):
    c = col(color, CREAM)
    body = RoundedRectangle(width=3.0, height=0.5, corner_radius=0.25, fill_color=c, fill_opacity=1, stroke_width=0)
    wing = P([(-0.3, 0), (0.5, 0), (-0.2, -1.0), (-0.6, -1.0)], "#c9ced6")
    wing2 = P([(-0.3, 0), (0.5, 0), (-0.2, 0.8), (-0.6, 0.8)], "#c9ced6")
    tail = P([(-1.5, 0), (-1.1, 0), (-1.45, 0.75), (-1.65, 0.75)], ORANGE)
    wins = VGroup(*[C(0.06, BLUE) for _ in range(7)]).arrange(RIGHT, buff=0.18).move_to(UP * 0.05 + RIGHT * 0.3)
    return VGroup(wing2, body, wing, tail, wins)


def train(color=None):
    cars = VGroup()
    for k in range(3):
        b = R(1.2, 0.7, col(color, BLUE) if k else ORANGE, 0.08)
        wins = VGroup(*[R(0.25, 0.22, "#9fd3e8") for _ in range(3)]).arrange(RIGHT, buff=0.1).move_to(b.get_center() + UP * 0.1)
        wh = VGroup(*[C(0.12, INK).move_to(b.get_bottom() + RIGHT * x) for x in (-0.35, 0.35)])
        cars.add(VGroup(b, wins, wh))
    cars.arrange(RIGHT, buff=0.08)
    return cars


def rocket(color=None):
    body = Ellipse(width=0.8, height=2.4, fill_color=col(color, CREAM), fill_opacity=1, stroke_width=0)
    win = VGroup(C(0.22, BLUE), Circle(radius=0.22, stroke_color=GREY, stroke_width=4)).shift(UP * 0.4)
    fins = VGroup(P([(-0.4, -0.6), (-0.8, -1.2), (-0.3, -1.0)], RED), P([(0.4, -0.6), (0.8, -1.2), (0.3, -1.0)], RED))
    flame = P([(-0.2, -1.15), (0.2, -1.15), (0, -1.8)], ORANGE)
    return VGroup(flame, fins, body, win)


# ------------------------------------------------------------------ devices
def laptop(color=None):
    screen = RoundedRectangle(width=2.2, height=1.4, corner_radius=0.08, fill_color="#26324a", fill_opacity=1, stroke_color=CREAM, stroke_width=3)
    lines = VGroup(*[R(w, 0.08, c) for w, c in ((1.2, TEAL), (0.9, GOLD), (1.5, BLUE), (0.7, ORANGE), (1.1, TEAL))]).arrange(DOWN, buff=0.12, aligned_edge=LEFT)
    lines.move_to(screen).align_to(screen, LEFT).shift(RIGHT * 0.25)
    base = P([(-1.35, 0), (1.35, 0), (1.15, 0.12), (-1.15, 0.12)], col(color, CREAM)).next_to(screen, DOWN, buff=0)
    return VGroup(screen, lines, base)


def phone(color=None):
    body = R(0.9, 1.7, col(color, INK), 0.15)
    scr = R(0.75, 1.35, "#26324a", 0.06)
    bars = VGroup(*[R(0.1, h, TEAL) for h in (0.2, 0.35, 0.3, 0.5, 0.65)]).arrange(RIGHT, buff=0.05, aligned_edge=DOWN).move_to(scr)
    return VGroup(body, scr, bars)


def monitor(color=None):
    scr = RoundedRectangle(width=4.2, height=2.4, corner_radius=0.1, fill_color="#111822", fill_opacity=1, stroke_color=col(color, "#6b7a90"), stroke_width=4)
    # something on the screen: a video with a play button and a small chart beside it
    vid = R(2.2, 1.4, "#26324a", 0.06).move_to(scr.get_center() + LEFT * 0.75 + UP * 0.1)
    play = Polygon([-0.18, 0.22, 0], [-0.18, -0.22, 0], [0.24, 0, 0], fill_color=CREAM, fill_opacity=1, stroke_width=0).move_to(vid)
    bars = VGroup(*[R(0.16, h, c) for h, c in ((0.4, TEAL), (0.65, TEAL), (0.5, TEAL), (0.95, ORANGE))]).arrange(RIGHT, buff=0.08, aligned_edge=DOWN)
    bars.move_to(scr.get_center() + RIGHT * 1.25 + UP * 0.05)
    lines = VGroup(*[R(w, 0.07, "#4a5d7a") for w in (2.2, 1.6)]).arrange(DOWN, buff=0.12, aligned_edge=LEFT).next_to(vid, DOWN, buff=0.15).align_to(vid, LEFT)
    stand = VGroup(R(0.3, 0.45, "#6b7a90"), R(1.4, 0.12, "#6b7a90")).arrange(DOWN, buff=0).next_to(scr, DOWN, buff=0)
    return VGroup(scr, vid, play, bars, lines, stand)


def gear(color=None):
    c = col(color, GREY)
    teeth = VGroup(*[R(0.3, 0.35, c).shift(UP * 0.85).rotate(k * math.pi / 4, about_point=ORIGIN) for k in range(8)])
    return VGroup(teeth, C(0.8, c), C(0.3, BG))


def lightbulb(color=None):
    glass = C(0.6, col(color, GOLD)).shift(UP * 0.3)
    neck = R(0.5, 0.3, GOLD).shift(DOWN * 0.35)
    base = VGroup(*[R(0.45, 0.1, GREY) for _ in range(3)]).arrange(DOWN, buff=0.03).next_to(neck, DOWN, buff=0.02)
    shine = Arc(radius=0.4, start_angle=2.2, angle=0.9, color=WHITE_, stroke_width=5).move_to(glass.get_center() + UP * 0.15 + LEFT * 0.2)
    return VGroup(glass, neck, base, shine)


def clock(color=None):
    face = VGroup(C(0.9, col(color, CREAM)), Circle(radius=0.9, stroke_color=INK, stroke_width=6))
    ticks = VGroup(*[R(0.05, 0.15, INK).shift(UP * 0.72).rotate(k * math.pi / 6, about_point=ORIGIN) for k in range(12)])
    hands = VGroup(Line(ORIGIN, UP * 0.55, color=INK, stroke_width=6), Line(ORIGIN, RIGHT * 0.4, color=RED, stroke_width=6))
    return VGroup(face, ticks, hands)


def calendar(color=None):
    page = R(1.6, 1.6, CREAM, 0.08)
    top = R(1.6, 0.45, col(color, RED), 0.08).align_to(page, UP)
    rings = VGroup(*[R(0.08, 0.3, GREY, 0.03) for _ in range(2)]).arrange(RIGHT, buff=0.7).move_to(top.get_top())
    grid = VGroup(*[R(0.22, 0.18, "#d6cdb8") for _ in range(12)]).arrange_in_grid(3, 4, buff=0.08).move_to(page.get_center() + DOWN * 0.2)
    return VGroup(page, top, rings, grid)


def hourglass(color=None):
    c = col(color, GOLD)
    frame = VGroup(R(1.2, 0.15, BROWN), R(1.2, 0.15, BROWN).shift(DOWN * 1.8)).shift(UP * 0.9)
    glass = VGroup(P([(-0.5, 0.8), (0.5, 0.8), (0.05, 0), (-0.05, 0)], "#c9e3ef"), P([(-0.5, -0.8), (0.5, -0.8), (0.05, 0), (-0.05, 0)], "#c9e3ef"))
    sand = VGroup(P([(-0.25, 0.4), (0.25, 0.4), (0, 0.05)], c), P([(-0.42, -0.75), (0.42, -0.75), (0, -0.35)], c))
    return VGroup(glass, sand, frame)


# ------------------------------------------------------------------ money
def coin(color=None):
    c = Circle(radius=0.2, fill_color=col(color, GOLD), fill_opacity=1, stroke_color="#c99a2e", stroke_width=3)
    return VGroup(c, Text("$", font=FONT, font_size=22, color="#8a6418", weight="BOLD").move_to(c))


def cash(color=None):
    g = VGroup()
    for k in range(4):
        note = R(1.6, 0.8, col(color, "#7fbf7f"), 0.05).shift(UP * k * 0.08 + RIGHT * k * 0.04)
        inner = Rectangle(width=1.35, height=0.6, stroke_color="#4f8f4f", stroke_width=2).move_to(note)
        sign = C(0.18, "#4f8f4f").move_to(note)
        g.add(VGroup(note, inner, sign, T("$", 18, CREAM).move_to(note)))
    return g


def money_bag(color=None):
    bag = VGroup(C(0.75, col(color, "#c9a46b")).shift(DOWN * 0.15), P([(-0.3, 0.5), (0.3, 0.5), (0.18, 0.85), (-0.18, 0.85)], "#c9a46b"))
    tie = R(0.6, 0.12, BROWN).move_to(UP * 0.55)
    return VGroup(bag, tie, T("$", 46, "#7a5a26").shift(DOWN * 0.15))


def wallet(color=None):
    body = R(1.8, 1.2, col(color, BROWN), 0.12)
    note = R(1.4, 0.5, "#7fbf7f").move_to(body.get_top() + DOWN * 0.05)
    flap = R(0.9, 0.6, "#6e4630", 0.1).move_to(body.get_right() + LEFT * 0.45)
    snap = C(0.08, GOLD).move_to(flap.get_center() + RIGHT * 0.2)
    return VGroup(note, body, flap, snap)


def piggy_bank(color=None):
    c = col(color, PINK)
    body = Ellipse(width=2.0, height=1.4, fill_color=c, fill_opacity=1, stroke_width=0)
    snout = Ellipse(width=0.45, height=0.38, fill_color="#d87596", fill_opacity=1, stroke_width=0).move_to(RIGHT * 1.0)
    ear = P([(0.3, 0.55), (0.65, 0.95), (0.7, 0.45)], c)
    legs = VGroup(*[R(0.25, 0.4, c).move_to([x, -0.7, 0]) for x in (-0.55, 0.45)])
    eye = C(0.06, INK).move_to([0.6, 0.2, 0])
    slot = R(0.5, 0.07, "#b9617f").move_to(UP * 0.6)
    return VGroup(legs, body, snout, ear, eye, slot)


def gold_bar(color=None):
    c = col(color, GOLD)
    top = P([(-0.8, 0.3), (0.8, 0.3), (0.6, 0.6), (-0.6, 0.6)], "#f7d77a")
    face = P([(-1.0, -0.3), (1.0, -0.3), (0.8, 0.3), (-0.8, 0.3)], c)
    return VGroup(face, top)


def credit_card(color=None):
    body = R(2.0, 1.25, col(color, BLUE), 0.12)
    chip_ = R(0.35, 0.28, GOLD, 0.04).move_to(body.get_center() + LEFT * 0.55 + UP * 0.1)
    stripe = VGroup(*[R(0.32, 0.08, CREAM) for _ in range(4)]).arrange(RIGHT, buff=0.08).move_to(body.get_center() + DOWN * 0.35)
    return VGroup(body, chip_, stripe)


def price_tag(color=None, text="$50"):
    t = Text(str(text), font=FONT, font_size=30, color=INK, weight="BOLD")
    body = Polygon([-0.25, 0.3, 0], [t.width + 0.35, 0.3, 0], [t.width + 0.35, -0.3, 0], [-0.25, -0.3, 0], [-0.55, 0, 0],
                   fill_color=col(color, GOLD), fill_opacity=1, stroke_width=0)
    hole = C(0.06, BG).move_to([-0.3, 0, 0])
    t.move_to([t.width / 2 + 0.05, 0, 0])
    return VGroup(body, hole, t)


def scale_balance(color=None):
    c = col(color, GOLD)
    post = R(0.15, 1.8, c)
    base = R(1.2, 0.15, c).next_to(post, DOWN, buff=0)
    beam = R(2.8, 0.1, c).next_to(post, UP, buff=0)
    pans = VGroup(*[VGroup(Line([x, 0.95, 0], [x, 0.35, 0], color=c, stroke_width=3), Arc(radius=0.45, start_angle=math.pi, angle=math.pi, color=c, stroke_width=6).move_to([x, 0.25, 0]))
                    for x in (-1.3, 1.3)])
    return VGroup(base, post, beam, pans)


# ------------------------------------------------------------------ people
def person(color=None, hat=None):
    head = C(0.17, SKIN).shift(UP * 0.42)
    body = RoundedRectangle(width=0.5, height=0.62, corner_radius=0.18, fill_color=col(color, TEAL), fill_opacity=1, stroke_width=0)
    g = VGroup(body, head)
    if hat == "hard":
        g.add(Arc(radius=0.19, start_angle=0, angle=math.pi, color=GOLD, stroke_width=8).move_to(head.get_top() + DOWN * 0.04))
    return g


def worker(color=None):
    return person(col(color, ORANGE), "hard")


def crowd(color=None, n=8, seed=1):
    rnd = random.Random(seed)
    cs = [TEAL, BLUE, ORANGE, GOLD, RED, PURPLE]
    return VGroup(*[person(cs[rnd.randrange(len(cs))]) for _ in range(n)]).arrange(RIGHT, buff=0.12)


# ------------------------------------------------------------------ things
def box(color=None):
    b = R(1.0, 0.9, col(color, "#c99a5b"))
    tape = R(0.18, 0.9, "#e3c38f")
    flap = Line(b.get_corner(UP + LEFT), b.get_corner(UP + RIGHT), color="#a37a43", stroke_width=3)
    return VGroup(b, tape, flap)


def basket(color=None):
    c = col(color, "#c99a5b")
    body = P([(-1.0, 0.4), (1.0, 0.4), (0.75, -0.6), (-0.75, -0.6)], c)
    weave = VGroup(*[Line([-0.9 + k * 0.3, 0.4, 0], [-0.68 + k * 0.23, -0.6, 0], color="#a37a43", stroke_width=3) for k in range(7)])
    handle = Arc(radius=0.9, start_angle=0, angle=math.pi, color="#a37a43", stroke_width=8).shift(UP * 0.4)
    return VGroup(handle, body, weave)


def egg(color=None):
    return Ellipse(width=0.55, height=0.72, fill_color=col(color, CREAM), fill_opacity=1, stroke_width=0)


def oil_barrel(color=None):
    c = col(color, "#2f3e56")
    body = R(0.9, 1.3, c, 0.08)
    rims = VGroup(*[R(0.95, 0.07, GREY) for _ in range(2)]).arrange(DOWN, buff=0.35).move_to(body)
    drop = VGroup(C(0.13, GOLD).shift(DOWN * 0.04), P([(-0.11, 0.0), (0.11, 0.0), (0, 0.22)], GOLD)).move_to(body.get_center() + UP * 0.33)
    return VGroup(body, rims, drop)


def wheat(color=None):
    c = col(color, GOLD)
    stem = Line(DOWN * 1.0, UP * 0.6, color=c, stroke_width=5)
    grains = VGroup(*[Ellipse(width=0.18, height=0.34, fill_color=c, fill_opacity=1, stroke_width=0).move_to([s * 0.12, 0.1 + k * 0.22, 0]).rotate(-s * 0.4)
                      for k in range(4) for s in (-1, 1)])
    return VGroup(stem, grains, Ellipse(width=0.16, height=0.3, fill_color=c, fill_opacity=1, stroke_width=0).move_to(UP * 1.0))


def document(color=None):
    page = P([(-0.6, 0.8), (0.3, 0.8), (0.6, 0.5), (0.6, -0.8), (-0.6, -0.8)], col(color, CREAM))
    fold = P([(0.3, 0.8), (0.3, 0.5), (0.6, 0.5)], "#d6cdb8")
    lines = VGroup(*[R(w, 0.07, "#b9b1a0") for w in (0.8, 0.9, 0.7, 0.9, 0.5)]).arrange(DOWN, buff=0.14, aligned_edge=LEFT).move_to(DOWN * 0.1)
    return VGroup(page, fold, lines)


def lock(color=None):
    body = R(0.7, 0.55, col(color, GOLD), 0.08)
    shackle = Arc(radius=0.22, start_angle=0, angle=math.pi, color=col(color, GOLD), stroke_width=10).next_to(body, UP, buff=-0.02)
    return VGroup(shackle, body, C(0.07, INK).move_to(body))


def key(color=None):
    c = col(color, GOLD)
    return VGroup(VGroup(C(0.3, c), C(0.12, BG)).shift(LEFT * 0.6), R(1.0, 0.12, c).shift(RIGHT * 0.15),
                  R(0.1, 0.22, c).move_to([0.45, -0.15, 0]), R(0.1, 0.18, c).move_to([0.6, -0.13, 0]))


def shield(color=None):
    c = col(color, TEAL)
    sh = P([(-0.7, 0.8), (0.7, 0.8), (0.7, 0.0), (0, -0.9), (-0.7, 0.0)], c)
    tick = VGroup(Line([-0.3, 0.0, 0], [-0.05, -0.25, 0], color=CREAM, stroke_width=10), Line([-0.05, -0.25, 0], [0.35, 0.3, 0], color=CREAM, stroke_width=10))
    return VGroup(sh, tick)


def magnifier(color=None):
    return VGroup(R(0.18, 0.9, BROWN, 0.05).rotate(-0.8).move_to([0.55, -0.55, 0]), C(0.5, "#c9e3ef"),
                  Circle(radius=0.5, stroke_color=col(color, GREY), stroke_width=10))


def fence(color=None, width=4.0, h=0.8):
    c = col(color, CREAM)
    posts = VGroup(*[R(0.1, h, c) for _ in range(int(width / 0.35))]).arrange(RIGHT, buff=0.25)
    rails = VGroup(R(posts.width, 0.08, c).move_to(posts.get_center() + UP * h * 0.25), R(posts.width, 0.08, c).move_to(posts.get_center() + DOWN * h * 0.25))
    return VGroup(posts, rails)


def waves(color=None, width=6.0):
    n = int(width / 0.6)
    return VGroup(*[Arc(radius=0.3, start_angle=math.pi, angle=math.pi, color=col(color, BLUE), stroke_width=3).move_to([-width / 2 + 0.3 + k * 0.6, 0, 0])
                    for k in range(n)])


def arrow_up(color=None):
    c = col(color, GREEN)
    return VGroup(R(0.4, 1.0, c).shift(DOWN * 0.3), P([(-0.6, 0.2), (0.6, 0.2), (0, 0.9)], c))


def arrow_down(color=None):
    return arrow_up(col(color, RED)).rotate(math.pi)


def line_chart(color=None, points=None, w=4.0, h=2.2):
    pts = [float(p) for p in (points or [2, 3, 2.5, 4, 3.6, 5, 4.4, 6])][:24] or [1, 2]
    lo, hi = min(pts), max(pts)
    span = (hi - lo) or 1
    axes = VGroup(Line([-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], color=GREY, stroke_width=3), Line([-w / 2, -h / 2, 0], [-w / 2, h / 2, 0], color=GREY, stroke_width=3))
    xy = [[-w / 2 + w * k / max(1, len(pts) - 1), -h / 2 + 0.15 + (h - 0.3) * (p - lo) / span, 0] for k, p in enumerate(pts)]
    line = VGroup()
    from manim import VMobject
    v = VMobject(stroke_color=col(color, GREEN if pts[-1] >= pts[0] else RED), stroke_width=7)
    v.set_points_as_corners(xy)
    line.add(v)
    g = VGroup(axes, line)
    g.line = v
    return g


def bar_chart(color=None, values=None, w=3.6, h=2.2):
    vals = [max(0.0, float(v)) for v in (values or [3, 5, 4, 7])][:8] or [1]
    top = max(vals) or 1
    bw = w / len(vals) * 0.7
    bars = VGroup(*[R(bw, max(0.05, h * v / top), col(color, TEAL) if k < len(vals) - 1 else ORANGE) for k, v in enumerate(vals)])
    bars.arrange(RIGHT, buff=w / len(vals) * 0.3, aligned_edge=DOWN)
    base = Line(bars.get_corner(DOWN + LEFT) + LEFT * 0.1, bars.get_corner(DOWN + RIGHT) + RIGHT * 0.1, color=GREY, stroke_width=3)
    return VGroup(bars, base)


def pie(color=None, share=0.3):
    from manim import AnnularSector, Sector
    share = max(0.02, min(0.98, float(share or 0.3)))
    rest = Sector(radius=1.0, angle=2 * math.pi * (1 - share), start_angle=math.pi / 2 + 2 * math.pi * share, fill_color=SLATE, fill_opacity=1, stroke_width=0)
    part = Sector(radius=1.05, angle=2 * math.pi * share, start_angle=math.pi / 2, fill_color=col(color, ORANGE), fill_opacity=1, stroke_width=0)
    _ = AnnularSector
    return VGroup(rest, part)


def chip(color=None, text="Word"):
    t = T(text, 26, CREAM)
    r = R(t.width + 0.4, t.height + 0.28, col(color, SLATE), 0.12)
    t.move_to(r)
    return VGroup(r, t)


BUILDERS = {
    "building": building, "skyline": skyline, "house": house, "factory": factory, "shop": shop, "bank": bank, "warehouse": warehouse,
    "tree": tree, "sun": sun, "cloud": cloud, "globe": globe, "ship": ship, "truck": truck, "car": car, "plane": plane, "train": train,
    "rocket": rocket, "laptop": laptop, "phone": phone, "monitor": monitor, "gear": gear, "lightbulb": lightbulb, "clock": clock,
    "calendar": calendar, "hourglass": hourglass, "coin": coin, "cash": cash, "money_bag": money_bag, "wallet": wallet,
    "piggy_bank": piggy_bank, "gold_bar": gold_bar, "credit_card": credit_card, "price_tag": price_tag, "scale": scale_balance,
    "person": person, "worker": worker, "crowd": crowd, "box": box, "basket": basket, "egg": egg, "oil_barrel": oil_barrel,
    "wheat": wheat, "document": document, "lock": lock, "key": key, "shield": shield, "magnifier": magnifier, "fence": fence,
    "waves": waves, "arrow_up": arrow_up, "arrow_down": arrow_down, "line_chart": line_chart, "bar_chart": bar_chart, "pie": pie,
    "chip": chip,
}
# Objects whose "size" means their WIDTH (they are wide); the rest: height.
WIDE = {"skyline", "crowd", "fence", "waves", "ship", "train", "truck", "car", "plane", "line_chart", "bar_chart", "chip", "cash",
        "gold_bar", "credit_card", "price_tag", "warehouse", "factory", "bank", "shop", "house", "monitor", "laptop"}
ALIASES = {
    "company": "factory", "business": "factory", "firm": "factory", "corporation": "factory", "plant": "factory", "mill": "factory",
    "city": "skyline", "new york": "skyline", "market": "skyline", "skyscraper": "building", "office": "building", "tower": "building",
    "home": "house", "store": "shop", "supermarket": "shop", "retailer": "shop", "exchange": "bank", "stock exchange": "bank",
    "government": "bank", "court": "bank", "central bank": "bank", "federal reserve": "bank", "storage": "warehouse",
    "earth": "globe", "world": "globe", "planet": "globe", "boat": "ship", "tanker": "ship", "cargo": "ship", "lorry": "truck",
    "vehicle": "car", "airplane": "plane", "aircraft": "plane", "jet": "plane", "computer": "laptop", "software": "laptop",
    "screen": "monitor", "tv": "monitor", "trading screen": "monitor", "mobile": "phone", "smartphone": "phone", "app": "phone",
    "machine": "gear", "engine": "gear", "idea": "lightbulb", "time": "clock", "deadline": "clock", "date": "calendar",
    "month": "calendar", "year": "calendar", "wait": "hourglass", "money": "cash", "dollar": "cash", "dollars": "cash",
    "salary": "cash", "income": "cash", "profit": "money_bag", "savings": "piggy_bank", "dividend": "coin", "coins": "coin",
    "gold": "gold_bar", "card": "credit_card", "debt": "credit_card", "loan": "credit_card", "price": "price_tag", "cost": "price_tag",
    "investor": "person", "people": "crowd", "public": "crowd", "customers": "crowd", "buyers": "crowd", "employee": "worker",
    "builder": "worker", "parcel": "box", "package": "box", "goods": "box", "crate": "box", "eggs": "egg", "oil": "oil_barrel",
    "barrel": "oil_barrel", "food": "wheat", "grain": "wheat", "crop": "wheat", "report": "document", "paper": "document",
    "contract": "document", "law": "document", "security": "shield", "insurance": "shield", "protection": "shield",
    "search": "magnifier", "research": "magnifier", "sea": "waves", "ocean": "waves", "growth": "arrow_up", "rise": "arrow_up",
    "fall": "arrow_down", "drop": "arrow_down", "chart": "line_chart", "stock": "line_chart", "stocks": "line_chart",
    "share price": "line_chart", "graph": "bar_chart", "statistics": "bar_chart", "share": "pie", "percentage": "pie",
    "balance": "scale", "justice": "scale", "fair": "scale", "word": "chip", "label": "chip", "bag": "money_bag",
}


def resolve(name):
    """A library name for a word, or None."""
    n = str(name or "").strip().lower().replace("-", " ").replace("_", " ")
    if not n:
        return None
    key_ = n.replace(" ", "_")
    if key_ in BUILDERS:
        return key_
    if n in ALIASES:
        return ALIASES[n]
    if n.endswith("s") and n[:-1].replace(" ", "_") in BUILDERS:
        return n[:-1].replace(" ", "_")
    return None


def build(name, color=None, **kw):
    fn = BUILDERS[name]
    try:
        return fn(color, **kw)
    except TypeError:
        return fn(color)


# ------------------------------------------------------------------ My Shapes: user / AI drawn recipes
def recipe_mob(recipe, color=None):
    """A shape from a small recipe: parts in a 0..1 box (x right, y up).
    {"parts":[{"shape":"rect","x":0.5,"y":0.3,"w":0.8,"h":0.4,"fill":"#c8553d","r":0.05},
              {"shape":"circle","x":0.5,"y":0.8,"r":0.15,"fill":"gold"},
              {"shape":"ellipse","x":..,"y":..,"w":..,"h":..},
              {"shape":"polygon","points":[[0.1,0.1],[0.9,0.1],[0.5,0.9]],"fill":..},
              {"shape":"line","points":[[x,y],[x,y]],"stroke":"#fff","sw":4},
              {"shape":"arc","x":..,"y":..,"r":..,"start":0,"angle":180,"stroke":..,"sw":..}], "rot" optional per part (degrees)}"""
    g = VGroup()
    S = 2.0  # recipe box -> 2 units

    def pt(x, y):
        return [(float(x) - 0.5) * S, (float(y) - 0.5) * S, 0]
    for p in (recipe.get("parts") or [])[:80]:
        if not isinstance(p, dict):
            continue
        try:
            fill = col(p.get("fill"), col(color, CREAM)) if p.get("fill") or color else col(p.get("fill"), CREAM)
            stroke = col(p.get("stroke"), INK)
            sw = max(0.0, min(20.0, float(p.get("sw") or 0)))
            sh = str(p.get("shape") or "").lower()
            if sh == "rect":
                m = RoundedRectangle(width=max(0.01, float(p.get("w", 0.2)) * S), height=max(0.01, float(p.get("h", 0.2)) * S),
                                     corner_radius=max(0.0, min(0.5, float(p.get("r") or 0))) * S, fill_color=fill, fill_opacity=1,
                                     stroke_color=stroke, stroke_width=sw).move_to(pt(p.get("x", 0.5), p.get("y", 0.5)))
            elif sh == "circle":
                m = Circle(radius=max(0.01, float(p.get("r", 0.1)) * S), fill_color=fill, fill_opacity=1, stroke_color=stroke,
                           stroke_width=sw).move_to(pt(p.get("x", 0.5), p.get("y", 0.5)))
            elif sh == "ellipse":
                m = Ellipse(width=max(0.01, float(p.get("w", 0.2)) * S), height=max(0.01, float(p.get("h", 0.2)) * S), fill_color=fill,
                            fill_opacity=1, stroke_color=stroke, stroke_width=sw).move_to(pt(p.get("x", 0.5), p.get("y", 0.5)))
            elif sh == "polygon":
                pts = [pt(a, b) for a, b in (p.get("points") or [])[:40]]
                if len(pts) < 3:
                    continue
                m = Polygon(*pts, fill_color=fill, fill_opacity=1, stroke_color=stroke, stroke_width=sw)
            elif sh == "line":
                pts = [pt(a, b) for a, b in (p.get("points") or [])[:2]]
                if len(pts) < 2:
                    continue
                m = Line(pts[0], pts[1], color=col(p.get("stroke") or p.get("fill"), INK), stroke_width=max(1.0, sw or 4))
            elif sh == "arc":
                m = Arc(radius=max(0.01, float(p.get("r", 0.2)) * S), start_angle=math.radians(float(p.get("start", 0))),
                        angle=math.radians(float(p.get("angle", 180))), color=col(p.get("stroke") or p.get("fill"), INK),
                        stroke_width=max(1.0, sw or 4)).move_to(pt(p.get("x", 0.5), p.get("y", 0.5)))
            else:
                continue
            if p.get("rot"):
                m.rotate(math.radians(float(p["rot"])))
            g.add(m)
        except (TypeError, ValueError):
            continue
    return g


# ------------------------------------------------------------------ gaming & media (user, 2026-11-20)
def console(color=None):
    body = R(2.6, 0.9, col(color, "#eceff4"), 0.12)
    stripe = R(2.6, 0.14, INK).move_to(body.get_center() + UP * 0.1)
    slot = R(0.9, 0.06, GREY).move_to(body.get_center() + DOWN * 0.18 + LEFT * 0.6)
    led = C(0.06, TEAL).move_to(body.get_center() + DOWN * 0.18 + RIGHT * 1.0)
    stand = R(1.6, 0.12, GREY).next_to(body, DOWN, buff=0)
    return VGroup(body, stripe, slot, led, stand)


def controller(color=None):
    c = col(color, "#e9e4da")
    body = VGroup(Ellipse(width=1.3, height=1.0, fill_color=c, fill_opacity=1, stroke_width=0).shift(LEFT * 0.75 + DOWN * 0.1),
                  Ellipse(width=1.3, height=1.0, fill_color=c, fill_opacity=1, stroke_width=0).shift(RIGHT * 0.75 + DOWN * 0.1),
                  R(1.6, 0.8, c, 0.3).shift(UP * 0.05))
    dpad = VGroup(R(0.42, 0.13, INK), R(0.13, 0.42, INK)).move_to(LEFT * 0.75 + UP * 0.05)
    btns = VGroup(*[C(0.08, cc).move_to(RIGHT * 0.75 + d * 0.16) for cc, d in ((GREEN, UP), (RED, RIGHT), (BLUE, LEFT), (GOLD, DOWN))])
    btns.shift(UP * 0.05)
    sticks = VGroup(C(0.13, SLATE).move_to(LEFT * 0.3 + DOWN * 0.3), C(0.13, SLATE).move_to(RIGHT * 0.3 + DOWN * 0.3))
    return VGroup(body, dpad, btns, sticks)


def game_case(color=None):
    case = R(1.3, 1.7, col(color, BLUE), 0.06)
    band = R(1.3, 0.25, "#2b5fc4").align_to(case, UP)
    art = VGroup(R(1.05, 1.0, "#f08a4b", 0.03), P([(-0.5, -0.45), (0.0, 0.1), (0.5, -0.45)], "#7a3fbf"), C(0.15, GOLD).shift(UP * 0.25 + RIGHT * 0.25))
    art.move_to(case.get_center() + DOWN * 0.15)
    return VGroup(case, band, art)


def headset(color=None):
    c = col(color, "#c9ced6")
    band = Arc(radius=0.75, start_angle=0.15, angle=math.pi - 0.3, color=c, stroke_width=14)
    cups = VGroup(R(0.35, 0.65, c, 0.12).move_to([-0.78, -0.15, 0]), R(0.35, 0.65, c, 0.12).move_to([0.78, -0.15, 0]))
    pads = VGroup(R(0.12, 0.5, RED, 0.05).move_to([-0.6, -0.15, 0]), R(0.12, 0.5, RED, 0.05).move_to([0.6, -0.15, 0]))
    mic = Line([-0.78, -0.45, 0], [-0.25, -0.75, 0], color=c, stroke_width=6)
    return VGroup(band, cups, pads, mic)


def tv(color=None):
    frame = R(3.2, 1.9, col(color, INK), 0.08)
    scr = R(3.0, 1.7, "#26324a")
    sky = R(3.0, 0.85, "#f08a4b").align_to(scr, UP)
    sunset = C(0.3, GOLD).move_to(scr.get_center() + UP * 0.15)
    palms = VGroup(*[R(0.05, 0.5, "#1d2430").move_to(scr.get_center() + RIGHT * x + DOWN * 0.15) for x in (-1.1, -0.9, 1.0)])
    legs = VGroup(R(0.08, 0.3, GREY).move_to([-1.1, -1.1, 0]), R(0.08, 0.3, GREY).move_to([1.1, -1.1, 0]))
    return VGroup(frame, scr, sky, sunset, palms, legs)


def map_(color=None):
    panels = VGroup(*[P([(-0.6 + k * 0.6, -0.7 + (0.08 if k % 2 else 0)), (0.0 + k * 0.6, -0.7 + (0 if k % 2 else 0.08)),
                         (0.0 + k * 0.6, 0.7 + (0 if k % 2 else 0.08)), (-0.6 + k * 0.6, 0.7 + (0.08 if k % 2 else 0))],
                        ["#e9e1c8", "#dcd2b5"][k % 2]) for k in range(3)]).move_to(ORIGIN)
    road = VMobject_path([(-0.8, -0.4), (-0.2, 0.1), (0.3, -0.2), (0.8, 0.4)], RED)
    pin = VGroup(C(0.14, RED).shift(UP * 0.12), P([(-0.1, 0.05), (0.1, 0.05), (0, -0.18)], RED)).move_to([0.45, 0.3, 0])
    water = Ellipse(width=0.5, height=0.3, fill_color=BLUE, fill_opacity=1, stroke_width=0).move_to([-0.55, 0.35, 0])
    return VGroup(panels, water, road, pin)


def VMobject_path(pts, c):
    from manim import VMobject
    v = VMobject(stroke_color=c, stroke_width=5)
    v.set_points_smoothly([[x, y, 0] for x, y in pts])
    return v


def trophy(color=None):
    c = col(color, GOLD)
    cup = VGroup(P([(-0.6, 0.6), (0.6, 0.6), (0.35, -0.2), (-0.35, -0.2)], c), C(0.36, c).shift(DOWN * 0.15))
    handles = VGroup(Arc(radius=0.25, start_angle=math.pi / 2, angle=math.pi, color=c, stroke_width=8).move_to([-0.7, 0.25, 0]),
                     Arc(radius=0.25, start_angle=-math.pi / 2, angle=math.pi, color=c, stroke_width=8).move_to([0.7, 0.25, 0]))
    stem = R(0.15, 0.35, c).move_to(DOWN * 0.65)
    base = R(0.8, 0.2, BROWN, 0.04).move_to(DOWN * 0.92)
    return VGroup(handles, cup, stem, base)


def star(color=None):
    pts = []
    for k in range(10):
        r = 0.9 if k % 2 == 0 else 0.38
        a = math.pi / 2 + k * math.pi / 5
        pts.append((r * math.cos(a), r * math.sin(a)))
    return VGroup(P(pts, col(color, GOLD)))


def microphone(color=None):
    head = R(0.6, 0.9, col(color, GREY), 0.3).shift(UP * 0.45)
    grill = VGroup(*[R(0.45, 0.04, "#6b7a90") for _ in range(4)]).arrange(DOWN, buff=0.12).move_to(head)
    holder = Arc(radius=0.42, start_angle=math.pi, angle=math.pi, color=GREY, stroke_width=6).shift(UP * 0.2)
    stand = VGroup(R(0.1, 0.6, GREY).shift(DOWN * 0.45), R(0.8, 0.1, GREY).shift(DOWN * 0.78))
    return VGroup(holder, head, grill, stand)


def video_camera(color=None):
    body = R(1.6, 1.0, col(color, SLATE), 0.12)
    lens = P([(0.8, 0.3), (1.4, 0.55), (1.4, -0.55), (0.8, -0.3)], "#9aa5b5")
    rec = C(0.1, RED).move_to(body.get_corner(UP + LEFT) + RIGHT * 0.25 + DOWN * 0.22)
    reels = VGroup(C(0.3, GREY).move_to([-0.45, 0.75, 0]), C(0.3, GREY).move_to([0.25, 0.75, 0]))
    return VGroup(reels, body, lens, rec)


def arrow_right(color=None):
    c = col(color, CREAM)
    return VGroup(R(1.4, 0.22, c).shift(LEFT * 0.25), P([(0.4, 0.38), (0.4, -0.38), (0.95, 0)], c))


def track(color=None):
    c = col(color, GREY)
    line = R(10.0, 0.06, c)
    ticks = VGroup(*[R(0.06, 0.3, c).move_to([x, 0, 0]) for x in (-4.5, -1.5, 1.5, 4.5)])
    return VGroup(line, ticks)


BUILDERS.update({"console": console, "controller": controller, "game_case": game_case, "headset": headset, "tv": tv, "map": map_,
                 "trophy": trophy, "star": star, "microphone": microphone, "video_camera": video_camera, "arrow_right": arrow_right,
                 "track": track})
WIDE.update({"console", "controller", "tv", "arrow_right", "track", "map"})
ALIASES.update({"playstation": "console", "ps5": "console", "xbox": "console", "consoles": "console", "game console": "console",
                "gamepad": "controller", "joystick": "controller", "controllers": "controller", "game": "game_case",
                "games": "game_case", "copies": "game_case", "copy": "game_case", "disc": "game_case", "gta": "game_case",
                "gta 6": "game_case", "gta 5": "game_case", "headphones": "headset", "gamer": "headset", "television": "tv",
                "screen time": "tv", "vice city": "map", "location": "map", "locations": "map", "award": "trophy", "winner": "trophy",
                "rating": "star", "review": "star", "reviews": "star", "podcast": "microphone", "streamer": "microphone",
                "streaming": "microphone", "stream": "microphone", "camera": "video_camera", "video": "video_camera",
                "creator": "video_camera", "creators": "video_camera", "youtube": "video_camera", "timeline": "track"})
