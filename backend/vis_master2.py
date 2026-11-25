"""YT Guru — master scenes, second set: 16 personal-finance stories in the same style as vis_master.py.

Every scene computes its own figures from the numbers given in scene code. Where a scene can run without
real data (stock lines, tax brackets, prices), the picture says that it is an example.

The maths is plain functions at the top (tested without drawing anything).
"""
from __future__ import annotations

import math

# ================================================================== maths


def debt_run(debt: float, rate: float, payment: float, limit: int = 600) -> dict:
    """Month by month: interest is added, then the payment taken. -> balances (one per month, starting with the
    debt), interest paid, months until paid off (None: not within `limit` months, or never)."""
    bal, paid, out = debt, 0.0, [debt]
    for month in range(1, limit + 1):
        interest = bal * rate / 12
        paid += interest
        bal = max(0.0, bal + interest - payment)
        out.append(bal)
        if bal <= 0.005:
            return {"balances": out, "interest": paid, "months": month}
        if bal > debt * 50:
            break
    return {"balances": out, "interest": paid, "months": None}


def duration_words(months: int) -> str:
    y, m = divmod(int(months), 12)
    parts = ([f"{y} year{'s' if y != 1 else ''}"] if y else []) + ([f"{m} month{'s' if m != 1 else ''}"] if m or not y else [])
    return " ".join(parts)


def payoff_race(debts: list[tuple], extra: float, order: str) -> dict:
    """debts = [(name, balance, yearly rate, minimum payment)]. Every month all minimums are paid; the extra money
    and the minimums of finished debts go to one target: the smallest balance ("snowball") or the highest rate
    ("avalanche"). -> months (None: never), interest, the balances after each month, the order debts finished."""
    bal = [float(d[1]) for d in debts]
    budget = sum(float(d[3]) for d in debts) + extra
    paid, history, done = 0.0, [list(bal)], []
    for month in range(1, 601):
        for i, d in enumerate(debts):
            interest = bal[i] * d[2] / 12
            paid += interest
            bal[i] += interest
        money_left = budget
        for i, d in enumerate(debts):
            pay = min(bal[i], float(d[3]), money_left)
            bal[i] -= pay
            money_left -= pay
        while money_left > 0.005 and any(b > 0.005 for b in bal):
            open_ = [i for i, b in enumerate(bal) if b > 0.005]
            target = (min(open_, key=lambda i: bal[i]) if order == "snowball"
                      else max(open_, key=lambda i: (debts[i][2], -bal[i])))
            pay = min(bal[target], money_left)
            bal[target] -= pay
            money_left -= pay
        for i, b in enumerate(bal):
            if b <= 0.005 and i not in done:
                bal[i] = 0.0
                done.append(i)
        history.append(list(bal))
        if len(done) == len(debts):
            return {"months": month, "interest": paid, "history": history, "order": done}
        if sum(bal) > sum(float(d[1]) for d in debts) * 20:
            break
    return {"months": None, "interest": paid, "history": history, "order": done}


def bracket_tax(income: float, brackets: list[tuple]) -> list[dict]:
    """brackets = [(upper limit or None, rate)], lowest first -> for each: from, to, taxed income, tax."""
    out, low = [], 0.0
    for upper, rate in brackets:
        top = math.inf if upper is None else float(upper)
        inside = max(0.0, min(income, top) - low)
        out.append({"from": low, "to": None if upper is None else top, "rate": rate, "taxed": inside, "tax": inside * rate})
        low = top
    return out


def buy_over_time(amount: float, prices: list[float]) -> dict:
    """The same amount at every price -> units bought each time, the total, your average cost, the average price."""
    units = [amount / p for p in prices]
    total = sum(units)
    return {"units": units, "total": total, "invested": amount * len(prices), "avg_cost": amount * len(prices) / total,
            "avg_price": sum(prices) / len(prices)}


def fee_values(amount: float, rate: float, years: float, fee: float, monthly: float = 0.0) -> float:
    """The final value when a yearly fee is taken from the yearly return."""
    from vis_master import compound_value
    return compound_value(amount, rate - fee, years, monthly)


NAMES = ("debt_trap", "budget_split", "emergency_fund", "diversify", "rule_of_72", "gross_vs_net", "credit_score",
         "index_vs_stock", "start_early", "pay_yourself_first", "lifestyle_creep", "fees_bite", "snowball_vs_avalanche",
         "tax_brackets", "net_worth", "dollar_cost_averaging")
EXAMPLE_BRACKETS = [(10000, 0.10), (40000, 0.12), (90000, 0.22), (None, 0.24)]
EXAMPLE_PRICES = [10.0, 8.0, 5.0, 8.0, 10.0]
EXAMPLE_STOCK = [100, 128, 152, 118, 171, 84, 101, 63, 76]
EXAMPLE_INDEX = [100, 106, 113, 108, 119, 112, 124, 131, 140]


