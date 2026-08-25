# -*- coding: utf-8 -*-
"""
===============================================================================
 PROCESADOR DE REPORTES DE SEGUIMIENTO NUTRICIONAL  -  ICBF REGIONAL ANTIOQUIA
===============================================================================

 Lee una carpeta de descargas del sistema (Ninos_CZ_* y Gestantes_CZ_*), la
 normaliza, le aplica las reglas de depuracion y calcula los indices. Sirve
 para CUALQUIER descarga futura: basta apuntarlo a la carpeta nueva.

   python procesar_reportes.py "RUTA\\A\\LA\\CARPETA\\REPS"
   python procesar_reportes.py "RUTA" --solo-analisis   (no relee los .xlsx)

 Estructura esperada de la carpeta:
     REPS\\
        NN\\   Ninos_CZ_<CENTRO ZONAL>.xlsx       (uno por CZ)
        GS\\   Gestantes_CZ_<CENTRO ZONAL>.xlsx    (uno por CZ)

 Los nombres de las subcarpetas no importan: se detectan por el patron del
 nombre de archivo. Los .xlsx originales NUNCA se modifican.

 Salidas, en <carpeta>\\_procesado\\ :
     nn_completo.csv          todas las columnas, una fila por toma
     gs_completo.csv          idem para gestantes
     nn_ultima_toma.csv       una fila por nino + marcas + IRN
     gs_ultima_toma.csv       una fila por gestante + marcas + IRG
     excepciones.csv          log trazable de cada regla incumplida
     indice_operadores.csv    IDO por entidad contratista
     diccionario_datos.csv    campo, alias, tipo, % llenado, dominio
     PANEL depuracion y calidad.txt
     manifiesto.txt           que se leyo, cuando, y que cambio

 Autor: capa construida sobre el analisis del corte 18-06-2026.
===============================================================================
"""
import openpyxl, glob, os, csv, sys, re, unicodedata, datetime
from collections import Counter, defaultdict

# =============================================================================
# 1. CONFIGURACION - lo unico que hay que tocar si el sistema cambia el reporte
# =============================================================================

# Alias de las columnas, EN EL ORDEN en que las entrega el sistema.
ALIAS_NN = [
    "contrato", "regional", "cz", "municipio", "eas", "cod_uds", "uds", "servicio",
    "tipo_benef", "tipo_doc", "doc", "apellido1", "apellido2", "nombre1", "nombre2",
    "sexo", "pais", "f_nacimiento", "f_ingreso", "f_valoracion", "municipio_res",
    "edad_meses", "grupo_edad", "hijo_gestante", "lme", "lmt", "etnia", "ubicacion",
    "discapacidad", "dx_discapacidad", "grupo_pc", "toma", "f_registro", "f_modificacion",
    "peso_nacer", "talla_nacer", "f_pb", "pb", "peso_seco", "prematuro", "menor40sem",
    "pc", "edad_postconcep", "peso", "talla", "pct_pe", "pct_te", "pct_imc", "pct_pce",
    "z_te", "z_pe", "z_pt", "z_imc", "flag", "est_te", "est_pe", "est_pt", "est_imc",
    "f_reg_salud", "regimen", "eps", "carnet_vac", "vac_aldia", "carnet_cyd", "n_cyd",
    "estado", "n_toma_benef", "talla_inferior", "canalizado", "ftlc", "criterio",
]
ALIAS_GS = [
    "contrato", "regional", "cz", "municipio", "eas", "cod_uds", "uds", "servicio",
    "tipo_benef", "tipo_doc", "doc", "apellido1", "apellido2", "nombre1", "nombre2",
    "pais", "f_nacimiento", "municipio_res", "f_ingreso", "f_valoracion", "edad_anios",
    "etnia", "ubicacion", "discapacidad", "complemento", "alto_riesgo", "toma",
    "f_registro", "f_modificacion", "sem_gest", "peso", "talla", "imc_gest", "imc_lact",
    "est_gest", "multiple", "tipo", "est_lact", "f_reg_salud", "regimen", "eps",
    "controles", "carnet_vac", "estado",
]

PATRON_NN = "Ninos_CZ"
PATRON_GS = "Gestantes_CZ"

# Centros zonales que deben llegar en toda descarga completa de la regional.
CZ_ESPERADOS = [
    "CZ ABURRA NORTE", "CZ ABURRA SUR", "CZ BAJO CAUCA", "CZ INTEGRAL NOROCCIDENTAL",
    "CZ INTEGRAL NORORIENTAL", "CZ LA MESETA", "CZ MAGDALENA MEDIO", "CZ OCCIDENTE",
    "CZ OCCIDENTE MEDIO", "CZ ORIENTE", "CZ ORIENTE MEDIO", "CZ PENDERISCO",
    "CZ PORCE NUS", "CZ ROSALES", "CZ SUR ORIENTE", "CZ SUROESTE", "CZ URABA",
]

TEXTO = {"contrato", "cod_uds", "doc", "tipo_doc"}     # conservan ceros a la izquierda
PII = {"apellido1", "apellido2", "nombre1", "nombre2"}  # datos identificables

# ---- catalogos oficiales, Resolucion 2465 de 2016 ---------------------------
CAT_PT = ["DESNUTRICION AGUDA SEVERA", "DESNUTRICION AGUDA MODERADA",
          "RIESGO DE DESNUTRICION AGUDA", "PESO ADECUADO PARA LA TALLA",
          "RIESGO DE SOBREPESO", "SOBREPESO", "OBESIDAD"]
CAT_TE = ["RETRASO EN TALLA", "RIESGO DE BAJA TALLA", "TALLA ADECUADA PARA LA EDAD"]
CAT_PE = ["DESNUTRICION GLOBAL", "RIESGO DE PESO BAJO PARA LA EDAD",
          "PESO ADECUADO PARA LA EDAD", "NO APLICA"]
