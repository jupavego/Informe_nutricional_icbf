#!/usr/bin/env node
/*
 * Pruebas de humo del tablero nutricional publicado.
 *
 * Corre en un navegador real (Playwright) contra el sitio en vivo, sin
 * pasar por un LLM: reproduce, como script determinista, la auditoria de
 * congruencia que se hizo a mano en la conversacion del 2026-08 (formula
 * IRN/IRG portada a JS, composicion de filtros, valores imposibles).
 *
 * Uso:
 *   cd codigo/pruebas_humo
 *   npm install          (una sola vez; usa el Chromium ya cacheado si existe)
 *   node pruebas_humo.js [URL]
 *
 * Sin URL usa la produccion (project-bnivv.vercel.app). Para probar un
 * archivo local antes de publicar:
 *   node pruebas_humo.js "file:///C:/ruta/al/TABLERO NUTRICIONAL.html"
 *
 * Sale con codigo 0 si todo paso, 1 si alguna prueba fallo -- pensado para
 * poder engancharse a un cron/CI sin que nadie tenga que leer el detalle
 * salvo que algo se rompa.
 */
const { chromium } = require("playwright");

const URL = process.argv[2] || "https://project-bnivv.vercel.app/";
const resultados = [];

function ok(nombre, condicion, detalle) {
  resultados.push({ nombre, ok: !!condicion, detalle: detalle || "" });
}

