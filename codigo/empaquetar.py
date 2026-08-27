# -*- coding: utf-8 -*-
"""
Empaqueta el tablero como documento HTML autonomo.

El artefacto publicado se sirve dentro de un esqueleto que la plataforma
arma, con su <!doctype>, su <head> y su <meta charset>. El archivo suelto
que se abre con doble clic no tiene nada de eso: el navegador adivina la
codificacion, elige la del sistema y las tildes salen rotas.

Este paso envuelve el cuerpo en un documento completo, con UTF-8 declarado.
"""
import io, os, sys, base64

D = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(D, "tablero.html")
DESTINO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, "tablero_autonomo.html")

import datetime
cuerpo = io.open(ORIGEN, encoding="utf-8").read()

# favicon: red de nodos, calcada del boceto del equipo (esferas con
# degradado radial + sombra + halo organico de fondo) pero con los verdes
# institucionales del propio tablero en vez de los del boceto.
FAVICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">'
    '<defs>'
    '<radialGradient id="gC" cx="32%" cy="28%" r="75%">'
    '<stop offset="0%" stop-color="#5C8F53"/><stop offset="100%" stop-color="#33502D"/>'
    '</radialGradient>'
    '<radialGradient id="gM" cx="32%" cy="28%" r="75%">'
    '<stop offset="0%" stop-color="#93CB6E"/><stop offset="100%" stop-color="#4F8245"/>'
    '</radialGradient>'
    '<radialGradient id="gL" cx="32%" cy="28%" r="75%">'
    '<stop offset="0%" stop-color="#B4E491"/><stop offset="100%" stop-color="#72BF44"/>'
    '</radialGradient>'
    '<radialGradient id="gA" cx="32%" cy="28%" r="75%">'
    '<stop offset="0%" stop-color="#D3F0BC"/><stop offset="100%" stop-color="#93CB6E"/>'
    '</radialGradient>'
    '<filter id="fs" x="-40%" y="-40%" width="180%" height="180%">'
    '<feDropShadow dx="0.4" dy="0.8" stdDeviation="0.6" flood-color="#12211a" flood-opacity=".35"/>'
    '</filter>'
    '</defs>'
    '<ellipse cx="20" cy="21" rx="19" ry="17" fill="#72BF44" opacity=".16"/>'
    '<line x1="20" y1="21" x2="9" y2="13" stroke="#4F8245" stroke-width="3" stroke-linecap="round"/>'
    '<line x1="20" y1="21" x2="29" y2="10" stroke="#4F8245" stroke-width="3" stroke-linecap="round"/>'
    '<line x1="29" y1="10" x2="36" y2="18" stroke="#72BF44" stroke-width="3" stroke-linecap="round"/>'
    '<line x1="20" y1="21" x2="24" y2="33" stroke="#4F8245" stroke-width="3" stroke-linecap="round"/>'
    '<circle cx="9" cy="13" r="6" fill="url(#gM)" filter="url(#fs)"/>'
    '<circle cx="29" cy="10" r="6" fill="url(#gL)" filter="url(#fs)"/>'
    '<circle cx="36" cy="18" r="4.6" fill="url(#gA)" filter="url(#fs)"/>'
    '<circle cx="24" cy="33" r="5.6" fill="url(#gM)" filter="url(#fs)"/>'
    '<circle cx="20" cy="21" r="8.2" fill="url(#gC)" filter="url(#fs)"/>'
    '</svg>'
)
FAVICON_HREF = "data:image/svg+xml;base64," + base64.b64encode(FAVICON_SVG.encode("utf-8")).decode("ascii")
# sella la fecha y hora de armado, para distinguir un archivo nuevo de
# una copia que el navegador dejo en cache
SELLO = datetime.datetime.now().strftime("%d-%m-%Y %H:%M")
cuerpo = cuerpo.replace('"faltantes":', '"build":"' + SELLO + '","faltantes":', 1)

# el titulo va dentro del <head>, no suelto en el cuerpo
titulo = "Tablero de vigilancia nutricional · ICBF Regional Antioquia"
i = cuerpo.find("<title>")
if i >= 0:
    j = cuerpo.find("</title>") + len("</title>")
    titulo = cuerpo[i + 7:cuerpo.find("</title>")]
    cuerpo = cuerpo[:i] + cuerpo[j:]

doc = (
    "<!doctype html>\n"
    '<html lang="es">\n'
    "<head>\n"
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    '<meta name="color-scheme" content="light">\n'
    "<title>" + titulo + "</title>\n"
    '<link rel="icon" type="image/svg+xml" href="' + FAVICON_HREF + '">\n'
    "<style>\n"
    "html,body{margin:0;padding:0}\n"
    "*,*::before,*::after{box-sizing:border-box}\n"
    "</style>\n"
    "</head>\n"
    "<body>\n"
    + cuerpo.lstrip("\n") +
    "\n</body>\n</html>\n"
)

with io.open(DESTINO, "w", encoding="utf-8") as f:
    f.write(doc)
print("empaquetado:", DESTINO, os.path.getsize(DESTINO) // 1024 // 1024, "MB")
print("  charset declarado:", '<meta charset="utf-8">' in doc)
print("  doctype:", doc.startswith("<!doctype html>"))
print("  versión sellada:", SELLO)