CAT_GEST = ["BAJO PESO PARA LA EDAD GESTACIONAL", "IMC ADECUADO PARA LA EDAD GESTACIONAL",
            "SOBREPESO PARA LA EDAD GESTACIONAL", "OBESIDAD PARA LA EDAD GESTACIONAL"]
AGUDA = {"DESNUTRICION AGUDA MODERADA", "DESNUTRICION AGUDA SEVERA"}
# limites OMS de valores biologicamente implausibles
OMS = {"z_pt": (-5, 5), "z_te": (-6, 6), "z_pe": (-6, 5), "z_imc": (-5, 5)}

# ---- puntajes del componente antropometrico del IRN (0 = adecuado) ----------
S_PT = {"PESO ADECUADO PARA LA TALLA": 0, "RIESGO DE SOBREPESO": 25,
        "RIESGO DE DESNUTRICION AGUDA": 40, "SOBREPESO": 50, "OBESIDAD": 70,
        "DESNUTRICION AGUDA MODERADA": 90, "DESNUTRICION AGUDA SEVERA": 100}
S_TE = {"TALLA ADECUADA PARA LA EDAD": 0, "RIESGO DE BAJA TALLA": 30, "RETRASO EN TALLA": 70}
S_PE = {"PESO ADECUADO PARA LA EDAD": 0, "NO APLICA": 0,
        "RIESGO DE PESO BAJO PARA LA EDAD": 30, "DESNUTRICION GLOBAL": 75}
S_GEST = {"IMC ADECUADO PARA LA EDAD GESTACIONAL": 0, "SOBREPESO PARA LA EDAD GESTACIONAL": 40,
          "OBESIDAD PARA LA EDAD GESTACIONAL": 70, "BAJO PESO PARA LA EDAD GESTACIONAL": 80}
ORD_PT = {"PESO ADECUADO PARA LA TALLA": 0, "RIESGO DE SOBREPESO": 1,
          "RIESGO DE DESNUTRICION AGUDA": 1, "SOBREPESO": 2, "OBESIDAD": 3,
          "DESNUTRICION AGUDA MODERADA": 2, "DESNUTRICION AGUDA SEVERA": 3}
ORD_GEST = {"IMC ADECUADO PARA LA EDAD GESTACIONAL": 0, "SOBREPESO PARA LA EDAD GESTACIONAL": 1,
            "OBESIDAD PARA LA EDAD GESTACIONAL": 2, "BAJO PESO PARA LA EDAD GESTACIONAL": 2}

# ---- catalogo de reglas ------------------------------------------------------
# Cada regla lleva su ORIGEN, para que Calidad del dato en el tablero pueda
# segmentar que es normativa oficial y que es diseno propio del equipo:
#   GUIA    la Guia ICBF G44.PP v1 (Tablas 1-14), su Anexo 1, o la
#           Resolucion 2465 de 2016 que la Guia adopta como catalogo oficial
#   OMS     limites o convenciones de organismos internacionales (OMS/OPS)
#           que la Guia usa pero no transcribe como tabla propia
#   PROPIA  diseno del equipo del tablero: no esta en la Guia ni en Res. 2465
REGLAS = [
    ("A1", "NN", "Falta el archivo de un centro zonal esperado", "Volver a descargar", "PROPIA"),
    ("A2", "NN", "Fila completamente vacia arrastrada del consolidado", "Descartar", "PROPIA"),
    ("B1", "NN", "Estado Peso/Talla fuera del catalogo Res. 2465", "Reasignar a 'Sin clasificar'", "GUIA"),
    ("B2", "NN", "Estado Talla/Edad fuera del catalogo", "Reasignar a 'Sin clasificar'", "GUIA"),
    ("B3", "NN", "Estado Peso/Edad fuera del catalogo", "Reasignar a 'Sin clasificar'", "GUIA"),
    ("B4", "GS", "Estado nutricional gestante fuera del catalogo", "Reasignar a 'Sin clasificar'", "GUIA"),
    ("C1", "NN", "Puntaje Z fuera de los limites de plausibilidad (Guia Tabla 9)", "EXCLUIR salvo lo que el flag 1 explica", "GUIA"),
    ("C2", "NN", "Flag de la OMS distinto de cero (flag 1 SI se evalua, Guia Tabla 13)", "EXCLUIR salvo flag 1", "GUIA"),
    ("C3", "AMB", "Peso fuera del rango fisico por grupo etario (Guia Tabla 10)", "EXCLUIR", "GUIA"),
    ("C4", "AMB", "Talla fuera del rango fisico por grupo etario (Guia Tabla 10)", "EXCLUIR", "GUIA"),
    ("C5", "NN", "IMC recalculado desde peso y talla fuera de 8-30", "Revisar medicion", "PROPIA"),
    ("C6", "NN", "La talla disminuye respecto de la toma anterior (proxy simple de la Tabla 11)", "Reinduccion a la UDS", "PROPIA"),
    ("C7", "NN", "Salto de mas de 3 DE en Z peso/talla entre tomas", "Revisar medicion", "PROPIA"),
    ("C8", "NN", "Talla inferior a la ultima toma (Guia Tabla 13/14)", "EXCLUIR de prevalencias", "GUIA"),
    ("C9", "GS", "Edad gestacional fuera de 4-42 semanas (Guia Tabla 10)", "Revisar", "GUIA"),
    ("D1", "NN", "La clasificacion no corresponde a su puntaje Z", "Recalcular desde Z", "PROPIA"),
    ("D2", "NN", "Canalizacion 'NO' en nino SIN desnutricion aguda", "No contar como no canalizado", "PROPIA"),
    ("D3", "NN", "Nino CON desnutricion aguda sin dato de canalizacion", "ALERTA a supervision", "PROPIA"),
    ("D4", "NN", "Nino CON desnutricion aguda sin dato de FTLC", "ALERTA a supervision", "PROPIA"),
    ("D5", "GS", "IMC gestante incoherente con peso y talla (Guia, consistencia P/T)", "Revisar medicion", "GUIA"),
    ("E1", "NN", "Sin puntaje Z de peso/talla", "Excluir de ese indicador", "PROPIA"),
    ("E2", "AMB", "Sin EPS registrada", "Solicitar al operador", "PROPIA"),
    ("E3", "NN", "Lactancia materna exclusiva con el valor por defecto 6", "Verificar captura", "PROPIA"),
    ("F1", "AMB", "Documento repetido dentro de la misma toma", "Deduplicar", "PROPIA"),
    ("F2", "AMB", "Mismo documento en mas de una unidad de servicio", "Verificar traslado", "PROPIA"),
    ("G1", "AMB", "Beneficiario con una sola toma en el periodo", "Revisar cumplimiento", "PROPIA"),
    ("G2", "AMB", "Ultima toma con dos periodos o mas de rezago", "Revisar cumplimiento", "PROPIA"),
    # ---- criterios de depuracion de la Guia ICBF (Tabla 13 y 14, G44.PP v1) ----
    ("H1", "NN", "Grupo de Edad = Grupo 3 (Guia Tabla 13/14)", "EXCLUIR de prevalencias", "GUIA"),
    ("H2", "NN", "Edad negativa o mayor a 59 meses (Guia Tabla 13/14)", "EXCLUIR de prevalencias", "GUIA"),
    ("H3", "NN", "Sexo = Intersexual (Guia Tabla 13/14)", "EXCLUIR de prevalencias", "GUIA"),
    ("H4", "NN", "Discapacidad Down/Acondroplasia/Paralisis cerebral (Guia)", "EXCLUIR (necesita otro patron)", "GUIA"),
    ("H5", "NN", "Al momento de la valoracion, menor de 40 semanas (Guia)", "EXCLUIR de prevalencias", "GUIA"),
    ("H6", "GS", "Semanas de gestacion en blanco, 0 o menores a 6 (Guia)", "EXCLUIR de prevalencias", "GUIA"),
    ("H7", "GS", "Edad de la gestante menor a 10 o mayor a 60 anios (Guia)", "EXCLUIR de prevalencias", "GUIA"),
    ("H8", "GS", "Embarazo multiple (Guia Tabla 13)", "EXCLUIR de prevalencias", "GUIA"),
    ("H9", "GS", "Sexo = Hombre (Guia Tabla 13)", "SOLO INDICADOR, no se excluye (falta la columna)", "GUIA"),
]

