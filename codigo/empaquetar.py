# -*- coding: utf-8 -*-
"""
Empaqueta el tablero como documento HTML autonomo.

El artefacto publicado se sirve dentro de un esqueleto que la plataforma
arma, con su <!doctype>, su <head> y su <meta charset>. El archivo suelto
que se abre con doble clic no tiene nada de eso: el navegador adivina la
codificacion, elige la del sistema y las tildes salen rotas.

Este paso envuelve el cuerpo en un documento completo, con UTF-8 declarado.
"""
import io, os, sys

D = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(D, "tablero.html")
DESTINO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, "tablero_autonomo.html")

import datetime
cuerpo = io.open(ORIGEN, encoding="utf-8").read()
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
