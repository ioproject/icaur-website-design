#!/usr/bin/env python3
"""
Generates optimized images and videos in src/assets/ from the raw material in mater/.
macOS only (uses `sips` and tools/video.swift); no external dependencies.

    python3 tools/media.py            # process everything that's missing
    python3 tools/media.py --force    # regenerate everything

Images: responsive JPEG (q70) at the widths listed -> <name>-<w>.jpg
        (WebP/AVIF need cwebp/avifenc: swap the encoder here when available).
Videos: H.264, no audio, + poster JPEG -> <name>.mp4 / <name>-poster.jpg
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT, "mater", "linee guida")
PKG = os.path.join(M, "Website package", "V27")
OUT = os.path.join(ROOT, "src", "assets")
FORCE = "--force" in sys.argv
VIDEO_BIN = os.path.join(ROOT, "tools", ".bin", "video")

# (source, output name without extension, widths)
IMAGES = [
    # Home
    (f"{PKG}/HOME PAGE/PAGE1/PAGE 1-1/压缩小图 iCAUR双车KV.jpg", "img/home/kv-duo", [768, 1280, 1920, 2560]),
    (f"{PKG}/Side Navigation/PAGE 2 V27.jpg", "img/home/v27-card", [768, 1280, 1920]),
    (f"{PKG}/HOME PAGE/PAGE 5-1.jpg", "img/home/innovation-awd", [768, 1280, 1920]),
    (f"{PKG}/HOME PAGE/PAGE 5-2.jpg", "img/home/innovation-reev", [768, 1280, 1920]),
    (f"{PKG}/HOME PAGE/PAGE 5-3.jpg", "img/home/innovation-safety", [768, 1280, 1920]),
    (f"{PKG}/HOME PAGE/PAGE 6-1.jpg", "img/home/life", [768, 1280, 1920]),
    (f"{PKG}/HOME PAGE/PAGE 6-2.jpg", "img/home/contact", [768, 1280, 1920]),
    (f"{PKG}/V27 MODEL/Crop For the Entrance Reception_V27 Launching KV01-Golden Glowing Circle KV01-v2.png", "img/home/news-1", [640, 1024]),
    (f"{PKG}/ABOUT iCAUR/PAGE 2.jpg", "img/home/news-2", [640, 1024]),
    (f"{PKG}/iCAUR LIFE/PAGE 6.jpeg", "img/home/news-3", [640, 1024]),
]

# V27 page
EXT, INT, PERF = f"{PKG}/V27 MODEL/外观Exterior", f"{PKG}/V27 MODEL/内饰Interior", f"{PKG}/V27 MODEL/驾控Performance"
COLORS = f"{PKG}/V27 MODEL/V27车色美图-横竖2版-完稿Color Visuals/小图 Thumbnail"
L, M = [800, 1440, 2048], [800, 1440]
IMAGES += [
    # studio views for the scroll-driven turn (same framing on every shot)
    (f"{EXT}/W01-iCAR_V27_车头-输出.jpg", "img/v27/turn-front", L),
    (f"{EXT}/W04-iCAR_V27_左前45-输出.jpg", "img/v27/turn-front45", L),
    (f"{EXT}/W03-iCAR_V27_正侧-输出.jpg", "img/v27/turn-side", L),
    (f"{EXT}/W05-iCAR_V27_左后45-输出.jpg", "img/v27/turn-rear45", L),
    (f"{EXT}/W02-iCAR_V27_车尾-输出.jpg", "img/v27/turn-rear", L),
    (f"{EXT}/W08-iCAR_V27_正顶（有顶）-输出.jpg", "img/v27/turn-top", L),
    # exterior details
    (f"{EXT}/W11-iCAR_V27_角雷达-输出.jpg", "img/v27/detail-light", M),
    (f"{EXT}/W14-iCAR_V27_轮毂-输出.jpg", "img/v27/detail-wheel", M),
    (f"{EXT}/W13-iCAR_V27_脚踏-输出.jpg", "img/v27/detail-steps", M),
    # interior
    (f"{INT}/N01-icar_V27_正前-输出-改iCAUR logo.jpg", "img/v27/int-cockpit", L),
    (f"{INT}/N03-2-icar_V27_正侧_透车-输出.jpg", "img/v27/int-cabin", M),
    (f"{INT}/N06-iCAR_V27_后排座椅-输出.jpg", "img/v27/int-rear", M),
    (f"{INT}/N04-icar_V27_后备箱座椅放倒-输出.jpg", "img/v27/int-flat", M),
    (f"{INT}/N14-icar_V27_主驾座椅-输出.jpg", "img/v27/int-seat", M),
    (f"{INT}/N09-iCAR_V27_音响-输出 (2).jpg", "img/v27/int-audio", M),
    (f"{INT}/P14-香氛图.jpg", "img/v27/int-perfume", M),
    (f"{INT}/iCAUR INTL_V27 REV_cam033.jpg", "img/v27/int-console", M),
    (f"{PERF}/iCAUR INTL_V27 REV_cam030.jpg", "img/v27/int-trunk", M),
    # performance, outdoor
    (f"{PERF}/Cam 015冲沙_OL_H1014.jpg", "img/v27/out-dune", L),
    (f"{PERF}/Cam 003_8k_OL.jpg", "img/v27/out-canyon", L),
    (f"{PERF}/Cam 005 B6_OL.jpg", "img/v27/out-front", L),
    (f"{PERF}/Cam 009 B3_OL.jpg", "img/v27/out-rear", L),
    (f"{PERF}/Cam-004-OL.jpg", "img/v27/out-rocks", L),
    (f"{PERF}/Cam-016-F-OL.jpg", "img/v27/out-valley", L),
    (f"{PERF}/KV20-iCAR-V27高-户外草地-输出.jpg", "img/v27/out-meadow", L),
    # technology & safety illustrations
    (f"{PERF}/REEV.PNG", "img/v27/tech-reev", M),
    (f"{PERF}/safety.PNG", "img/v27/tech-cage", M),
    (f"{PERF}/RCTA.png", "img/v27/adas-rcta", M),
    (f"{PERF}/Automatic Parking（APA）.png", "img/v27/adas-apa", M),
    (f"{PERF}/L2 Active Safety.png", "img/v27/adas-active", M),
]
# body colours (file names contain full-width characters: matched by English prefix)
for prefix, slug in [("Desert Bronze", "desert-bronze"), ("Moonstone White", "moonstone-white"), ("Deep Emerald", "deep-emerald"),
                     ("Obsidian Black", "obsidian-black"), ("Glacier Silver", "glacier-silver"), ("Auric Gold", "auric-gold"), ("Basalt Grey", "basalt-grey")]:
    match = [f for f in os.listdir(COLORS) if f.startswith(prefix)] if os.path.isdir(COLORS) else []
    if match:
        IMAGES.append((os.path.join(COLORS, match[0]), f"img/v27/color-{slug}", L))

# Vertical (9:16) colour visual for the tall tile of the mega menu
VERTICAL = f"{PKG}/V27 MODEL/V27车色美图-横竖2版-完稿Color Visuals/竖版 Vertical"
_v = [f for f in os.listdir(VERTICAL) if f.startswith("Desert Bronze") and f.endswith(".jpg")] if os.path.isdir(VERTICAL) else []
if _v:
    IMAGES.append((os.path.join(VERTICAL, _v[0]), "img/menu/v27-vertical", [600, 1000]))

# About us (+ part of iCAUR Life). Life photos/video showing the V23 are deliberately not used.
ABOUT, LIFE = f"{PKG}/ABOUT iCAUR", f"{PKG}/iCAUR LIFE"
IMAGES += [
    (f"{ABOUT}/PAGE 2.jpg", "img/about/hero", L),
    (f"{ABOUT}/PAGE 3.jpg", "img/about/vinyl", M),
    (f"{ABOUT}/PAGE 4-1.png", "img/about/tag-design", M),
    (f"{ABOUT}/PAGE 4-2.png", "img/about/tag-tech", M),
    (f"{ABOUT}/PAGE 4-3.jpg", "img/about/tag-eco", M),
    (f"{ABOUT}/PAGE 5-1.png", "img/about/value-user", M),
    (f"{ABOUT}/PAGE 5-2.png", "img/about/value-design", M),
    (f"{ABOUT}/PAGE 5-3.jpg", "img/about/value-innovation", M),
    (f"{ABOUT}/PAGE 5-4.png", "img/about/value-safety", M),
    (f"{ABOUT}/PAGE 5-5.jpg", "img/about/value-global", M),
    (f"{ABOUT}/PAGE 6.jpg", "img/about/mission", L),
    (f"{LIFE}/PAGE 1.png", "img/about/life-lounge", L),
    (f"{LIFE}/PAGE 6.jpeg", "img/about/service", M),
]

# (source, output name, start s, duration s, width, kbps, poster at s (relative to start), height or None)
# height set = center-cropped to that frame (used for portrait mobile versions)
VIDEOS = [
    (f"{PKG}/HOME PAGE/PAGE 2 品牌视频.mp4", "video/home-hero", 45, 16, 1600, 2600, 15.5, None),
    (f"{PKG}/HOME PAGE/PAGE 2 品牌视频.mp4", "video/home-hero-mobile", 45, 16, 720, 1600, 15.5, 1280),
    (f"{PKG}/HOME PAGE/PAGE3-3 V27视频.mp4", "video/card-v27", 19, 9, 1280, 1800, 3, None),
    (f"{PKG}/HOME PAGE/PAGE 3-2 V25 coming soon引导至品牌页.mp4", "video/card-v25", 7, 6, 1280, 1500, 2.5, None),
    (f"{PKG}/HOME PAGE/PAGE3-3 V27视频.mp4", "video/v27-hero", 2, 14, 1600, 1800, 7, None),
    (f"{PKG}/HOME PAGE/PAGE3-3 V27视频.mp4", "video/v27-hero-mobile", 2, 14, 720, 1100, 7, 1280),
    # V25 coming soon: dark teaser (eye, headlight, light blade) from the HQ "V25 coming soon" film
    (f"{PKG}/HOME PAGE/PAGE 3-2 V25 coming soon引导至品牌页.mp4", "video/v25-hero", 5, 15, 1600, 1600, 1.5, None),
    (f"{PKG}/HOME PAGE/PAGE 3-2 V25 coming soon引导至品牌页.mp4", "video/v25-hero-mobile", 5, 15, 720, 1000, 1.5, 1280),
]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"failed: {' '.join(cmd)}\n{r.stderr}")
    return r.stdout.strip()


def images():
    for src, name, widths in IMAGES:
        os.makedirs(os.path.dirname(os.path.join(OUT, name)), exist_ok=True)
        for w in widths:
            dst = os.path.join(OUT, f"{name}-{w}.jpg")
            if os.path.exists(dst) and not FORCE:
                continue
            run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "70", "--resampleWidth", str(w), src, "--out", dst])
            print(f"img  {name}-{w}.jpg  {os.path.getsize(dst) // 1024}KB")


def videos():
    if not os.path.exists(VIDEO_BIN):
        os.makedirs(os.path.dirname(VIDEO_BIN), exist_ok=True)
        run(["swiftc", "-O", os.path.join(ROOT, "tools", "video.swift"), "-o", VIDEO_BIN])
    for src, name, start, dur, width, kbps, poster, height in VIDEOS:
        dst = os.path.join(OUT, name + ".mp4")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.exists(dst) or FORCE:
            cmd = [VIDEO_BIN, "export", src, dst, str(start), str(dur), str(width), str(kbps)] + ([str(height)] if height else [])
            print("vid ", name, run(cmd))
        pst = os.path.join(OUT, name + "-poster.jpg")
        if not os.path.exists(pst) or FORCE:
            if height:  # poster = first frame of the cropped clip
                run([VIDEO_BIN, "poster", dst, pst, str(poster), str(width)])
            else:
                run([VIDEO_BIN, "poster", src, pst, str(start + poster), str(width)])
            print("post", name, f"{os.path.getsize(pst) // 1024}KB")


if __name__ == "__main__":
    images()
    videos()