# =============================================================================
# 2. UTILIDADES
# =============================================================================

def norm(v, campo):
    """Texto -> MAYUSCULA sin tildes y sin espacios sobrantes. Numeros intactos."""
    if v is None:
        return None
    if campo in TEXTO:
        s = str(v).strip()
        return s or None
    if not isinstance(v, str):
        return v
    v = " ".join(v.split())
    if not v:
        return None
    d = unicodedata.normalize("NFKD", v)
    return "".join(c for c in d if not unicodedata.combining(c)).upper()

def F(v):
    try: return float(str(v).replace(",", "."))
    except (ValueError, TypeError, AttributeError): return None

def I(v):
    try: return int(float(str(v).replace(",", ".")))
    except (ValueError, TypeError, AttributeError): return None

def clasificar_pt(z):
    """Puntos de corte de la Resolucion 2465 de 2016 para peso/talla."""
    return ("DESNUTRICION AGUDA SEVERA" if z < -3 else
            "DESNUTRICION AGUDA MODERADA" if z < -2 else
            "RIESGO DE DESNUTRICION AGUDA" if z < -1 else
            "PESO ADECUADO PARA LA TALLA" if z <= 1 else
            "RIESGO DE SOBREPESO" if z <= 2 else
            "SOBREPESO" if z <= 3 else "OBESIDAD")

def mil(x):
    return f"{x:,}".replace(",", ".")

# =============================================================================
# 3. EXTRACCION
# =============================================================================

def buscar(base, patron):
    """Encuentra los .xlsx del reporte sin depender del nombre de la subcarpeta."""
    hits = []
    for r, _, fs in os.walk(base):
        if os.path.basename(r).startswith("_"):
            continue
        for f in fs:
            if f.lower().endswith((".xlsx", ".xlsm")) and patron.lower() in f.lower():
                if "consolidado" in f.lower():
                    continue
                hits.append(os.path.join(r, f))
    return sorted(hits)

def extraer(files, alias, destino, log):
    n = 0
    vacias = 0
    with open(destino, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["archivo"] + alias)
        for f in files:
            wb = openpyxl.load_workbook(f, data_only=True, read_only=True)
            ws = wb.active
            it = ws.iter_rows(values_only=True)
            h = list(next(it))
            if len(h) != len(alias):
                log(f"  !! {os.path.basename(f)}: {len(h)} columnas, se esperaban {len(alias)}.")
                log("     La estructura del reporte cambio. Revisar ALIAS_* antes de continuar.")
                sys.exit(2)
            src = os.path.basename(f)
            k = 0
            for row in it:
                if all(v is None or v == "" for v in row):
                    vacias += 1
                    continue
                w.writerow([src] + [norm(row[j] if j < len(row) else None, alias[j])
                                    for j in range(len(alias))])
                k += 1; n += 1
            wb.close()
            log(f"  {src[:56]:<58}{mil(k):>10}")
    return n, vacias

# =============================================================================
# 4. DEPURACION E INDICES
# =============================================================================

