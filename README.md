# Informe nutricional · ICBF Regional Antioquia

Tubería que convierte los reportes de seguimiento nutricional descargados del
sistema en un tablero de control de una sola página, para la supervisión de la
Regional Antioquia.

## Qué se versiona aquí y qué no

**Este repositorio contiene únicamente código.** No contiene datos, y no debe
contenerlos.

Los reportes del sistema traen datos personales de menores de edad —tipo y
número de documento, nombres, apellidos y fecha de nacimiento—, y todo lo que
el ETL deriva de ellos los arrastra. El tablero generado no lleva nombres,
pero sí embebe alrededor de 82.000 números de documento, porque hacen falta
para poder ubicar un caso en el sistema.

Nada de eso sale de la carpeta de trabajo. El `.gitignore` excluye los
reportes, la carpeta `_procesado`, el tablero generado y los respaldos.

Si alguna vez hace falta compartir cifras fuera de la entidad, se comparte el
agregado, nunca el registro.

## Estructura

```
TABLERO NUTRICIONAL.html   el entregable (generado · no se versiona)
codigo/
  procesar_reportes.py     ETL: lee los .xlsx, depura, calcula IRN e IDO
  generar_tablero.py       arma el dataset columnar que lee el tablero
  generar_mapa.py          simplifica el geojson de municipios y comunas
  generar_coordenadas_uds.py   ubica cada unidad de servicio en el mapa
  generar_figuras.py       prepara las siluetas de la sección Perfil
  empaquetar.py            envuelve la plantilla en un HTML completo
  plantilla/
    tpl_head.html          estilos, fichas técnicas y armazón
    tpl_tail.js            componentes gráficos y vistas
recursos/                  geografía, coordenadas y figuras ya procesadas
_procesado/                salida del ETL (ignorado)
NN/ · GS/                  reportes descargados (ignorado)
```

## Cómo se regenera

```bash
python codigo/procesar_reportes.py .          # 1. depura y calcula los índices
python codigo/generar_tablero.py              # 2. arma el dataset columnar
cat codigo/plantilla/tpl_head.html codigo/plantilla/tpl_tail.js > tpl.html
python codigo/empaquetar.py "TABLERO NUTRICIONAL.html"   # 3. empaqueta
```

El paso 1 es parametrizable: apuntándolo a otra carpeta de reportes aplica las
mismas 27 reglas de depuración y los mismos índices, sin tocar nada más.

## Criterios que conviene no perder

- **Ninguna regla borra datos.** Cada una marca el registro y deja el rastro en
  `excepciones.csv` y en el panel de depuración. Los `.xlsx` originales no se
  modifican nunca.
- **El corte comparable** es el mínimo de las tomas máximas por centro zonal, de
  modo que una descarga desfasada no rompa la comparación entre territorios.
- **El piso clínico prevalece sobre el puntaje del IRN.** El componente
  antropométrico pesa 50 % y su techo son 90 puntos, o sea 45: sin el piso,
  ninguna condición antropométrica alcanzaba su clase por sí sola.

## Referencias normativas

Resolución 2465 de 2016 (MinSalud) · Patrones de Crecimiento OMS 2006 ·
Resolución 3280 de 2018 · Anexo 1 A14.G4.PP, orientaciones para la toma de
medidas antropométricas en el ICBF.
