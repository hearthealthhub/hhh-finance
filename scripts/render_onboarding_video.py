from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math
import subprocess

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / "videos" / "frames"
OUT = ROOT / "videos" / "hhh-finance-onboarding.mp4"
FFMPEG = ROOT / "node_modules" / "@remotion" / "compositor-win32-x64-msvc" / "ffmpeg.exe"

WIDTH, HEIGHT = 1080, 1920
FPS = 24
SCENE_SECONDS = 4.5
FRAMES_PER_SCENE = int(FPS * SCENE_SECONDS)

SCENES = [
    ("Welcome to HHH-FINANCE", "Heart Health Hub", "This is our shared finance app for orders, expenses, assets, liabilities, and monthly profit.", ["Install it on your phone", "Sign in with your approved email", "Everything syncs automatically"], "#147a5c"),
    ("Start by signing in", "One account per person", "Use your email and password. Once you sign in, the app loads the same shared records on every device.", ["kingfishbamz@gmail.com", "maryamumar917@gmail.com", "No need to paste Supabase keys"], "#315e9f"),
    ("Read the dashboard first", "Quick business health check", "The dashboard shows revenue, expenses, net profit, and founder salary for the month.", ["Founder Salary = 15% of net profit", "Recent activity appears below", "Trends help you compare months"], "#d99b2b"),
    ("Log a new order", "Orders page", "Tap New Order, enter the customer, choose products, add delivery cost, then save.", ["Customer names autocomplete", "Order numbers are automatic", "Profit is calculated for you"], "#147a5c"),
    ("Review before saving", "Avoid small mistakes", "Before tapping Save Order, quickly check product price, product cost, delivery cost, and payment status.", ["Price sold to customer", "Cost of product", "Delivery cost to us"], "#b9473f"),
    ("Track expenses", "Expenses page", "Log data, transport, ads, packaging, and other business costs as soon as they happen.", ["Pick the category", "Enter amount and date", "Add a short note if useful"], "#315e9f"),
    ("Assets and liabilities", "Balance sheet habit", "Use Assets for investments and owned value. Use Liabilities for refunds, debts, and obligations.", ["Assets increase your snapshot", "Open liabilities reduce confidence", "Mark settled obligations clearly"], "#147a5c"),
    ("Install on your phone", "Use it like an app", "Open hhh-finance.netlify.app in your browser, then choose Add to Home Screen or Install App.", ["Works on mobile and laptop", "Use the same login", "Data syncs through Supabase"], "#d99b2b"),
]


def font(size, bold=False, emoji=False):
    if emoji:
        path = Path("C:/Windows/Fonts/seguiemj.ttf")
    elif bold:
        path = Path("C:/Windows/Fonts/arialbd.ttf")
    else:
        path = Path("C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(str(path), size)


TITLE = font(82, bold=True)
KICKER = font(34, bold=True)
BODY = font(42)
BULLET = font(34, bold=True)
SMALL = font(24, bold=True)
LOGO = font(56, emoji=True)


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def wrap_text(draw, text, font_obj, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=font_obj)[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_wrapped(draw, text, xy, font_obj, fill, max_width, line_gap=12):
    x, y = xy
    for line in wrap_text(draw, text, font_obj, max_width):
        draw.text((x, y), line, font=font_obj, fill=fill)
        y += font_obj.size + line_gap
    return y


def render_scene(scene, scene_index, frame_in_scene):
    title, kicker, body, bullets, accent_hex = scene
    accent = hex_to_rgb(accent_hex)
    bg = (246, 247, 244)
    ink = (23, 32, 29)
    muted = (102, 115, 109)
    line = (220, 227, 220)

    enter = min(1, frame_in_scene / 18)
    enter = 1 - pow(1 - enter, 3)
    fade = 1 if frame_in_scene < FRAMES_PER_SCENE - 16 else max(0, (FRAMES_PER_SCENE - frame_in_scene) / 16)
    y_shift = int((1 - enter) * 70)

    img = Image.new("RGB", (WIDTH, HEIGHT), bg)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(0, HEIGHT, 8):
        t = i / HEIGHT
        color = mix(accent, bg, min(1, t * 1.7))
        od.rectangle((0, i, WIDTH, i + 8), fill=(*color, 32))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    top = 72 + y_shift
    rounded_rect(draw, (72, top, 150, top + 78), 18, (185, 224, 202))
    draw.text((90, top + 7), "ðŸ’°", font=LOGO, fill=ink)
    draw.text((168, top + 4), "HHH-FINANCE", font=font(34, True), fill=ink)
    draw.text((168, top + 45), "Heart Health Hub", font=SMALL, fill=muted)
    draw.text((930, top + 18), f"{scene_index + 1}/{len(SCENES)}", font=font(28, True), fill=accent)

    content_y = 440 + y_shift
    draw.text((72, content_y), kicker.upper(), font=KICKER, fill=accent)
    content_y += 70
    content_y = draw_wrapped(draw, title, (72, content_y), TITLE, ink, 900, 10)
    content_y += 34
    content_y = draw_wrapped(draw, body, (72, content_y), BODY, (77, 91, 85), 900, 14)
    content_y += 34

    for idx, bullet in enumerate(bullets):
        b_enter = min(1, max(0, (frame_in_scene - 30 - idx * 7) / 14))
        b_enter = 1 - pow(1 - b_enter, 3)
        x_shift = int((1 - b_enter) * 45)
        y = content_y + idx * 112
        rounded_rect(draw, (72 + x_shift, y, 1008 + x_shift, y + 88), 14, (255, 255, 255), line, 2)
        rounded_rect(draw, (98 + x_shift, y + 25, 136 + x_shift, y + 63), 10, accent)
        draw.ellipse((110 + x_shift, y + 37, 124 + x_shift, y + 51), fill=(255, 255, 255))
        draw.text((158 + x_shift, y + 24), bullet, font=BULLET, fill=ink)

    progress_y = HEIGHT - 150
    rounded_rect(draw, (72, progress_y, 1008, progress_y + 12), 20, line)
    rounded_rect(draw, (72, progress_y, 72 + int(936 * ((scene_index + 1) / len(SCENES))), progress_y + 12), 20, accent)
    draw.text((72, HEIGHT - 112), "hhh-finance.netlify.app", font=SMALL, fill=muted)
    draw.text((720, HEIGHT - 112), "Review details before saving", font=SMALL, fill=muted)

    if fade < 1:
        faded = Image.new("RGB", (WIDTH, HEIGHT), bg)
        img = Image.blend(faded, img, fade)
    return img


def main():
    FRAMES.mkdir(parents=True, exist_ok=True)
    total = len(SCENES) * FRAMES_PER_SCENE
    for frame in range(total):
        scene_index = frame // FRAMES_PER_SCENE
        frame_in_scene = frame % FRAMES_PER_SCENE
        img = render_scene(SCENES[scene_index], scene_index, frame_in_scene)
        img.save(FRAMES / f"frame_{frame:04d}.png", optimize=False)
        if frame % 120 == 0:
            print(f"Rendered frame {frame}/{total}")

    cmd = [
        str(FFMPEG),
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(FRAMES / "frame_%04d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(OUT),
    ]
    subprocess.run(cmd, check=True)
    print(OUT)


if __name__ == "__main__":
    main()