async function main() {
  console.log("Pruebas de humo -- " + URL);
  console.log("=".repeat(70));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let statusHttp = null;
  const resp = await page.goto(URL, { waitUntil: "load", timeout: 120000 });
  statusHttp = resp ? resp.status() : null;
  ok("El sitio responde 200", statusHttp === 200, "status=" + statusHttp);
  if (statusHttp !== 200) {
    await imprimirYSalir(browser);
    return;
  }

  // el tablero termina de armar el DOM (render() dentro de init()) de forma
  // sincronica al cargar el script, asi que si "#lateral" tiene contenido
  // ya esta listo -- no hace falta esperar timers.
  await page.waitForSelector("#lateral .n", { timeout: 30000 }).catch(() => {});

  const version = await page.evaluate(() => (typeof D !== "undefined" && D.meta && D.meta.build) || null);
  console.log("Version del build: " + (version || "(no encontrada)"));

  // ---------------------------------------------------------------------
  // 1) las 13 pestañas renderizan sin lanzar excepcion (igual a lo que
  //    hace "Informe completo (PDF)" internamente)
  // ---------------------------------------------------------------------
  const rTabs = await page.evaluate(() => {
    const errores = [];
    const tabAntes = TAB;
    VIEWS.forEach(([id]) => {
      try { TAB = id; VISTAS[id](); } catch (e) { errores.push({ id, error: String(e) }); }
    });
    TAB = tabAntes; FCZ = FMUN = FEAS = -1; FMES = null; render();
    return { errores, total: VIEWS.length };
  });
  ok("Las " + rTabs.total + " pestañas renderizan sin error", rTabs.errores.length === 0,
    JSON.stringify(rTabs.errores));

  // ---------------------------------------------------------------------
  // 2) regresion exacta: construirVistaNN/GS con TODOS los meses alguna
  //    vez vistos (no MESES_CORTE, que a proposito deja fuera los meses
  //    mas alla del corte comparable -- ver tpl_tail.js) debe reproducir
  //    D.nn/D.gs campo por campo: el IRN/IRG portado a JS no debe
  //    desviarse un solo digito del que calculo procesar_reportes.py en
  //    Python, sea cual sea la toma mas reciente de cada quien.
  // ---------------------------------------------------------------------
  const rRegresion = await page.evaluate(() => {
    const todosLosMeses = new Set([
      ...((D.historico && D.historico.nn && D.historico.nn.meses) || []),
      ...((D.historico && D.historico.gs && D.historico.gs.meses) || []),
    ]);
    const vNN = construirVistaNN(todosLosMeses), vGS = construirVistaGS(todosLosMeses);
    const camposNN = ["pt", "te", "pe", "irn", "irc", "nt", "tm", "ev", "cr", "can", "ftlc",
      "kg", "cm", "pb", "pc", "zt", "zp", "fl"];
    const camposGS = ["st", "ed", "tm", "ctl", "irg", "irc", "sg", "kg", "cm", "imc"];
    const idxB = new Map(); D.nn.doc.forEach((d, i) => idxB.set(d, i));
    let mmNN = 0;
    for (let i = 0; i < vNN.doc.length; i++) {
      const j = idxB.get(vNN.doc[i]);
      for (const c of camposNN) if (D.nn[c][j] !== vNN[c][i]) mmNN++;
    }
    const idxBG = new Map(); D.gs.doc.forEach((d, i) => idxBG.set(d, i));
    let mmGS = 0;
    for (let i = 0; i < vGS.doc.length; i++) {
      const j = idxBG.get(vGS.doc[i]);
      for (const c of camposGS) if (D.gs[c][j] !== vGS[c][i]) mmGS++;
    }
    return { n_nn: vNN.doc.length, n_gs: vGS.doc.length, mmNN, mmGS };
  });
  ok("Vista NN (todos los meses) == D.nn, 0 diferencias",
    rRegresion.mmNN === 0, rRegresion.mmNN + " diferencias en " + rRegresion.n_nn + " beneficiarios");
  ok("Vista GS (todos los meses) == D.gs, 0 diferencias",
    rRegresion.mmGS === 0, rRegresion.mmGS + " diferencias en " + rRegresion.n_gs + " gestantes");

  // ---------------------------------------------------------------------
  // 3) composicion de filtros: ni perdida ni duplicado al combinarlos
  //    (la clase de bug que se encontro en el tablero de georreferenciacion
  //    de Buen Comienzo Medellin -- ver conversacion 2026-08)
  // ---------------------------------------------------------------------
  const rFiltros = await page.evaluate(() => {
    FCZ = -1; FMUN = -1; FEAS = -1; FMES = null; aplicarFiltroMeses();
    const totalNN = idxNN().length, totalGS = idxGS().length;

    let sumaCZ_NN = 0, sumaCZ_GS = 0;
    for (let cz = 0; cz < DIC.cz.length; cz++) { FCZ = cz; sumaCZ_NN += idxNN().length; sumaCZ_GS += idxGS().length; }
    FCZ = -1;

    FCZ = 0;
    const totalCZ0 = idxNN().length;
    const munsEnCZ0 = new Set(idxNN().map(i => N.mun[i]));
    let sumaMun = 0;
    for (const mun of munsEnCZ0) { FMUN = mun; sumaMun += idxNN().length; }
    FMUN = -1;

    FCZ = 0; const nSoloCz = idxNN().length;
    FEAS = 0; const nCzMasEas = idxNN().length;
    const monotono = nCzMasEas <= nSoloCz;
    FCZ = -1; FEAS = -1;

    FCZ = 3; FMUN = 10; FEAS = 5; FMES = new Set([2, 3]); aplicarFiltroMeses();
    FCZ = -1; FMUN = -1; FEAS = -1; FMES = null; aplicarFiltroMeses();
    const totalTrasLimpiar = idxNN().length;

    return {
      totalNN, totalGS, sumaCZ_NN, sumaCZ_GS, totalCZ0, sumaMun, monotono, totalTrasLimpiar,
    };
  });
  ok("Suma de cada CZ (niñez) == total regional",
    rFiltros.sumaCZ_NN === rFiltros.totalNN, rFiltros.sumaCZ_NN + " vs " + rFiltros.totalNN);
  ok("Suma de cada CZ (gestantes) == total regional",
    rFiltros.sumaCZ_GS === rFiltros.totalGS, rFiltros.sumaCZ_GS + " vs " + rFiltros.totalGS);
  ok("Suma de municipios dentro de un CZ == total de ese CZ",
    rFiltros.sumaMun === rFiltros.totalCZ0, rFiltros.sumaMun + " vs " + rFiltros.totalCZ0);
  ok("Agregar un filtro nunca aumenta el conteo (monotonia)", rFiltros.monotono);
  ok("Limpiar filtros restaura el total exacto",
    rFiltros.totalTrasLimpiar === rFiltros.totalNN, rFiltros.totalTrasLimpiar + " vs " + rFiltros.totalNN);

  // ---------------------------------------------------------------------
  // 4) el filtro de Meses tampoco pierde ni duplica: la union de "un solo
  //    mes" para cada mes SELECCIONABLE (MESES_CORTE, que a proposito deja
  //    fuera lo que esta mas alla del corte comparable) debe dar
  //    EXACTAMENTE el mismo conjunto de personas que marcarlos todos a la
  //    vez -- OJO, esto ya NO tiene por que coincidir con "todos los
  //    meses" sin filtro (FMES=null), porque quien solo tiene toma en un
  //    mes fuera de MESES_CORTE queda fuera del filtro a proposito.
  // ---------------------------------------------------------------------
  const rMeses = await page.evaluate(() => {
    FCZ = -1; FMUN = -1; FEAS = -1;
    FMES = new Set(MESES_CORTE); aplicarFiltroMeses();
    const docsTodos = new Set(idxNN().map(i => N.doc[i]));
    let union = new Set();
    for (const m of MESES_CORTE) {
      FMES = new Set([m]); aplicarFiltroMeses();
      idxNN().forEach(i => union.add(N.doc[i]));
    }
    FMES = null; aplicarFiltroMeses();
    const faltan = [...docsTodos].filter(d => !union.has(d)).length;
    const sobran = [...union].filter(d => !docsTodos.has(d)).length;
    return { docsTodos: docsTodos.size, union: union.size, faltan, sobran };
  });
  ok("Union de filtros de un solo mes == todos los meses seleccionables a la vez (sin perder ni duplicar)",
    rMeses.faltan === 0 && rMeses.sobran === 0 && rMeses.union === rMeses.docsTodos,
    JSON.stringify(rMeses));

  // ---------------------------------------------------------------------
  // 5) barrido de valores imposibles (NaN/infinito/fuera de rango) bajo
  //    varios escenarios de filtro, incluyendo meses no consecutivos
  // ---------------------------------------------------------------------
  const rBarrido = await page.evaluate(() => {
    function barrer(v, campos) {
      let malos = 0;
      for (const c of campos) for (let i = 0; i < v[c].length; i++) {
        const x = v[c][i];
        if (typeof x === "number" && (isNaN(x) || !isFinite(x))) malos++;
      }
      return malos;
    }
    const escenarios = [null, new Set(MESES_CORTE.slice(0, Math.ceil(MESES_CORTE.length / 2))),
      new Set([MESES_CORTE[0]]),
      MESES_CORTE.length > 2 ? new Set([MESES_CORTE[0], MESES_CORTE[MESES_CORTE.length - 1]]) : null];
    let malos = 0, fueraDeRango = 0, n = 0;
    for (const fm of escenarios) {
      if (!fm && fm !== null) continue;
      const vN = construirVistaNN(fm), vG = construirVistaGS(fm);
      malos += barrer(vN, ["irn", "zt", "zp", "pt", "te", "pe", "irc", "em", "kg", "cm"]);
      malos += barrer(vG, ["irg", "imc", "st", "irc"]);
      fueraDeRango += vN.irn.filter(x => x !== -1 && (x < 0 || x > 100)).length;
      fueraDeRango += vN.irc.filter(x => x < 0 || x > 5).length;
      n += vN.doc.length + vG.doc.length;
    }
    return { malos, fueraDeRango, n };
  });
  ok("Sin NaN/infinito en " + rBarrido.n + " valores revisados (varios filtros)", rBarrido.malos === 0,
    rBarrido.malos + " valores malos");
  ok("Sin IRN/IRC fuera de rango", rBarrido.fueraDeRango === 0, rBarrido.fueraDeRango + " fuera de rango");

  // ---------------------------------------------------------------------
  // 6) UI del filtro de Meses: el panel existe, se puebla y responde a un
  //    clic real (no solo a llamar las funciones desde la consola)
  // ---------------------------------------------------------------------
  const trigger = await page.$("#fmesTrigger");
  ok("El boton del filtro de Meses existe en el DOM", !!trigger);
  if (trigger) {
    await trigger.click();
    const panelVisible = await page.evaluate(() => document.querySelector("#fmesPanel").classList.contains("abierto"));
    ok("El panel de Meses se abre al hacer clic", panelVisible);
    await trigger.click(); // lo vuelve a cerrar, no dejar el estado sucio
  }

  await browser.close();
  imprimirResumen();
}

function imprimirResumen() {
  console.log("");
  let fallas = 0;
  for (const r of resultados) {
    console.log((r.ok ? "  OK  " : "  FAIL") + "  " + r.nombre + (r.detalle ? "  (" + r.detalle + ")" : ""));
    if (!r.ok) fallas++;
  }
  console.log("=".repeat(70));
  console.log(resultados.length - fallas + "/" + resultados.length + " pruebas pasaron.");
  process.exit(fallas > 0 ? 1 : 0);
}

async function imprimirYSalir(browser) {
  await browser.close();
  imprimirResumen();
}

main().catch(e => {
  console.error("Error inesperado corriendo las pruebas:", e);
  process.exit(2);
});
