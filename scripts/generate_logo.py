#!/usr/bin/env python3
"""
Generate high-resolution branding logo for AgentSpaceDebris.
Theme: Deep Space Void (#030712), Orbital Radar Blue (#38BDF8), Plasma Orange (#F97316), Deorbit Green (#10B981).
"""

from PIL import Image, ImageDraw, ImageFont
import math
from pathlib import Path


def generate_logo():
    width = 800
    height = 800
    image = Image.new("RGBA", (width, height), (3, 7, 18, 255))
    draw = ImageDraw.Draw(image)

    cx, cy = 400, 350

    # 1. Background radar range rings (LEO altitudes: 800km, 500km, 300km, 120km)
    for r in [260, 210, 160, 110]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(56, 189, 248, 50), width=2)

    # Radar crosshairs (azimuth axes)
    draw.line([(cx - 280, cy), (cx + 280, cy)], fill=(56, 189, 248, 40), width=1)
    draw.line([(cx, cy - 280), (cx, cy + 280)], fill=(56, 189, 248, 40), width=1)

    # 2. Earth Globe at Center (blue-green marble with atmosphere glow)
    earth_r = 75
    for gr in range(earth_r + 20, earth_r, -2):
        alpha = int(45 * (1 - (gr - earth_r) / 20))
        draw.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], outline=(56, 189, 248, alpha), width=2)
    # Earth surface
    draw.ellipse([cx - earth_r, cy - earth_r, cx + earth_r, cy + earth_r], fill=(12, 45, 90, 255), outline=(56, 189, 248, 220), width=4)
    # Continents curve hint
    draw.arc([cx - earth_r + 15, cy - earth_r + 10, cx + earth_r - 10, cy + earth_r - 15], 30, 240, fill=(16, 185, 129, 200), width=8)

    # 3. Decaying Elliptical Orbit Track (Reentry trajectory)
    # Ellipse tilted 30 degrees
    orbit_pts = []
    reentry_pts = []
    for deg in range(0, 360, 2):
        rad = math.radians(deg)
        # unrotated ellipse: semi-major 220, semi-minor 140
        ex = 210 * math.cos(rad)
        ey = 135 * math.sin(rad)
        # rotate by -25 degrees
        tilt = math.radians(-25)
        rx = cx + (ex * math.cos(tilt) - ey * math.sin(tilt))
        ry = cy + (ex * math.sin(tilt) + ey * math.cos(tilt))
        orbit_pts.append((rx, ry))
        if 80 <= deg <= 220:
            reentry_pts.append((rx, ry))

    for i in range(len(orbit_pts) - 1):
        draw.line([orbit_pts[i], orbit_pts[i+1]], fill=(56, 189, 248, 120), width=2)

    # Plasma reentry fiery trail along lower decay curve
    for i in range(len(reentry_pts) - 1):
        draw.line([reentry_pts[i], reentry_pts[i+1]], fill=(249, 115, 22, 220), width=4)

    # 4. ADR Servicer Chaser Satellite (Top Right)
    sat_x, sat_y = cx + 155, cy - 110
    # Solar arrays
    draw.line([(sat_x - 35, sat_y), (sat_x + 35, sat_y)], fill=(56, 189, 248, 255), width=8)
    draw.rectangle([sat_x - 12, sat_y - 12, sat_x + 12, sat_y + 12], fill=(226, 232, 240, 255), outline=(56, 189, 248, 255), width=2)
    # Laser / robotic capture tether pointing towards debris
    deb_x, deb_y = cx - 120, cy + 95
    draw.line([(sat_x, sat_y), (deb_x, deb_y)], fill=(16, 185, 129, 200), width=2)

    # 5. Defunct Space Debris Object (Spent Rocket Stage / Fragment)
    draw.polygon([
        (deb_x - 14, deb_y - 10),
        (deb_x + 10, deb_y - 16),
        (deb_x + 16, deb_y + 12),
        (deb_x - 8, deb_y + 15),
    ], fill=(148, 163, 184, 255), outline=(249, 115, 22, 255), width=2)

    # Reentry atmospheric sparks / plasma fire around debris
    for dx, dy in [(-18, -12), (-24, 8), (-10, 24), (20, 18), (-30, 20)]:
        draw.ellipse([deb_x + dx - 3, deb_y + dy - 3, deb_x + dx + 3, deb_y + dy + 3], fill=(249, 115, 22, 230))

    # 6. Target Tracking HUD Box around debris
    box_s = 28
    draw.line([(deb_x - box_s, deb_y - box_s), (deb_x - box_s + 12, deb_y - box_s)], fill=(16, 185, 129, 255), width=2)
    draw.line([(deb_x - box_s, deb_y - box_s), (deb_x - box_s, deb_y - box_s + 12)], fill=(16, 185, 129, 255), width=2)
    draw.line([(deb_x + box_s, deb_y - box_s), (deb_x + box_s - 12, deb_y - box_s)], fill=(16, 185, 129, 255), width=2)
    draw.line([(deb_x + box_s, deb_y - box_s), (deb_x + box_s, deb_y - box_s + 12)], fill=(16, 185, 129, 255), width=2)
    draw.line([(deb_x - box_s, deb_y + box_s), (deb_x - box_s + 12, deb_y + box_s)], fill=(16, 185, 129, 255), width=2)
    draw.line([(deb_x - box_s, deb_y + box_s), (deb_x - box_s, deb_y + box_s - 12)], fill=(16, 185, 129, 255), width=2)
    draw.line([(deb_x + box_s, deb_y + box_s), (deb_x + box_s - 12, deb_y + box_s)], fill=(16, 185, 129, 255), width=2)
    draw.line([(deb_x + box_s, deb_y + box_s), (deb_x + box_s, deb_y + box_s - 12)], fill=(16, 185, 129, 255), width=2)

    # 7. Typography Branding
    try:
        font_title = ImageFont.truetype("arial.ttf", 46)
        font_sub = ImageFont.truetype("arial.ttf", 21)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    draw.text((400, 640), "AGENT SPACE DEBRIS", fill=(240, 249, 255, 255), font=font_title, anchor="mm")
    draw.text((400, 695), "Orbital Collision Avoidance & Active Removal Escrow", fill=(56, 189, 248, 255), font=font_sub, anchor="mm")
    draw.text((400, 730), "GenLayer StudioNet · Chain ID 61999 (0xF22F)", fill=(148, 163, 184, 220), font=font_sub, anchor="mm")

    out_path = Path(__file__).parent.parent / "logo.png"
    image.save(out_path, "PNG")
    print(f"[+] Successfully generated logo at {out_path}")


if __name__ == "__main__":
    generate_logo()
