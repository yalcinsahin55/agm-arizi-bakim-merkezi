#!/usr/bin/env python3
"""
public/icon-*.png dosyalarını components/Logo.tsx ile birebir aynı tasarıma
(koyu yuvarlatılmış kare + altın/turuncu gradyanlı "AGM" yazısı + nabız/dalga
çizgisi) göre yeniden üretir. Eski güneş/dişli ikonun yerini alır.
"""
import math
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = "/mnt/skills/examples/canvas-design/canvas-fonts/BigShoulders-Bold.ttf"
BG = (13, 23, 28, 255)          # #0d171c
STROKE = (51, 71, 79, 255)      # #33474f
GRAD_A = (249, 214, 122)        # #f9d67a (top-left)
GRAD_B = (224, 147, 15)         # #e0930f (bottom-right)

BASE = 1024  # yüksek çözünürlüklü ana tuval; her boyut buradan LANCZOS ile küçültülür


def diagonal_gradient(size, c1, c2):
    """Sol-üstten sağ-alta köşegen gradyan (SVG'deki x1=0,y1=0 -> x2=1,y2=1 ile aynı)."""
    w, h = size, size
    grad = Image.new("RGB", (w, h))
    px = grad.load()
    maxd = (w - 1) + (h - 1)
    for y in range(h):
        for x in range(w):
            t = (x + y) / maxd
            r = round(c1[0] + (c2[0] - c1[0]) * t)
            g = round(c1[1] + (c2[1] - c1[1]) * t)
            b = round(c1[2] + (c2[2] - c1[2]) * t)
            px[x, y] = (r, g, b)
    return grad


def rounded_rect_mask(size, inset, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([inset, inset, size - inset, size - inset], radius=radius, fill=255)
    return mask


def build_master(maskable: bool) -> Image.Image:
    S = BASE
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    if maskable:
        # Maskable ikonlar OS tarafından daire/squircle ile kırpılabilir; önemli
        # içerik güvenli alanda (orta ~%70) kalmalı, arka plan tuvalin tamamını
        # kaplamalı (kenarlarda boşluk/köşe kalmamalı).
        bg = Image.new("RGBA", (S, S), BG)
        canvas.paste(bg, (0, 0))
        content_scale = 0.62
    else:
        # SVG viewBox 64x64: rect x=1.5 y=1.5 w=61 h=61 rx=16 stroke 1.5
        inset = S * (1.5 / 64)
        radius = S * (16 / 64)
        mask = rounded_rect_mask(S, inset, radius)
        bg = Image.new("RGBA", (S, S), BG)
        canvas.paste(bg, (0, 0), mask)
        stroke_w = max(1, round(S * (1.5 / 64)))
        d = ImageDraw.Draw(canvas)
        d.rounded_rectangle(
            [inset, inset, S - inset, S - inset], radius=radius,
            outline=STROKE, width=stroke_w,
        )
        content_scale = 1.0

    # --- İçerik (AGM yazısı + dalga çizgisi) 0-64 koordinat uzayında, sonra ölçekleniyor ---
    scale = (S / 64) * content_scale
    off = (S - 64 * scale) / 2  # içerik küçültülürse ortala

    def pt(x, y):
        return (off + x * scale, off + y * scale)

    grad = diagonal_gradient(S, GRAD_A, GRAD_B)

    # Metin maskesi
    text_mask = Image.new("L", (S, S), 0)
    td = ImageDraw.Draw(text_mask)
    font_size = round(21 * scale * 1.05)
    font = ImageFont.truetype(FONT_PATH, font_size)
    text = "AGM"
    bbox = td.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = off + 32 * scale - tw / 2 - bbox[0]
    ty = off + 27 * scale - th / 2 - bbox[1]
    td.text((tx, ty), text, font=font, fill=255)

    # Dalga/nabız çizgisi maskesi
    line_mask = Image.new("L", (S, S), 0)
    ld = ImageDraw.Draw(line_mask)
    pts = [pt(17, 39), pt(25.5, 39), pt(28.5, 33.5), pt(34, 45.5), pt(37, 39), pt(47, 39)]
    line_w = max(2, round(2.6 * scale))
    ld.line(pts, fill=255, width=line_w, joint="curve")
    r = line_w / 2
    for p in (pts[0], pts[-1]):
        ld.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)

    # metin + çizgi maskelerini birleştir (piksel bazlı maksimum)
    import PIL.ImageChops as ImageChops
    combined_mask = ImageChops.lighter(text_mask, line_mask)

    gradient_rgba = grad.convert("RGBA")
    canvas.paste(gradient_rgba, (0, 0), combined_mask)

    return canvas


def save_all():
    master = build_master(maskable=False)
    master_mask = build_master(maskable=True)

    sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512]
    for s in sizes:
        img = master.resize((s, s), Image.LANCZOS)
        img.save(f"public/icon-{s}.png")
        print(f"wrote public/icon-{s}.png")

    apple = master.resize((180, 180), Image.LANCZOS)
    apple_bg = Image.new("RGBA", (180, 180), BG)
    apple_bg.alpha_composite(apple)
    apple_bg.convert("RGB").save("public/apple-touch-icon.png")
    print("wrote public/apple-touch-icon.png")

    mask512 = master_mask.resize((512, 512), Image.LANCZOS)
    mask512.save("public/icon-maskable-512.png")
    print("wrote public/icon-maskable-512.png")

    # favicon.ico (çoklu boyut)
    fav_sizes = [16, 32, 48]
    fav_imgs = [master.resize((s, s), Image.LANCZOS) for s in fav_sizes]
    fav_imgs[0].save("public/favicon.ico", sizes=[(s, s) for s in fav_sizes], append_images=fav_imgs[1:])
    print("wrote public/favicon.ico")


if __name__ == "__main__":
    save_all()
