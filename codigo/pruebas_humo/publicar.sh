#!/bin/bash
# Publica "TABLERO PUBLICO.html" en Vercel y corre las pruebas de humo
# JUSTO DESPUES, en la misma corrida -- para que publicar y verificar sean
# un solo paso y nadie tenga que acordarse de correrlas aparte.
#
# Uso, desde cualquier lado (resuelve las rutas solo):
#   bash codigo/pruebas_humo/publicar.sh
#
# Requiere que ya exista "TABLERO PUBLICO.html" en la raiz del repo
# (generado con PUBLICO=1 python codigo/generar_tablero.py + empaquetar.py
# -- ver README.md, "Como se regenera").
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ORIGEN="$REPO/TABLERO PUBLICO.html"
DESTINO_DIR="$HOME/tablero-publico"

if [ ! -f "$ORIGEN" ]; then
  echo "No existe '$ORIGEN'."
  echo "Generalo primero:  PUBLICO=1 python codigo/generar_tablero.py  y luego empaquetar.py"
  exit 1
fi
if [ ! -d "$DESTINO_DIR" ]; then
  echo "No existe la carpeta de despliegue '$DESTINO_DIR' (ver codigo/api_publico/LEEME.txt)."
  exit 1
fi

echo "Copiando TABLERO PUBLICO.html -> $DESTINO_DIR/index.html"
cp "$ORIGEN" "$DESTINO_DIR/index.html"

echo ""
echo "Publicando en Vercel..."
( cd "$DESTINO_DIR" && vercel --prod --yes )

echo ""
echo "Publicado. Corriendo pruebas de humo..."
echo ""
cd "$REPO/codigo/pruebas_humo"
if [ ! -d node_modules ]; then npm install; fi
node pruebas_humo.js
