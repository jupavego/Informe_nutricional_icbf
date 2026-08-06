# -*- coding: utf-8 -*-
"""
Simplifica el geojson de Antioquia para que quepa en el tablero.

Entrada: antioquia_con_comunas v5.geojson  (32 MB, 146 poligonos, 227.663 vertices)
Salida : mapa.json                          (geometria simplificada + llaves)

Aplica Douglas-Peucker y redondea coordenadas. La tolerancia esta pensada para
un mapa de coropletas regional: a esa escala 200 m de error no se ven, y el peso
baja dos ordenes de magnitud.

Conserva COD_MPIO (codigo DANE) para poder cruzar sin depender del nombre.
"""
import json, io, os, math, unicodedata

GEO = (r"E:\REGIONAL ANTIOQUIA\GESTION SUPERVISION REGIONAL\VIDEOCONFERENCIAS"
       r"\7. 2026\5. MAYO\20-05-2026 CONTROL COBERTURAL\antioquia_con_comunas v5.geojson")
OUT = os.path.dirname(os.path.abspath(__file__))
TOL = 0.0022      # grados ~ 240 m
DEC = 4           # 4 decimales ~ 11 m


def norm(v):
    if not isinstance(v, str):
        return v
    v = " ".join(v.split())
    d = unicodedata.normalize("NFKD", v)
    return "".join(c for c in d if not unicodedata.combining(c)).upper()


def dp(pts, tol):
    """Douglas-Peucker iterativo."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    pila = [(0, len(pts) - 1)]
    while pila:
        i, j = pila.pop()
        if j <= i + 1:
            continue
        ax, ay = pts[i]; bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        n2 = dx * dx + dy * dy
        peor, ip = -1.0, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            if n2 == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / n2))
                d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
            if d > peor:
                peor, ip = d, k
        if peor > tol:
            keep[ip] = True
            pila.append((i, ip)); pila.append((ip, j))
    return [p for p, k in zip(pts, keep) if k]


def anillo(r):
    r = [(round(x, DEC), round(y, DEC)) for x, y in r]
    # quita duplicados consecutivos que deja el redondeo
    out = [r[0]]
    for p in r[1:]:
        if p != out[-1]:
            out.append(p)
    if len(out) < 4:
        return None
    s = dp(out, TOL)
    if len(s) < 4:
        s = out[:: max(1, len(out) // 12)]
        if s[0] != s[-1]:
            s.append(s[0])
    if s[0] != s[-1]:
        s.append(s[0])
    return [[x, y] for x, y in s] if len(s) >= 4 else None


print("leyendo", os.path.getsize(GEO) // 1024 // 1024, "MB ...", flush=True)
g = json.load(io.open(GEO, encoding="utf-8"))

feats = []
antes = despues = 0
for f in g["features"]:
    p = f["properties"]
    geo = f["geometry"]
    polis = [geo["coordinates"]] if geo["type"] == "Polygon" else geo["coordinates"]
    nuevos = []
    for poli in polis:
        rings = []
        for r in poli:
            antes += len(r)
            a = anillo(r)
            if a:
                rings.append(a); despues += len(a)
        if rings:
            # solo el anillo exterior: los huecos no aportan a una coropleta
            nuevos.append([rings[0]])
    if not nuevos:
        continue
    # se queda con el poligono de mayor area aproximada
    def area(rr):
        c = rr[0]
        return abs(sum(c[i][0] * c[i + 1][1] - c[i + 1][0] * c[i][1] for i in range(len(c) - 1))) / 2
    nuevos.sort(key=area, reverse=True)
    cz = norm(p.get("centro_zonal") or "")
    feats.append({
        "cod": p.get("COD_MPIO"),
        "nom": norm(p.get("MPIO_NOMBR") or p.get("name") or ""),
        "cz": cz,
        "sub": norm(p.get("SUBREGION") or ""),
        "g": [n[0] for n in nuevos[:3]],   # hasta 3 piezas por municipio
    })

print(f"vertices {antes:,} -> {despues:,}".replace(",", "."), flush=True)

xs = [x for f in feats for r in f["g"] for x, y in r]
ys = [y for f in feats for r in f["g"] for x, y in r]
mapa = {"bbox": [min(xs), min(ys), max(xs), max(ys)], "f": feats}
p = os.path.join(OUT, "mapa.json")
json.dump(mapa, io.open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("escrito", p, os.path.getsize(p) // 1024, "KB ·", len(feats), "poligonos")
print("bbox", [round(v, 3) for v in mapa["bbox"]])

from collections import Counter
c = Counter(f["cz"] for f in feats)
print("\ncentros zonales en el mapa:", len(c))
for k, v in sorted(c.items()):
    print(f"   {k:<28}{v:>4} municipios")