# ================================================================== drawing
def make(S, api: dict, narration: str) -> dict:
    """The scene functions for scene code."""
    from vis_master import Stage, as_rate, compound_value, money, percent, read_items, _back, _ease, _part, np_point

    def bad(name, why):
        S.warnings.append(f"{name}(): {why}")
        return 0

    def nums(name, **values):
        """The values as numbers, or None (with a warning that names the wrong one)."""
        out = {}
        for k, v in values.items():
            try:
                out[k] = float(v)
                if not math.isfinite(out[k]):
                    raise ValueError
            except (TypeError, ValueError):
                bad(name, f"{k} must be a number")
                return None
        return out

    class Scene(Stage):
        """The shared pieces of these scenes."""

        def __init__(self, variant, settings, setting, title):
            super().__init__(S, api, narration)
            self.v = self.begin(variant, settings, setting)
            self.C = self.top - 1.7 * self.k - self.floor  # the height free for the drawing, under title and counter
            self.head_y, self.count_y = self.top - 0.1 * self.k, self.top - 0.95 * self.k
            if title:
                self.G.add(self.text(title, 0.36, "#cfd9ee", serif=False, max_width=11).move_to([0, self.head_y, 0]))
            self.ph = 3.5 if self.tall else 2.4  # a person's height

        def y(self, share: float) -> float:
            return self.floor + self.C * share

        def label(self, s, size, color, x, y, width=4.0, serif=False):
            return self.text(s, size, color, serif=serif, max_width=width).move_to([x, y, 0])

        def figure(self, s, x=0.0, color=None, size=0.8, y=None, width=9.0):
            return self.text(s, size, color or self.K.GOLD, max_width=width).move_to([x, self.count_y if y is None else y, 0])

        def plate(self, s, fill, x, y, width=6.0, size=0.36, ink="#ffffff"):
            t = self.text(s, size, ink, serif=False, max_width=width - 0.5)
            back = self.box(t.width + 0.55, t.height + 0.38, fill, 0.18)
            return self.M.VGroup(back, t.move_to(back)).move_to([x, y, 0])

        def column(self, x, h, color, w, base=None, r=0.14):
            base = self.floor if base is None else base
            h = max(0.05, h)
            return self.box(w, h, color, r).move_to([x, base + h / 2, 0])

        def fader(self, m):
            """-> f(a): m shown from invisible (0) to as drawn (1); outlines stay outlines."""
            parts = m.family_members_with_points()
            orig = [(p.get_fill_opacity(), p.get_stroke_opacity()) for p in parts]

            def f(a):
                for p, (fill, stroke) in zip(parts, orig):
                    p.set_fill(opacity=fill * a, family=False)
                    p.set_stroke(opacity=stroke * a, family=False)
            return f

        def reveal(self, mobs, dur=0.45, sound="pop", rise=0.0):
            """Fades things in (optionally rising into place)."""
            faders = [self.fader(m) for m in mobs]
            homes = [m.get_center().copy() for m in mobs]
            for f in faders:
                f(0)
            self.G.add(*mobs)
            if sound:
                self.snd(sound)

            def draw(a):
                for m, f, h in zip(mobs, faders, homes):
                    f(_ease(a))
                    if rise:
                        m.move_to(h + np_point(0, -rise * (1 - _ease(a))))
            self.anim(dur, draw)

        def fly(self, m, to, dur=0.7, sound="swoosh", arc=0.6, shrink=1.0):
            frm = m.get_center().copy()
            goal = np_point(*to)
            full = m.copy()
            if sound:
                self.snd(sound)

            def draw(a):
                e = _ease(a)
                c = full.copy().scale(1 + (shrink - 1) * e)
                m.become(c.move_to(frm + (goal - frm) * e + np_point(0, math.sin(math.pi * e) * arc)))
            self.anim(dur, draw)

        def slot(self, *mobs):
            g = self.M.VGroup(*mobs)
            self.G.add(g)
            return g

        def line(self, pts, color, width=6, opacity=1.0):
            m = self.M.VMobject()
            m.set_points_as_corners([np_point(*p) for p in pts] if len(pts) > 1 else [np_point(*pts[0])] * 2)
            return m.set_stroke(color, width, opacity).set_fill(opacity=0)

    def along(pts, f):
        """The part of a polyline up to the fraction f (0..1) of its points."""
        if f >= 1:
            return list(pts)
        at = max(0.0, f) * (len(pts) - 1)
        i = int(at)
        a, b, t = pts[i], pts[min(i + 1, len(pts) - 1)], at - i
        return list(pts[:i + 1]) + [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)]

    # ================================================================== 1 · the debt trap
    def debt_trap(debt=5000, rate=0.24, payment=125, months=None, when_words=None, currency="$", variant=None,
                  setting=None, note=None, title="The debt trap", who=None):
        n = nums("debt_trap", debt=debt, rate=rate, payment=payment)
        if n is None or n["debt"] <= 0 or n["payment"] < 0:
            return bad("debt_trap", "debt must be above 0 and payment 0 or more") if n else 0
        debt, rate, payment = n["debt"], as_rate(n["rate"]), n["payment"]
        run = debt_run(debt, rate, payment)
        if months:
            shown = max(1, min(600, int(months)))
        else:
            shown = run["months"] or 24
        balances = [run["balances"][min(i, len(run["balances"]) - 1)] for i in range(shown + 1)]
        end = balances[-1]
        interest = debt_run(debt, rate, payment, shown)["interest"]
        first = debt * rate / 12
        st = Scene(variant, ("plain", "home", "night"), setting, title)
        K = st.K
        peak = max(balances)
        col_h = st.C * 0.7
        hero = st.person(who or ("leo", "sam", "nina")[st.v], "worried", st.ph, -5.2)
        t_debt, t_int, t_pay, t_res = st.beats(["debt", "interest", "payment", "result"], when_words)
        st.G.add(st.note(note or f"{percent(rate)} a year on the balance", 4.4 if not st.tall else 0,
                         st.y(0.08) if not st.tall else st.y(1.0), 4.6))
        col = st.slot(st.column(0, 0.05, K.RED, 2.7))
        counter, month = st.slot(), st.slot()
        height = lambda b: col_h * b / peak  # noqa: E731
        st.go(t_debt)
        st.G.add(hero)
        st.snd("thud", 0.3)

        def rise(a):
            col.submobjects = [st.column(0, height(debt) * _back(a), K.RED, 2.7)]
            counter.submobjects = [st.figure(money(debt * _ease(st.stepped(a, 0.9)), currency), color="#ff8a75")]
        st.anim(st.room(t_int, 0.9), rise)
        st.go(t_int)
        plus = st.plate(f"+{money(first, currency)} interest a month", K.ORANGE, -3.7, st.y(0.86), 4.6, 0.28, "#1d2430")
        st.reveal([plus], min(0.4, st.room(t_pay, 0.4)), "swoosh_down", -0.4)
        block = st.box(2.2, 0.34, K.ORANGE, 0.1).move_to([0, st.y(0.84), 0])
        st.G.add(block)
        st.fly(block, (0, st.floor + height(debt) + 0.17), st.room(t_pay, 0.6), "thud", 0.0)
        st.go(t_pay)
        st.G.remove(block)
        minus = st.plate(f"you pay {money(payment, currency)}", K.GREEN, 3.9, st.y(0.62), 4.0, 0.28, "#10261a")
        chunk = st.box(1.6, 0.26, K.GREEN, 0.1).move_to([0, st.floor + height(debt), 0])
        st.G.add(chunk)
        st.reveal([minus], 0.3, None)
        st.fly(chunk, (4.3, st.y(0.3)), st.room(t_res, 0.7), "coin", 0.8, 0.5)
        st.G.remove(chunk)
        dur = max(0.8, st.room(t_res + 1.0, 4.0))
        st.snd("riser")
        st.ticks(dur, 0.16)

        def months_pass(a):
            m = round(shown * st.stepped(a, dur))
            col.submobjects = [st.column(0, height(balances[m]), K.RED, 2.7)]
            counter.submobjects = [st.figure(money(balances[m], currency), color="#ff8a75")]
            month.submobjects = [st.label(f"Month {m}", 0.28, "#cfd9ee", 0, st.top - 1.6 * st.k)]
        st.anim(min(dur, max(0.6, st.S.total - st.S.t - 1.4)), months_pass)
        st.go(t_res)
        if end <= 0.005:
            says, fill = f"Paid off in {duration_words(shown)} · interest {money(interest, currency)}", K.GOLD
            mood = ("worried", "celebrating")
        else:
            says = f"After {duration_words(shown)}: still {money(end, currency)} owed"
            says += " — it grows" if end > debt else ""
            fill, mood = K.GOLD, ("worried", "sad")
        out = st.plate(says, fill, 0, st.count_y, 10.5, 0.34, "#1d2430")
        st.G.remove(plus, minus, month, counter)
        st.snd("ding")
        st.reveal([out], 0.4, "thud", 0.5)
        st.anim(st.room(None, 0.6), lambda a: st.change(hero, mood[0], mood[1], a))
        return end

    # ================================================================== 2 · budget split (jars)
    def budget_split(income, parts=None, title="Where your pay goes", period="month", when_words=None, currency="$",
                     variant=None, setting=None, note=None):
        n = nums("budget_split", income=income)
        got = read_items(parts or [("Needs", 50), ("Wants", 30), ("Savings", 20)])[:4]
        if n is None or n["income"] <= 0 or not got:
            return bad("budget_split", "give an income above 0 and parts like [(\"Needs\", 50), (\"Wants\", 30)]") if n else 0
        income = n["income"]
        values = [p["value"] for p in got]
        if all(v <= 1 for v in values):
            shares = values
        elif sum(values) <= 100.5:
            shares = [v / 100 for v in values]
        else:
            shares = [v / income for v in values]
        if sum(shares) > 1.005:
            S.warnings.append(f"budget_split(): the parts add up to {percent(sum(shares))} of the pay — check them")
        st = Scene(variant, ("home", "plain", "office"), setting, title)
        M, K = st.M, st.K
        count = len(got)
        xs = [(-(count - 1) / 2 + i) * (12.0 / count) for i in range(count)]
        jar_w, jar_h = min(2.6, 12.0 / count - 0.6), st.C * 0.62
        icons = {"need": "garden_house", "want": "shopping_bags", "sav": "piggy_bank", "debt": "bank_card",
                 "rent": "garden_house", "food": "shopping_cart", "invest": "chart_up"}
        colours = [K.BLUE, K.ORANGE, K.GREEN, K.PURPLE]
        times = st.beats(["income"] + [p["name"] for p in got], when_words)
        st.go(times[0])
        pay = st.figure(f"{money(income, currency)} a {period}")
        st.reveal([pay], 0.45, "coin", -0.3)
        jars = []
        for i, x in enumerate(xs):
            jars.append(st.box(jar_w, jar_h, "#ffffff", 0.35, 0.05).set_stroke("#e8eefc", 4, 0.55)
                        .move_to([x, st.floor + jar_h / 2, 0]))
        st.reveal(jars, min(0.4, st.room(times[1], 0.4)), "swoosh")
        top_share = max(shares + [0.01])
        for i, (p, share) in enumerate(zip(got, shares)):
            nxt = times[i + 2] if i + 2 < len(times) else None
            st.go(times[i + 1])
            colour = K.col(p["color"], next((colours[j] for j, k in enumerate(("need", "want", "sav")) if k in p["name"].lower()),
                                            colours[i % 4]))
            full = (jar_h - 0.2) * share / top_share * 0.94
            water = st.slot()
            coins = st.slot()
            name = st.label(f"{p['name']}  {percent(share)}", 0.27, K.CREAM, xs[i], st.floor + jar_h + 0.35 * st.k, 12 / count - 0.2)
            key = next((v for k, v in icons.items() if k in p["name"].lower()), "cash_sack")
            pic = st.icon(p["icon"] or key, min(1.1, jar_w * 0.5))
            if pic:
                pic.move_to([xs[i], st.floor + 0.2 + pic.height / 2, 0])
                st.G.add(pic)
            amount = st.slot()
            st.G.add(name)
            fn = st.fader(name)
            st.snd("swoosh_down")
            for c in range(3):
                st.snd("coin", 0.18 + 0.16 * c)
            dur = st.room(nxt, 1.1)

            def pour(a, i=i, full=full, water=water, coins=coins, amount=amount, colour=colour, share=share, fn=fn, pic=pic,
                     dur=dur):
                fn(_ease(a * 3))
                level = full * _ease(a)
                water.submobjects = [st.column(xs[i], level, colour, jar_w - 0.18, st.floor + 0.09, 0.24)]
                coins.submobjects = [] if a >= 0.9 else [
                    st.dot(0.16, K.GOLD).move_to([xs[i] + (c - 1) * 0.34,
                                                  st.floor + jar_h + 0.9 - (jar_h + 0.9 - level) * _part(a, c * 0.18, c * 0.18 + 0.5), 0])
                    for c in range(3) if _part(a, c * 0.18, c * 0.18 + 0.5) < 1]
                shown = income * share * _ease(st.stepped(a, dur))
                amount.submobjects = [st.text(money(shown, currency, like=income * share), 0.44, colour, max_width=12 / count - 0.2)
                                      .move_to([xs[i], st.floor + jar_h + 0.9 * st.k, 0])]
            st.anim(dur, pour)
        if note:
            st.G.add(st.note(note, 0, st.top - 1.75 * st.k))
        return income

    # ================================================================== 3 · emergency fund
    def emergency_fund(expenses, save, cover=6, bill=None, when_words=None, currency="$", variant=None, setting=None,
                       note=None, title="Emergency fund", who=None):
        n = nums("emergency_fund", expenses=expenses, save=save, cover=cover, bill=bill if bill is not None else 0)
        if n is None or min(n["expenses"], n["save"], n["cover"]) <= 0:
            return bad("emergency_fund", "expenses, save and cover must be above 0") if n else 0
        goal = n["expenses"] * n["cover"]
        need = math.ceil(goal / n["save"] - 1e-9)
        bill = n["bill"] if bill is not None else None
        st = Scene(variant, ("home", "night", "plain"), setting, title)
        M, K = st.M, st.K
        hero = st.person(who or ("maya", "omar", "sam")[st.v], "thinking", st.ph, 4.9)
        stack_h, w = st.C * 0.6, 4.6
        x = -0.8

        def cushion(level: float, squash: float = 0.0):
            h = stack_h * max(0.0, level)
            layers = max(1, min(6, math.ceil(6 * level - 1e-9))) if level > 0 else 0
            g = M.VGroup()
            if not layers:
                return g
            each = h / layers * (1 - squash * 0.45)
            for i in range(layers):
                pill = st.box(w * (1 + squash * 0.18) - 0.12 * (i % 2), max(0.12, each), [K.TEAL, "#37b3a3"][i % 2],
                              each / 2.1)
                g.add(pill.move_to([x, st.floor + each * (i + 0.5), 0]))
            return g

        goal_y = st.floor + stack_h + 0.06
        mark = M.VGroup(M.DashedLine([x - w / 2 - 0.4, goal_y, 0], [x + w / 2 + 0.4, goal_y, 0], color=K.GOLD, stroke_width=4,
                                     dash_length=0.2),
                        st.label(f"goal: {n['cover']:g} months = {money(goal, currency)}", 0.25, K.GOLD, x, goal_y + 0.3 * st.k, 6.0))
        steps = ["save", "goal"] + (["bill"] if bill is not None else [])
        times = st.beats(steps, when_words)
        pile, counter, month = st.slot(), st.slot(), st.slot()
        st.go(times[0])
        st.G.add(hero)
        st.reveal([mark], 0.4, "swoosh")
        dur = st.room(times[1], max(1.2, times[1] - st.S.t))
        st.snd("riser")
        st.ticks(dur, 0.18)

        def fill(a):
            m = round(need * st.stepped(a, dur))
            saved = min(goal, m * n["save"])
            pile.submobjects = [cushion(saved / goal)]
            counter.submobjects = [st.figure(money(saved, currency))]
            month.submobjects = [st.label(f"Month {m} · saving {money(n['save'], currency)}", 0.26, "#cfd9ee", 0,
                                          st.top - 1.6 * st.k, 7)]
        st.anim(dur, fill)
        st.go(times[1])
        done = st.plate(f"Full in {duration_words(need)}", K.GOLD, -4.9, st.y(0.5), 3.6, 0.28, "#1d2430")
        st.snd("ding")
        st.reveal([done], min(0.45, st.room(times[2] if bill is not None else None, 0.45)), "pop", 0.4)
        st.anim(st.room(times[2] if bill is not None else None, 0.5), lambda a: st.change(hero, "thinking", "happy", a))
        if bill is not None:
            st.go(times[2])
            paper = st.icon("receipt", 1.5)
            tag = st.label(f"surprise bill {money(bill, currency)}", 0.3, "#ff8a75", x, st.y(0.98), 5)
            start_y = st.y(0.82)
            paper.move_to([x, start_y, 0])
            st.G.add(paper, tag)
            st.G.remove(month, done)
            mark.remove(mark[1])
            covered = bill <= goal
            left = goal - bill
            st.snd("whoosh")
            st.snd("thud", 0.4)
            dur = st.room(None, 1.6)

            def hit(a):
                fall = _part(a, 0, 0.35)
                squash = math.sin(math.pi * _part(a, 0.35, 0.75))
                level = 1 - (1 - max(0.0, left) / goal) * _ease(_part(a, 0.45, 1.0))
                pile.submobjects = [cushion(level, squash)]
                top = st.floor + stack_h * level * (1 - squash * 0.45) + 0.75
                paper.move_to([x, start_y + (top - start_y) * fall * fall, 0])
                counter.submobjects = [st.figure(money(goal - (goal - max(0.0, left)) * _ease(st.stepped(_part(a, 0.45, 1), dur)),
                                                       currency))]
                st.change(hero, "happy", "celebrating" if covered else "worried", _part(a, 0.55, 0.9))
            st.anim(dur, hit)
            verdict = (f"Covered — {money(left, currency)} still saved" if covered else f"{money(-left, currency)} short")
            st.G.remove(counter)
            st.reveal([st.plate(verdict, K.GREEN if covered else K.RED, 0, st.count_y, 8.0, 0.36)], 0.35, "ding")
        st.G.add(st.note(note, -4.9, st.y(0.2), 3.6) if note else M.VGroup())
        return goal

    # ================================================================== 4 · diversification
    def diversify(amount=10000, drop=0.6, spread=4, names=None, crash_name=None, when_words=None, currency="$",
                  variant=None, setting=None, note=None, title="Don't use one basket"):
        n = nums("diversify", amount=amount, drop=drop, spread=spread)
        if n is None or n["amount"] <= 0:
            return bad("diversify", "amount must be above 0") if n else 0
        amount, drop = n["amount"], min(1.0, max(0.0, as_rate(n["drop"])))
        count = max(2, min(5, int(n["spread"])))
        labels = [str(x)[:12] for x in (names or [])][:count]
        count = max(2, len(labels)) if labels else count
        st = Scene(variant, ("plain", "night", "office"), setting, title)
        M, K = st.M, st.K
        big = st.C * 0.34
        step = 6.2 / count
        small = min(big * 0.75, step * 0.86)
        xs = [0.55 + step * (i + 0.5) for i in range(count)]

        def basket(h, x):
            m = st.icon("basket_item", h) or st.icon("basket", h)
            return m.move_to([x, st.floor + h / 2, 0])

        t_one, t_many, t_crash, t_res = st.beats(["one", "many", "crash", "result"], when_words)
        divider = M.Line([0, st.floor, 0], [0, st.y(0.8), 0], color="#8fa3c4", stroke_width=3, stroke_opacity=0.5)
        left = basket(big, -3.5)
        head_l = st.label("All in one", 0.3, K.CREAM, -3.5, st.y(0.86), 4)
        head_r = st.label(f"Spread over {count}", 0.3, K.CREAM, 3.6, st.y(0.86), 4)
        val_l, val_r = st.slot(), st.slot()
        st.go(t_one)
        st.G.add(st.note(note or f"example: one holding falls {percent(drop)}", 0, st.top - 1.75 * st.k))
        st.reveal([left, head_l, divider], 0.5, "pop", 0.3)
        val_l.submobjects = [st.figure(money(amount, currency), -3.5, y=st.y(0.7), width=5)]
        st.go(t_many)
        rights = [basket(small, x) for x in xs]
        tags = [st.label(labels[i] if i < len(labels) else money(amount / count, currency), 0.2, "#cfd9ee", x,
                         st.floor + small + 0.28 * st.k, step - 0.1) for i, x in enumerate(xs)]
        st.reveal([head_r], 0.2, None)
        for i, (b, tag) in enumerate(zip(rights, tags)):
            st.reveal([b, tag], max(0.14, st.room(t_crash, 0.9) / count), "pop", 0.3)
        val_r.submobjects = [st.figure(money(amount, currency), 3.6, y=st.y(0.7), width=5)]
        st.go(t_crash)
        hit = 0
        if crash_name:
            hit = next((i for i, s in enumerate(labels) if str(crash_name).lower() in s.lower()), 0)
        bolts = [st.icon("lightning", big * 0.9).move_to([-3.5, st.y(0.48), 0]),
                 st.icon("lightning", small * 0.9).move_to([xs[hit], st.floor + small + 1.0 * st.k, 0])]
        after_one, after_many = amount * (1 - drop), amount * (1 - drop / count)
        st.snd("crack")
        st.snd("thud", 0.25)
        st.G.add(*bolts)
        left_home, hit_home = left.copy(), rights[hit].copy()
        dur = st.room(t_res, 1.4)

        def crash(a):
            shake = math.sin(a * 40) * 0.12 * (1 - a)
            for src, m, share in ((left_home, left, drop), (hit_home, rights[hit], drop)):
                e = _ease(_part(a, 0.15, 0.75))
                c = src.copy().stretch(max(0.2, 1 - share * e), 1, about_edge=M.DOWN)
                if e > 0:
                    c.set_color(M.interpolate_color(M.ManimColor("#b5651d"), M.ManimColor(K.RED), e))
                m.become(c.shift(np_point(shake, 0)))
            for bolt in bolts:
                bolt.set_opacity(1 - _ease(_part(a, 0.45, 0.8)))
            q = _ease(st.stepped(_part(a, 0.15, 0.85), dur))
            val_l.submobjects = [st.figure(money(amount - (amount - after_one) * q, currency), -3.5,
                                           color="#ff8a75" if q > 0.3 else K.GOLD, y=st.y(0.7), width=5)]
            val_r.submobjects = [st.figure(money(amount - (amount - after_many) * q, currency), 3.6, y=st.y(0.7), width=5)]
        st.anim(dur, crash)
        st.G.remove(*bolts)
        st.go(t_res)
        plates = [st.plate(f"-{percent(drop)}", K.RED, -3.5, st.y(0.48), 3.0, 0.34),
                  st.plate(f"only -{percent(drop / count)}", K.GREEN, 3.6, st.y(0.48), 4.0, 0.34, "#10261a")]
        st.reveal(plates, st.room(None, 0.5), "ding", 0.4)
        return after_many

    # ================================================================== 5 · the rule of 72
    def rule_of_72(rate=8, start=1000, doublings=3, when_words=None, currency="$", variant=None, setting=None, note=None,
                   title="The rule of 72", who=None):
        n = nums("rule_of_72", rate=rate, start=start, doublings=doublings)
        if n is None or n["rate"] <= 0 or n["start"] <= 0:
            return bad("rule_of_72", "rate and start must be above 0") if n else 0
        pct = as_rate(n["rate"]) * 100
        years = 72 / pct
        times_ = max(1, min(4, int(n["doublings"])))
        start = n["start"]
        yr = f"{years:.0f}" if abs(years - round(years)) < 0.05 else f"{years:.1f}"
        st = Scene(variant, ("plain", "office", "night"), setting, title)
        M, K = st.M, st.K
        count = times_ + 1
        xs = [-4.9 + 9.8 * i / (count - 1) for i in range(count)]
        w, col_h = min(1.9, 8.5 / count), st.C * 0.62
        formula = st.plate(f"72 ÷ {pct:g} = {yr} years to double", K.GOLD, 0, st.count_y, 9.0, 0.44, "#1d2430")
        t_rule, t_double, t_res = st.beats(["rule", "double", "result"], when_words)
        st.go(t_rule)
        st.G.add(st.note(note or "a quick estimate, not a promise", 0, st.top - 1.75 * st.k))
        st.reveal([formula], 0.5, "ding", 0.4)
        st.go(t_double)
        each = max(0.3, min(1.0, (t_res - st.S.t) / count))
        bars = []
        for i in range(count):
            value = start * 2 ** i
            h = max(0.18, col_h * 2 ** i / 2 ** times_)
            slot = st.slot()
            tags = st.M.VGroup(st.label(money(value, currency), 0.4, K.GOLD, xs[i], st.floor + h + 0.32 * st.k, w + 0.7, True),
                               st.label("now" if i == 0 else f"year {years * i:.0f}", 0.22, "#cfd9ee", xs[i],
                                        st.floor + h + 0.78 * st.k, w + 0.7))
            if i:
                tags.add(st.plate("×2", K.GREEN, (xs[i - 1] + xs[i]) / 2, st.floor + 0.28 * st.k, 1.2, 0.2, "#10261a"))
            f = st.fader(tags)
            f(0)
            st.G.add(tags)
            st.snd("riser" if i else "pop")
            st.snd("coin", each * 0.6)

            def grow(a, i=i, h=h, slot=slot, f=f):
                colour = K.GOLD if i == times_ else M.interpolate_color(M.ManimColor(K.GOLD), M.ManimColor(K.SLATE), 0.4)
                slot.submobjects = [st.column(xs[i], h * _back(a), colour, w)]
                f(_ease(_part(a, 0.35, 1)))
            st.anim(each, grow)
            bars.append(slot)
        st.go(t_res)
        crown = st.icon("sparkle_star", 0.9)
        crown.move_to([xs[-1] - w, st.floor + col_h + 0.7, 0])
        st.reveal([crown], st.room(None, 0.5), "ding", 0.3)
        return years

    # ================================================================== 6 · gross vs take-home
    def gross_vs_net(gross, deductions=None, period="month", when_words=None, currency="$", variant=None, setting=None,
                     note=None, title="Gross pay vs take-home"):
        n = nums("gross_vs_net", gross=gross)
        got = read_items(deductions or [("Tax", 0.18), ("Social security", 0.08), ("Insurance", 0.04)])[:4]
        if n is None or n["gross"] <= 0 or not got:
            return bad("gross_vs_net", "give gross above 0 and deductions like [(\"Tax\", 0.2)]") if n else 0
        gross = n["gross"]
        for p in got:
            p["cut"] = p["value"] * gross if p["value"] <= 1 else p["value"]
        net = gross - sum(p["cut"] for p in got)
        if net < 0:
            return bad("gross_vs_net", "the deductions are more than the gross pay")
        st = Scene(variant, ("office", "plain", "home"), setting, title)
        M, K = st.M, st.K
        x, w, full = -2.6, 3.0, st.C * 0.8
        colours = [K.RED, K.ORANGE, K.PURPLE, K.PINK]
        times = st.beats(["gross"] + [p["name"] for p in got] + ["net"], when_words)
        bar, counter = st.slot(), st.slot()
        st.go(times[0])
        st.G.add(st.note(note or "example deductions", 3.4, st.floor + 0.25 * st.k, 5.5))
        st.snd("riser")
        side = st.label(f"gross, a {period}", 0.26, "#cfd9ee", -5.5, st.y(0.4), 2.6)

        def rise(a):
            bar.submobjects = [st.column(x, full * _back(a), K.BLUE, w)]
            counter.submobjects = [st.figure(money(gross * _ease(st.stepped(a, 0.9)), currency))]
        st.anim(st.room(times[1], 0.9), rise)
        st.G.add(side)
        left = gross
        for i, p in enumerate(got):
            st.go(times[i + 1])
            before, left = left, left - p["cut"]
            h0, h1 = full * before / gross, full * left / gross
            colour = K.col(p["color"], colours[i % 4])
            piece = st.box(w, max(0.12, h0 - h1), colour, 0.1).move_to([x, st.floor + (h0 + h1) / 2, 0])
            st.G.add(piece)
            row_y = st.y(0.86) - i * st.C * 0.22
            dur = st.room(times[i + 2], 0.8)

            def lower(a, h0=h0, h1=h1):
                bar.submobjects = [st.column(x, h0 + (h1 - h0) * _ease(_part(a, 0, 0.5)), K.BLUE, w)]
            lower(0.0)
            row = st.plate(f"{p['name']}  -{money(p['cut'], currency)}", colour, 3.4, row_y, 6.0, 0.3)
            st.snd("crack")
            lower(1.0)
            st.fly(piece, (3.4, row_y), dur * 0.65, "swoosh", 0.7, 0.35)
            st.G.remove(piece)
            counter.submobjects = [st.figure(money(left, currency))]
            st.reveal([row], dur * 0.3, "coin")
        st.go(times[-1])
        st.G.remove(side)
        h = full * net / gross
        st.snd("ding")

        def finish(a):
            colour = M.interpolate_color(M.ManimColor(K.BLUE), M.ManimColor(K.GREEN), _ease(a))
            bar.submobjects = [st.column(x, h, colour, w)]
            counter.submobjects = [st.text(money(net, currency), 0.8, K.GREEN, max_width=9)
                                   .scale(1 + 0.25 * math.sin(math.pi * a)).move_to([0, st.count_y, 0])]
        st.anim(st.room(None, 0.6), finish)
        st.reveal([st.plate(f"take-home {percent(net / gross)}", K.GREEN, -5.45, st.y(0.4), 2.9, 0.24, "#10261a")], 0.3, "pop")
        return net

    # ================================================================== 7 · credit score meter
    def credit_score(start=620, events=None, low=300, high=850, when_words=None, variant=None, setting=None, note=None,
                     title="Your credit score"):
        n = nums("credit_score", start=start, low=low, high=high)
        if n is None or n["high"] <= n["low"]:
            return bad("credit_score", "high must be above low") if n else 0
        got = []
        for e in (events or [("Pays on time", 40), ("Missed payment", -70), ("Pays down cards", 55)])[:4]:
            try:
                got.append((str(e[0])[:24], float(e[1])))
            except (TypeError, ValueError, IndexError):
                bad("credit_score", 'events are like [("Pays on time", 40), ("Missed payment", -70)]')
        lo, hi = n["low"], n["high"]
        st = Scene(variant, ("plain", "bank", "night"), setting, title)
        M, K = st.M, st.K
        radius = min(3.1, st.C * (0.72 if not st.tall else 0.5))
        cy = st.floor + 0.35 if not st.tall else st.y(0.56)
        zones = [K.RED, K.ORANGE, K.GOLD, "#a6d36b", K.GREEN]
        dial = M.VGroup(*[M.AnnularSector(inner_radius=radius * 0.72, outer_radius=radius, angle=math.pi / 5 - 0.025,
                                          start_angle=math.pi - (i + 1) * math.pi / 5 + 0.012, fill_color=c, fill_opacity=1,
                                          stroke_width=0).shift([0, cy, 0]) for i, c in enumerate(zones)])
        ends = M.VGroup(st.label(f"{lo:.0f}", 0.2, "#cfd9ee", -radius * 0.86, cy - 0.24 * st.k, 1.4),
                        st.label(f"{hi:.0f}", 0.2, "#cfd9ee", radius * 0.86, cy - 0.24 * st.k, 1.4))
        needle, number = st.slot(), st.slot()

        def point(score):
            share = max(0.0, min(1.0, (score - lo) / (hi - lo)))
            a = math.pi * (1 - share)
            ux, uy = math.cos(a), math.sin(a)
            tip = (ux * radius * 0.9, cy + uy * radius * 0.9)
            base = [(-uy * 0.14, cy + ux * 0.14), (uy * 0.14, cy - ux * 0.14)]
            needle.submobjects = [M.Polygon(*[np_point(*p) for p in (base[0], tip, base[1])], fill_color=K.CREAM,
                                            fill_opacity=1, stroke_width=0), st.dot(0.26, K.CREAM).move_to([0, cy, 0])]
            colour = zones[min(4, int(share * 5))]
            number.submobjects = [st.figure(f"{score:.0f}", color=colour, size=0.9)]

        times = st.beats(["start"] + [name for name, _ in got] + ["result"], when_words)
        st.go(times[0])
        st.G.add(st.note(note or "an illustration — real scoring models differ", 0, st.top - 1.75 * st.k))
        st.reveal([dial, ends], 0.5, "swoosh")
        score = n["start"]
        st.anim(st.room(times[1], 0.7), lambda a: point(lo + (score - lo) * _ease(st.stepped(a, 0.7))))
        for i, (name, change) in enumerate(got):
            st.go(times[i + 1])
            new = max(lo, min(hi, score + change))
            side = -1 if i % 2 == 0 else 1
            row = st.y(0.52) - (i // 2) * st.C * 0.27
            where = (side * 4.95, row) if not st.tall else (side * 3.3, st.y(0.12) - (i // 2) * 0.9 * st.k)
            if st.tall:
                where = (side * 3.3, st.floor + 1.0 + (1 - i // 2) * 2.1)
            tag = st.M.VGroup(st.plate(f"{change:+.0f}", K.GREEN if change >= 0 else K.RED, 0, 0, 2.0, 0.34),
                              st.label(name, 0.23, K.CREAM, 0, 0.55 * st.k, 3.6)).move_to([where[0], where[1], 0])
            st.reveal([tag], 0.3, "ding" if change >= 0 else "swoosh_down", 0.3)
            frm = score
            dur = st.room(times[i + 2], 0.9)
            st.ticks(dur * 0.8)

            def swing(a, frm=frm, new=new, dur=dur):
                wobble = math.sin(a * 11) * (1 - a) * abs(new - frm) * 0.12
                point(frm + (new - frm) * _ease(st.stepped(a, dur)) + (wobble if a > 0.6 else 0))
            st.anim(dur, swing)
            score = new
        st.go(times[-1])
        st.snd("ding")
        final_colour = zones[min(4, int(max(0.0, score - lo) / (hi - lo) * 5))]

        def land(a):
            number.submobjects = [st.figure(f"{score:.0f}", color=final_colour, size=0.9).scale(1 + 0.25 * math.sin(math.pi * a))]
        st.anim(st.room(None, 0.6), land)
        return score

    # ================================================================== 8 · one stock vs an index
    def index_vs_stock(stock=None, index=None, amount=None, stock_name="One company", index_name="Index fund",
                       when_words=None, currency="$", variant=None, setting=None, note=None, title="One stock vs many"):
        real = bool(stock) and bool(index)
        try:
            s = [float(v) for v in (stock if real else EXAMPLE_STOCK)]
            ix = [float(v) for v in (index if real else EXAMPLE_INDEX)]
            assert len(s) >= 3 and len(ix) >= 3 and min(s + ix) >= 0 and s[0] > 0 and ix[0] > 0
        except (TypeError, ValueError, AssertionError):
            return bad("index_vs_stock", "stock and index must be lists of 3 or more prices")
        s = [v / s[0] * 100 for v in s]
        ix = [v / ix[0] * 100 for v in ix]
        st = Scene(variant, ("office", "plain", "night"), setting, title)
        M, K = st.M, st.K
        x0, x1 = -6.0, 4.2
        top = max(s + ix) * 1.06
        yy = lambda v: st.floor + 0.25 + st.C * 0.82 * v / top  # noqa: E731
        ps = [(x0 + (x1 - x0) * i / (len(s) - 1), yy(v)) for i, v in enumerate(s)]
        pi = [(x0 + (x1 - x0) * i / (len(ix) - 1), yy(v)) for i, v in enumerate(ix)]
        falls = [s[i - 1] - s[i] for i in range(1, len(s))]
        crash_at = (falls.index(max(falls))) / (len(s) - 1)  # the share of the line before the biggest fall
        crash_at = min(0.85, max(0.2, crash_at))
        base = M.DashedLine([x0, yy(100), 0], [x1, yy(100), 0], color="#8fa3c4", stroke_width=2.5, dash_length=0.18)
        axis = st.line([(x0, st.floor + 0.2), (x1, st.floor + 0.2)], "#8fa3c4", 4)
        l_s, l_i = st.slot(), st.slot()
        tag_s, tag_i = st.slot(), st.slot()

        def draw_line(slot, tag, pts, vals, f, colour, name):
            part = along(pts, f)
            slot.submobjects = [st.line(part, colour, 8), st.dot(0.14, colour).move_to([part[-1][0], part[-1][1], 0])]
            at = f * (len(vals) - 1)
            i = int(at)
            v = vals[i] + (vals[min(i + 1, len(vals) - 1)] - vals[i]) * (at - i)
            label = st.M.VGroup(st.text(name, 0.25, colour, serif=False, max_width=2.4))
            if amount is not None and real:
                label.add(st.text(money(float(amount) * v / 100, currency), 0.34, K.CREAM, max_width=2.4))
                label.arrange(M.DOWN, buff=0.12)
            label.move_to([min(5.65, part[-1][0] + 1.45), part[-1][1], 0])
            tag.submobjects = [label]
        t_s, t_i, t_c, t_r = st.beats(["stock", "index", "crash", "result"], when_words)
        st.go(t_s)
        warn = "Illustration, not real data" if not real else (note or "past prices do not predict the future")
        st.G.add(st.note(warn, 0, st.top - 1.75 * st.k))
        st.reveal([axis, base], 0.3, "swoosh")
        dur = st.room(t_i, 1.4)
        st.snd("riser")
        st.anim(dur, lambda a: draw_line(l_s, tag_s, ps, s, crash_at * a, K.ORANGE, stock_name))
        st.go(t_i)
        dur = st.room(t_c, 1.4)
        st.snd("riser")
        st.anim(dur, lambda a: draw_line(l_i, tag_i, pi, ix, crash_at * a, K.GREEN, index_name))
        st.go(t_c)
        dur = st.room(t_r, 2.0)
        st.snd("swoosh_down", 0.1)
        st.snd("thud", dur * 0.4)

        def rest(a):
            f = crash_at + (1 - crash_at) * a
            draw_line(l_s, tag_s, ps, s, f, K.ORANGE, stock_name)
            draw_line(l_i, tag_i, pi, ix, f, K.GREEN, index_name)
            if abs(tag_s[0].get_center()[1] - tag_i[0].get_center()[1]) < 0.9 * st.k:
                up = 1 if tag_s[0].get_center()[1] >= tag_i[0].get_center()[1] else -1  # keep who is above
                tag_s[0].shift(np_point(0, up * 0.5 * st.k))
                tag_i[0].shift(np_point(0, -up * 0.5 * st.k))
        st.anim(dur, rest)
        st.go(t_r)
        verdict = "smoother ride with many companies" if not real else (
            f"{index_name if ix[-1] >= s[-1] else stock_name} finished higher")
        st.reveal([st.plate(verdict, K.GOLD, 0, st.count_y, 8.5, 0.32, "#1d2430")], st.room(None, 0.5), "ding", 0.3)
        return ix[-1]

    # ================================================================== 9 · start early
    def start_early(monthly=200, rate=0.07, early_age=25, late_age=35, end_age=65, when_words=None, currency="$",
                    variant=None, setting=None, note=None, title="Start early"):
        n = nums("start_early", monthly=monthly, rate=rate, early_age=early_age, late_age=late_age, end_age=end_age)
        if n is None or not (n["early_age"] < n["late_age"] < n["end_age"]) or n["monthly"] <= 0:
            return bad("start_early", "ages must be early < late < end and monthly above 0") if n else 0
        rate, m = as_rate(n["rate"]), n["monthly"]
        a0, a1, a2 = int(n["early_age"]), int(n["late_age"]), int(n["end_age"])
        early = compound_value(0, rate, a2 - a0, m)
        late = compound_value(0, rate, a2 - a1, m)
        st = Scene(variant, ("plain", "home", "street"), setting, title)
        M, K = st.M, st.K
        col_h = st.C * 0.66
        sides = [(-1, "maya" if st.v != 1 else "nina", a0, early, K.GREEN), (1, "leo" if st.v != 2 else "sam", a1, late, K.BLUE)]
        people = [st.person(who, "standing", st.ph, s * 5.4) for s, who, *_ in sides]
        t_e, t_l, t_g, t_r = st.beats(["early", "late", "grow", "result"], when_words)
        st.go(t_e)
        st.G.add(st.note(note or f"{money(m, currency)} a month at {percent(rate)} · example", 0, st.top - 1.75 * st.k))
        st.reveal([people[0], st.label(f"starts at {a0}", 0.28, K.GREEN, -2.4, st.y(0.9), 4)], 0.4, "pop", 0.3)
        st.go(t_l)
        st.reveal([people[1], st.label(f"starts at {a1}", 0.28, "#8fb4ff", 2.4, st.y(0.9), 4)], 0.4, "pop", 0.3)
        cols, age = [st.slot(), st.slot()], st.slot()
        st.go(t_g)
        dur = st.room(t_r, max(2.0, t_r - st.S.t))
        st.snd("riser")
        st.ticks(dur, 0.15)

        def grow(a):
            now = a0 + (a2 - a0) * st.stepped(a, dur)
            age.submobjects = [st.figure(f"Age {now:.0f}", color=K.CREAM, size=0.6)]
            for slot, (s, _who, begin, _final, colour) in zip(cols, sides):
                value = compound_value(0, rate, max(0.0, now - begin), m)
                h = max(0.06, col_h * value / early)
                slot.submobjects = [st.column(s * 2.4, h, colour, 2.5),
                                    st.label(money(value, currency), 0.44, K.CREAM, s * 2.4, st.floor + h + 0.36 * st.k, 3.4, True)]
        st.anim(dur, grow)
        st.go(t_r)
        st.snd("ding")
        diff = st.plate(f"{money(early - late, currency)} more for starting {a1 - a0} years sooner", K.GOLD, 0, st.count_y,
                        10.5, 0.34, "#1d2430")
        st.G.remove(age)
        st.reveal([diff], 0.45, "thud", 0.4)
        st.anim(st.room(None, 0.6), lambda a: (st.change(people[0], "standing", "celebrating", a),
                                                st.change(people[1], "standing", "surprised", a)))
        return early - late

    # ================================================================== 10 · pay yourself first
    def pay_yourself_first(income, save=0.2, bills=None, when_words=None, currency="$", variant=None, setting=None,
                           note=None, title="Pay yourself first", who=None):
        if isinstance(save, str) and save.strip().endswith("%"):
            try:
                save = float(save.strip().rstrip("%")) / 100
            except ValueError:
                pass
        n = nums("pay_yourself_first", income=income, save=save)
        if n is None or n["income"] <= 0 or n["save"] < 0:
            return bad("pay_yourself_first", "income must be above 0") if n else 0
        income = n["income"]
        saved = n["save"] * income if n["save"] <= 1 else n["save"]
        if 1 < n["save"] <= 100 and income >= 1000:
            S.warnings.append(f"pay_yourself_first(): save={n['save']:g} means {money(saved, currency)} — for "
                              f"{n['save']:g}% write save={n['save'] / 100:g}")
        if saved > income:
            return bad("pay_yourself_first", "you cannot save more than the income")
        got = read_items(bills or [])[:4]
        spent = sum(p["value"] for p in got)
        left = income - saved - spent
        if left < 0:
            S.warnings.append("pay_yourself_first(): the bills are more than what is left after saving")
        st = Scene(variant, ("home", "plain", "office"), setting, title)
        M, K = st.M, st.K
        steps = ["pay", "save"] + (["bills"] if got else []) + ["result"]
        times = st.beats(steps, when_words)
        cx, cy = -0.4, st.y(0.62)
        check = st.slot()

        def pay_note(value, scale=1.0):
            body = M.VGroup(st.box(4.4, 2.0, "#3f9d62", 0.2), st.box(4.14, 1.74, "#5cc27f", 0.14))
            body.add(st.text(money(value, currency), 0.62, "#0f3a24", max_width=3.6))
            return body.scale(scale).move_to([cx, cy, 0])
        pig = st.icon("piggy_bank", min(2.4, st.C * 0.45))
        pig.move_to([-4.9, st.floor + pig.height / 2, 0])
        st.go(times[0])
        st.snd("whoosh")
        def arrive(a):
            check.submobjects = [pay_note(income, max(0.05, _back(a)))]
        st.anim(st.room(times[1], 0.6), arrive)
        st.reveal([pig], 0.25, "pop")
        st.go(times[1])
        first = st.plate(f"1st: save {money(saved, currency)}", K.GREEN, cx, cy, 4.2, 0.32, "#10261a")
        st.reveal([first], 0.25, "ding")
        st.fly(first, (-4.9, st.floor + pig.height + 0.5), st.room(times[2], 0.9), "swoosh", 1.0)
        check.submobjects = [pay_note(income - saved)]
        st.snd("coin")
        if got:
            st.go(times[2])
            each = st.room(times[3], 1.8) / len(got)
            running = income - saved
            for i, p in enumerate(got):
                running -= p["value"]
                row_y = st.y(0.66) - i * st.C * 0.17
                tag = st.plate(f"{p['name']}  {money(p['value'], currency)}", K.col(p["color"], K.ORANGE), cx, cy, 4.4, 0.27,
                               "#1d2430")
                st.G.add(tag)
                st.fly(tag, (4.5, row_y), max(0.2, each * 0.9), "swoosh", 0.5)
                check.submobjects = [pay_note(max(0.0, running))]
        st.go(times[-1])
        out = st.plate(f"left to spend: {money(max(0.0, left), currency)}", K.GOLD if left >= 0 else K.RED, cx, st.count_y,
                       7.0, 0.36, "#1d2430" if left >= 0 else "#ffffff")
        hero = st.person(who or ("nina", "maya", "omar")[st.v], "standing", st.ph, -0.4)  # where the paycheck was
        st.G.remove(check)
        st.G.add(hero)
        st.reveal([out], 0.4, "ding", 0.4)
        st.anim(st.room(None, 0.6), lambda a: st.change(hero, "standing", "happy" if left >= 0 else "worried", a))
        if note:
            st.G.add(st.note(note, 0, st.top - 1.75 * st.k))
        return left

    # ================================================================== 11 · lifestyle creep
    def lifestyle_creep(incomes, spending, labels=None, when_words=None, currency="$", variant=None, setting=None,
                        note=None, title="Lifestyle creep"):
        try:
            inc = [float(v) for v in incomes][:4]
            sp = [float(v) for v in spending][:len(inc)]
            assert 2 <= len(inc) == len(sp) and min(inc + sp) >= 0 and max(inc + sp) > 0
        except (TypeError, ValueError, AssertionError):
            return bad("lifestyle_creep", "give 2-4 incomes and the same number of spending amounts")
        count = len(inc)
        names = [str(x)[:16] for x in (labels or [])][:count]
        names += [("Start", "Raise 1", "Raise 2", "Raise 3")[i] for i in range(len(names), count)]
        st = Scene(variant, ("street", "plain", "home"), setting, title)
        M, K = st.M, st.K
        step = 12.4 / count
        xs = [-6.2 + step * (i + 0.5) for i in range(count)]
        w, col_h, big = min(1.15, step * 0.34), st.C * 0.62, max(inc + sp)
        legend = M.VGroup(st.plate("income", K.GREEN, -1.4, st.count_y, 2.6, 0.26, "#10261a"),
                          st.plate("spending", K.RED, 1.4, st.count_y, 2.8, 0.26))
        times = st.beats(names + ["result"], when_words)
        st.go(max(0.1, times[0] - 0.3))
        st.G.add(st.note(note or "example amounts per month", 0, st.top - 1.75 * st.k))
        st.reveal([legend], 0.3, "pop")
        gaps = []
        for i in range(count):
            st.go(times[i])
            slot = st.slot()
            name = st.label(names[i], 0.24, "#cfd9ee", xs[i], st.y(0.9), step - 0.2)
            st.G.add(name)
            dur = st.room(times[i + 1], 1.1)
            st.snd("riser")
            st.snd("pop", dur * 0.5)

            def rise(a, i=i, slot=slot, dur=dur):
                q = st.stepped(a, dur)
                group = M.VGroup()
                for value, dx, colour, delay in ((inc[i], -w * 0.56, K.GREEN, 0.0), (sp[i], w * 0.56, K.RED, 0.35)):
                    h = max(0.06, col_h * value / big * _ease(_part(a, delay, delay + 0.6)))
                    group.add(st.column(xs[i] + dx, h, colour, w))
                    group.add(st.label(money(value * _ease(_part(q, delay, delay + 0.6)), currency, like=value), 0.2, K.CREAM,
                                       xs[i] + dx, st.floor + h + 0.24 * st.k, w + 0.04, False))
                slot.submobjects = [group]
            st.anim(dur, rise)
            gap = inc[i] - sp[i]
            tag = st.plate(f"left {money(gap, currency)}", K.GOLD if gap >= 0 else K.RED, xs[i], st.y(0.78), step - 0.15, 0.24,
                           "#1d2430" if gap >= 0 else "#ffffff")
            st.reveal([tag], min(0.3, st.room(times[i + 1], 0.3)), "coin")
            gaps.append(tag)
        st.go(times[-1])
        grew = (inc[-1] - sp[-1]) - (inc[0] - sp[0])
        says = f"earns {money(inc[-1] - inc[0], currency)} more, keeps {money(abs(grew), currency)} {'more' if grew >= 0 else 'less'}"
        st.G.remove(legend)
        st.reveal([st.plate(says, K.GOLD, 0, st.count_y, 10.5, 0.34, "#1d2430")], 0.4, "ding", 0.4)

        def pulse(a):
            for g in gaps:
                g.become(g.copy().scale(1 + 0.025 * math.sin(math.pi * 2 * a)))
        st.anim(st.room(None, 0.6), pulse)
        return grew

    # ================================================================== 12 · fees take a bite
    def fees_bite(amount=10000, rate=0.07, fee=0.01, years=30, low_fee=0.001, monthly=0, when_words=None, currency="$",
                  variant=None, setting=None, note=None, title="What a small fee costs"):
        n = nums("fees_bite", amount=amount, rate=rate, fee=fee, years=years, low_fee=low_fee, monthly=monthly)
        if n is None or (n["amount"] <= 0 and n["monthly"] <= 0) or n["years"] < 1:
            return bad("fees_bite", "amount (or monthly) must be above 0 and years at least 1") if n else 0
        rate = as_rate(n["rate"])
        # fees are small: 1 means 1 %
        f_hi = n["fee"] / 100 if n["fee"] >= 0.1 else n["fee"]
        f_lo = n["low_fee"] / 100 if n["low_fee"] >= 0.1 else n["low_fee"]
        years, amount, m = int(min(80, n["years"])), n["amount"], n["monthly"]
        lo = fee_values(amount, rate, years, f_lo, m)
        hi = fee_values(amount, rate, years, f_hi, m)
        if f_hi <= f_lo or hi >= lo:
            return bad("fees_bite", "fee must be larger than low_fee")
        st = Scene(variant, ("office", "plain", "bank"), setting, title)
        M, K = st.M, st.K
        col_h, w = st.C * 0.72, 2.8
        xs = (-2.5, 2.5)
        t_s, t_g, t_r = st.beats(["start", "grow", "result"], when_words)
        heads = [st.label(f"fee {percent(f_lo) if f_lo >= 0.001 else '0%'}", 0.3, "#9fe0a8", -5.4, st.y(0.35), 2.6),
                 st.label(f"fee {percent(f_hi)}", 0.3, "#ff9a86", 5.4, st.y(0.35), 2.6)]
        cols, year = [st.slot(), st.slot()], st.slot()
        st.go(t_s)
        st.G.add(st.note(note or f"{percent(rate)} a year before fees · {years} years · example", 0, st.top - 1.75 * st.k))
        st.reveal(heads, 0.4, "pop", 0.3)
        st.go(t_g)
        dur = st.room(t_r, max(2.0, t_r - st.S.t))
        st.snd("riser")
        st.ticks(dur, 0.15)

        def grow(a):
            y = years * st.stepped(a, dur)
            year.submobjects = [st.figure(f"Year {y:.0f}", color=K.CREAM, size=0.6)]
            for slot, x, f, colour in ((cols[0], xs[0], f_lo, K.GREEN), (cols[1], xs[1], f_hi, K.ORANGE)):
                value = fee_values(amount, rate, y, f, m)
                h = max(0.06, col_h * value / lo)
                slot.submobjects = [st.column(x, h, colour, w),
                                    st.label(money(value, currency), 0.42, K.CREAM, x, st.floor + h + 0.34 * st.k, 3.6, True)]
        st.anim(dur, grow)
        st.go(t_r)
        h_lo, h_hi = col_h, col_h * hi / lo
        lost = lo - hi
        # the second column's figure moves inside it, the missing part lights up above it
        cols[1].submobjects = [st.column(xs[1], h_hi, K.ORANGE, w),
                               st.label(money(hi, currency), 0.42, "#1d2430", xs[1], st.floor + h_hi - 0.36 * st.k, w - 0.2, True)]
        missing = max(0.3, h_lo - h_hi - 0.08)
        gap = st.box(w, missing, K.RED, 0.12, 0.28).set_stroke(K.RED, 5).move_to([xs[1], st.floor + h_hi + 0.08 + missing / 2, 0])
        took = st.label(f"-{money(lost, currency)}", min(0.36, missing * 0.5), K.CREAM, xs[1], gap.get_center()[1], w - 0.3, True)
        st.snd("crack")
        st.reveal([gap, took], 0.45, "thud")
        st.G.remove(year)
        st.reveal([st.plate(f"the fee took {money(lost, currency)} ({percent(lost / lo)})", K.RED, 0, st.count_y, 10, 0.36)],
                  st.room(None, 0.5), "ding", 0.4)
        return lost

    # ================================================================== 13 · snowball vs avalanche
    def snowball_vs_avalanche(debts=None, extra=200, when_words=None, currency="$", variant=None, setting=None, note=None,
                              title="Which debt first?"):
        try:
            ds = [(str(d[0])[:12], float(d[1]), as_rate(d[2]), float(d[3]))
                  for d in (debts or [("Card", 4000, 24, 100), ("Car", 7000, 7, 160), ("Loan", 1500, 12, 50)])][:4]
            ex = float(extra)
            assert len(ds) >= 2 and all(d[1] > 0 and d[3] > 0 for d in ds) and ex >= 0
        except (TypeError, ValueError, IndexError, AssertionError):
            return bad("snowball_vs_avalanche", 'debts are 2-4 of ("Card", balance, yearly rate, minimum payment)')
        runs = [payoff_race(ds, ex, o) for o in ("snowball", "avalanche")]
        if any(r["months"] is None for r in runs):
            return bad("snowball_vs_avalanche", "with these payments the debts are never paid off — raise the payments")
        st = Scene(variant, ("plain", "night", "office"), setting, title)
        M, K = st.M, st.K
        biggest = max(d[1] for d in ds)
        colours = [K.RED, K.ORANGE, K.PURPLE, K.PINK]
        heads = ["Snowball: smallest first", "Avalanche: highest rate first"]
        t_d, t_s, t_a, t_r = st.beats(["debts", "snowball", "avalanche", "result"], when_words)
        panels = [st.slot(), st.slot()]
        rows = lambda i: st.y(0.64) - i * st.C * 0.125  # noqa: E731

        def panel(side: int, month: int):
            cx = -3.4 if side == 0 else 3.4
            bal = runs[side]["history"][min(month, len(runs[side]["history"]) - 1)]
            g = M.VGroup()
            for i, d in enumerate(ds):
                g.add(st.label(d[0], 0.2, K.CREAM, cx - 2.35, rows(i), 1.3))
                g.add(st.box(4.0, 0.3 * st.k, "#ffffff", 0.1, 0.08).move_to([cx + 0.55, rows(i), 0]))
                if bal[i] > 0.5:
                    wid = 4.0 * bal[i] / biggest
                    g.add(st.box(wid, 0.3 * st.k, colours[i], 0.1).move_to([cx - 1.45 + wid / 2, rows(i), 0]))
                else:
                    g.add(st.label("paid", 0.2, "#8be08f", cx - 0.95, rows(i), 1.4))
            panels[side].submobjects = [g]
        divider = M.Line([0, st.floor + 0.1, 0], [0, st.y(0.86), 0], color="#8fa3c4", stroke_width=3, stroke_opacity=0.5)
        titles = [st.label(h, 0.27, K.GOLD, -3.4 if i == 0 else 3.4, st.y(0.82), 6.0) for i, h in enumerate(heads)]
        st.go(t_d)
        st.G.add(st.note(note or f"minimums plus {money(ex, currency)} extra a month · example", 0, st.top - 1.75 * st.k))
        st.G.add(divider)
        for side in (0, 1):
            panel(side, 0)
        f = [st.fader(p) for p in panels]
        st.snd("swoosh")
        st.anim(st.room(t_s, 0.6), lambda a: [x(_ease(a)) for x in f])
        month = st.slot()
        for side, t, nxt in ((0, t_s, t_a), (1, t_a, t_r)):
            st.go(t)
            st.reveal([titles[side]], 0.25, "pop")
            dur = st.room(nxt, max(1.4, nxt - st.S.t))
            st.snd("riser")
            st.ticks(dur, 0.15)

            def pay(a, side=side, dur=dur):
                m = round(runs[side]["months"] * st.stepped(a, dur))
                panel(side, m)
                month.submobjects = [st.figure(f"Month {m}", color=K.CREAM, size=0.55)]
            st.anim(dur, pay)
            done = st.plate(f"{duration_words(runs[side]['months'])} · interest {money(runs[side]['interest'], currency)}",
                            "#141b2b", -3.4 if side == 0 else 3.4, st.floor + 0.4 * st.k, 6.2, 0.24)
            st.reveal([done], 0.2, "coin")
        st.go(t_r)
        a, b = runs[0]["interest"], runs[1]["interest"]
        diff = abs(a - b)
        if diff < 1:
            says = "both cost about the same"
        else:
            says = f"{'Avalanche' if b < a else 'Snowball'} saves {money(diff, currency)} in interest"
        st.G.remove(month)
        glow = st.box(6.5, st.C * 0.92, K.GOLD, 0.3, 0.0).set_stroke(K.GOLD, 5)
        glow.move_to([3.4 if b < a else -3.4, st.y(0.45), 0])
        st.snd("ding")
        st.reveal([st.plate(says, K.GOLD, 0, st.count_y, 10, 0.36, "#1d2430")] + ([glow] if diff >= 1 else []),
                  st.room(None, 0.5), "thud", 0.3)
        return diff

    # ================================================================== 14 · tax brackets
    def tax_brackets(income, brackets=None, when_words=None, currency="$", variant=None, setting=None, note=None,
                     title="How tax brackets work"):
        official = bool(brackets)
        try:
            inc = float(income)
            br = [(None if u is None else float(u), as_rate(r)) for u, r in (brackets or EXAMPLE_BRACKETS)]
            assert inc > 0 and br and all(a[0] is not None and a[0] > 0 for a in br[:-1])
        except (TypeError, ValueError, AssertionError):
            return bad("tax_brackets", "give income above 0 and brackets like [(10000, 10), (40000, 12), (None, 22)]")
        rows = bracket_tax(inc, br)
        used = [r for r in rows if r["taxed"] > 0][:5]
        if sum(r["taxed"] for r in used) < inc - 1:
            S.warnings.append("tax_brackets(): the brackets do not cover all of the income — end with (None, rate)")
        total = sum(r["tax"] for r in rows)
        st = Scene(variant, ("bank", "plain", "office"), setting, title)
        M, K = st.M, st.K
        count = len(used)
        step = min(3.2, 12.4 / count)
        xs = [(-(count - 1) / 2 + i) * step for i in range(count)]
        w, h = min(2.3, step - 0.35), st.C * 0.56
        colours = [K.GREEN, K.TEAL, K.GOLD, K.ORANGE, K.RED]
        names = [percent(r["rate"]) for r in used]
        times = st.beats(["income"] + names + ["result"], when_words)
        counter = st.slot()
        st.go(times[0])
        foot = (note or "check the current official rates") if official else "Example brackets, not official rates"
        st.G.add(st.note(foot, 0, st.top - 1.75 * st.k))
        st.reveal([st.figure(f"income {money(inc, currency)}", color=K.CREAM, size=0.55)], 0.35, "pop", 0.3)
        head = st.G.submobjects[-1]
        buckets = [st.box(w, h, "#ffffff", 0.2, 0.05).set_stroke("#e8eefc", 4, 0.5).move_to([x, st.floor + h / 2, 0]) for x in xs]
        st.reveal(buckets, min(0.35, st.room(times[1], 0.35)), "swoosh")
        running = 0.0
        for i, r in enumerate(used):
            st.go(times[i + 1])
            cap = (r["to"] - r["from"]) if r["to"] is not None else r["taxed"]
            level = (h - 0.16) * min(1.0, r["taxed"] / max(1.0, cap))
            span = (f"{money(r['from'], currency)}–{money(r['to'], currency)}" if r["to"] is not None
                    else f"over {money(r['from'], currency)}")
            water = st.slot()
            tags = M.VGroup(st.label(names[i], 0.42, colours[i % 5], xs[i], st.floor + h + 0.34 * st.k, step - 0.15, True),
                            st.label(span, 0.18, "#cfd9ee", xs[i], st.floor + h + 0.76 * st.k, step - 0.45))
            tax = st.slot()
            st.G.add(tags)
            fn = st.fader(tags)
            if i == 0:
                st.G.remove(head)
            dur = st.room(times[i + 2], 1.0)
            st.snd("swoosh_down")
            st.snd("coin", dur * 0.6)
            before = running

            def pour(a, i=i, r=r, level=level, water=water, tax=tax, fn=fn, before=before, dur=dur):
                fn(_ease(a * 3))
                water.submobjects = [st.column(xs[i], level * _ease(a), colours[i % 5], w - 0.16, st.floor + 0.08, 0.14)]
                q = _ease(st.stepped(a, dur))
                counter.submobjects = [st.figure(f"tax {money(before + r['tax'] * q, currency)}")]
                t = st.text(money(r["tax"] * q, currency, like=r["tax"]), 0.34, "#ffffff", max_width=w - 0.2)
                tax.submobjects = [M.VGroup(st.box(t.width + 0.3, t.height + 0.24, "#141b2b", 0.12, 0.85), t)
                                   .move_to([xs[i], st.floor + 0.42 * st.k, 0])]
                tax.submobjects[0][1].move_to(tax.submobjects[0][0])
            st.anim(dur, pour)
            running += r["tax"]
        st.go(times[-1])
        st.G.remove(counter)
        st.reveal([st.plate(f"tax {money(total, currency)} = {percent(total / inc)} of income", K.GOLD, 0, st.count_y, 10.5,
                            0.36, "#1d2430")], st.room(None, 0.5), "ding", 0.4)
        return total

    # ================================================================== 15 · net worth
    def net_worth(assets, debts=None, when_words=None, currency="$", variant=None, setting=None, note=None,
                  title="Net worth"):
        own, owe = read_items(assets)[:4], read_items(debts or [])[:4]
        if not own and not owe:
            return bad("net_worth", 'give assets like [("Savings", 5000)] and debts like [("Loan", 3000)]')
        a_sum, d_sum = sum(p["value"] for p in own), sum(p["value"] for p in owe)
        worth = a_sum - d_sum
        st = Scene(variant, ("plain", "bank", "home"), setting, title)
        M, K = st.M, st.K
        arm, pivot_y = 3.6, st.y(0.6)
        hang = st.C * 0.4
        items = [[], []]
        scale_slot = st.slot()
        stacks = [st.slot(), st.slot()]
        biggest = max(a_sum, d_sum, 1.0)

        def draw(angle: float):
            g = M.VGroup(M.Polygon(np_point(-0.8, st.floor), np_point(0.8, st.floor), np_point(0.12, pivot_y),
                                   np_point(-0.12, pivot_y), fill_color="#b99a55", fill_opacity=1, stroke_width=0))
            for side, sign in ((0, -1), (1, 1)):
                ex, ey = sign * arm * math.cos(angle), pivot_y + sign * arm * math.sin(angle)
                pan_y = ey - hang
                g.add(st.line([(ex, ey), (ex - 1.5, pan_y)], "#b99a55", 3), st.line([(ex, ey), (ex + 1.5, pan_y)], "#b99a55", 3))
                g.add(st.box(3.5, 0.16, "#d7b866", 0.07).move_to([ex, pan_y, 0]))
                y = pan_y + 0.1
                for card in items[side]:
                    card.move_to([ex, y + card.height / 2, 0])
                    y += card.height + 0.05
                stacks[side].submobjects = list(items[side])
            g.add(st.line([(-arm * math.cos(angle), pivot_y - arm * math.sin(angle)),
                           (arm * math.cos(angle), pivot_y + arm * math.sin(angle))], "#e8c978", 12),
                  st.dot(0.24, "#e8c978").move_to([0, pivot_y, 0]))
            scale_slot.submobjects = [g]
        angle_for = lambda a, d: max(-0.2, min(0.2, (a - d) / biggest * 0.24))  # noqa: E731 — the heavier side sinks
        t_a, t_d, t_r = st.beats(["assets", "debts", "result"], when_words)
        heads = [st.label("you own", 0.28, "#9fe0a8", -5.4, st.y(0.93), 2.6),
                 st.label("you owe", 0.28, "#ff9a86", 5.4, st.y(0.93), 2.6)]
        counter = st.slot()
        st.go(max(0.1, t_a - 0.5))
        draw(0.0)
        base = st.fader(scale_slot)
        st.anim(0.4, lambda a: base(_ease(a)))
        have, owed = 0.0, 0.0
        card_size = 0.21 if max(len(own), len(owe)) > 2 else 0.25
        for side, group, t, nxt, colour in ((0, own, t_a, t_d, K.GREEN), (1, owe, t_d, t_r, K.RED)):
            st.go(t)
            st.G.add(heads[side])
            each = st.room(nxt, 1.8) / max(1, len(group))
            for p in group:
                card = st.plate(f"{p['name']}  {money(p['value'], currency)}", K.col(p["color"], colour), 0, 0, 3.4, card_size,
                                "#10261a" if side == 0 else "#ffffff")
                before = angle_for(have, owed)
                if side == 0:
                    have += p["value"]
                else:
                    owed += p["value"]
                after = angle_for(have, owed)
                items[side].append(card)
                st.snd("thud", 0.1)
                total_now = have if side == 0 else owed

                def drop(a, before=before, after=after, total_now=total_now, side=side):
                    draw(before + (after - before) * _back(a))
                    counter.submobjects = [st.figure(("own " if side == 0 else "owe ") + money(total_now, currency),
                                                     color="#9fe0a8" if side == 0 else "#ff9a86", size=0.55)]
                st.anim(max(0.2, each), drop)
        st.go(t_r)
        st.G.remove(counter)
        st.reveal([st.plate(f"net worth {money(worth, currency)}", K.GOLD if worth >= 0 else K.RED, 0, st.count_y, 9, 0.44,
                            "#1d2430" if worth >= 0 else "#ffffff")], st.room(None, 0.5), "ding", 0.4)
        if note:
            st.G.add(st.note(note, 0, st.top - 1.75 * st.k))
        return worth

    # ================================================================== 16 · dollar cost averaging
    def dollar_cost_averaging(amount=100, prices=None, labels=None, unit="shares", when_words=None, currency="$",
                              variant=None, setting=None, note=None, title="Same amount, every time"):
        real = bool(prices)
        try:
            amt = float(amount)
            ps = [float(p) for p in (prices or EXAMPLE_PRICES)][:6]
            assert amt > 0 and len(ps) >= 3 and min(ps) > 0
        except (TypeError, ValueError, AssertionError):
            return bad("dollar_cost_averaging", "give an amount above 0 and 3-6 prices")
        got = buy_over_time(amt, ps)
        count = len(ps)
        names = [str(x)[:10] for x in (labels or [])][:count]
        names += [f"Month {i + 1}" for i in range(len(names), count)]
        st = Scene(variant, ("office", "plain", "night"), setting, title)
        M, K = st.M, st.K
        step = 12.0 / count
        xs = [-6.0 + step * (i + 0.5) for i in range(count)]
        py = lambda p: st.y(0.54) + st.C * 0.2 * (p - min(ps)) / max(1e-9, max(ps) - min(ps))  # noqa: E731
        col_h, most = st.C * 0.28, max(got["units"])
        t_in, t_low, t_res = st.beats(["invest", "low", "result"], when_words)
        line, counter = st.slot(), st.slot()
        st.go(t_in)
        st.G.add(st.note(("Illustrative prices" if not real else (note or "prices as given")) + f" · {money(amt, currency)} each time",
                         0, st.top - 1.75 * st.k))
        span = max(1.6, t_res - st.S.t - 0.2)
        each = span / count
        low = ps.index(min(ps))
        for i in range(count):
            slot = st.slot()
            dot = st.dot(0.13, K.ORANGE).move_to([xs[i], py(ps[i]), 0])
            tag = st.label(money(ps[i], currency), 0.24, "#ffd0a8", xs[i], py(ps[i]) + 0.32 * st.k, step - 0.15)
            name = st.label(names[i], 0.18, "#cfd9ee", xs[i], st.floor + 0.2 * st.k, step - 0.15)
            st.G.add(dot, tag, name)
            fades = [st.fader(x) for x in (dot, tag, name)]
            h = max(0.15, col_h * got["units"][i] / most)
            st.snd("coin", each * 0.4)

            def buy(a, i=i, slot=slot, h=h, fades=fades, dur=each):
                for f in fades:
                    f(_ease(a * 2.5))
                line.submobjects = [st.line(along([(xs[k], py(ps[k])) for k in range(i + 1)],
                                                  1.0 if i == 0 else (i - 1 + _ease(a)) / i), K.ORANGE, 6)] if i else []
                e = _ease(_part(a, 0.25, 1))
                colour = K.GREEN if i == low else K.GOLD
                hh = max(0.04, h * e)
                slot.submobjects = [st.column(xs[i], hh, colour, min(1.2, step * 0.55), st.floor + 0.42 * st.k),
                                    st.label(f"{got['units'][i] * e:.1f}", 0.26, K.CREAM, xs[i],
                                             st.floor + 0.42 * st.k + hh + 0.24 * st.k, step - 0.15, True)]
                counter.submobjects = [st.figure(f"invested {money(amt * (i + 1), currency)}", color=K.CREAM, size=0.5)]
            st.anim(max(0.25, min(each, st.S.total - st.S.t - 1.0)), buy)
        st.go(t_low)
        st.G.remove(counter)
        hint = st.plate(f"low price buys the most {unit}", K.GREEN, 0, st.count_y, 8, 0.34, "#10261a")
        st.reveal([hint], 0.35, "ding", 0.3)
        st.go(t_res)
        st.G.remove(hint)
        out = st.plate(f"your average cost {money(got['avg_cost'], currency)} · average price {money(got['avg_price'], currency)}",
                       K.GOLD, 0, st.count_y, 11.5, 0.32, "#1d2430")
        st.reveal([out], st.room(None, 0.5), "thud", 0.4)
        return got["avg_cost"]

    return {n: f for n, f in locals().items() if n in NAMES}


# ================================================================== what the AI is told
GUIDE = r'''  debt_trap(debt=5000, rate=24, payment=125)      steps: debt, interest, payment, result
      interest drops onto a debt column faster or slower than the payments remove it (rate = yearly %, payment monthly).
  budget_split(3000, [("Needs", 50), ("Wants", 30), ("Savings", 20)])      steps: income, <each part name>
      the pay is poured into 2-4 jars.
  emergency_fund(expenses=1500, save=300, cover=6, bill=2000)      steps: save, goal, bill
      a cushion fills month by month, then a surprise bill falls on it (leave bill out if the story has none).
  diversify(amount=10000, drop=60, spread=4, names=["Tech", "Property", "Bonds", "Gold"])      steps: one, many, crash, result
      one basket against several; a crash hits one holding.
  rule_of_72(rate=8, start=1000, doublings=3)      steps: rule, double, result
      72 ÷ rate = years to double; the columns double.
  gross_vs_net(4000, [("Tax", 0.18), ("Insurance", 0.05)])      steps: gross, <each deduction name>, net
      deductions are sliced off a paycheck (shares 0.18 or amounts).
  credit_score(start=620, events=[("Pays on time", 40), ("Missed payment", -70)])      steps: start, <each event name>, result
      a meter needle moves with each habit.
  index_vs_stock(stock=None, index=None, amount=None)      steps: stock, index, crash, result
      two price lines. Give stock=[..], index=[..] ONLY with real prices from a source; else it is drawn as an illustration.
  start_early(monthly=200, rate=7, early_age=25, late_age=35, end_age=65)      steps: early, late, grow, result
  pay_yourself_first(3000, save=0.2, bills=[("Rent", 1200), ("Food", 500)])      steps: pay, save, bills, result
      save = a share (0.2 = 20%) or an amount (600).
  lifestyle_creep([3000, 4000, 5500], [2800, 3750, 5200], labels=["Start", "Raise", "Promotion"])
      steps: <each label>, result.      income and spending columns rise together.
  fees_bite(amount=10000, rate=7, fee=1, low_fee=0.1, years=30)      steps: start, grow, result      (fees in %)
  snowball_vs_avalanche([("Card", 4000, 24, 100), ("Car", 7000, 7, 160)], extra=200)      steps: debts, snowball, avalanche, result
      each debt: (name, balance, yearly %, minimum payment).
  tax_brackets(60000, [(11000, 10), (45000, 12), (None, 22)])      steps: income, <each rate like "10%">, result
      brackets = (upper limit, %), the last limit None. Use official figures from a source, or leave brackets out
      (the screen then says they are an example).
  net_worth([("Savings", 8000), ("Car", 12000)], [("Car loan", 9000)])      steps: assets, debts, result
  dollar_cost_averaging(amount=100, prices=None, unit="shares")      steps: invest, low, result
      the same amount buys more when the price is low. prices=[..] only when real; else they are marked illustrative.

'''
