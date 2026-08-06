# -*- coding: utf-8 -*-
"""
Prepara las dos figuras para la seccion de perfil.

Toma la lamina limpia (nino de frente y gestante de perfil), la separa en
dos, recorta el margen en blanco, deja el fondo transparente y la reduce a
un tamano razonable para embeberla en el tablero.

El trazo se conserva en el azul del original; se recolorea por CSS con un
filtro, para que herede la tinta institucional.
"""
from PIL import Image
import io, os, base64, json

SRC = (r"E:\REGIONAL ANTIOQUIA\GESTION SUPERVISION REGIONAL\VIDEOCONFERENCIAS"
       r"\7. 2026\6. JUNIO\18-06-2026 SEGUIMIENTO NUTRICIONAL\REPS"
       r"\ChatGPT Image 6 ago 2026, 02_06_42 a.m.png")
OUT = os.path.dirname(os.path.abspath(__file__))
ALTO = 620          # alto final de cada figura


def recortar(im):
    """Quita el margen blanco buscando el area con trazo."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if px[x, y] < 205:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    m = 14
    return im.crop((max(0, x0 - m), max(0, y0 - m), min(w, x1 + m), min(h, y1 + m)))


def transparente(im):
    """El blanco pasa a transparente; el trazo se conserva."""
    im = im.convert("RGBA")
    d = im.getdata()
    out = []
    for r, g, b, a in d:
        lum = (r + g + b) / 3
        if lum > 232:
            out.append((0, 0, 0, 0))
        else:
            # alfa proporcional a lo oscuro que sea el pixel
            al = int(255 * min(1.0, (232 - lum) / 150.0))
            out.append((30, 52, 92, al))
    im.putdata(out)
    return im


print("abriendo la lamina ...")
im = Image.open(SRC).convert("RGB")
w, h = im.size
mitad = int(w * 0.56)          # el nino ocupa algo mas de la mitad izquierda
figs = {"nn": im.crop((0, 0, mitad, h)), "gs": im.crop((mitad, 0, w, h))}

datos = {}
for k, f in figs.items():
    f = recortar(f)
    f = transparente(f)
    esc = ALTO / f.size[1]
    f = f.resize((max(1, int(f.size[0] * esc)), ALTO), Image.LANCZOS)
    buf = io.BytesIO()
    f.save(buf, "PNG", optimize=True)
    b = buf.getvalue()
    datos[k] = {"w": f.size[0], "h": f.size[1],
                "src": "data:image/png;base64," + base64.b64encode(b).decode()}
    print("  %s: %sx%s  ·  %d KB" % (k, f.size[0], f.size[1], len(b) // 1024))

p = os.path.join(OUT, "figuras.json")
json.dump(datos, io.open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("escrito", p, os.path.getsize(p) // 1024, "KB")
