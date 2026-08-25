# -*- coding: utf-8 -*-
"""
Genera el dataset columnar que alimenta el tablero.

A diferencia de un agregado, aqui va UNA FILA POR BENEFICIARIO con sus
dimensiones codificadas como enteros. Eso permite que el tablero cruce
los filtros de centro zonal, municipio y entidad contratista en el
navegador, sin volver a leer los archivos.

MUNICIPIO = el de la UNIDAD DE SERVICIO (columna 4 'Municipio' en NN y
'Municipio UDS' en GS), no el de residencia del beneficiario.
"""
import csv, json, os, io, statistics, datetime
from collections import Counter, defaultdict

# PUBLICO=1 genera una version para publicar en internet: el numero de
# documento real de cada beneficiario (que si no, queda embebido en el
# HTML tal cual) se reemplaza por un identificador anonimo antes de
# escribir el JSON. Todos los conteos, cruces y ordenamientos que usan
# "doc" ya se calcularon con el valor real ANTES de este reemplazo, asi
# que ningun numero cambia -- solo deja de ser rastreable a una persona.
PUBLICO = os.environ.get("PUBLICO", "0") == "1"

D = r"E:\REGIONAL ANTIOQUIA\GESTION SUPERVISION REGIONAL\VIDEOCONFERENCIAS\7. 2026\6. JUNIO\18-06-2026 SEGUIMIENTO NUTRICIONAL\REPS\_procesado"
OUT = os.path.dirname(os.path.abspath(__file__))
# OUT es la carpeta del script; los recursos ya procesados estan un nivel
# arriba, en recursos/. Antes coincidian y por eso no se notaba.
REC = os.path.join(os.path.dirname(OUT), "recursos")

PT = ["", "DESNUTRICION AGUDA SEVERA", "DESNUTRICION AGUDA MODERADA",
      "RIESGO DE DESNUTRICION AGUDA", "PESO ADECUADO PARA LA TALLA",
      "RIESGO DE SOBREPESO", "SOBREPESO", "OBESIDAD"]
TE = ["", "RETRASO EN TALLA", "RIESGO DE BAJA TALLA", "TALLA ADECUADA PARA LA EDAD"]
PE = ["", "DESNUTRICION GLOBAL", "RIESGO DE PESO BAJO PARA LA EDAD",
      "PESO ADECUADO PARA LA EDAD", "NO APLICA"]
IRC = ["", "ADECUADO", "PREVENTIVO", "ALTO RIESGO", "CRITICO", "NO EVALUABLE"]
GST = ["", "BAJO PESO PARA LA EDAD GESTACIONAL", "IMC ADECUADO PARA LA EDAD GESTACIONAL",
       "SOBREPESO PARA LA EDAD GESTACIONAL", "OBESIDAD PARA LA EDAD GESTACIONAL"]
ORD = {2: 3, 3: 2, 4: 1, 5: 0, 6: 1, 7: 2, 1: 3}   # pt code -> distancia a la adecuacion
ORD = {1: 3, 2: 2, 3: 1, 4: 0, 5: 1, 6: 2, 7: 3}

def _gst_code_laxo(st):
    """Codigo de GST para MOSTRAR (G["st"]/vista): admite sinonimos que no
    calzan exacto (DELGADEZ, NORMAL, etc.). Distinto del match ESTRICTO que
    exige indices_gs() en procesar_reportes.py para decidir NO EVALUABLE en
    el IRG (ver _toma_gs mas abajo) -- no usar este para puntuar el IRG."""
    return GST.index(st) if st in GST else (
        1 if "BAJO PESO" in st or st == "DELGADEZ" else
        3 if "SOBREPESO" in st else 4 if "OBESIDAD" in st else
        2 if "ADECUADO" in st or st == "NORMAL" else 0)

def F(v):
    try: return float(str(v).replace(",", "."))
    except (ValueError, TypeError): return None
def I(v):
    try: return int(float(str(v).replace(",", ".")))
    except (ValueError, TypeError): return None
def nombre_de(r):
    """Nombre completo, tal como viene en el reporte (apellidos primero).
    Solo se usa en el build interno: se vacia por completo en PUBLICO=1."""
    p = [r.get("apellido1"), r.get("apellido2"), r.get("nombre1"), r.get("nombre2")]
    return " ".join(x.strip() for x in p if x and x.strip())

