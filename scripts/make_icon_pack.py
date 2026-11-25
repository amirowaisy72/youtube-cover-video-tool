"""Builds backend/data/icons.json — the Visual Explainer's extra drawn things.

Source: Microsoft "Fluent Emoji" Flat style, MIT licence (free for commercial use), taken from the
npm package @iconify-json/fluent-emoji-flat (download its .tgz from registry.npmjs.org, unpack it):

    python scripts/make_icon_pack.py path/to/package/icons.json

Only the hand-picked names below are copied; each gets the simple name scene code uses.
"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "backend" / "data" / "icons.json"

# category -> "simple_name=icon-name" (or just a name when both are the same)
PICK = {
    "money": """dollar_note=dollar-banknote euro_note=euro-banknote pound_note=pound-banknote yen_note=yen-banknote
        flying_money=money-with-wings cash_sack=money-bag gold_coin=coin dollar_sign=heavy-dollar-sign bank_card=credit-card
        receipt shopping_cart=shopping-cart shopping_bags=shopping-bags gift=wrapped-gift price_label=label
        gem=gem-stone crown ring ticket=admission-tickets abacus ledger chart_up=chart-increasing
        chart_down=chart-decreasing bars=bar-chart yen_chart=chart-increasing-with-yen slot_machine=slot-machine dice=game-die
        crystal_ball=crystal-ball magnet balance_scales=balance-scale card_index=card-index""",
    "places": """bank_building=classical-building office_block=office-building store_front=convenience-store
        department_store=department-store village_houses=houses garden_house=house-with-garden old_house=derelict-house
        hospital school hotel post_office=post-office construction=building-construction place_of_worship=place-of-worship
        city_night=night-with-stars sunrise_city=sunrise-over-mountains mountain snow_mountain=snow-capped-mountain volcano
        beach=beach-with-umbrella""",
    "transport": """taxi bus school_bus=oncoming-bus police_car=police-car fire_truck=fire-engine delivery_truck=delivery-truck
        big_truck=articulated-lorry pickup=pickup-truck racing_car=racing-car minibus tram=tram-car train_front=high-speed-train
        bullet_train=bullet-train bicycle airliner=airplane small_plane=small-airplane takeoff=airplane-departure
        cruise_ship=passenger-ship canoe satellite fuel_pump=fuel-pump anchor""",
    "work": """briefcase luggage backpack toolbox hammer wrench tools=hammer-and-wrench saw=carpentry-saw clamp ladder brick
        wood rock broom soap clipboard memo notebook closed_book=closed-book open_book=open-book books green_book=green-book
        file_folder=file-folder open_folder=open-file-folder file_cabinet=file-cabinet card_box=card-file-box
        newspaper envelope email=e-mail sent_mail=envelope-with-arrow inbox=inbox-tray outbox=outbox-tray mailbox=postbox
        parcel_box=package pen pencil fountain_pen=fountain-pen paintbrush scissors clips=linked-paperclips
        pushpin pin=round-pushpin id_card=identification-card ballot_box=ballot-box-with-ballot printer
        wastebasket tear_calendar=tear-off-calendar spiral_calendar=spiral-calendar bookmark""",
    "tech": """app_phone=mobile-phone phone_call=telephone-receiver old_phone=telephone desktop=desktop-computer keyboard
        computer_mouse=computer-mouse floppy_disk=floppy-disk cd_disc=optical-disk photo_camera=camera film_camera=movie-camera retro_tv=television
        radio microphone_stand=studio-microphone music_headphones=headphone speaker=speaker-high-volume mute=muted-speaker
        megaphone loudspeaker bell battery low_battery=low-battery plug=electric-plug bulb=light-bulb flashlight robot
        microscope telescope test_tube=test-tube dna atom=atom-symbol satellite_dish=satellite-antenna signal=antenna-bars
        video_game=video-game""",
    "time_and_signs": """alarm_clock=alarm-clock stopwatch timer=timer-clock wrist_watch=watch sand_timer=hourglass-not-done
        time_up=hourglass-done wall_clock=mantelpiece-clock check=check-mark checked=check-box-with-check cross=cross-mark
        warning stop_sign=prohibited question=red-question-mark exclamation=red-exclamation-mark up=up-arrow
        down=down-arrow left=left-arrow right=right-arrow up_right=up-right-arrow down_right=down-right-arrow
        cycle=clockwise-vertical-arrows target=bullseye flag=triangular-flag finish_flag=chequered-flag
        speech_bubble=speech-balloon thought_bubble=thought-balloon placard
        danger=skull-and-crossbones radioactive voltage=high-voltage""",
    "safety_and_health": """locked unlocked secure=locked-with-key private=locked-with-pen vintage_key=old-key door_key=key
        shield_badge=shield umbrella rain_umbrella=umbrella-with-rain-drops lifebuoy=ring-buoy
        fire_extinguisher=fire-extinguisher pill syringe stethoscope tooth heart=red-heart broken_heart=broken-heart
        healing_heart=mending-heart growing_heart=growing-heart anatomy_heart=anatomical-heart brain eyes
        muscle=flexed-biceps wheelchair=manual-wheelchair""",
    "feelings_and_events": """thumbs_up=thumbs-up thumbs_down=thumbs-down handshake clapping=clapping-hands
        crossed_fingers=crossed-fingers party=party-popper balloon fireworks firecracker
        trophy_cup=trophy gold_medal=1st-place-medal silver_medal=2nd-place-medal bronze_medal=3rd-place-medal
        medal=sports-medal sparkle_star=glowing-star shooting_star=shooting-star puzzle=puzzle-piece magic_wand=magic-wand
        bomb ghost skull boxing_glove=boxing-glove goal_flag=flag-in-hole""",
    "home_and_daily": """sofa=couch-and-lamp bed chair door window toilet shower bathtub candle diya=diya-lamp
        basket_item=basket lotion=lotion-bottle toothbrush teddy=teddy-bear baby_bottle=baby-bottle t_shirt=t-shirt
        dress shoe=mans-shoe sneaker=running-shoe heel=high-heeled-shoe handbag purse=clutch-bag glasses sunglasses
        top_hat=top-hat scarf kite=carp-streamer""",
    "food": """bread baguette=baguette-bread croissant pancakes burger=hamburger pizza hot_dog=hot-dog sandwich=stuffed-flatbread
        rice=cooked-rice noodles=steaming-bowl takeaway=takeout-box canned_food=canned-food salt cake=birthday-cake
        cupcake candy chocolate=chocolate-bar cookie ice_cream=ice-cream coffee=teacup-without-handle
        drink=cup-with-straw milk=glass-of-milk juice_box=beverage-box beer=beer-mug cheers=clinking-glasses wine=wine-glass
        apple=red-apple green_apple=green-apple carrot watermelon pineapple eggplant pepper=bell-pepper
        lettuce=leafy-green cutlery=fork-and-knife plate=fork-and-knife-with-plate spoon""",
    "nature_and_weather": """seedling potted_plant=potted-plant herb clover=four-leaf-clover sunflower pine=evergreen-tree
        leafy_tree=deciduous-tree palm=palm-tree maple_leaf=maple-leaf falling_leaf=fallen-leaf wind_leaf=leaf-fluttering-in-wind
        rice_plant=sheaf-of-rice sunshine=sun rain=cloud-with-rain storm=cloud-with-lightning-and-rain
        lightning=cloud-with-lightning snow=cloud-with-snow cloudy=sun-behind-cloud rainbow snowflake snowman
        flame=fire water_drop=droplet wave=water-wave sunset sunrise earth_americas=globe-showing-americas
        earth_europe=globe-showing-europe-africa earth_asia=globe-showing-asia-australia world_map=world-map compass
        ringed_planet=ringed-planet oil_drum=oil-drum ice""",
    "animals": """bull=water-buffalo bear fox pig cow chicken chick=hatching-chick rooster=turkey sheep=ewe goat horse
        dog cat rabbit turtle snail sloth ant bee=honeybee butterfly ladybird=lady-beetle fish whale=spouting-whale shark
        eagle owl duck penguin frog snake dragon unicorn lion elephant monkey mouse_trap=mouse-trap""",
    "sport_and_play": """soccer_ball=soccer-ball basketball baseball volleyball american_football=american-football
        bowling billiard=pool-8-ball guitar music_note=musical-notes art_palette=artist-palette clapper=clapper-board
        theatre=performing-arts film=film-frames carousel=carousel-horse fishing=fishing-pole""",
}


def main(source: str) -> None:
    data = json.loads(Path(source).read_text(encoding="utf-8"))
    icons, aliases = data["icons"], data.get("aliases", {})
    out, missing, seen = {}, [], set()
    for category, words in PICK.items():
        for item in words.split():
            name, _, icon = item.partition("=")
            icon = icon or name.replace("_", "-")
            if name in seen:
                continue
            hit = icons.get(icon) or icons.get((aliases.get(icon) or {}).get("parent", ""))
            if not hit or any(x in hit["body"] for x in ("<mask", "<clipPath", "Gradient", "<filter")):
                missing.append(item)
                continue
            seen.add(name)
            out[name] = {"cat": category, "body": hit["body"], "w": hit.get("width", data.get("width", 32)),
                         "h": hit.get("height", data.get("height", 32))}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"source": "Microsoft Fluent Emoji (Flat), MIT licence", "icons": out},
                              separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(len(out), "icons ->", OUT, f"({OUT.stat().st_size // 1024} KB)")
    if missing:
        print("not copied:", " ".join(missing))


if __name__ == "__main__":
    main(sys.argv[1])
