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

# (source, output name, start s, duration s, width, kbps, poster at s (relative to start), height or None)
# height set = center-cropped to that frame (used for portrait mobile versions)
VIDEOS = [
    (f"{PKG}/HOME PAGE/PAGE 2 品牌视频.mp4", "video/home-hero", 45, 16, 1600, 2600, 15.5, None),
    (f"{PKG}/HOME PAGE/PAGE 2 品牌视频.mp4", "video/home-hero-mobile", 45, 16, 720, 1600, 15.5, 1280),
    (f"{PKG}/HOME PAGE/PAGE3-3 V27视频.mp4", "video/card-v27", 19, 9, 1280, 1800, 3, None),
    (f"{PKG}/HOME PAGE/PAGE 3-2 V25 coming soon引导至品牌页.mp4", "video/card-v25", 7, 6, 1280, 1500, 2.5, None),
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
