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

# Lo que se publica sale de main. Una rama local con commits que main no
# tiene es trabajo que el sitio publicado NO va a reflejar aunque el build
# haya salido limpio -- paso ya vivido una vez (filtros + Calidad del dato
# por origen quedaron meses en una rama sin fusionar). Se aborta antes de
# tocar el sitio en vivo.
cd "$REPO"
RAMA_ACTUAL="$(git rev-parse --abbrev-ref HEAD)"
if [ "$RAMA_ACTUAL" != "main" ]; then
  echo "ABORTA: estas en la rama '$RAMA_ACTUAL', no en main. Se publica desde main."
  exit 1
fi
SIN_FUSIONAR="$(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v '^main$' | while read -r b; do
  git log --oneline "main..$b" 2>/dev/null | grep -q . && echo "$b"
done)"
if [ -n "$SIN_FUSIONAR" ]; then
  echo "ABORTA: hay ramas locales con commits sin fusionar a main:"
  echo "$SIN_FUSIONAR"
  echo "Fusionalas (o descartalas a proposito) antes de publicar -- si no, el sitio"
  echo "publicado queda sin ese trabajo aunque el build salga limpio."
  exit 1
fi

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