def analizar_nn(ruta, R, det, exc, log):
    hist = defaultdict(list); docs_uds = defaultdict(set); par = Counter()
    filas = []; n = 0; tmax = 0
    tmax_cz = {}
    with open(ruta, encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            n += 1; m = []
            doc = row["doc"]; toma = I(row["toma"])
            if toma:
                tmax = max(tmax, toma)
                cz_ = row["cz"] or ""
                tmax_cz[cz_] = max(tmax_cz.get(cz_, 0), toma)
            pt = (row["est_pt"] or "").strip(); te = (row["est_te"] or "").strip()
            pe = (row["est_pe"] or "").strip()
            zpt = F(row["z_pt"]); peso = F(row["peso"]); talla = F(row["talla"])

            if pt and pt not in CAT_PT: R["B1"] += 1; m.append("B1"); det["B1"][pt] += 1
            if te and te not in CAT_TE: R["B2"] += 1; m.append("B2"); det["B2"][te] += 1
            if pe and pe not in CAT_PE: R["B3"] += 1; m.append("B3"); det["B3"][pe] += 1
            for zc, (lo, hi) in OMS.items():
                z = F(row[zc])
                if z is not None and not (lo <= z <= hi):
                    R["C1"] += 1; m.append("C1"); det["C1"][zc] += 1; break
            if I(row["flag"]) not in (0, None):
                R["C2"] += 1; m.append("C2"); det["C2"][row["flag"]] += 1
            # rangos de la Guia Tabla 10 para ninas y ninos 0-72 meses (antes 1.5-40 / 40-135, propios)
            if peso is not None and not (0.5 <= peso <= 45): R["C3"] += 1; m.append("C3")
            if talla is not None and not (30 <= talla <= 130): R["C4"] += 1; m.append("C4")
            if peso and talla and talla > 0 and not (8 <= peso/((talla/100.0)**2) <= 30):
                R["C5"] += 1; m.append("C5")
            if (row["talla_inferior"] or "").strip() == "SI": R["C8"] += 1; m.append("C8")
            # ---- criterios de depuracion de la Guia ICBF (Tabla 13/14) --------
            if (row["grupo_edad"] or "").strip() == "GRUPO3": R["H1"] += 1; m.append("H1")
            em = I(row["edad_meses"])
            if em is not None and (em < 0 or em > 59): R["H2"] += 1; m.append("H2")
            if (row["sexo"] or "").strip() == "INTERSEX": R["H3"] += 1; m.append("H3")
            if (row["dx_discapacidad"] or "").strip() in ("SINDROME DE DOWN", "ACONDROPLASIA", "PARALISIS CEREBRAL"):
                R["H4"] += 1; m.append("H4")
            if (row["menor40sem"] or "").strip() == "SI": R["H5"] += 1; m.append("H5")
            if pt in CAT_PT and zpt is not None and clasificar_pt(zpt) != pt:
                R["D1"] += 1; m.append("D1"); det["D1"][f"{pt} -> {clasificar_pt(zpt)}"] += 1
            can = (row["canalizado"] or "").strip(); ftlc = (row["ftlc"] or "").strip()
            if pt not in AGUDA and can == "NO": R["D2"] += 1; m.append("D2")
            if pt in AGUDA and can not in ("SI", "NO"): R["D3"] += 1; m.append("D3")
            if pt in AGUDA and ftlc not in ("SI", "NO"): R["D4"] += 1; m.append("D4")
            if zpt is None: R["E1"] += 1; m.append("E1")
            if not (row["eps"] or "").strip(): R["E2"] += 1; m.append("E2")
            if I(row["lme"]) == 6: R["E3"] += 1; m.append("E3")

            if toma is not None: par[(doc, toma)] += 1
            docs_uds[doc].add(row["cod_uds"])
            hist[doc].append((toma, talla, zpt, pt))
            filas.append((row, m))
            if m: exc.append((row["archivo"], row["cz"], row["municipio"], row["eas"],
                              row["uds"], doc, toma, ";".join(sorted(set(m)))))
    for doc, v in hist.items():
        v = sorted((x for x in v if x[0] is not None), key=lambda x: x[0])
        for a, b in zip(v, v[1:]):
            if a[1] and b[1] and b[1] < a[1] - 1.0: R["C6"] += 1
            if a[2] is not None and b[2] is not None and abs(b[2] - a[2]) > 3: R["C7"] += 1
    R["F1"] += sum(c - 1 for c in par.values() if c > 1)
    R["F2"] += sum(1 for d, u in docs_uds.items() if len(u) > 1)
    R["G1"] += sum(1 for d, v in hist.items() if len(v) == 1)
    # corte comparable: la ultima toma que TODOS los centros zonales alcanzan
    tcom = min(tmax_cz.values()) if tmax_cz else tmax
    if tcom < tmax:
        rezag = sorted(k for k, v in tmax_cz.items() if v > tcom)
        log(f"  !! Corte desigual: {', '.join(rezag)} trae(n) tomas hasta la {tmax},")
        log(f"     el resto llega a la {tcom}. La cobertura se mide contra la toma {tcom}")
        log("     para que los centros zonales sean comparables.")
    return filas, hist, n, tcom, tmax


def indices_nn(filas, hist, tmax):
    ultima = {}
    for row, m in filas:
        d = row["doc"]; t = I(row["toma"]) or 0
        if d not in ultima or t >= (I(ultima[d][0]["toma"]) or 0):
            ultima[d] = (row, m)

    def antro(pt, te, pe, zte, zpe):
        s = [S_PT.get(pt), S_TE.get(te), S_PE.get(pe)]
        if te == "RETRASO EN TALLA" and zte is not None and zte < -3: s[1] = 90
        if pe == "DESNUTRICION GLOBAL" and zpe is not None and zpe < -3: s[2] = 90
        s = [x for x in s if x is not None]
        return max(s) if s else None

    def tend(doc):
        v = sorted((x for x in hist[doc] if x[0] is not None), key=lambda x: x[0])
        v = [x for x in v if x[3] in ORD_PT]
        if len(v) < 2: return None
        ini, fin = ORD_PT[v[0][3]], ORD_PT[v[-1][3]]
        d = fin - ini
        # 'sin cambio' no significa lo mismo estando bien que estando mal: si la
        # ultima toma esta en el estado adecuado no hay nada que mejorar
        if d == 0 and fin == 0: return 0
        return 0 if d <= -2 else 20 if d == -1 else 40 if d == 0 else 75 if d == 1 else 100

    def fact(row, pt):
        p = []
        c = I(row["n_cyd"])
        p.append(0 if (row["n_cyd"] or "").strip() == "NO APLICA" else
                 30 if c is None else 0 if c >= 2 else 30 if c == 1 else 60)
        va = (row["vac_aldia"] or "").strip()
        p.append(0 if va in ("S", "SI") else 40 if va in ("N", "NO") else 20)
        base = sum(p) / len(p)
        if pt in AGUDA:
            return max(base, 0 if (row["canalizado"] or "").strip() == "SI" else 100,
                       0 if (row["ftlc"] or "").strip() == "SI" else 60)
        return base

    # ---- piso clinico ----------------------------------------------------
    # El componente antropometrico pesa 65 % (antes 50 %, ver commit que
    # quito Oportunidad). Su techo (90 puntos) pesa 58,5 -- por debajo de
    # CRITICO (75) siempre, y por debajo de ALTO RIESGO (50) para retraso
    # en talla, desnutricion global y obesidad en su forma NO severa (70,
    # 75 y 70 puntos base -> 45,5 / 48,75 / 45,5 ponderados). El piso
    # sigue siendo necesario para las siete condiciones de abajo; solo
    # cambia cuanto tiene que subir en cada caso. El piso solo SUBE.
    ORDEN_CLASE = {"ADECUADO": 0, "PREVENTIVO": 1, "ALTO RIESGO": 2, "CRITICO": 3}

    def piso_clinico(pt, te, pe, zte, zpe, canal):
        """Clase minima que impone el hecho clinico, sin mirar el puntaje."""
        p = None
        def sube(x):
            nonlocal p
            if p is None or ORDEN_CLASE[x] > ORDEN_CLASE[p]: p = x
        # desnutricion aguda: como estaba
        if pt == "DESNUTRICION AGUDA SEVERA": sube("CRITICO")
        elif pt == "DESNUTRICION AGUDA MODERADA":
            sube("CRITICO" if canal != "SI" else "ALTO RIESGO")
        # condiciones establecidas: -2 DE es la condicion, -3 DE su forma severa
        if te == "RETRASO EN TALLA":
            sube("CRITICO" if (zte is not None and zte < -3) else "ALTO RIESGO")
        if pe == "DESNUTRICION GLOBAL":
            sube("CRITICO" if (zpe is not None and zpe < -3) else "ALTO RIESGO")
        if pt == "OBESIDAD": sube("ALTO RIESGO")
        return p

    res = []; cat = Counter(); noeval = 0; por_piso = Counter()
    ido = defaultdict(Counter)
    for doc, (row, m) in ultima.items():
        pt = (row["est_pt"] or "").strip(); te = (row["est_te"] or "").strip()
        pe = (row["est_pe"] or "").strip()
        e = ido[row["eas"]]; e["n"] += 1
        if (I(row["toma"]) or 0) >= tmax - 1: e["reciente"] += 1
        if len(hist[doc]) == 1: e["una_toma"] += 1
        if (row["criterio"] or "").strip() == "NO CUMPLE": e["no_cumple"] += 1
        if any(x in m for x in ("C1", "C2", "C5", "C8", "D1")): e["marcas"] += 1
        if pt in AGUDA:
            e["aguda"] += 1
            if (row["canalizado"] or "").strip() != "SI": e["sin_canalizar"] += 1
        flg = I(row["flag"])
        excluye_flag = flg is not None and flg not in (0, 1)   # Guia Tabla 13: el flag 1 SI se evalua
        # Flag 1 (Tabla 9) significa exactamente "z_te fuera de rango": si C1 se
        # disparo SOLO por eso, el flag 1 ya lo explica y no debe excluir -- si
        # no, la excepcion de la Guia para flag 1 quedaria anulada por C1.
        excluye_c1 = "C1" in m and flg != 1
        if any(x in m for x in ("C3", "C4", "C8", "H1", "H2", "H3", "H4", "H5")) or excluye_flag or excluye_c1:
            noeval += 1; res.append((row, m, None, "NO EVALUABLE")); continue
        A = antro(pt, te, pe, F(row["z_te"]), F(row["z_pe"]))
        if A is None:
            noeval += 1; res.append((row, m, None, "NO EVALUABLE")); continue
        T = tend(doc); Fx = fact(row, pt)
        # Se quito Oportunidad (rezago de meses desde la ultima toma): con
        # una toma esperada por TRIMESTRE, no por mes, y beneficiarios que
        # entran a mitad de año o cambian de UDS, ese rezago mensual median
        # mal a quien esta al dia y penalizaba a quien no tiene la culpa.
        # Su 15 % pasa completo a Antropometrico (50 %->65 %): el IRN queda
        # anclado mas en la medida clinica real y menos en un proxy fragil
        # de puntualidad del registro.
        irn = (A*.65/.80 + Fx*.15/.80) if T is None else (A*.65 + T*.20 + Fx*.15)
        irn = round(irn, 1)
        c = ("ADECUADO" if irn < 25 else "PREVENTIVO" if irn < 50
             else "ALTO RIESGO" if irn < 75 else "CRITICO")
        pc = piso_clinico(pt, te, pe, F(row["z_te"]), F(row["z_pe"]),
                          (row["canalizado"] or "").strip())
        if pc is not None and ORDEN_CLASE[pc] > ORDEN_CLASE[c]:
            por_piso[(c, pc)] += 1     # queda el rastro de cuanto movio el piso
            c = pc
        cat[c] += 1
        res.append((row, m, irn, c))
    return res, cat, noeval, ido, por_piso


def analizar_gs(ruta, R, det, exc):
    hist = defaultdict(list); docs_uds = defaultdict(set); par = Counter()
    filas = []; n = 0
    with open(ruta, encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            n += 1; m = []
            doc = row["doc"]; toma = I(row["toma"])
            eg = (row["est_gest"] or "").strip()
            peso = F(row["peso"]); talla = F(row["talla"]); imc = F(row["imc_gest"])
            sem = I(row["sem_gest"])
            if eg and eg not in CAT_GEST: R["B4"] += 1; m.append("B4"); det["B4"][eg] += 1
            # rangos de la Guia Tabla 10 para gestantes (antes 30-180 / 120-200, propios)
            if peso is not None and not (25 <= peso <= 160): R["C3"] += 1; m.append("C3")
            if talla is not None and not (120 <= talla <= 190): R["C4"] += 1; m.append("C4")
            # rango fisiologico de la Guia (texto 7.3.1): menor a 4 o mayor a 42 semanas (antes 4-45, propio)
            if sem is not None and not (4 <= sem <= 42): R["C9"] += 1; m.append("C9")
            if peso and talla and imc and talla > 0:
                if abs(imc - peso/((talla/100.0)**2)) > 1.0: R["D5"] += 1; m.append("D5")
            if not (row["eps"] or "").strip(): R["E2"] += 1; m.append("E2")
            # ---- criterios de depuracion de la Guia ICBF (Tabla 13) -----------
            if sem is None or sem < 6: R["H6"] += 1; m.append("H6")
            ea = I(row["edad_anios"])
            if ea is not None and (ea < 10 or ea > 60): R["H7"] += 1; m.append("H7")
            if (row["multiple"] or "").strip() == "SI": R["H8"] += 1; m.append("H8")
            if toma is not None: par[(doc, toma)] += 1
            docs_uds[doc].add(row["cod_uds"])
            hist[doc].append((toma, eg))
            filas.append((row, m))
            if m: exc.append((row["archivo"], row["cz"], row["municipio"], row["eas"],
                              row["uds"], doc, toma, ";".join(sorted(set(m)))))
    R["F1"] += sum(c - 1 for c in par.values() if c > 1)
    R["F2"] += sum(1 for d, u in docs_uds.items() if len(u) > 1)
    R["G1"] += sum(1 for d, v in hist.items() if len(v) == 1)

    ultima = {}
    for row, m in filas:
        d = row["doc"]; t = I(row["toma"]) or 0
        if d not in ultima or t >= (I(ultima[d][0]["toma"]) or 0):
            ultima[d] = (row, m)
    res = []; cat = Counter()
    for doc, (row, m) in ultima.items():
        eg = (row["est_gest"] or "").strip()
        A = S_GEST.get(eg)
        if A is None or any(x in m for x in ("H6", "H7", "H8")):
            res.append((row, m, None, "NO EVALUABLE")); continue
        v = sorted((x for x in hist[doc] if x[0] is not None and x[1] in ORD_GEST),
                   key=lambda x: x[0])
        T = None
        if len(v) >= 2:
            d_ = ORD_GEST[v[-1][1]] - ORD_GEST[v[0][1]]
            T = 0 if d_ <= -2 else 20 if d_ == -1 else 40 if d_ == 0 else 75 if d_ == 1 else 100
        c_ = I(row["controles"])
        Fx = 60 if c_ is None else 0 if c_ >= 6 else 25 if c_ >= 3 else 60
        # mismo cambio que en el IRN: se quita Oportunidad (rezago mensual,
        # fragil frente a ingresos a mitad de año o cambio de UDS) y su
        # 15 % pasa a Antropometrico
        irg = (A*.65/.80 + Fx*.15/.80) if T is None else (A*.65 + T*.20 + Fx*.15)
        irg = round(irg, 1)
        c = ("ADECUADO" if irg < 25 else "PREVENTIVO" if irg < 50
             else "ALTO RIESGO" if irg < 75 else "CRITICO")
        if eg == "BAJO PESO PARA LA EDAD GESTACIONAL" and c == "PREVENTIVO":
            c = "ALTO RIESGO"
        cat[c] += 1
        res.append((row, m, irg, c))
    return res, cat, n, filas


# =============================================================================
# 5. DICCIONARIO DE DATOS
# =============================================================================

def diccionario(ruta, alias, origen, destino):
    ll = Counter(); dom = defaultdict(Counter); tipo = defaultdict(Counter); n = 0
    with open(ruta, encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            n += 1
            for a in alias:
                v = row.get(a)
                if v in ("", None): continue
                ll[a] += 1
                if len(dom[a]) < 60: dom[a][v] += 1
                tipo[a]["num" if F(v) is not None else "txt"] += 1
    filas = []
    for i, a in enumerate(alias, 1):
        t = ("texto" if a in TEXTO else
             "numero" if tipo[a].get("num", 0) > tipo[a].get("txt", 0) else
             "fecha" if a.startswith("f_") else "texto")
        card = len(dom[a])
        ej = " | ".join(str(k)[:24] for k, _ in dom[a].most_common(4))
        filas.append([origen, i, a, t, ll[a], round(100.0*ll[a]/max(n, 1), 1),
                      ">60" if card >= 60 else card, "SI" if a in PII else "",
                      ej])
    modo = "a" if os.path.exists(destino) else "w"
    with open(destino, modo, newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        if modo == "w":
            w.writerow(["reporte", "posicion", "alias", "tipo", "registros_con_dato",
                        "pct_llenado", "valores_distintos", "dato_personal", "ejemplos"])
        w.writerows(filas)
    return filas


# =============================================================================
# 6. PROGRAMA PRINCIPAL
# =============================================================================

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    base = os.path.abspath(sys.argv[1])
    solo = "--solo-analisis" in sys.argv
    if not os.path.isdir(base):
        sys.exit(f"No existe la carpeta: {base}")
    dst = os.path.join(base, "_procesado")
    os.makedirs(dst, exist_ok=True)

    man = open(os.path.join(dst, "manifiesto.txt"), "w", encoding="utf-8")
    def log(*a):
        s = " ".join(str(x) for x in a)
        print(s, flush=True); man.write(s + "\n")

    log("=" * 78)
    log(" PROCESAMIENTO DE REPORTES DE SEGUIMIENTO NUTRICIONAL")
    log(" Carpeta : " + base)
    log(" Ejecutado: " + datetime.datetime.now().strftime("%d/%m/%Y %H:%M"))
    log("=" * 78)

    fn = buscar(base, PATRON_NN)
    fg = buscar(base, PATRON_GS)
    log(f"\nArchivos encontrados: {len(fn)} de ninas y ninos, {len(fg)} de gestantes")

    nn_csv = os.path.join(dst, "nn_completo.csv")
    gs_csv = os.path.join(dst, "gs_completo.csv")
    R = Counter(); det = defaultdict(Counter); exc = []

    if solo and os.path.exists(nn_csv):
        log("\n--solo-analisis: se reutilizan los CSV ya extraidos.")
        nnn = sum(1 for _ in open(nn_csv, encoding="utf-8-sig")) - 1
        ngs = sum(1 for _ in open(gs_csv, encoding="utf-8-sig")) - 1 if os.path.exists(gs_csv) else 0
    else:
        log("\n[1/4] Extraccion NN")
        nnn, v1 = extraer(fn, ALIAS_NN, nn_csv, log)
        log("\n[1/4] Extraccion GS")
        ngs, v2 = extraer(fg, ALIAS_GS, gs_csv, log)
        R["A2"] = v1 + v2
    log(f"\n  NN: {mil(nnn)} filas x {len(ALIAS_NN)} campos")
    log(f"  GS: {mil(ngs)} filas x {len(ALIAS_GS)} campos")

    # --- control de cobertura de centros zonales
    log("\n[2/4] Control de cobertura")
    for etiqueta, ruta in (("NN", nn_csv), ("GS", gs_csv)):
        vistos = set()
        with open(ruta, encoding="utf-8-sig") as fh:
            for row in csv.DictReader(fh):
                if row["cz"]: vistos.add(row["cz"])
        faltan = [c for c in CZ_ESPERADOS if c not in vistos]
        extra = sorted(vistos - set(CZ_ESPERADOS))
        log(f"  {etiqueta}: {len(vistos)} de {len(CZ_ESPERADOS)} centros zonales")
        if faltan:
            R["A1"] += len(faltan)
            log(f"     !! FALTAN: {', '.join(faltan)}")
        if extra:
            log(f"     ?? no estaban en la lista esperada: {', '.join(extra)}")

    log("\n[3/4] Depuracion e indices")
    filas, hist, nnn2, tmax, tmax_real = analizar_nn(nn_csv, R, det, exc, log)
    res_nn, cat_nn, noeval, ido, piso_nn = indices_nn(filas, hist, tmax)
    res_gs, cat_gs, ngs2, filas_gs = analizar_gs(gs_csv, R, det, exc)
    log(f"  Periodo detectado: tomas 1 a {tmax_real}  ·  corte comparable: toma {tmax}"
        f"  ·  beneficiarios NN: {mil(len(hist))}")

    log("\n[4/4] Escritura de resultados")
    campos = list(filas[0][0].keys())
    with open(os.path.join(dst, "nn_ultima_toma.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh); w.writerow(campos + ["marcas_calidad", "irn", "clasificacion_irn"])
        for row, m, v, c in res_nn:
            w.writerow([row[k] for k in campos] + [";".join(sorted(set(m))), v, c])
    campos_gs = list(filas_gs[0][0].keys())
    with open(os.path.join(dst, "gs_ultima_toma.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh); w.writerow(campos_gs + ["marcas_calidad", "irg", "clasificacion_irg"])
        for row, m, v, c in res_gs:
            w.writerow([row[k] for k in campos_gs] + [";".join(sorted(set(m))), v, c])
    with open(os.path.join(dst, "excepciones.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["archivo", "centro_zonal", "municipio", "eas", "uds", "documento", "toma", "reglas"])
        w.writerows(exc)

    filas_ido = []
    for eas, e in ido.items():
        if e["n"] < 300: continue
        cob = 100.0*(1 - e["reciente"]/e["n"]); seg = 100.0*e["una_toma"]/e["n"]
        cum = 100.0*e["no_cumple"]/e["n"]; cal = 100.0*e["marcas"]/e["n"]
        cli = 100.0*e["sin_canalizar"]/e["aguda"] if e["aguda"] else 0.0
        filas_ido.append((round(cob*.30+seg*.20+cum*.20+cal*.15+cli*.15, 1), e["n"],
                          cob, seg, cum, cal, cli, eas))
    filas_ido.sort(reverse=True)
    with open(os.path.join(dst, "indice_operadores.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(["eas", "beneficiarios", "ido", "cobertura", "una_toma", "no_cumple",
                    "marcas", "sin_canalizar"])
        for v, k, a, b, c, d, e_, eas in filas_ido:
            w.writerow([eas, k, v, round(a, 1), round(b, 1), round(c, 1), round(d, 1), round(e_, 1)])

    dic = os.path.join(dst, "diccionario_datos.csv")
    if os.path.exists(dic): os.remove(dic)
    diccionario(nn_csv, ALIAS_NN, "NN", dic)
    diccionario(gs_csv, ALIAS_GS, "GS", dic)

    # ------------------------------- panel ----------------------------------
    p = os.path.join(dst, "PANEL depuracion y calidad.txt")
    with open(p, "w", encoding="utf-8") as fh:
        def W(*a): fh.write(" ".join(str(x) for x in a) + "\n")
        W("=" * 104)
        W(f"PANEL DE DEPURACION Y CALIDAD   ·   {datetime.datetime.now():%d/%m/%Y %H:%M}")
        W(f"NN {mil(nnn)} filas de toma  ·  GS {mil(ngs)}  ·  periodo: tomas 1 a {tmax_real}"  + (f"  ·  corte comparable: toma {tmax}" if tmax < tmax_real else ""))
        W("=" * 104)
        W(f"{'REGLA':<6}{'':<4}{'DESCRIPCION':<54}{'MARCADOS':>10}{'%':>8}  ACCION")
        W("-" * 104)
        for cod, amb, desc, acc, origen in REGLAS:
            v = R[cod]
            base_ = len(hist) if cod in ("F2", "G1") else (ngs if amb == "GS" else nnn)
            pct = 100.0*v/base_ if base_ else 0
            sev = "!!" if pct > 5 else ("!" if v else "  ")
            W(f"{cod:<6}{amb:<4}{desc[:53]:<54}{mil(v):>10}{pct:>7.2f}% {sev} {acc}  [{origen}]")
        W("-" * 104)
        W(f"Filas con al menos una marca: {mil(len(exc))}")
        for r in ("B1", "B2", "B3", "B4", "C1", "C2", "D1"):
            if det[r]:
                W(f"\nDETALLE {r}")
                for v, c in det[r].most_common(8):
                    W(f"   {str(v)[:66]:<68}{mil(c):>8}")
        W("")
        W("=" * 104); W("INDICE DE RIESGO NUTRICIONAL - NINAS Y NINOS (IRN)"); W("=" * 104)
        W("")
        W("  El puntaje ordena por prioridad; la CLASE la fija el piso clinico cuando la")
        W("  norma no admite ambiguedad. El piso solo sube la clase, nunca la baja.")
        W("     aguda severa            -> CRITICO")
        W("     aguda moderada          -> CRITICO si no esta canalizada, si no ALTO RIESGO")
        W("     retraso en talla        -> ALTO RIESGO   (CRITICO si Z < -3)")
        W("     desnutricion global     -> ALTO RIESGO   (CRITICO si Z < -3)")
        W("     obesidad                -> ALTO RIESGO")
        if piso_nn:
            W("")
            W("  Casos que subieron de clase por el piso clinico:")
            for (de, a), n in sorted(piso_nn.items(), key=lambda x: -x[1]):
                W("     %-12s -> %-12s %7d" % (de, a, n))
            W("     %-12s    %-12s %7d" % ("TOTAL", "", sum(piso_nn.values())))
        t = sum(cat_nn.values())
        for k in ("ADECUADO", "PREVENTIVO", "ALTO RIESGO", "CRITICO"):
            W(f"  {k:<14}{mil(cat_nn[k]):>9}{100.0*cat_nn[k]/t:>8.2f}%   " + "#"*int(100.0*cat_nn[k]/t/2))
        W(f"  {'NO EVALUABLE':<14}{mil(noeval):>9}{100.0*noeval/(t+noeval):>8.2f}%   (excluidos por implausibilidad)")
        W("")
        W("=" * 104); W("INDICE DE RIESGO GESTACIONAL (IRG)"); W("=" * 104)
        t2 = sum(cat_gs.values())
        noeval_gs = sum(1 for _, _, _, c in res_gs if c == "NO EVALUABLE")
        for k in ("ADECUADO", "PREVENTIVO", "ALTO RIESGO", "CRITICO"):
            W(f"  {k:<14}{mil(cat_gs[k]):>9}{100.0*cat_gs[k]/max(t2,1):>8.2f}%   " + "#"*int(100.0*cat_gs[k]/max(t2,1)/2))
        W(f"  {'NO EVALUABLE':<14}{mil(noeval_gs):>9}{100.0*noeval_gs/max(t2+noeval_gs,1):>8.2f}%   (excluidos por implausibilidad)")
        W("")
        W("=" * 104); W("INDICE DE DESEMPENO DEL OPERADOR (IDO)   0 = mejor, 100 = peor"); W("=" * 104)
        W(f"  {'IDO':>6}{'n':>8}{'Cobert':>8}{'1 toma':>8}{'NoCumpl':>9}{'Marcas':>8}{'SinCanal':>10}  ENTIDAD")
        for v, k, a, b, c, d, e_, eas in filas_ido[:12]:
            W(f"  {v:>6.1f}{mil(k):>8}{a:>7.1f}%{b:>7.1f}%{c:>8.1f}%{d:>7.1f}%{e_:>9.1f}%  {eas[:46]}")
        W("  ...")
        for v, k, a, b, c, d, e_, eas in filas_ido[-5:]:
            W(f"  {v:>6.1f}{mil(k):>8}{a:>7.1f}%{b:>7.1f}%{c:>8.1f}%{d:>7.1f}%{e_:>9.1f}%  {eas[:46]}")

    log("\n  nn_completo.csv · gs_completo.csv")
    log("  nn_ultima_toma.csv · gs_ultima_toma.csv")
    log("  excepciones.csv · indice_operadores.csv · diccionario_datos.csv")
    log("  PANEL depuracion y calidad.txt")
    log("\nLISTO.")
    man.close()


if __name__ == "__main__":
    main()
