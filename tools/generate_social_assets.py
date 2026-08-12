"""Generate ChemLab's deterministic Open Graph card from shipped brand assets."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og.png"
CAPTURE = ROOT / "public" / "media" / "lab-kinetics.png"
FONT = ROOT / "public" / "fonts" / "inter-var.woff2"
MONO = ROOT / "public" / "fonts" / "jbmono-var.woff2"

W, H = 1200, 630
NAVY = "#071221"
SURFACE = "#101f34"
CYAN = "#38bdf8"
INK = "#f1f5f9"
MUTED = "#a8b8cc"
GREEN = "#4ade80"


def font(path, size):
    return ImageFont.truetype(str(path), size=size)


def flask(draw, x, y, scale=1):
    points = [(x + 14*scale, y), (x + 30*scale, y), (x + 30*scale, y + 19*scale),
              (x + 45*scale, y + 48*scale), (x - 1*scale, y + 48*scale),
              (x + 14*scale, y + 19*scale)]
    draw.line(points + [points[0]], fill=CYAN, width=max(2, int(3*scale)), joint="curve")
    draw.line((x + 10*scale, y + 37*scale, x + 35*scale, y + 37*scale),
              fill=CYAN, width=max(2, int(3*scale)))
    draw.ellipse((x + 18*scale, y + 29*scale, x + 22*scale, y + 33*scale), fill=GREEN)


im = Image.new("RGB", (W, H), NAVY)
draw = ImageDraw.Draw(im)

# Technical grid and restrained orbit.
for x in range(0, W, 80):
    draw.line((x, 0, x, H), fill="#0b1b2e", width=1)
for y in range(0, H, 80):
    draw.line((0, y, W, y), fill="#0b1b2e", width=1)
draw.ellipse((670, -185, 1270, 415), outline="#10334b", width=2)
draw.ellipse((735, -120, 1205, 350), outline="#0d2b42", width=1)

flask(draw, 57, 48, 0.65)
draw.text((102, 46), "ChemLab", font=font(FONT, 27), fill=INK)
draw.text((228, 46), "ZW", font=font(FONT, 27), fill=CYAN)

draw.ellipse((61, 140, 71, 150), fill=GREEN)
draw.text((83, 134), "FREE  ·  NO ACCOUNT NEEDED", font=font(MONO, 13), fill="#7dd3fc")
draw.multiline_text((59, 184), "Practise chemistry\npracticals anywhere.",
                    font=font(FONT, 55), fill=INK, spacing=0, stroke_width=0)
draw.text((60, 333), "Operate the apparatus. Record real readings.", font=font(FONT, 21), fill=MUTED)
draw.text((60, 368), "Turn evidence into exam-ready answers.", font=font(FONT, 21), fill=MUTED)

# Verified product proof.
facts = [("14", "PRACTICALS"), ("19", "GUIDE UNITS"), ("3", "MOCK PAPERS")]
for i, (value, label) in enumerate(facts):
    x = 60 + i * 168
    draw.text((x, 451), value, font=font(MONO, 30), fill=CYAN)
    draw.text((x, 493), label, font=font(MONO, 11), fill=MUTED)
draw.rounded_rectangle((60, 542, 310, 590), radius=8, fill=CYAN)
draw.text((86, 555), "START PRACTISING FREE", font=font(MONO, 14), fill=NAVY)

# Real product capture in a framed, perspective-free window.
capture = Image.open(CAPTURE).convert("RGB")
capture.thumbnail((555, 385), Image.Resampling.LANCZOS)
frame = (609, 130, 1163, 477)
draw.rounded_rectangle((frame[0]-2, frame[1]-36, frame[2]+2, frame[3]+2),
                       radius=14, fill=SURFACE, outline="#286284", width=2)
draw.ellipse((627, 110, 637, 120), fill=GREEN)
draw.text((648, 105), "LIVE PRACTICAL", font=font(MONO, 11), fill=MUTED)
draw.text((1047, 105), "9701 · KINETICS", font=font(MONO, 10), fill="#6d829e")
crop_h = frame[3] - frame[1]
capture = capture.resize((frame[2]-frame[0], int((frame[2]-frame[0])*9/16)),
                         Image.Resampling.LANCZOS)
if capture.height < crop_h:
    capture = capture.resize((int(crop_h*16/9), crop_h), Image.Resampling.LANCZOS)
left = max(0, (capture.width - (frame[2]-frame[0])) // 2)
capture = capture.crop((left, 0, left + frame[2]-frame[0], crop_h))
im.paste(capture, (frame[0], frame[1]))
draw.text((609, 501), "Real run data  ·  automatic graph  ·  evidence marking",
          font=font(MONO, 11), fill="#6d829e")
draw.text((879, 565), "PHONE-READY  ·  OFFLINE AFTER FIRST LOAD",
          font=font(MONO, 10), fill="#7dd3fc")

im.save(OUT, "PNG", optimize=True)
print(f"generated {OUT.name}: {W}x{H}, {OUT.stat().st_size} bytes")