class Dic:
    def __init__(self): self.a = []; self.m = {}
    def __call__(self, v):
        v = v or "(sin dato)"
        if v not in self.m: self.m[v] = len(self.a); self.a.append(v)
        return self.m[v]

# ---------------- historial: numero de tomas y evolucion ----------------
hist = defaultdict(list)
with open(os.path.join(D, "nn_completo.csv"), encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        t = I(r["toma"])
        if t is not None:
            hist[r["doc"]].append((t, (r["est_pt"] or "").strip()))

# mismo criterio que "hist" de arriba (todas las gestantes alguna vez
# vistas en gs_completo.csv, vinculadas o no) para que BENEF_GS signifique
# lo mismo que BENEF_NN=len(hist) -- antes contaba solo len(set(G["doc"])),
# que ya viene filtrado a VINCULADO (ver mas abajo), dando un numero que no
# es comparable con BENEF_NN pese al nombre paralelo. Detectado en
# auditoria de congruencia 2026-08-24: el campo no se muestra en ninguna
# pantalla hoy, pero quedaba mal calculado para quien lo use despues.
hist_gs_docs = set()
with open(os.path.join(D, "gs_completo.csv"), encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if I(r["toma"]) is not None:
            hist_gs_docs.add(r["doc"])

ntomas = {}; evol = {}; trans = Counter()
for d, v in hist.items():
    ntomas[d] = len(v)
    w = sorted((x for x in v if x[1] in PT[1:]), key=lambda x: x[0])
    if len(w) < 2: evol[d] = 0; continue
    a, b = PT.index(w[0][1]), PT.index(w[-1][1])
    trans[(w[0][1], w[-1][1])] += 1
    evol[d] = 1 if ORD[b] < ORD[a] else 3 if ORD[b] > ORD[a] else 2

# ---------------- niñas y niños ----------------
dcz, dmun, deas, dserv, duds, dcu = Dic(), Dic(), Dic(), Dic(), Dic(), Dic()
C = {k: [] for k in ("doc", "nombre", "cz", "mun", "eas", "serv", "uds", "cu", "pt", "te", "pe",
                     "sx", "em", "tm", "nt", "cr", "can", "ftlc", "irn", "irc",
                     "ev", "mk", "et",
                     # medidas crudas: lo que alguien tomo con un instrumento
                     "kg", "cm", "pb", "pc", "zt", "zp", "fl")}
TMAX = 0
with open(os.path.join(D, "nn_ultima_toma.csv"), encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if r["estado"] != "VINCULADO":
            continue
        t = I(r["toma"]) or 0
        TMAX = max(TMAX, t)
        e = (r["etnia"] or "")
        C["doc"].append(r["doc"])
        C["nombre"].append(nombre_de(r))
        C["cz"].append(dcz(r["cz"]))
        C["mun"].append(dmun(r["municipio"]))       # municipio de la UDS
        C["eas"].append(deas(r["eas"]))
        C["serv"].append(dserv(r["servicio"]))
        C["uds"].append(duds(r["uds"]))
        C["cu"].append(dcu((r["cod_uds"] or "").lstrip("0")))
        C["pt"].append(PT.index(r["est_pt"]) if r["est_pt"] in PT else 0)
        C["te"].append(TE.index(r["est_te"]) if r["est_te"] in TE else 0)
        C["pe"].append(PE.index(r["est_pe"]) if r["est_pe"] in PE else 0)
        C["sx"].append(1 if (r["sexo"] or "").startswith("H") else 2 if (r["sexo"] or "").startswith("M") else 0)
        C["em"].append(I(r["edad_meses"]) if I(r["edad_meses"]) is not None else -1)
        C["tm"].append(t)
        C["nt"].append(ntomas.get(r["doc"], 1))
        C["cr"].append(1 if (r["criterio"] or "") == "NO CUMPLE" else 0)
        cn = (r["canalizado"] or "").strip()
        C["can"].append(1 if cn == "SI" else 2 if cn == "NO" else 0)
        ft = (r["ftlc"] or "").strip()
        C["ftlc"].append(1 if ft == "SI" else 2 if ft == "NO" else 0)
        v = F(r["irn"]); C["irn"].append(round(v, 1) if v is not None else -1)
        C["irc"].append(IRC.index(r["clasificacion_irn"]) if r["clasificacion_irn"] in IRC else 0)
        C["ev"].append(evol.get(r["doc"], 0))
        C["mk"].append(r["marcas_calidad"] or "")
        C["et"].append(1 if "INDIGENA" in e else 2 if ("AFRO" in e or "NEGRO" in e)
                       else 3 if "NO SE AUTORRECONOCE" in e else 4 if e else 0)
        # --- medidas crudas, redondeadas a la precision que exige la guia ---
        _k = F(r["peso"]);  C["kg"].append(round(_k, 1) if _k else -1)
        _c = F(r["talla"]); C["cm"].append(round(_c, 1) if _c else -1)
        _b = F(r["pb"]);    C["pb"].append(round(_b, 1) if _b else -1)
        _f = F(r["pc"]);    C["pc"].append(round(_f, 1) if _f else -1)
        _zt = F(r["z_te"]); C["zt"].append(round(_zt, 2) if _zt is not None else -99)
        _zp = F(r["z_pt"]); C["zp"].append(round(_zp, 2) if _zp is not None else -99)
        C["fl"].append(I(r["flag"]) if I(r["flag"]) is not None else -1)

# ---------------- gestantes ----------------
gcz, gmun, geas, guds = Dic(), Dic(), Dic(), Dic()
G = {k: [] for k in ("doc", "nombre", "cz", "mun", "eas", "uds", "st", "ed", "tm", "ctl", "irg", "irc", "sg", "et",
                     # medidas crudas de la gestante
                     "kg", "cm", "imc")}
GTMAX = 0
with open(os.path.join(D, "gs_ultima_toma.csv"), encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if r["estado"] != "VINCULADO":
            continue
        t = I(r["toma"]) or 0
        GTMAX = max(GTMAX, t)
        st = (r["est_gest"] or "").strip()
        code = _gst_code_laxo(st)
        G["doc"].append(r["doc"]); G["nombre"].append(nombre_de(r))
        G["cz"].append(gcz(r["cz"]))
        G["mun"].append(gmun(r["municipio"])); G["eas"].append(geas(r["eas"]))
        G["uds"].append(guds(r["uds"])); G["st"].append(code)
        G["ed"].append(I(r["edad_anios"]) if I(r["edad_anios"]) is not None else -1)
        G["tm"].append(t)
        G["ctl"].append(I(r["controles"]) if I(r["controles"]) is not None else -1)
        v = F(r["irg"]); G["irg"].append(round(v, 1) if v is not None else -1)
        G["irc"].append(IRC.index(r["clasificacion_irg"]) if r["clasificacion_irg"] in IRC else 0)
        G["sg"].append(I(r["sem_gest"]) if I(r["sem_gest"]) is not None else -1)
        ge = (r["etnia"] or "")
        G["et"].append(1 if "INDIGENA" in ge else 2 if ("AFRO" in ge or "NEGRO" in ge)
                       else 3 if "NO SE AUTORRECONOCE" in ge else 4 if ge else 0)
        _gk = F(r["peso"]);     G["kg"].append(round(_gk, 1) if _gk else -1)
        _gc = F(r["talla"]);    G["cm"].append(round(_gc, 1) if _gc else -1)
        _gi = F(r["imc_gest"]); G["imc"].append(round(_gi, 1) if _gi else -1)

# gestantes con discapacidad que tuvieron toma: independiente de si siguen
# vinculadas hoy, porque "tuvieron toma" ya lo garantiza estar en este
# archivo (es la ULTIMA toma de cada una). Filtrar por VINCULADO aqui
# dejaba afuera casos reales solo porque se desvincularon despues.
GS_DISC = []
with open(os.path.join(D, "gs_ultima_toma.csv"), encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if (r["discapacidad"] or "").strip() != "SI":
            continue
        GS_DISC.append({"doc": r["doc"], "nombre": nombre_de(r), "cz": r["cz"], "mun": r["municipio"],
                         "eas": r["eas"], "uds": r["uds"], "estado": r["estado"],
                         "toma": I(r["toma"]) or 0})

# ---------------- historico mes a mes (volumen de cargue, cobertura de
# reporte y estado nutricional), a partir del histórico COMPLETO, no solo
# la ultima toma. No se filtra por estado=VINCULADO: esto mide el CARGUE,
# no la prevalencia clinica. ----------------
MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
         "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
BUCKET_PT = {
    "PESO ADECUADO PARA LA TALLA": "adecuado",
    "RIESGO DE DESNUTRICION AGUDA": "riesgo", "RIESGO DE SOBREPESO": "riesgo",
    "SOBREPESO": "exceso", "OBESIDAD": "exceso",
    "DESNUTRICION AGUDA MODERADA": "aguda", "DESNUTRICION AGUDA SEVERA": "aguda",
}
BUCKET_GST = {
    "BAJO PESO PARA LA EDAD GESTACIONAL": "bajopeso",
    "IMC ADECUADO PARA LA EDAD GESTACIONAL": "adecuado",
    "SOBREPESO PARA LA EDAD GESTACIONAL": "sobrepeso",
    "OBESIDAD PARA LA EDAD GESTACIONAL": "obesidad",
}

def hist_mensual(ruta, campo_eas, campo_uds, campo_bucket, bucket_map, bucket_claves):
    """Registros, beneficiarios y unidades que reportaron, mes a mes,
    total regional y por centro zonal."""
    tot = defaultdict(lambda: {"registros": 0, "docs": set(), "eas": set(), "uds": set(),
                                "bk": Counter(), "vinc": Counter()})
    porcz = defaultdict(lambda: defaultdict(lambda: {"registros": 0, "docs": set(),
                                "eas": set(), "uds": set(), "bk": Counter(), "vinc": Counter()}))
    eas_univ, uds_univ = set(), set()
    eas_univ_cz, uds_univ_cz = defaultdict(set), defaultdict(set)
    with open(ruta, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            t = I(r["toma"])
            if t is None:
                continue
            cz = r["cz"] or "(sin dato)"
            eas = r["eas"]; uds = r[campo_uds]
            for d in (tot[t], porcz[t][cz]):
                d["registros"] += 1
                d["docs"].add(r["doc"])
                if eas: d["eas"].add(eas)
                if uds: d["uds"].add(uds)
                bk = bucket_map.get((r[campo_bucket] or "").strip())
                if bk: d["bk"][bk] += 1
                est = (r["estado"] or "").strip()
                if est: d["vinc"][est] += 1
            if eas: eas_univ.add(eas); eas_univ_cz[cz].add(eas)
            if uds: uds_univ.add(uds); uds_univ_cz[cz].add(uds)

    meses = sorted(tot.keys())
    vacio = lambda: {"registros": 0, "docs": set(), "eas": set(), "uds": set(), "bk": Counter(), "vinc": Counter()}

    def serie(d_por_toma):
        return {"registros": [d_por_toma[t]["registros"] for t in meses],
                "beneficiarios": [len(d_por_toma[t]["docs"]) for t in meses],
                "eas_rep": [len(d_por_toma[t]["eas"]) for t in meses],
                "uds_rep": [len(d_por_toma[t]["uds"]) for t in meses],
                "bk": {k: [d_por_toma[t]["bk"].get(k, 0) for t in meses] for k in bucket_claves},
                "vinculados": [d_por_toma[t]["vinc"].get("VINCULADO", 0) for t in meses],
                "desvinculados": [d_por_toma[t]["vinc"].get("DESVINCULADO", 0) for t in meses]}

    cz_out = {}
    for cz in sorted(eas_univ_cz.keys() | uds_univ_cz.keys()):
        d_por_toma = {t: porcz[t].get(cz, vacio()) for t in meses}
        cz_out[cz] = dict(serie(d_por_toma), eas_univ=len(eas_univ_cz[cz]), uds_univ=len(uds_univ_cz[cz]))

    return {"meses": meses, "etiquetas": [MESES[min(t, 12)].capitalize() for t in meses],
            "total": dict(serie(tot), eas_univ=len(eas_univ), uds_univ=len(uds_univ)),
            "cz": cz_out}

HIST_NN = hist_mensual(os.path.join(D, "nn_completo.csv"), "eas", "cod_uds",
                        "est_pt", BUCKET_PT, ["adecuado", "riesgo", "exceso", "aguda"])
HIST_GS = hist_mensual(os.path.join(D, "gs_completo.csv"), "eas", "cod_uds",
                        "est_gest", BUCKET_GST, ["adecuado", "bajopeso", "sobrepeso", "obesidad"])
print("historico  NN meses:", HIST_NN["meses"], " GS meses:", HIST_GS["meses"])

# ---------------- estadisticas de corte para el glosario tecnico ----------------
# Media y mediana de los 4 puntajes Z, y la verificacion cruzada Flag vs
# limites OMS: son los unicos numeros que el glosario cita como ejemplo
# ("ESTE CORTE ...") que no estan ya disponibles via D.meta o D.reglas.
# 'talla inferior' y 'lactancia = 6' SI estan: son las reglas C8 y E3.
def calidad_extra(ruta):
    OMS = {"z_pt": (-5, 5), "z_te": (-6, 6), "z_pe": (-6, 5), "z_imc": (-5, 5)}
    zvals = {k: [] for k in OMS}
    flag = Counter()
    # preferencia de digito en peso/talla: si el instrumento se lee con
    # precision de 0,1 (kg/cm), el decimal deberia repartirse ~parejo entre
    # 0-9. Una concentracion fuerte en .0/.5 es la señal estandar (SMART/
    # ENA) de que se esta redondeando a ojo en vez de leyendo el
    # instrumento -- una alerta sobre la TECNICA de medicion en la UDS, no
    # sobre el calculo del tablero. Se mide sobre nn_completo.csv (todas las
    # tomas, antes de deduplicar), igual que el resto de este panel.
    dig_peso = Counter(); dig_talla = Counter()
    with open(ruta, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            zf = {k: F(r[k]) for k in OMS}
            for k, v in zf.items():
                if v is not None:
                    zvals[k].append(v)
            dentro = all(v is None or (lo <= v <= hi) for v, (lo, hi) in
                         ((zf[k], OMS[k]) for k in OMS))
            fl = I(r["flag"])
            if fl == 0:
                flag["ok_dentro" if dentro else "ok_fuera"] += 1
            elif fl is not None:
                flag["mal_dentro" if dentro else "mal_fuera"] += 1
            p = F(r["peso"])
            if p is not None: dig_peso[round(p * 10) % 10] += 1
            t = F(r["talla"])
            if t is not None: dig_talla[round(t * 10) % 10] += 1
    def resumen_z(vs):
        if not vs:
            return {"n": 0, "media": None, "mediana": None}
        return {"n": len(vs), "media": round(sum(vs) / len(vs), 2),
                "mediana": round(statistics.median(vs), 2)}
    def resumen_dig(c):
        tot = sum(c.values())
        return {"n": tot, "pct": [round(100 * c.get(d, 0) / tot, 1) if tot else 0.0 for d in range(10)]}
    return {"z": {k: resumen_z(v) for k, v in zvals.items()}, "flag": dict(flag),
            "digitos": {"peso": resumen_dig(dig_peso), "talla": resumen_dig(dig_talla)}}

CALIDAD_EXTRA = calidad_extra(os.path.join(D, "nn_completo.csv"))
print("calidad_extra  flag:", CALIDAD_EXTRA["flag"], " z_pt media/mediana:",
      CALIDAD_EXTRA["z"]["z_pt"]["media"], CALIDAD_EXTRA["z"]["z_pt"]["mediana"])
print("digitos  peso .0:", CALIDAD_EXTRA["digitos"]["peso"]["pct"][0], "%  talla .0+.5:",
      round(CALIDAD_EXTRA["digitos"]["talla"]["pct"][0] + CALIDAD_EXTRA["digitos"]["talla"]["pct"][5], 1), "%")

def estado_split(ruta):
    c = Counter()
    with open(ruta, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            c[(r["estado"] or "").strip() or "(sin dato)"] += 1
    return dict(c)

CALIDAD_EXTRA["estado_nn"] = estado_split(os.path.join(D, "nn_ultima_toma.csv"))
CALIDAD_EXTRA["estado_gs"] = estado_split(os.path.join(D, "gs_ultima_toma.csv"))
print("estado_nn:", CALIDAD_EXTRA["estado_nn"], " estado_gs:", CALIDAD_EXTRA["estado_gs"])

# ---------------- calidad ----------------
reglas = []
for ln in open(os.path.join(D, "PANEL depuracion y calidad.txt"), encoding="utf-8"):
    if len(ln) > 70 and ln[:1].isalpha() and ln[1:2].isdigit() and ln[4:5] == " ":
        try:
            # el origen va al final de la linea entre corchetes: "... [GUIA]"
            lns = ln.rstrip()
            origen = lns[lns.rfind("[") + 1:-1] if lns.endswith("]") else "PROPIA"
            reglas.append({"cod": ln[:2], "amb": ln[6:9].strip(), "desc": ln[10:64].strip(),
                           "n": int(ln[64:74].strip().replace(".", "")),
                           "pct": float(ln[74:82].strip().rstrip("%")),
                           "origen": origen})
        except ValueError:
            pass


# ---------------- metadata derivada del dato ----------------
FILAS_NN = sum(1 for _ in io.open(os.path.join(D, "nn_completo.csv"), encoding="utf-8-sig")) - 1
FILAS_GS = sum(1 for _ in io.open(os.path.join(D, "gs_completo.csv"), encoding="utf-8-sig")) - 1
BENEF_NN = len(hist)
BENEF_GS = len(hist_gs_docs)
tmin = min(t for t in C["tm"] if t) if C["tm"] else 1
# corte comparable: la ultima toma que alcanzan todos los centros zonales
_mx = {}
for _i, _t in enumerate(C["tm"]):
    _c = C["cz"][_i]
    _mx[_c] = max(_mx.get(_c, 0), _t)
TCOM = min(_mx.values()) if _mx else TMAX
REZAG = sorted(dcz.a[c] for c, v in _mx.items() if v > TCOM)
PERIODO = "%s a %s" % (MESES[min(tmin, 12)], MESES[min(TCOM, 12)])
# La fecha de corte es la de la ULTIMA EXTRACCION REAL de los .xlsx, no la
# de hoy: nn_completo.csv solo se reescribe cuando procesar_reportes.py lee
# los reportes de verdad (con --solo-analisis no se toca). Un string fijo
# aqui es exactamente el error que dejo "Corte 18-06-2026" pegado en la
# cabecera meses despues de que los datos ya eran de otro corte.
CORTE = os.environ.get("CORTE") or datetime.datetime.fromtimestamp(
    os.path.getmtime(os.path.join(D, "nn_completo.csv"))).strftime("%d-%m-%Y")
CZ_ESPERADOS = [
    "CZ ABURRA NORTE", "CZ ABURRA SUR", "CZ BAJO CAUCA", "CZ INTEGRAL NOROCCIDENTAL",
    "CZ INTEGRAL NORORIENTAL", "CZ LA MESETA", "CZ MAGDALENA MEDIO", "CZ OCCIDENTE",
    "CZ OCCIDENTE MEDIO", "CZ ORIENTE", "CZ ORIENTE MEDIO", "CZ PENDERISCO",
    "CZ PORCE NUS", "CZ ROSALES", "CZ SUR ORIENTE", "CZ SUROESTE", "CZ URABA",
]
FALTAN = [c for c in CZ_ESPERADOS if c not in dcz.a]
print("periodo:", PERIODO, "| corte comparable toma", TCOM, "de", TMAX,
      "| beneficiarios NN:", BENEF_NN, "| faltan:", FALTAN or "ninguno",
      "| rezagados:", REZAG or "ninguno")

# ---------------- historial por toma (filtro "Meses" del tablero) -------------
# Un arreglo por beneficiario, alineado por POSICION con C["doc"]/G["doc"]
# (mismo orden, mismo largo) -- nunca lleva el documento adentro, asi que
# la anonimizacion PUBLICO=1 de abajo no tiene que tocarlo. Con esto el
# tablero recalcula, en el navegador, el estado clinico y el IRN/IRG "como
# si el corte fuera solo esos meses" -- sin eso, filtrar por mes solo
# podria esconder/mostrar la fila ya calculada de la ULTIMA toma (lo que
# ya hacen fcz/fmun/feas), que no sirve para ver "como estaba la poblacion
# en el trimestre X": ver conversacion que agrego este filtro.
#
# La ubicacion (cz/mun/eas/uds) de cada toma NO se repite aqui a proposito:
# el filtro de Meses sigue usando la ubicacion de la ULTIMA toma (la misma
# que ya trae C/G) para filtrar y mostrar, exactamente igual que hoy --
# evita duplicar 6 campos mas por toma (case F2, "beneficiario en mas de
# una UDS", es la unica situacion real donde esto no coincide, y ya esta
# marcada aparte como anomalia de calidad, no como el caso comun).
HIST_NN_ROWS = defaultdict(list)
with open(os.path.join(D, "nn_historial.csv"), encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if I(r["toma"]) is not None:
            HIST_NN_ROWS[r["doc"]].append(r)

def _toma_nn(r):
    can = (r["canalizado"] or "").strip(); ft = (r["ftlc"] or "").strip()
    _k = F(r["peso"]); _c = F(r["talla"]); _b = F(r["pb"]); _f = F(r["pc"])
    _zt = F(r["z_te"]); _zp = F(r["z_pt"]); _ze = F(r["z_pe"])
    return [
        I(r["toma"]),
        PT.index(r["est_pt"]) if r["est_pt"] in PT else 0,
        TE.index(r["est_te"]) if r["est_te"] in TE else 0,
        PE.index(r["est_pe"]) if r["est_pe"] in PE else 0,
        round(_zt, 2) if _zt is not None else None,
        round(_ze, 2) if _ze is not None else None,
        round(_zp, 2) if _zp is not None else None,
        I(r["edad_meses"]) if I(r["edad_meses"]) is not None else -1,
        1 if (r["criterio"] or "") == "NO CUMPLE" else 0,
        1 if can == "SI" else 2 if can == "NO" else 0,
        1 if ft == "SI" else 2 if ft == "NO" else 0,
        round(_k, 1) if _k else -1,
        round(_c, 1) if _c else -1,
        round(_b, 1) if _b else -1,
        round(_f, 1) if _f else -1,
        I(r["flag"]) if I(r["flag"]) is not None else -1,
        I(r["fact_cyd"]) or 0,
        I(r["fact_vac"]) or 0,
        r["marcas"] or "",
    ]

NN_HIST = [sorted((_toma_nn(r) for r in HIST_NN_ROWS.get(doc, [])), key=lambda x: x[0])
           for doc in C["doc"]]

HIST_GS_ROWS = defaultdict(list)
with open(os.path.join(D, "gs_historial.csv"), encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        if I(r["toma"]) is not None:
            HIST_GS_ROWS[r["doc"]].append(r)

def _toma_gs(r):
    _k = F(r["peso"]); _c = F(r["talla"]); _i = F(r["imc_gest"])
    return [
        I(r["toma"]),
        # estricto (no la variante con sinonimos de _gst_code_laxo): asi
        # coincide con como analizar_gs() decide "NO EVALUABLE" via
        # S_GEST.get(eg) en procesar_reportes.py -- codigo 0 = no evaluable.
        GST.index(r["est_gest"]) if r["est_gest"] in GST else 0,
        I(r["controles"]) if I(r["controles"]) is not None else -1,
        round(_k, 1) if _k else -1,
        round(_c, 1) if _c else -1,
        round(_i, 1) if _i else -1,
        I(r["edad_anios"]) if I(r["edad_anios"]) is not None else -1,
        I(r["sem_gest"]) if I(r["sem_gest"]) is not None else -1,
        _gst_code_laxo((r["est_gest"] or "").strip()),   # solo para mostrar (G["st"])
    ]

GS_HIST = [sorted((_toma_gs(r) for r in HIST_GS_ROWS.get(doc, [])), key=lambda x: x[0])
           for doc in G["doc"]]
print("historial por toma  NN:", sum(len(v) for v in NN_HIST), "filas  GS:",
      sum(len(v) for v in GS_HIST), "filas")

# reemplazo del documento por un identificador anonimo, SOLO para la
# version publica y SOLO despues de que ntomas/evol/hist ya usaron el
# valor real -- nada de lo que se calcula con "doc" cambia, solo deja
# de ser un numero de cedula real en el HTML final
if PUBLICO:
    C["doc"] = ["A%06d" % i for i in range(len(C["doc"]))]
    G["doc"] = ["A%06d" % i for i in range(len(G["doc"]))]
    C["nombre"] = ["" for _ in C["nombre"]]
    G["nombre"] = ["" for _ in G["nombre"]]
    for i, v in enumerate(GS_DISC):
        v["doc"] = "A%06d" % i
        v["nombre"] = ""
    print(f"PUBLICO=1: documento y nombre anonimizados ({len(C['doc'])} NN, {len(G['doc'])} GS, {len(GS_DISC)} GS_DISC)")

data = {
    "meta": {"corte": CORTE, "periodo": PERIODO,
             "filas_nn": FILAS_NN, "filas_gs": FILAS_GS,
             "benef_nn": BENEF_NN, "benef_gs": BENEF_GS,
             "tmax": TCOM, "tmax_real": TMAX, "rezagados": REZAG,
             "gtmax": GTMAX, "faltantes": FALTAN, "publico": PUBLICO,
             "uds_trimestre": json.load(io.open(os.path.join(REC, "uds_trimestre.json"), encoding="utf-8"))
             if os.path.exists(os.path.join(REC, "uds_trimestre.json")) else None},
    "dic": {"cz": dcz.a, "mun": dmun.a, "eas": deas.a, "serv": dserv.a, "uds": duds.a, "cu": dcu.a},
    "cat": {"pt": PT, "te": TE, "pe": PE, "irc": IRC, "gst": GST},
    "nn": C,
    "nn_hist": NN_HIST,
    "gdic": {"cz": gcz.a, "mun": gmun.a, "eas": geas.a, "uds": guds.a},
    "gs": G,
    "gs_hist": GS_HIST,
    "gs_disc": GS_DISC,
    "trans": [{"a": a, "b": b, "n": n} for (a, b), n in trans.most_common(20)],
    "reglas": reglas,
    "mapa": json.load(io.open(os.path.join(REC, "mapa.json"), encoding="utf-8")),
    "uds": json.load(io.open(os.path.join(REC, "uds.json"), encoding="utf-8")),
    "historico": {"nn": HIST_NN, "gs": HIST_GS},
    "calidad_extra": CALIDAD_EXTRA,
    "alias": {   # nombre en el reporte -> nombre en la cartografia
        "DONMATIAS": "DON MATIAS", "PENOL": "EL PENOL", "RETIRO": "EL RETIRO",
        "SAN ANDRES": "SAN ANDRES DE CUERQUIA", "SAN PEDRO": "SAN PEDRO DE LOS MILAGROS",
        "SAN VICENTE FERRER": "SAN VICENTE",
    },
}
datos_str = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
p = os.path.join(D, "datos_tablero.json")
with io.open(p, "w", encoding="utf-8") as fh:
    fh.write(datos_str)
print("escrito", p, os.path.getsize(p) // 1024, "KB")
print("ninos:", len(C["doc"]), "| gestantes:", len(G["doc"]))
print("dic  cz:", len(dcz.a), "mun:", len(dmun.a), "eas:", len(deas.a),
      "serv:", len(dserv.a), "uds:", len(duds.a))

# ---------------- inyecta el dataset en la plantilla -> tablero.html ----------
# La plantilla se arma de sus dos piezas versionadas. Antes se leia una copia
# suelta en _procesado/, que git ignora: existian dos plantillas y nada impedia
# que se separaran. Ahora hay una sola fuente y es la que esta bajo control.
PLA = os.path.join(os.path.dirname(OUT), "codigo", "plantilla")
plantilla = PLA
cuerpo = (io.open(os.path.join(PLA, "tpl_head.html"), encoding="utf-8").read()
          + io.open(os.path.join(PLA, "tpl_tail.js"), encoding="utf-8").read())
marcador = "const D = __DATOS__;"
if marcador not in cuerpo:
    raise SystemExit("No se encontro el marcador __DATOS__ en " + plantilla)
cuerpo = cuerpo.replace(marcador, "const D = " + datos_str + ";", 1)
ph = os.path.join(OUT, "tablero.html")
with io.open(ph, "w", encoding="utf-8") as fh:
    fh.write(cuerpo)
print("escrito", ph, os.path.getsize(ph) // 1024 // 1024, "MB  (listo para empaquetar_tablero.py)")
