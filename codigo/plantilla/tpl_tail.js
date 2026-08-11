


/* iconografia propia en SVG: los emoji se ven distinto en cada sistema y no
   imprimen bien en un informe institucional */
const ICO = {
  semaforo: "M12 3a9 9 0 0 0-9 9h4m14 0h-4m-1-6.4-2.8 2.8M12 12l4-6",
  mapa: "M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4zm0 0v13m6-10.5v13",
  anatomia: "M12 3v3m0 12v3M3 12h3m12 0h3M7.8 7.8 5.6 5.6m12.8 12.8-2.2-2.2M7.8 16.2l-2.2 2.2M18.4 5.6l-2.2 2.2M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  perfil: "M12 3.2a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2zM8.4 10.6h7.2l1.4 5.2h-2.1l-.5 5h-6l-.5-5H5.8l1.4-5.2zM4 6.5h2M18 6.5h2M4 17h2M18 17h2",
  estado: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  critica: "M12 4 2.5 20h19L12 4zm0 5.5v5m0 2.5v.5",
  gestantes: "M13.5 5.2a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0zM11 9c-2.2 0-3.3 1.6-3.3 4.2 0 2.7 1.3 3.8 1.3 3.8L8.5 21h6l-.6-4s1.6-1 1.6-3.8C15.5 10.6 13.9 9 11 9z",
  operadores: "M4 21V7l7-4 7 4v14M4 21h16M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01M8 13.5h.01M12 13.5h.01M16 13.5h.01",
  calidad: "M12 3 4 6v6c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V6l-8-3zm-3 9 2.2 2.2L15.5 10",
  historico: "M4 19h16M4 19V9m4 10v-6m4 6v-9m4 9V7m4 12V5M4 9l5-4 4 3 4-6",
  glosario: "M4 5.5A2 2 0 0 1 6 3.5h13v15H6a2 2 0 0 0-2 2v-15zM4 18.5v2h15M8 7.5h7M8 11h7",
};

/* =====================================================================
   COMPONENTES
   ===================================================================== */
function tiles(list) {
  const w = el("div", "tiles");
  list.forEach(t => {
    const n = el("div", "tile " + (t.cls || "neut"));
    n.append(el("span", "rail"));
    const lab = el("span", "t");
    lab.append(el("span", null, esc(t.t)));
    if (t.f) lab.append(btnInfo(t.f));
    if (t.tabla) lab.append(btnTabla(t.tabla));
    n.append(lab);
    /* la cifra a la izquierda; el subtitulo y el microgafico a su derecha */
    const cuerpo = el("div", "cuerpo");
    cuerpo.append(el("span", "v", t.v));
    const lado = el("div", "lado");
    lado.append(el("span", "d", esc(t.d || "")));
    if (t.sp && t.sp.length > 2) {
      const sp = spark(t.sp, t.spc);
      sp.title = "Distribución del indicador entre los centros zonales del conjunto filtrado";
      lado.append(sp);
    }
    cuerpo.append(lado);
    n.append(cuerpo);
    w.append(n);
  });
  return w;
}
function stacked(filas, series, cat, col) {
  const p = el("div", "panel");
  if (cat) { const c = el("div", "catdato"); c.append(el("i"), document.createTextNode(cat)); p.append(c); }
  const w = el("div", "rows");
  filas.forEach(f => {
    const total = series.reduce((s, x) => s + (f.d[x.k] || 0), 0);
    if (!total) return;
    const r = el("div", "row" + (col && f.code != null ? " nav" : ""));
    if (col && f.code != null) { r.onclick = () => { hideTT(); bajarA(col, f.code); }; r.title = "Filtrar por " + f.lb; }
    r.append(el("div", "lb", esc(f.lb)));
    const st = el("div", "stack");
    series.forEach(x => {
      const v = f.d[x.k] || 0; if (!v) return;
      const s = el("div", "seg");
      s.style.width = (100 * v / total) + "%"; s.style.background = x.c; s.tabIndex = 0;
      const html = `<b>${esc(f.lb)}</b><div class="r"><span><i style="background:${x.c}"></i>${esc(x.lb)}</span><span>${mil(v)} · ${p1(pct(v, total))}</span></div><div class="r"><span>Total</span><span>${mil(total)}</span></div>`;
      s.onmousemove = e => showTT(e, html); s.onmouseleave = hideTT;
      s.onfocus = () => { const b = s.getBoundingClientRect(); showTT({ clientX: b.left, clientY: b.bottom }, html); };
      s.onblur = hideTT;
      st.append(s);
    });
    r.append(st, el("div", "nn", mil(total)));
    w.append(r);
  });
  p.append(w);
  p.append(legend(series));   /* la leyenda viaja con el grafico */
  return p;
}
function legend(series) {
  const l = el("div", "leg");
  series.forEach(x => { const s = el("span"); const i = el("i"); i.style.background = x.c; s.append(i, document.createTextNode(x.lb)); l.append(s); });
  return l;
}
function bars(filas, opt = {}) {
  const max = opt.max != null ? opt.max : Math.max(...filas.map(f => f.v), 0.0001);
  const p = el("div", "panel"); const w = el("div", "bars");
  filas.forEach(f => {
    const r = el("div", "brow");
    r.append(el("div", "lb", esc(f.lb)));
    const t = el("div", "btrack");
    const b = el("div", "bfill");
    b.style.width = Math.max(0.8, 100 * f.v / max) + "%";
    if (f.c) b.style.background = f.c;
    t.append(b);
    if (opt.ref != null) { const rr = el("div", "ref"); rr.style.left = (100 * opt.ref / max) + "%"; t.append(rr); }
    if (f.tip) { t.onmousemove = e => showTT(e, f.tip); t.onmouseleave = hideTT; }
    r.append(t, el("div", "vv", f.txt != null ? f.txt : p2(f.v)));
    if (f.tabla) { w.classList.add("contab"); r.append(btnTabla(f.tabla)); }
    w.append(r);
  });
  p.append(w); return p;
}
function tabla(cols, filas, opt = {}) {
  const sc = el("div", "scroll"); const t = el("table");
  const th = el("thead"); const tr = el("tr");
  cols.forEach((c, i) => {
    const h = el("th", c.n ? "n" : "", esc(c.lb));
    if (opt.sort) h.onclick = () => opt.sort(i);
    if (opt.si === i) h.classList.add(opt.asc ? "asc" : "sorted");
    tr.append(h);
  });
  th.append(tr); t.append(th);
  const tb = el("tbody");
  filas.forEach(f => { const r = el("tr"); f.forEach((v, i) => r.append(el("td", cols[i].n ? "n" : "", v))); tb.append(r); });
  t.append(tb); sc.append(t); return sc;
}
const vacio = m => el("div", "empty", esc(m));

/* lectura interpretativa: la frase que dice qué significa el gráfico */
function lectura(html) {
  const d = el("div", "lectura");
  d.append(el("span", "q", "?"), el("span", null, html));
  return d;
}
const arriba = t => `<span class="up">${t}</span>`;
const abajo = t => `<span class="dn">${t}</span>`;

/* barras con la brecha contra la media marcada en cada fila */
function barsDelta(filas, media, opt = {}) {
  const max = Math.max(media, ...filas.map(f => f.v), 0.0001);
  const p = el("div", "panel"); const w = el("div", "bars");
  filas.forEach(f => {
    const r = el("div", "brow");
    const lb = el("div", "lb"); lb.append(document.createTextNode(f.lb));
    r.append(lb);
    const t = el("div", "btrack");
    const b = el("div", "bfill");
    b.style.width = Math.max(0.8, 100 * f.v / max) + "%";
    const d = f.v - media;
    b.style.background = d > media * .25 ? "linear-gradient(180deg,var(--d2),var(--d3))"
      : d > 0 ? "linear-gradient(180deg,var(--icbf-naranja),#D96200)"
      : "linear-gradient(180deg,var(--icbf-verde),var(--icbf-verde-med))";
    t.append(b);
    const rr = el("div", "ref"); rr.style.left = (100 * media / max) + "%"; t.append(rr);
    if (f.tip) { t.onmousemove = e => showTT(e, f.tip); t.onmouseleave = hideTT; }
    const vv = el("div", "vv");
    vv.innerHTML = p2(f.v) + `<span class="dlt ${d > .2 ? "pos" : d < -.2 ? "neg" : "eq"}">${d > 0 ? "+" : ""}${d.toFixed(1).replace(".", ",")}</span>`;
    r.append(t, vv);
    w.append(r);
  });
  p.append(w); return p;
}

/* ---------- grafico de lineas en SVG ----------
   cfg.suf (por defecto " %") y cfg.fmt (por defecto p2) permiten usarlo
   tambien para series de conteos absolutos, no solo porcentajes. */
function nicePaso(max) {
  if (!max) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(max / 5)));
  const norm = max / 5 / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}
function lineas(cfg) {
  const W = 720, H = 250, ml = 42, mr = 20, mt = 12, mb = 34;
  const iw = W - ml - mr, ih = H - mt - mb;
  const suf = cfg.suf ?? " %", fmt = cfg.fmt || p2;
  const max = Math.max(...cfg.series.flatMap(s => s.v)) * 1.12 || 1;
  const x = i => ml + (cfg.labels.length > 1 ? iw * i / (cfg.labels.length - 1) : iw / 2);
  const y = v => mt + ih - ih * v / max;
  const f = el("div", "fig");
  f.append(el("div", "ttl", esc(cfg.titulo)));
  if (cfg.sub) f.append(el("div", "sub", esc(cfg.sub)));
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", cfg.titulo);
  const mk = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
  const paso = cfg.paso || nicePaso(max);
  for (let g = 0; g <= max; g += paso) {
    svg.append(mk("line", { x1: ml, x2: W - mr, y1: y(g), y2: y(g), class: "gl" }));
    const t = mk("text", { x: ml - 7, y: y(g) + 3.5, class: "axt", "text-anchor": "end" });
    t.textContent = (cfg.ejeFmt ? cfg.ejeFmt(g) : Math.round(g)) + suf; svg.append(t);
  }
  svg.append(mk("line", { x1: ml, x2: W - mr, y1: y(0), y2: y(0), class: "ax" }));
  cfg.labels.forEach((l, i) => {
    const t = mk("text", { x: x(i), y: H - mb + 17, class: "axt", "text-anchor": "middle" });
    t.textContent = l; svg.append(t);
  });
  cfg.series.forEach(s => {
    svg.append(mk("path", { d: s.v.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join(" "), class: "ln", stroke: s.c }));
    s.v.forEach((v, i) => {
      const c = mk("circle", { cx: x(i), cy: y(v), r: 4.5, fill: s.c, class: "pt" });
      const html = `<b>${esc(s.lb)}</b><div class="r"><span>${esc(cfg.labels[i])}</span><span>${fmt(v)}</span></div>`;
      c.onmousemove = e => showTT(e, html); c.onmouseleave = hideTT;
      svg.append(c);
    });
  });
  f.append(svg);
  /* leyenda aparte, no pegada al final de cada linea: si dos series
     terminan en valores parecidos, sus etiquetas quedaban una encima
     de la otra y se volvian ilegibles */
  f.append(legend(cfg.series));
  return f;
}

/* ---------- matriz 2x2 de operadores ---------- */
function matriz(pts, cfg) {
  const W = 720, H = 330, ml = 52, mr = 108, mt = 14, mb = 42;
  const iw = W - ml - mr, ih = H - mt - mb;
  const mx = Math.max(...pts.map(p => p.x), cfg.cx * 1.6) || 1;
  const my = Math.max(...pts.map(p => p.y), cfg.cy * 1.6) || 1;
  const X = v => ml + iw * v / mx, Y = v => mt + ih - ih * v / my;
  const rr = Math.max(...pts.map(p => p.n));
  const f = el("div", "fig");
  f.append(el("div", "ttl", esc(cfg.titulo)), el("div", "sub", esc(cfg.sub)));
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img"); svg.setAttribute("aria-label", cfg.titulo);
  const mk = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
  svg.append(mk("rect", { x: X(cfg.cx), y: mt, width: iw - (X(cfg.cx) - ml), height: Y(cfg.cy) - mt, fill: "var(--d3)", opacity: ".07" }));
  [[0, "%"], [25, "%"], [50, "%"], [75, "%"], [100, "%"]].forEach(() => { });
  for (let g = 0; g <= my; g += my > 40 ? 20 : 10) {
    svg.append(mk("line", { x1: ml, x2: W - mr, y1: Y(g), y2: Y(g), class: "gl" }));
    const t = mk("text", { x: ml - 7, y: Y(g) + 3.5, class: "axt", "text-anchor": "end" }); t.textContent = g + "%"; svg.append(t);
  }
  for (let g = 0; g <= mx; g += mx > 40 ? 20 : 5) {
    const t = mk("text", { x: X(g), y: H - mb + 17, class: "axt", "text-anchor": "middle" }); t.textContent = g + "%"; svg.append(t);
  }
  svg.append(mk("line", { x1: X(cfg.cx), x2: X(cfg.cx), y1: mt, y2: mt + ih, class: "ax", "stroke-dasharray": "4 4" }));
  svg.append(mk("line", { x1: ml, x2: W - mr, y1: Y(cfg.cy), y2: Y(cfg.cy), class: "ax", "stroke-dasharray": "4 4" }));
  const q = (tx, ty, txt, anchor) => { const t = mk("text", { x: tx, y: ty, class: "qlab", "text-anchor": anchor }); t.textContent = txt; svg.append(t); };
  q(W - mr - 4, mt + 12, "ATENCIÓN PRIORITARIA", "end");
  q(ml + 4, mt + 12, "riesgo alto · buena gestión", "start");
  q(ml + 4, mt + ih - 4, "sin alertas", "start");
  q(W - mr - 4, mt + ih - 4, "gestión débil", "end");
  pts.forEach(p => {
    const c = mk("circle", { cx: X(p.x), cy: Y(p.y), r: 4 + 11 * Math.sqrt(p.n / rr),
      fill: (p.x > cfg.cx && p.y > cfg.cy) ? "var(--d2)" : p.y > cfg.cy ? "var(--icbf-naranja)" : p.x > cfg.cx ? "var(--e2)" : "var(--ok)",
      opacity: ".72", class: "pt" });
    const html = `<b>${esc(p.lb)}</b><div class="r"><span>${esc(cfg.ejeX)}</span><span>${p2(p.x)}</span></div><div class="r"><span>${esc(cfg.ejeY)}</span><span>${p2(p.y)}</span></div><div class="r"><span>Beneficiarios</span><span>${mil(p.n)}</span></div>`;
    c.onmousemove = e => showTT(e, html); c.onmouseleave = hideTT;
    svg.append(c);
  });
  const ex = mk("text", { x: ml + iw / 2, y: H - 4, class: "axt", "text-anchor": "middle" }); ex.textContent = cfg.ejeX; svg.append(ex);
  const ey = mk("text", { x: 12, y: mt + ih / 2, class: "axt", "text-anchor": "middle", transform: `rotate(-90 12 ${mt + ih / 2})` }); ey.textContent = cfg.ejeY; svg.append(ey);
  f.append(svg);
  return f;
}

/* ---------- tornado: dos sentidos enfrentados sobre un eje ---------- */
function flujo(pares, titulo) {
  const f = el("div", "fig");
  f.append(el("div", "ttl", esc(titulo)),
    el("div", "sub", "Cada par de barras compara los dos sentidos del mismo tránsito. El largo es proporcional al número de beneficiarios; la cifra va siempre fuera de la barra."));
  const max = Math.max(...pares.flatMap(p => [p.empeora, p.mejora]), 1);
  const w = el("div", "torn");
  const cab = el("div", "tcab");
  cab.append(el("span", null, "se alejan de la adecuación"), el("span"),
    el("span", null, "se acercan a la adecuación"));
  w.append(cab);
  pares.forEach(p => {
    w.append(el("div", "tpar", "entre <b>" + esc(p.mejor) + "</b> y <b>" + esc(p.peor) + "</b>"));
    const r = el("div", "trow");
    /* cada lado: cifra fuera, barra dentro de una pista de ancho conocido */
    const izq = el("div", "lado izq");
    izq.append(el("span", "cif", mil(p.empeora)));
    const pi = el("div", "pista");
    const b1 = el("div", "bar3");
    b1.style.width = Math.max(5, 100 * p.empeora / max) + "%";
    b1.style.background = "linear-gradient(180deg,var(--d1),var(--d2))";
    const h1 = "<b>" + esc(p.mejor) + " \u2192 " + esc(p.peor)
      + "</b><div class='r'><span>Se alejaron de la adecuación</span><span>" + mil(p.empeora) + "</span></div>";
    b1.onmousemove = e => showTT(e, h1); b1.onmouseleave = hideTT;
    pi.append(b1); izq.append(pi);

    const der = el("div", "lado der");
    const pd = el("div", "pista");
    const b2 = el("div", "bar3");
    b2.style.width = Math.max(5, 100 * p.mejora / max) + "%";
    b2.style.background = "linear-gradient(180deg,var(--icbf-verde),var(--icbf-verde-med))";
    const h2_ = "<b>" + esc(p.peor) + " \u2192 " + esc(p.mejor)
      + "</b><div class='r'><span>Se acercaron a la adecuación</span><span>" + mil(p.mejora) + "</span></div>";
    b2.onmousemove = e => showTT(e, h2_); b2.onmouseleave = hideTT;
    pd.append(b2); der.append(pd, el("span", "cif", mil(p.mejora)));

    r.append(izq, el("div", "eje"), der);
    w.append(r);
    const neto = p.empeora - p.mejora;
    const n = el("div", "tneto");
    n.innerHTML = neto === 0
      ? "<span>Los dos sentidos se equilibran</span>"
      : '<span class="fl2" style="color:' + (neto > 0 ? "var(--d2)" : "var(--icbf-verde-osc)") + '">'
        + (neto > 0 ? "\u25C0 " : "\u25B6 ") + mil(Math.abs(neto)) + "</span>"
        + "<span>beneficiarios netos <b>" + (neto > 0 ? "se alejaron de" : "se acercaron a")
        + "</b> la adecuación</span>";
    w.append(n);
  });
  f.append(w);
  f.append(legend([
    { lb: "Se alejan de la adecuación", c: "var(--d2)" },
    { lb: "Se acercan a la adecuación", c: "var(--icbf-verde)" },
  ]));
  return f;
}



/* =====================================================================
   GRAFICO DE PUNTOS
   La posicion codifica el valor, no el area. Una categoria del 0,02 %
   queda tan visible como una del 70 %: solo cambia donde se posa el punto.
   ===================================================================== */
function dots(filas, opt) {
  opt = opt || {};
  const max = Math.max(...filas.map(f => f.v), opt.min || 0.0001) * 1.06;
  const p = el("div", "panel");
  if (opt.cat) { const c = el("div", "catdato"); c.append(el("i"), document.createTextNode(opt.cat)); p.append(c); }
  const w = el("div", "dots");
  filas.forEach(f => {
    const r = el("div", "drow" + (f.col && f.code != null ? " nav" : ""));
    if (f.col && f.code != null) { r.onclick = () => { hideTT(); bajarA(f.col, f.code); }; r.title = "Filtrar por " + f.lb; }
    r.append(el("div", "lb", esc(f.lb)));
    const tr = el("div", "dtrack");
    const px = Math.max(0.6, 100 * f.v / max);
    const st = el("div", "dstem");
    st.style.left = "0"; st.style.width = px + "%";
    st.style.background = f.c || "var(--icbf-verde)"; st.style.opacity = ".38";
    const dt = el("div", "ddot");
    dt.style.left = px + "%"; dt.style.background = f.c || "var(--icbf-verde)";
    tr.append(st, dt);
    if (opt.ref != null) { const m = el("div", "dmed"); m.style.left = (100 * opt.ref / max) + "%"; tr.append(m); }
    const html = f.tip || ("<b>" + esc(f.lb) + "</b><div class='r'><span>Valor</span><span>" + p2f(f.v) + "</span></div>"
      + (f.n != null ? "<div class='r'><span>Casos</span><span>" + mil(f.n) + "</span></div>" : ""));
    tr.onmousemove = e => showTT(e, html); tr.onmouseleave = hideTT;
    const vv = el("div", "vv");
    vv.innerHTML = p2f(f.v) + (f.n != null ? "<small>" + mil(f.n) + "</small>" : "");
    r.append(tr, vv);
    w.append(r);
  });
  p.append(w);
  if (opt.leyenda) p.append(legend(opt.leyenda));
  return p;
}

const p2f = v => v.toFixed(2).replace(".", ",") + " %";

/* =====================================================================
   MULTIPLOS PEQUENOS
   Un mini grafico por categoria, cada uno CON SU PROPIA ESCALA. Asi la
   desnutricion aguda no compite contra el peso adecuado por el mismo eje.
   ===================================================================== */
function multiples(cats, grupos, opt) {
  opt = opt || {};
  const g = el("div", "mult");
  cats.forEach(c => {
    const filas = grupos.map(gr => ({
      lb: gr.lb, v: pct(gr.d[c.k] || 0, gr.n), n: gr.d[c.k] || 0,
    })).sort((a, b) => b.v - a.v);
    const total = grupos.reduce((s_, gr) => s_ + (gr.d[c.k] || 0), 0);
    const tot = grupos.reduce((s_, gr) => s_ + gr.n, 0);
    const max = Math.max(...filas.map(f => f.v), 0.0001);
    const card = el("div", "mcard");
    const mh = el("div", "mh");
    const i = el("i"); i.style.background = c.c;
    mh.append(i, el("b", null, esc(c.lb)));
    card.append(mh);
    card.append(el("div", "mn", p2f(pct(total, tot))));
    card.append(el("div", "ms", mil(total) + (total === 1 ? " beneficiario" : " beneficiarios")));
    const bars_ = el("div", "mbars");
    filas.slice(0, opt.top || 6).forEach(f => {
      const r = el("div", "mb");
      r.append(el("div", "t", esc(f.lb)));
      const gg = el("div", "g"); const ii = el("i");
      ii.style.width = Math.max(2, 100 * f.v / max) + "%"; ii.style.background = c.c;
      gg.append(ii);
      const html = "<b>" + esc(f.lb) + "</b><div class='r'><span>" + esc(c.lb) + "</span><span>"
        + p2f(f.v) + "</span></div><div class='r'><span>Casos</span><span>" + mil(f.n) + "</span></div>";
      gg.onmousemove = e => showTT(e, html); gg.onmouseleave = hideTT;
      r.append(gg, el("div", "v", f.v < 10 ? f.v.toFixed(1).replace(".", ",") : Math.round(f.v)));
      bars_.append(r);
    });
    card.append(bars_);
    g.append(card);
  });
  return g;
}


/* =====================================================================
   MAPA DE CALOR  ·  territorio x categoria
   Todas las categorias y todos los territorios de un vistazo. El color es
   la prevalencia dentro de la fila, asi que cada fila se lee sola.
   ===================================================================== */
function calor(filas, series, cat) {
  const p = el("div", "panel");
  if (cat) { const c = el("div", "catdato"); c.append(el("i"), document.createTextNode(cat)); p.append(c); }
  const w = el("div", "heat");
  const tb = el("table");
  const th = el("thead"); const tr = el("tr");
  tr.append(el("th", "terr", "Territorio"));
  series.forEach(x => tr.append(el("th", null, esc(x.lb))));
  tr.append(el("th", null, "n"));
  th.append(tr); tb.append(th);
  const body = el("tbody");
  filas.forEach(f => {
    const r = el("tr", f.code != null ? "nav" : "");
    r.append(el("td", "terr", esc(f.lb)));
    series.forEach(x => {
      const v = f.d[x.k] || 0, pc = pct(v, f.n);
      const td = el("td");
      const c = el("div", "cel");
      /* la intensidad se toma dentro de la propia categoria, no del total:
         asi la desnutricion aguda no queda plana contra el peso adecuado */
      const rel = Math.min(1, pc / (x.max || 1));
      c.style.background = mezcla(x.c, rel);
      c.style.color = rel > .55 ? "#fff" : "var(--ink)";
      c.textContent = pc < 0.1 && v > 0 ? "<0,1" : pc === 0 ? "·" : pc.toFixed(pc < 10 ? 1 : 0).replace(".", ",");
      const html = "<b>" + esc(f.lb) + "</b><div class='r'><span><i style='background:" + x.c + "'></i>"
        + esc(x.lb) + "</span><span>" + p2f(pc) + "</span></div>"
        + "<div class='r'><span>Beneficiarios</span><span>" + mil(v) + " de " + mil(f.n) + "</span></div>";
      c.onmousemove = e => showTT(e, html); c.onmouseleave = hideTT;
      td.append(c); r.append(td);
    });
    r.append(el("td", "tot", mil(f.n)));
    if (f.code != null && f.col) {
      r.onclick = () => { hideTT(); bajarA(f.col, f.code); };
      r.title = "Filtrar por " + f.lb;
    }
    body.append(r);
  });
  tb.append(body); w.append(tb); p.append(w);
  p.append(legend(series));
  const nota = el("div", "note");
  nota.style.margin = "9px 0 0";
  nota.textContent = "Cada celda es el porcentaje dentro de su territorio. La intensidad se calcula dentro de cada columna, para que las categorías poco frecuentes no queden planas.";
  p.append(nota);
  return p;
}

/* mezcla un color con el fondo segun la intensidad */
function mezcla(c, k) {
  const v = c.startsWith("var(") ? getComputedStyle(document.documentElement)
    .getPropertyValue(c.slice(4, -1)).trim() : c;
  const h = v.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const f = 0.10 + 0.90 * Math.pow(k, 0.62);
  return "rgb(" + Math.round(255 - (255 - r) * f) + "," + Math.round(255 - (255 - g) * f)
    + "," + Math.round(255 - (255 - b) * f) + ")";
}

/* =====================================================================
   CURVAS DE DENSIDAD  ·  la forma completa de la distribucion
   Una barra apilada dice cuantos caen en cada caja. Esto dice como esta
   repartida la poblacion dentro y entre las cajas: si un territorio esta
   desplazado, se ve aunque los conteos por categoria se parezcan.
   ===================================================================== */
function densidad(grupos, cfg) {
  const LO = -4, HI = 4, NB = 48, W = 300, H = 38;
  const p = el("div", "panel");
  if (cfg.cat) { const c = el("div", "catdato"); c.append(el("i"), document.createTextNode(cfg.cat)); p.append(c); }
  const w = el("div", "dens");
  const NS = "http://www.w3.org/2000/svg";
  /* escala comun: el pico mas alto de todos manda */
  const hists = grupos.map(g => {
    const b = new Array(NB).fill(0);
    let n = 0;
    g.vals.forEach(z => {
      if (z < LO || z > HI) return;
      b[Math.min(NB - 1, Math.floor((z - LO) / (HI - LO) * NB))]++; n++;
    });
    return { g: g, b: b, n: n, max: Math.max(...b) / Math.max(n, 1) };
  });
  const mx = Math.max(...hists.map(h => h.max), 0.0001);
  hists.forEach(h => {
    if (h.n < 25) return;
    const r = el("div", "drow2");
    r.append(el("div", "lb2", esc(h.g.lb)));
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("preserveAspectRatio", "none");
    const X = z => (z - LO) / (HI - LO) * W;
    /* bandas de referencia */
    [[-4, -3, "var(--d3)"], [-3, -2, "var(--d2)"], [-2, -1, "var(--d1)"],
     [-1, 1, "var(--ok)"], [1, 2, "var(--e1)"], [2, 3, "var(--e2)"], [3, 4, "var(--e3)"]]
      .forEach(([a, b, c]) => {
        const rc = document.createElementNS(NS, "rect");
        rc.setAttribute("x", X(a)); rc.setAttribute("y", 0);
        rc.setAttribute("width", X(b) - X(a)); rc.setAttribute("height", H);
        rc.setAttribute("fill", c); rc.setAttribute("opacity", ".13");
        svg.append(rc);
      });
    /* la curva */
    let d = "M0 " + H;
    h.b.forEach((c, i) => {
      const x = (i + .5) / NB * W, y = H - (c / Math.max(h.n, 1)) / mx * (H - 3);
      d += " L" + x.toFixed(1) + " " + y.toFixed(1);
    });
    d += " L" + W + " " + H + " Z";
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "var(--icbf-verde-osc)");
    path.setAttribute("opacity", ".62");
    svg.append(path);
    /* eje cero */
    const ln = document.createElementNS(NS, "line");
    ln.setAttribute("x1", X(0)); ln.setAttribute("x2", X(0));
    ln.setAttribute("y1", 0); ln.setAttribute("y2", H);
    ln.setAttribute("stroke", "var(--ink3)"); ln.setAttribute("stroke-width", "1");
    svg.append(ln);
    const cont = el("div"); cont.append(svg);
    const vals = h.g.vals.filter(z => z >= LO && z <= HI).sort((a, b) => a - b);
    const med = vals[Math.floor(vals.length / 2)];
    const html = "<b>" + esc(h.g.lb) + "</b><div class='r'><span>Mediana del puntaje Z</span><span>"
      + med.toFixed(2).replace(".", ",") + "</span></div>"
      + "<div class='r'><span>Beneficiarios</span><span>" + mil(h.n) + "</span></div>";
    cont.onmousemove = e => showTT(e, html); cont.onmouseleave = hideTT;
    r.append(cont, el("div", "med2", med.toFixed(2).replace(".", ",")));
    if (h.g.code != null && h.g.col) {
      r.style.cursor = "pointer";
      r.onclick = () => { hideTT(); bajarA(h.g.col, h.g.code); };
    }
    w.append(r);
  });
  p.append(w);
  const ej = el("div", "densejes");
  ej.append(el("div"), (() => { const e = el("div", "ee");
    e.append(el("span", null, "−4 DE"), el("span", null, "−2"), el("span", null, "0"),
      el("span", null, "+2"), el("span", null, "+4 DE")); return e; })(),
    el("div", null, "mediana"));
  p.append(ej);
  p.append(legend([
    { lb: "Desnutrición aguda", c: "var(--d2)" }, { lb: "Riesgo", c: "var(--d1)" },
    { lb: "Adecuado", c: "var(--ok)" }, { lb: "Riesgo de sobrepeso", c: "var(--e1)" },
    { lb: "Sobrepeso u obesidad", c: "var(--e2)" },
  ]));
  return p;
}

/* =====================================================================
   CURVA DE CRECIMIENTO
   El grafico canonico de la nutricion infantil: talla contra edad, con las
   bandas de desviacion estandar y la poblacion encima. Las bandas se
   DERIVAN DEL PROPIO DATO: en cada tramo de edad se busca la talla
   observada donde el puntaje Z cruza cada corte.
   ===================================================================== */
let CSEXO = 0;   /* 0 = ambos, 1 = niños, 2 = niñas */
function curvaCrecimiento(ix) {
  const W = 780, H = 400, ml = 46, mr = 18, mt = 14, mb = 40;
  const iw = W - ml - mr, ih = H - mt - mb;
  const EDMAX = 60, TLO = 45, THI = 125;
  const X = m => ml + iw * Math.min(m, EDMAX) / EDMAX;
  const Y = c => mt + ih - ih * (Math.min(Math.max(c, TLO), THI) - TLO) / (THI - TLO);

  const sel = ix.filter(i => N.em[i] >= 0 && N.em[i] <= EDMAX && N.cm[i] > 0
    && N.zt[i] > -50 && Math.abs(N.zt[i]) <= 6 && (CSEXO === 0 || N.sx[i] === CSEXO));
  const f = el("div", "crec");
  if (sel.length < 300) { f.append(el("div", "note", "Sin población suficiente para trazar la curva.")); return f; }

  /* bandas empiricas: por tramo de 3 meses, la talla donde el Z cruza cada corte */
  const PASO = 3, NB = Math.ceil(EDMAX / PASO);
  const CORTES = [-3, -2, -1, 0, 1, 2];
  const bandas = CORTES.map(() => []);
  for (let b = 0; b < NB; b++) {
    const lo = b * PASO, hi = lo + PASO;
    const g = sel.filter(i => N.em[i] >= lo && N.em[i] < hi)
      .map(i => [N.zt[i], N.cm[i]]).sort((a, b2) => a[0] - b2[0]);
    if (g.length < 12) continue;
    CORTES.forEach((z, k) => {
      /* interpolacion lineal sobre los pares (z, talla) observados */
      let j = 0; while (j < g.length && g[j][0] < z) j++;
      let val;
      if (j === 0) val = g[0][1];
      else if (j >= g.length) val = g[g.length - 1][1];
      else {
        const [z0, t0] = g[j - 1], [z1, t1] = g[j];
        val = z1 === z0 ? t1 : t0 + (t1 - t0) * (z - z0) / (z1 - z0);
      }
      bandas[k].push([lo + PASO / 2, val]);
    });
  }

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Curva de crecimiento: talla para la edad");
  const mk = (tag, at) => { const n = document.createElementNS(NS, tag); for (const k in at) n.setAttribute(k, at[k]); return n; };

  /* rejilla */
  for (let c = 50; c <= THI; c += 10) {
    svg.append(mk("line", { x1: ml, x2: W - mr, y1: Y(c), y2: Y(c), class: "gl" }));
    const tx = mk("text", { x: ml - 7, y: Y(c) + 3.5, class: "axt", "text-anchor": "end" });
    tx.textContent = c; svg.append(tx);
  }
  for (let m = 0; m <= EDMAX; m += 12) {
    const tx = mk("text", { x: X(m), y: H - mb + 17, class: "axt", "text-anchor": "middle" });
    tx.textContent = m === 0 ? "0" : (m / 12) + (m === 12 ? " año" : " años"); svg.append(tx);
  }
  svg.append(mk("line", { x1: ml, x2: W - mr, y1: mt + ih, y2: mt + ih, class: "ax" }));

  /* areas entre bandas */
  const camino = pts => pts.map((p_, i) => (i ? "L" : "M") + X(p_[0]).toFixed(1) + " " + Y(p_[1]).toFixed(1)).join(" ");
  const AREAS = [[0, 1, "var(--d2)"], [1, 2, "var(--d1)"], [2, 4, "var(--ok)"], [4, 5, "var(--e1)"]];
  AREAS.forEach(([a, b, c]) => {
    if (!bandas[a].length || !bandas[b].length) return;
    const d = camino(bandas[a]) + " " + bandas[b].slice().reverse()
      .map(p_ => "L" + X(p_[0]).toFixed(1) + " " + Y(p_[1]).toFixed(1)).join(" ") + " Z";
    svg.append(mk("path", { d: d, fill: c, class: "banda", opacity: ".16" }));
  });

  /* la poblacion: una muestra, para no ahogar el navegador */
  const paso = Math.max(1, Math.floor(sel.length / 2600));
  for (let i = 0; i < sel.length; i += paso) {
    const k = sel[i];
    const z = N.zt[k];
    const c = z < -2 ? "var(--d2)" : z < -1 ? "var(--d1)" : z <= 1 ? "var(--ok)" : z <= 2 ? "var(--e1)" : "var(--e2)";
    svg.append(mk("circle", { cx: X(N.em[k]).toFixed(1), cy: Y(N.cm[k]).toFixed(1), r: 1.7, fill: c, class: "pt2" }));
  }

  /* lineas de corte */
  CORTES.forEach((z, k) => {
    if (!bandas[k].length) return;
    const col = z === 0 ? "var(--ink)" : Math.abs(z) === 2 ? "var(--d2)" : "var(--ink3)";
    svg.append(mk("path", { d: camino(bandas[k]), class: "blin" + (z === 0 ? " cero" : ""), stroke: col }));
    const ult = bandas[k][bandas[k].length - 1];
    const tx = mk("text", { x: X(ult[0]) + 6, y: Y(ult[1]) + 3.5, class: "axt", fill: col, "font-weight": "700" });
    tx.textContent = (z > 0 ? "+" : "") + z; svg.append(tx);
  });
  const ex = mk("text", { x: ml + iw / 2, y: H - 4, class: "axt", "text-anchor": "middle" });
  ex.textContent = "edad"; svg.append(ex);
  const ey = mk("text", { x: 12, y: mt + ih / 2, class: "axt", "text-anchor": "middle",
    transform: "rotate(-90 12 " + (mt + ih / 2) + ")" });
  ey.textContent = "talla o longitud en cm"; svg.append(ey);
  f.append(svg);
  return f;
}

/* baja el filtro al territorio en el que se hizo clic */
function bajarA(col, code) {
  if (col === "cz") FCZ = code;
  else if (col === "mun") FMUN = code;
  else if (col === "eas") FEAS = code;
  else return;
  render();
  scrollTo({ top: 0, behavior: "smooth" });
}


/* =====================================================================
   EMBUDO  ·  una cascada donde cada paso retiene parte del anterior
   ===================================================================== */
function embudo(pasos, cfg) {
  cfg = cfg || {};
  const p = el("div", "panel");
  if (cfg.cat) { const c = el("div", "catdato"); c.append(el("i"), document.createTextNode(cfg.cat)); p.append(c); }
  const w = el("div", "emb");
  const base = pasos[0].v || 1;
  pasos.forEach((x, i) => {
    if (i > 0) {
      const perd = pasos[i - 1].v - x.v;
      const c = el("div", "ecaida");
      c.append(el("div"));
      const ec = el("div", "ec");
      ec.innerHTML = perd > 0
        ? '<i></i><span>se pierden <b>' + mil(perd) + '</b> ('
          + p1(pct(perd, pasos[i - 1].v)) + ' del paso anterior)</span>'
        : '<span>sin pérdida</span>';
      c.append(ec); w.append(c);
    }
    const r = el("div", "epaso");
    const l = el("div", "el");
    l.innerHTML = "<b>" + esc(x.lb) + "</b><span>" + esc(x.sub || "") + "</span>";
    r.append(l);
    const b = el("div", "eb");
    const f = el("div", "ef2");
    f.style.width = Math.max(12, 100 * x.v / base) + "%";
    f.style.background = x.c;
    f.append(el("b", null, mil(x.v)));
    const html = "<b>" + esc(x.lb) + "</b><div class='r'><span>Beneficiarios</span><span>" + mil(x.v) + "</span></div>"
      + "<div class='r'><span>Del total detectado</span><span>" + p1(pct(x.v, base)) + "</span></div>";
    f.onmousemove = e => showTT(e, html); f.onmouseleave = hideTT;
    b.append(f); r.append(b);
    w.append(r);
  });
  p.append(w);
  return p;
}

/* =====================================================================
   MOSAICO  ·  cien casillas, una proporcion que se cuenta a ojo
   ===================================================================== */
function mosaico(partes, cfg) {
  cfg = cfg || {};
  const tot = partes.reduce((s_, x) => s_ + x.v, 0) || 1;
  const p = el("div", "panel");
  if (cfg.cat) { const c = el("div", "catdato"); c.append(el("i"), document.createTextNode(cfg.cat)); p.append(c); }
  const w = el("div", "waf");
  /* reparto de las 100 casillas con el resto mayor, para no perder ninguna */
  const exact = partes.map(x => 100 * x.v / tot);
  const base = exact.map(Math.floor);
  let falta = 100 - base.reduce((a, b) => a + b, 0);
  exact.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (falta > 0) { base[i]++; falta--; } });
  partes.forEach((x, k) => {
    for (let i = 0; i < base[k]; i++) {
      const c = el("i");
      c.style.background = x.c;
      const html = "<b>" + esc(x.lb) + "</b><div class='r'><span>Beneficiarios</span><span>" + mil(x.v) + "</span></div>"
        + "<div class='r'><span>Del total</span><span>" + p1(100 * x.v / tot) + "</span></div>";
      c.onmousemove = e => showTT(e, html); c.onmouseleave = hideTT;
      w.append(c);
    }
  });
  p.append(w);
  const lg = el("div", "wafleg");
  partes.forEach((x, k) => {
    const sp = el("span");
    const i = el("i"); i.style.background = x.c;
    sp.append(i);
    const b = el("b"); b.textContent = base[k] + " de cada 100";
    sp.append(b, document.createTextNode(" · " + x.lb + " · " + mil(x.v)));
    lg.append(sp);
  });
  p.append(lg);
  return p;
}

/* =====================================================================
   PUNTOS AGRUPADOS POR BLOQUE  ·  escala de raiz para que convivan
   una regla del 27 % y otra del 0,01 %
   ===================================================================== */
function reglasPuntos(reglas, bloques) {
  const p = el("div", "panel");
  const c = el("div", "catdato");
  c.append(el("i"), document.createTextNode("Registros marcados sobre las " + mil(D.meta.filas_nn) + " filas de toma"));
  p.append(c);
  const max = Math.max(...reglas.map(r => r.pct), 0.0001);
  const esc_ = v => Math.pow(v / max, 0.42);   /* raiz: comprime lo grande, abre lo chico */
  Object.entries(bloques).forEach(([letra, nombre]) => {
    const rs = reglas.filter(r => r.cod[0] === letra);
    if (!rs.length) return;
    const b = el("div", "bloq");
    const bt = el("div", "bt");
    bt.innerHTML = '<i>' + letra + '</i><b>' + esc(nombre) + '</b><span>'
      + rs.length + (rs.length === 1 ? " regla" : " reglas") + '</span>';
    b.append(bt);
    const w = el("div", "regs");
    rs.forEach(r => {
      const row = el("div", "reg");
      row.append(el("div", "cod", r.cod));
      const tr = el("div", "tr3");
      tr.className = "tr2";
      const d = el("div", "pt3");
      d.style.left = Math.max(1.2, 100 * esc_(r.pct)) + "%";
      d.style.background = r.pct > 5 ? "var(--d3)" : r.pct > 0.5 ? "var(--icbf-naranja)" : "var(--icbf-verde)";
      const ds = el("div", "dsc", esc(r.desc.slice(0, 52)));
      tr.append(ds, d);
      const html = "<b>" + esc(r.cod) + " · " + esc(r.amb) + "</b><div class='r'><span>"
        + esc(r.desc) + "</span></div><div class='r'><span>Marcados</span><span>" + mil(r.n)
        + "</span></div><div class='r'><span>Del total</span><span>" + p2f(r.pct) + "</span></div>";
      tr.onmousemove = e => showTT(e, html); tr.onmouseleave = hideTT;
      const v = el("div", "val");
      v.innerHTML = p2f(r.pct) + "<small>" + mil(r.n) + "</small>";
      row.append(tr, v);
      w.append(row);
    });
    b.append(w);
    p.append(b);
  });
  const ej = el("div", "regejes");
  ej.append(el("div"), (() => { const e = el("div", "ee2");
    e.append(el("span", null, "0 %"), el("span", null, "escala de raíz"),
      el("span", null, max.toFixed(0) + " %")); return e; })(), el("div"));
  p.append(ej);
  const n = el("div", "note");
  n.style.margin = "9px 0 0";
  n.textContent = "La escala es de raíz, no lineal: comprime las reglas muy disparadas y abre las que marcan pocos registros, para que ninguna quede pegada al origen.";
  p.append(n);
  return p;
}

/* =====================================================================
   BULLET  ·  un valor contra su referencia y sus tramos
   ===================================================================== */
function bullet(v, media, max, tramos) {
  const w = el("div", "bul");
  (tramos || [[0, 20, "#E4F0DC"], [20, 40, "#FBEFD6"], [40, 100, "#F8E0DE"]]).forEach(([a, b, c]) => {
    const r = el("div", "rango");
    r.style.left = (100 * a / max) + "%";
    r.style.width = (100 * (b - a) / max) + "%";
    r.style.background = c;
    w.append(r);
  });
  const val = el("div", "valor");
  val.style.width = Math.max(1, 100 * v / max) + "%";
  val.style.background = v > 40 ? "var(--d2)" : v > 20 ? "var(--icbf-naranja)" : "var(--icbf-verde-osc)";
  w.append(val);
  if (media != null) {
    const m = el("div", "marca");
    m.style.left = (100 * media / max) + "%";
    w.append(m);
  }
  return w;
}


/* =====================================================================
   MULTIPLOS CON COLUMNA VERTICAL
   Una tarjeta por territorio. Dentro, una columna apilada al 100 % que se
   lee de abajo hacia arriba, del deficit al exceso. Al pie, el dato que
   resume la tarjeta.
   ===================================================================== */
function columnas(filas, series, cat, col, resumenCfg) {
  const p = el("div", "panel");
  if (cat) { const c = el("div", "catdato"); c.append(el("i"), document.createTextNode(cat)); p.append(c); }
  /* escala comun a todas las tarjetas, para que se puedan comparar entre si */
  let mx = 0;
  filas.forEach(f => series.forEach(x => { mx = Math.max(mx, pct(f.d[x.k] || 0, f.n)); }));
  mx = mx || 1;
  /* raiz cuadrada: entre 'adecuado' y 'aguda severa' hay 900 a 1 y en escala
     lineal la segunda no se veria */
  const alto = v => Math.max(3, 100 * Math.sqrt(v / mx));

  const g = el("div", "cols");
  filas.forEach(f => {
    const c = el("div", "ccard" + (col && f.code != null ? " nav" : ""));
    if (col && f.code != null) {
      c.onclick = () => { hideTT(); bajarA(col, f.code); };
      c.title = "Filtrar por " + f.lb;
    }
    const h = el("div", "ch");
    h.innerHTML = "<b>" + esc(f.lb) + "</b><span>" + mil(f.n) + "</span>";
    c.append(h);
    const gr = el("div", "cgrid");
    series.forEach(x => {
      const v = f.d[x.k] || 0, pc = pct(v, f.n);
      const b = el("div", "cbar");
      const i2 = el("i");
      i2.style.height = alto(pc) + "%";
      i2.style.background = x.c;
      if (!v) i2.style.opacity = ".18";
      const html = "<b>" + esc(f.lb) + "</b><div class='r'><span><i style='background:" + x.c + "'></i>"
        + esc(x.lb) + "</span><span>" + p2f(pc) + "</span></div>"
        + "<div class='r'><span>Beneficiarios</span><span>" + mil(v) + " de " + mil(f.n) + "</span></div>";
      b.onmousemove = e => showTT(e, html); b.onmouseleave = hideTT;
      b.append(i2);
      gr.append(b);
    });
    c.append(gr);
    if (resumenCfg) {
      const pie = el("div", "cf");
      pie.innerHTML = "<b style='color:" + resumenCfg.color + "'>" + p1(resumenCfg.valor(f)) + "</b><span>"
        + esc(resumenCfg.lb) + "</span>";
      c.append(pie);
    }
    g.append(c);
  });
  p.append(g);
  p.append(legend(series));
  const e2 = el("div", "colsesc");
  e2.innerHTML = "Las siete barras van en el mismo orden que la leyenda y comparten escala entre tarjetas. "
    + "La altura usa <b>escala de raíz</b>, no lineal: entre la categoría más frecuente y la más rara hay "
    + "novecientos a uno, y en escala lineal la segunda mediría cero píxeles.";
  p.append(e2);
  return p;
}

/* ---------- guia de lectura de cada grafico ---------- */
const ICOG = {
  que: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 4.2v.01M12 11v5.3",
  como: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zm9.5 2.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
  buscar: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5 12 4.5 4.5",
};
function guia(g) {
  const w = el("div", "guia");
  [["que", "Qué muestra", g.que, "var(--icbf-azul)"],
   ["como", "Cómo se lee", g.como, "var(--icbf-verde-osc)"],
   ["buscar", "Qué buscar", g.buscar, "var(--icbf-naranja)"]].forEach(([k, tt, txt, c]) => {
    if (!txt) return;
    const d = el("div", "gc");
    const h = el("div", "gt");
    h.innerHTML = '<i style="background:' + c + '"><svg viewBox="0 0 24 24"><path d="'
      + ICOG[k] + '"/></svg></i>' + tt;
    const pp = el("p"); pp.innerHTML = txt;
    d.append(h, pp);
    w.append(d);
  });
  return w;
}

const GUIAS = {
  tecnica: {
    que: "Cómo se reparte la población entre las <b>dos técnicas de medición</b> que exige la guía. "
      + "Cada figura es un 1 % de los beneficiarios. No mide nutrición: mide <b>método</b>.",
    como: "El bloque azul son los menores de dos años, que se miden <b>acostados</b> con infantómetro y "
      + "requieren dos personas. El verde son los de dos años o más, que se miden <b>de pie</b> con "
      + "tallímetro. Es el mismo niño y la misma variable, pero tomada de dos maneras distintas.",
    buscar: "El tamaño del bloque azul es la porción del dato que depende de la medición más difícil de "
      + "hacer bien. Luego compárelo con el recuadro de abajo: <b>si el retraso en talla es más alto "
      + "justo en ese bloque</b>, lo que está fallando puede ser la medición y no la nutrición.",
  },
  irn: {
    que: "Los beneficiarios del conjunto filtrado repartidos en las cuatro clases del índice. "
      + "Aquí cada figura vale <b>una milésima</b>, no un 1 %: hace falta ese detalle porque la clase "
      + "crítica pesa menos del 1 %.",
    como: "Se lee de izquierda a derecha y de arriba abajo, del verde al rojo. Cada <b>fila completa "
      + "es el 5 %</b> del conjunto. La leyenda trae, para cada clase, los beneficiarios, el porcentaje "
      + "y cuántas figuras le tocaron.",
    buscar: "El bloque rojo del final. Son pocos y por eso se pueden contar: <b>caben en una lista "
      + "revisable uno por uno</b>, que es justo lo que abre el botón «ver registros» de esa clase.",
  },
  comp: {
    que: "Una tarjeta por territorio, con <b>una barra por categoría</b>. Todas arrancan de la misma línea base, así que se comparan directamente.",
    como: "Las barras van en el orden de la leyenda, de la desnutrición severa al exceso. Bajo el nombre va la población; al pie, el porcentaje adecuado. La altura usa escala de raíz para que ninguna categoría desaparezca.",
    buscar: "Barras <b>rojas más altas</b> que en las tarjetas vecinas, y el porcentaje adecuado del pie: un territorio con 66 % adecuado tiene un tercio de su población fuera de rango.",
  },
  pts: {
    que: "Una sola categoría a la vez, comparada entre territorios.",
    como: "La <b>posición</b> del punto es el valor, no el área. La línea punteada es la media del conjunto; el número gris a la derecha, los casos absolutos.",
    buscar: "Los puntos más a la derecha, y sobre todo la <b>distancia</b> entre el primero y la línea punteada: ahí está la brecha real.",
  },
  calor: {
    que: "Todas las categorías y todos los territorios al mismo tiempo.",
    como: "Cada celda es el porcentaje <b>dentro de su fila</b>. La intensidad se calcula por columna, así que una categoría rara conserva su contraste en vez de quedar en blanco.",
    buscar: "Columnas oscuras completas, que señalan un problema regional, y <b>celdas sueltas</b> mucho más oscuras que su columna: ese territorio se sale del patrón.",
  },
  dens: {
    que: "La <b>forma completa</b> de la distribución del puntaje Z, no solo cuántos caen en cada caja.",
    como: "El eje va de −4 a +4 desviaciones estándar; el fondo de color marca las categorías. La cifra de la derecha es la mediana del territorio.",
    buscar: "Curvas <b>desplazadas</b> respecto de las demás, aunque sus conteos por categoría se parezcan. Y colas largas hacia la izquierda: son los casos graves.",
  },
  mult: {
    que: "Un gráfico independiente por categoría, cada uno con <b>su propia escala</b>.",
    como: "El número grande es el total de esa categoría en el conjunto filtrado; debajo, los cinco territorios donde más pesa.",
    buscar: "Compare <b>dentro</b> de cada tarjeta, no entre tarjetas: las escalas son distintas a propósito, para que la desnutrición aguda no compita contra el peso adecuado.",
  },
};

/* selector de tipo de grafico */
function selVista(actual, onChange) {
  const w = el("div", "vistas");
  [["comp", "Composición"], ["pts", "Comparación"], ["calor", "Matriz"],
   ["dens", "Distribución"], ["mult", "Detalle"]].forEach(x => {
    const b = el("button", null, x[1]); b.type = "button";
    b.setAttribute("aria-pressed", x[0] === actual);
    b.onclick = () => onChange(x[0]);
    w.append(b);
  });
  return w;
}

/* tarjeta de hallazgo con chip de severidad */
function hallazgo(h) {
  /* la severidad viaja tambien en la tarjeta, no solo en la pastilla:
     asi se ve de un vistazo sin tener que leer el texto del chip */
  const c = el("div", "hcard sev-" + h.sev);
  const hh = el("div", "hh");
  hh.append(el("span", "chip2 " + h.sev, h.sev.toUpperCase()));
  if (h.pct != null) hh.append(el("span", "hp", h.pct));
  c.append(hh, el("h4", null, esc(h.t)), el("p", null, h.d));
  if (h.f) { const f = el("div", "hf"); f.innerHTML = h.f; c.append(f); }
  /* fila de acciones aparte: "ver registros" y "ver por que" no compiten
     con la pastilla de severidad ni con la cifra por el mismo renglon */
  c.append(el("div", "hact"));
  return c;
}

/* =====================================================================
   LOS REGISTROS DETRAS DE CADA CIFRA
   El tablero muestra agregados. Esto abre la lista de los registros que
   componen la cifra, con los campos tal como vienen del reporte, para poder
   ir a buscar el caso en el sistema.
   ===================================================================== */
const LB_SX = ["Sin dato", "Hombre", "Mujer"];
const LB_PT = ["Sin dato", "Desnutrición aguda severa", "Desnutrición aguda moderada",
  "Riesgo de desnutrición aguda", "Peso adecuado para la talla", "Riesgo de sobrepeso",
  "Sobrepeso", "Obesidad"];
const LB_TE = ["Sin dato", "Retraso en talla", "Riesgo de baja talla", "Talla adecuada para la edad"];
const LB_PE = ["Sin dato", "Desnutrición global", "Riesgo de peso bajo para la edad",
  "Peso adecuado para la edad", "No aplica"];
const LB_IRC = ["Sin dato", "Adecuado", "Preventivo", "Alto riesgo", "Crítico", "No evaluable"];
const LB_SN = ["Sin dato", "Sí", "No"];
const LB_GST = ["Sin dato", "Bajo peso para la edad gestacional", "IMC adecuado para la edad gestacional",
  "Sobrepeso para la edad gestacional", "Obesidad para la edad gestacional"];

const nd = (v, dec) => v == null || v < 0 ? "—" : v.toFixed(dec == null ? 1 : dec).replace(".", ",");
const nz = v => v == null || v <= -90 ? "—" : v.toFixed(2).replace(".", ",");
/* al ordenar, 'sin dato' no es un valor bajo: es la ausencia de valor */
const oz = v => v == null || v <= -90 ? null : v;   /* centinela -99 */
const op = v => v == null || v < 0 ? null : v;      /* centinela -1  */

/* columnas de niñas y niños; 'v' devuelve el texto y 'o' el valor para ordenar.
   La version publica (D.meta.publico) no trae columna de documento: aunque el
   dato ya viene anonimizado desde Python, en esta version tampoco tiene
   sentido mostrar un identificador de fila que nadie afuera va a usar. */
const COLS_NN = [
  ...(D.meta.publico ? [] : [{ lb: "Documento", v: i => N.doc[i] }]),
  { lb: "Sexo", v: i => LB_SX[N.sx[i]] || "—" },
  { lb: "Edad (meses)", num: 1, v: i => N.em[i] >= 0 ? String(N.em[i]) : "—", o: i => op(N.em[i]) },
  { lb: "Centro zonal", v: i => DIC.cz[N.cz[i]] || "—" },
  { lb: "Municipio", v: i => DIC.mun[N.mun[i]] || "—" },
  { lb: "Entidad contratista", v: i => DIC.eas[N.eas[i]] || "—" },
  { lb: "Unidad de servicio", v: i => DIC.uds[N.uds[i]] || "—" },
  { lb: "Peso (kg)", num: 1, v: i => nd(N.kg[i]), o: i => op(N.kg[i]) },
  { lb: "Talla (cm)", num: 1, v: i => nd(N.cm[i]), o: i => op(N.cm[i]) },
  { lb: "Z peso/talla", num: 1, v: i => nz(N.zp[i]), o: i => oz(N.zp[i]) },
  { lb: "Peso para la talla", v: i => LB_PT[N.pt[i]] || "—", o: i => N.pt[i],
    cls: i => N.pt[i] === 1 || N.pt[i] === 2 ? "mal" : N.pt[i] === 4 ? "bien" : "" },
  { lb: "Z talla/edad", num: 1, v: i => nz(N.zt[i]), o: i => oz(N.zt[i]) },
  { lb: "Talla para la edad", v: i => LB_TE[N.te[i]] || "—", o: i => N.te[i],
    cls: i => N.te[i] === 1 ? "mal" : "" },
  { lb: "Peso para la edad", v: i => LB_PE[N.pe[i]] || "—", o: i => N.pe[i],
    cls: i => N.pe[i] === 1 ? "mal" : "" },
  { lb: "Canalizado", v: i => LB_SN[N.can[i]] || "—", o: i => N.can[i],
    cls: i => N.can[i] === 2 ? "mal" : N.can[i] === 1 ? "bien" : "" },
  { lb: "FTLC", v: i => LB_SN[N.ftlc[i]] || "—", o: i => N.ftlc[i] },
  { lb: "N.º de toma", num: 1, v: i => String(N.tm[i]), o: i => N.tm[i] },
  { lb: "Riesgo nutricional", v: i => LB_IRC[N.irc[i]] || "—", o: i => N.irc[i],
    cls: i => N.irc[i] >= 3 ? "mal" : "" },
  /* las marcas de depuracion, para poder ver en la propia tabla cual registro
     es el que no cuadra */
  { lb: "Marcas de calidad", v: i => marcasDe(i).join(" ") || "—", o: i => marcasDe(i).length,
    cls: i => noPlausible(i) ? "mks mal" : "mks" },
];

/* columnas de gestantes */
const COLS_GS = [
  ...(D.meta.publico ? [] : [{ lb: "Documento", v: i => G.doc[i] }]),
  { lb: "Edad (años)", num: 1, v: i => G.ed[i] >= 0 ? String(G.ed[i]) : "—", o: i => op(G.ed[i]) },
  { lb: "Centro zonal", v: i => GDIC.cz[G.cz[i]] || "—" },
  { lb: "Municipio", v: i => GDIC.mun[G.mun[i]] || "—" },
  { lb: "Entidad contratista", v: i => GDIC.eas[G.eas[i]] || "—" },
  { lb: "Unidad de servicio", v: i => GDIC.uds[G.uds[i]] || "—" },
  { lb: "Semanas de gestación", num: 1, v: i => G.sg[i] > 0 ? String(G.sg[i]) : "—", o: i => op(G.sg[i]) },
  { lb: "Peso (kg)", num: 1, v: i => nd(G.kg[i]), o: i => op(G.kg[i]) },
  { lb: "Talla (cm)", num: 1, v: i => nd(G.cm[i]), o: i => op(G.cm[i]) },
  { lb: "IMC", num: 1, v: i => nd(G.imc[i]), o: i => op(G.imc[i]) },
  { lb: "Estado nutricional", v: i => LB_GST[G.st[i]] || "—", o: i => G.st[i],
    cls: i => G.st[i] === 1 ? "mal" : G.st[i] === 2 ? "bien" : "" },
  { lb: "Controles prenatales", num: 1, v: i => G.ctl[i] >= 0 ? String(G.ctl[i]) : "—", o: i => op(G.ctl[i]) },
  { lb: "Riesgo gestacional", v: i => LB_IRC[G.irc[i]] || "—", o: i => G.irc[i],
    cls: i => G.irc[i] >= 3 ? "mal" : "" },
];

const TOPE_FILAS = 400;   /* lo que se pinta; la descarga lleva todo */

function tablaRegistros(cfg) {
  const filas = cfg.idx();
  const cols = cfg.cols || COLS_NN;
  /* 'peor' es el valor mas bajo en los indicadores de deficit y el mas alto
     en los de exceso; cada tabla lo declara */
  let ordK = cfg.ordenar == null ? -1 : cfg.ordenar, ordAsc = !!cfg.asc;

  const hd = el("div", "hd");
  hd.innerHTML = '<div class="k">REGISTROS DEL REPORTE</div><h3 id="fxtit">' + esc(cfg.t) + "</h3>";
  const cerrarBtn = el("button", "close", "&times;");
  cerrarBtn.setAttribute("aria-label", "Cerrar"); cerrarBtn.onclick = cerrar;
  hd.append(cerrarBtn);

  const bd = el("div", "bd");
  if (cfg.lead) { const p = el("p", "dnota"); p.innerHTML = cfg.lead; bd.append(p); }

  const tools = el("div", "dtools");
  const cuenta = el("div", "cuenta");
  cuenta.innerHTML = "<b>" + mil(filas.length) + "</b> registro" + (filas.length === 1 ? "" : "s")
    + (filas.length > TOPE_FILAS ? " · se muestran los primeros <b>" + mil(TOPE_FILAS) + "</b>" : "");
  tools.append(cuenta);
  const baja = el("button", "dbaja");
  baja.type = "button";
  baja.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16"/></svg>'
    + "descargar CSV (" + mil(filas.length) + ")";
  baja.onclick = () => descargarCSV(cfg.t, cols, ordenadas());
  tools.append(baja);
  bd.append(tools);

  const wrap = el("div", "dwrap");
  const tab = el("table", "dtab");
  const thead = el("thead"), trh = el("tr");
  cols.forEach((c, k) => {
    const th = el("th", null, esc(c.lb));
    th.append(el("span", "ord", "↕"));
    th.onclick = () => { if (ordK === k) ordAsc = !ordAsc; else { ordK = k; ordAsc = false; } pintar(); };
    trh.append(th);
  });
  thead.append(trh);
  const tbody = el("tbody");
  tab.append(thead, tbody);
  wrap.append(tab);
  bd.append(wrap);

  const ordenadas = () => {
    if (ordK < 0) return filas;
    const c = cols[ordK], val = c.o || (i => c.v(i));
    return [...filas].sort((a, b) => {
      const x = val(a), y = val(b);
      /* sin dato siempre al final, se ordene hacia donde se ordene */
      const xv = x == null || x === "" || x === "—", yv = y == null || y === "" || y === "—";
      if (xv || yv) return xv && yv ? 0 : xv ? 1 : -1;
      const r = typeof x === "number" && typeof y === "number"
        ? x - y : String(x).localeCompare(String(y), "es");
      return ordAsc ? r : -r;
    });
  };

  const pintar = () => {
    const orden = ordenadas();
    tbody.textContent = "";
    orden.slice(0, TOPE_FILAS).forEach(i => {
      const tr = el("tr");
      cols.forEach(c => {
        const td = el("td", (c.num ? "num " : "") + (c.cls ? c.cls(i) : ""));
        td.textContent = c.v(i);
        tr.append(td);
      });
      tbody.append(tr);
    });
    [...trh.children].forEach((th, k) => {
      th.classList.toggle("act", k === ordK);
      th.querySelector(".ord").textContent = k === ordK ? (ordAsc ? "↑" : "↓") : "↕";
    });
    baja.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16"/></svg>'
      + "descargar CSV (" + mil(filas.length) + ")";
  };
  pintar();

  if (cfg.pie) { const p = el("p", "dnota"); p.innerHTML = cfg.pie; bd.append(p); }
  const priv = el("div", "dpriv");
  priv.innerHTML = D.meta.publico
    ? "El identificador de esta tabla es <b>anónimo</b> (no es el número de documento real). Aun así, "
      + "en una unidad con pocos beneficiarios, la combinación de unidad de servicio, sexo y edad puede "
      + "acotar a una sola niña, niño o gestante: evite cruzar esta tabla con otras fuentes."
    : "<b>Uso interno.</b> La tabla trae el número de documento para poder ubicar el caso "
      + "en el sistema, y no trae nombres. Aun así, en una unidad pequeña la combinación de unidad, sexo "
      + "y edad en meses puede señalar a una sola niña o niño: trátela como información reservada.";
  bd.append(priv);

  $("#fx").textContent = "";
  $("#fx").classList.add("ancha");
  $("#fx").append(hd, bd);
  modal.classList.add("on");
  cerrarBtn.focus();
}

/* el CSV sale con punto y coma y BOM, que es lo que espera Excel en español */
function descargarCSV(titulo, cols, filas) {
  const esc2 = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const lin = [cols.map(c => esc2(c.lb)).join(";")];
  filas.forEach(i => lin.push(cols.map(c => esc2(c.v(i))).join(";")));
  const blob = new Blob(["﻿" + lin.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const a = el("a");
  a.href = URL.createObjectURL(blob);
  a.download = titulo.toLowerCase().replace(/[^a-z0-9áéíóúñ ]/gi, "").replace(/\s+/g, "_")
    + "_" + (D.meta.corte || "corte").replace(/[^0-9a-zA-Z]/g, "") + ".csv";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* el icono que abre la tabla */
function btnTabla(cfg) {
  const b = el("button", "btabla");
  b.type = "button";
  b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zM3 10h18M9 10v9"/></svg>ver registros';
  b.setAttribute("aria-label", "Ver los registros de: " + cfg.t);
  b.onclick = e => { e.stopPropagation(); cerrarEvid(); tablaRegistros(cfg); };
  return b;
}

/* ---------- cuadricula de mil ----------
   Mil cuadros, cada uno una milesima del conjunto. Sirve cuando una categoria
   es tan pequena que en una barra apilada no se veria: aqui se cuenta.
   ------------------------------------------------------------------------ */
function waffle(partes, cfg) {
  /* 100 celdas, no 1.000: "1 de cada 100" se lee igual de bien y el
     grafico deja de ocupar media pantalla de alto */
  const CELDAS = 100;
  const p = el("div", "panel");
  if (cfg.cat) { const c = el("div", "catdato");
    c.append(el("i"), document.createTextNode(cfg.cat)); p.append(c); }

  const tot = cfg.tot || partes.reduce((z, x) => z + (x.v || 0), 0) || 1;
  /* metodo del mayor resto: los cuadros suman exactamente CELDAS */
  const exacto = partes.map(x => (x.v || 0) / tot * CELDAS);
  const cel = exacto.map(Math.floor);
  const falta = CELDAS - cel.reduce((z, v) => z + v, 0);
  exacto.map((e, i) => [e - cel[i], i]).sort((z, q) => q[0] - z[0])
    .slice(0, Math.max(0, falta)).forEach(([, i]) => cel[i]++);

  /* el numero de columnas lo decide el CSS (auto-fill): usa todo el ancho
     del panel, asi que en un panel ancho quedan mas columnas y menos
     filas (grafico bajo) y en uno angosto pasa lo contrario, sin que
     ninguno de los dos casos quede enorme ni con hueco a la derecha */
  const g = el("div", "waffle");
  cel.forEach((n, i) => {
    for (let k = 0; k < n; k++) {
      const c = el("i");
      c.style.background = partes[i].c;
      c.dataset.k = i;
      g.append(c);
    }
  });
  /* un solo manejador para los mil cuadros */
  g.onmousemove = e => {
    const d = e.target.dataset ? e.target.dataset.k : null;
    if (d == null) { hideTT(); return; }
    const x = partes[+d];
    showTT(e, "<b>" + esc(x.lb) + "</b>"
      + (x.d ? "<div class='r'><span>" + esc(x.d) + "</span></div>" : "")
      + "<div class='r'><span>Beneficiarios</span><span>" + mil(x.v) + "</span></div>"
      + "<div class='r'><span>Del conjunto</span><span>" + p2f(pct(x.v, tot)) + "</span></div>"
      + "<div class='r'><span>Figuras</span><span>" + mil(cel[+d]) + " de " + mil(CELDAS) + "</span></div>");
  };
  g.onmouseleave = hideTT;
  p.append(g);

  const leg = el("div", "wleg");
  partes.forEach((x, i) => {
    const it = el("div", "wit");
    const sw = el("i"); sw.style.background = x.c;
    it.append(sw);
    const tx = el("span");
    tx.innerHTML = esc(x.lb) + " &nbsp;<b>" + mil(x.v) + "</b> <small>· " + p2f(pct(x.v, tot))
      + " · " + mil(cel[i]) + " de " + mil(CELDAS) + "</small>"
      + (x.d ? "<small class='wd'>" + esc(x.d) + "</small>" : "");
    it.append(tx);
    if (x.tabla && x.v) it.append(btnTabla(x.tabla));
    leg.append(it);
  });
  p.append(leg);

  const nota = el("p", "note");
  nota.innerHTML = "Cada figura es <b>una centésima</b> del conjunto (" + mil(tot)
    + " beneficiarios). Se usa esta forma y no una barra apilada "
    + "porque la categoría crítica pesa menos del 1 %: en una barra no alcanzaría a verse, y aquí "
    + "se puede contar.";
  p.append(nota);
  return p;
}

/* La clase que habria dado el puntaje por si solo, con los mismos tramos del
   ETL. Si la clase publicada es mayor, la subio el piso clinico. */
const clasePorPuntaje = v => v < 25 ? 1 : v < 50 ? 2 : v < 75 ? 3 : 4;
const subioPorPiso = i => N.irn[i] >= 0 && N.irc[i] >= 1 && N.irc[i] <= 4
  && N.irc[i] > clasePorPuntaje(N.irn[i]);

/* =====================================================================
   REGISTROS NO PLAUSIBLES
   No es un criterio nuevo: son las cuatro reglas del catalogo de depuracion
   cuya accion declarada ya era "EXCLUIR de prevalencias". Aqui se aplican,
   mostrando la cifra con y sin ellos. Nada se borra.
   ===================================================================== */
const EXCLUIR = {
  C1: "Puntaje Z fuera de los límites OMS de plausibilidad",
  C2: "Flag de la OMS distinto de cero",
  C3: "Peso fuera del rango físico esperado",
  C4: "Talla fuera del rango físico esperado",
};
const marcasDe = i => (N.mk[i] || "").split(";").filter(Boolean);
const noPlausible = i => marcasDe(i).some(c => EXCLUIR[c]);

/* compara cada indicador con y sin los registros que las reglas excluyen */
function panelPlausibilidad(ix) {
  const limpio = ix.filter(i => !noPlausible(i));
  const fuera = ix.length - limpio.length;
  const a = resumen(ix), b = resumen(limpio);
  const p = el("div", "panel");
  const c = el("div", "catdato");
  c.append(el("i"), document.createTextNode("Calidad del dato · reglas C1 a C4"));
  p.append(c);

  const filas = [
    ["Desnutrición aguda", a.dnt, b.dnt],
    ["Riesgo de desnutrición aguda", a.riesgo, b.riesgo],
    ["Retraso en talla", a.retraso, b.retraso],
    ["Sobrepeso u obesidad", a.exceso, b.exceso],
    ["Desnutrición global", a.glob, b.glob],
  ];
  const tab = el("table", "plaus");
  const thead = el("thead"), trh = el("tr");
  ["Indicador", "Casos", "Prevalencia", "Casos depurados", "Prevalencia depurada", "Diferencia"]
    .forEach(x => trh.append(el("th", null, x)));
  thead.append(trh);
  const tb = el("tbody");
  filas.forEach(([lb, va, vb]) => {
    const pa = pct(va, a.n), pb = pct(vb, b.n), d = pb - pa;
    const tr = el("tr");
    tr.append(el("td", null, lb));
    tr.append(el("td", null, mil(va)));
    tr.append(el("td", null, p2f(pa)));
    tr.append(el("td", null, mil(vb) + (va - vb ? " " : "")));
    if (va - vb) tr.lastChild.append(el("span", "quitados", "(−" + mil(va - vb) + ")"));
    tr.append(el("td", null, p2f(pb)));
    const dd = el("td", "dif " + (Math.abs(d) < .005 ? "igual" : d > 0 ? "sube" : "baja"));
    dd.textContent = Math.abs(d) < .005 ? "sin cambio"
      : (d > 0 ? "+" : "−") + Math.abs(d).toFixed(2).replace(".", ",") + " pp";
    tr.append(dd);
    tb.append(tr);
  });
  tab.append(thead, tb);
  p.append(tab);

  const pie = el("p", "note");
  pie.innerHTML = "Se excluyen <b>" + mil(fuera) + "</b> registros de " + mil(ix.length)
    + " (" + p2f(pct(fuera, ix.length)) + ") marcados por las reglas "
    + Object.keys(EXCLUIR).map(k => '<span class="mkchip">' + k + "</span>").join("")
    + " del panel de depuración. <b>No se borra ninguno</b>: siguen en el archivo y en las tablas, "
    + "con su marca a la vista. Una diferencia grande no significa que el territorio esté peor o mejor: "
    + "significa que la <b>medición</b> de ese indicador no es confiable.";
  p.append(pie);
  return p;
}

/* microgafico de barras para las tarjetas */
function spark(vals, color) {
  const max = Math.max(...vals, 0.0001);
  const w = el("div", "spark");
  vals.forEach((v, i) => {
    const b = el("i");
    b.style.height = Math.max(8, 100 * v / max) + "%";
    b.style.background = color || "var(--icbf-verde)";
    b.style.color = color || "var(--icbf-verde)";
    b.style.opacity = i === vals.length - 1 ? "1" : ".42";
    w.append(b);
  });
  return w;
}

/* =====================================================================
   PANEL DE EVIDENCIA
   Reutiliza el grafico de puntos en version compacta para sustentar lo que
   afirma cada tarjeta de atencion.
   ===================================================================== */
function dotsMini(filas, ref, color) {
  const max = Math.max(...filas.map(f => f.v), ref || 0, 0.0001) * 1.08;
  const w = el("div", "dmini");
  filas.forEach(f => {
    const r = el("div", "r2" + (f.hi ? " hi" : ""));
    r.append(el("div", "l", esc(f.lb)));
    const tr = el("div", "t2");
    const px = Math.max(1, 100 * f.v / max);
    const st = el("div", "s2"); st.style.width = px + "%"; st.style.background = f.c || color;
    const dt = el("div", "d2"); dt.style.left = px + "%"; dt.style.background = f.c || color;
    tr.append(st, dt);
    if (ref != null) { const m = el("div", "m2"); m.style.left = (100 * ref / max) + "%"; tr.append(m); }
    const v = el("div", "v2");
    v.innerHTML = (f.txt != null ? f.txt : p2f(f.v)) + (f.n != null ? "<small>" + mil(f.n) + "</small>" : "");
    r.append(tr, v);
    w.append(r);
  });
  return w;
}

const evid = () => $("#evid");
let evidT = null;

function abrirEvid(ancla, cfg) {
  const e = evid();
  e.textContent = "";
  const h = el("div", "eh");
  h.innerHTML = '<div class="k">EVIDENCIA</div><b>' + esc(cfg.t) + "</b>";
  const b = el("div", "eb");
  if (cfg.lead) b.append(el("p", "lead", cfg.lead));
  b.append(cfg.chart);
  e.append(h, b);
  if (cfg.pie) e.append(el("div", "ef", cfg.pie));
  e.classList.add("on");
  const r = ancla.getBoundingClientRect();
  const er = e.getBoundingClientRect();
  let x = r.left, y = r.bottom + 8;
  if (x + er.width > innerWidth - 10) x = innerWidth - er.width - 10;
  if (x < 10) x = 10;
  if (y + er.height > innerHeight - 10) y = Math.max(10, r.top - er.height - 8);
  e.style.left = x + "px"; e.style.top = y + "px";
}
function cerrarEvid() { clearTimeout(evidT); evid().classList.remove("on"); }
evid().onclick = e => e.stopPropagation();
addEventListener('click', () => { cerrarEvid(); document.querySelectorAll('.hcard .ver.act,.llam .verd.act').forEach(x => x.classList.remove('act')); });
addEventListener("keydown", e => { if (e.key === "Escape") cerrarEvid(); });

/* engancha una tarjeta de hallazgo con su evidencia */
function conEvidencia(card, cfg) {
  const hh = card.querySelector(".hact");
  const v = el("span", "ver");
  v.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 20V10m5 10V4m5 16v-7m5 7V8"/></svg>ver por qué';
  hh.append(v);
  card.tabIndex = 0;
  let abierto = false;
  const abrir = () => { abrirEvid(card, cfg()); abierto = true; v.classList.add("act"); };
  const cerrar = () => { cerrarEvid(); abierto = false; v.classList.remove("act"); };
  card.onclick = e => {
    e.stopPropagation();
    document.querySelectorAll(".hcard .ver.act").forEach(x => x.classList.remove("act"));
    if (abierto) { cerrar(); } else { cerrarEvid(); abrir(); }
  };
  card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.onclick(e); } };
  return card;
}

/* engancha cualquier elemento con su panel de evidencia */
function conEvidenciaEl(nodo, cfg) {
  const v = el("span", "verd");
  v.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 20V10m5 10V4m5 16v-7m5 7V8"/></svg>ver detalle';
  nodo.append(v);
  nodo.classList.add("ev");
  nodo.tabIndex = 0;
  let abierto = false;
  nodo.onclick = e => {
    e.stopPropagation(); hideTT();
    document.querySelectorAll(".verd.act,.hcard .ver.act").forEach(x => x.classList.remove("act"));
    if (abierto) { cerrarEvid(); abierto = false; return; }
    cerrarEvid(); abrirEvid(nodo, cfg()); abierto = true; v.classList.add("act");
  };
  nodo.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nodo.onclick(e); } };
  return nodo;
}

/* el corte territorial mas fino disponible segun los filtros activos */
function nivelTerritorio() {
  if (FEAS >= 0) return ["uds", DIC.uds, "unidades de servicio", 12];
  if (FMUN >= 0) return ["eas", DIC.eas, "operadores", 15];
  if (FCZ >= 0) return ["mun", DIC.mun, "municipios", 15];
  return ["cz", DIC.cz, "centros zonales", 1];
}

/* =====================================================================
   ESTADO Y FILTRADO
   Los tres filtros se cruzan: cada uno restringe a los demas y todos los
   graficos se recalculan sobre el subconjunto resultante.
   ===================================================================== */
let FCZ = -1, FMUN = -1, FEAS = -1, TAB = "semaforo";
const N = D.nn, G = D.gs, DIC = D.dic, GDIC = D.gdic, CAT = D.cat;
const NN_N = N.doc.length, GS_N = G.doc.length;
const MESES_LARGO = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/* Cobertura de toma por Cupos UDS: beneficiarios unicos con toma en el
   ultimo trimestre completo, sobre el cupo autorizado de la UDS -- una
   toma por trimestre es lo que exige el lineamiento, no una ventana fija
   de meses. Es una metrica de OFERTA (no depende del filtro de poblacion
   o edad), pero SI respeta los filtros geograficos ya activos en el
   tablero. Las UDS sin cupo conocido en el reporte de Unidades de
   Servicio quedan afuera para no distorsionar el porcentaje. */
function cobUdsFiltro() {
  let cu = 0, bt = 0;
  (D.uds || []).forEach(u => {
    if (u.cu == null) return;
    if (FCZ >= 0 && u.cz !== DIC.cz[FCZ]) return;
    if (FMUN >= 0 && u.mu !== DIC.mun[FMUN]) return;
    if (FEAS >= 0 && u.e !== DIC.eas[FEAS].slice(0, 46)) return;
    cu += u.cu; bt += (u.bt || 0);
  });
  return { cu: cu, bt: bt, pct: cu > 0 ? 100 * bt / cu : null };
}
const COLS_UDS_COB = [
  { lb: "Unidad de servicio", v: u => u.n },
  { lb: "Centro zonal", v: u => u.cz },
  { lb: "Municipio", v: u => u.mu },
  { lb: "Entidad contratista", v: u => u.e },
  { lb: "Cupos UDS", num: 1, v: u => mil(u.cu), o: u => u.cu },
  { lb: "Con toma en el trimestre", num: 1, v: u => mil(u.bt || 0), o: u => u.bt || 0 },
  { lb: "Cobertura", num: 1, v: u => p1(u.cb), o: u => u.cb,
    cls: u => u.cb < 60 ? "mal" : u.cb >= 100 ? "bien" : "" },
];


const SUBS = {
  semaforo: "Las seis cifras que deciden si hay que abrir el resto",
  mapa: "Distribución territorial por municipio y unidad de servicio",
  anatomia: "Qué se mide, con qué instrumento y qué se calcula a partir de ello",
  perfil: "Todo el conjunto filtrado en una sola figura, medida por medida",
  estado: "Clasificación antropométrica según la Resolución 2465 de 2016",
  critica: "Listado nominal de los casos que requieren seguimiento",
  gestantes: "Estado nutricional de la población gestante",
  operadores: "Desempeño de las entidades contratistas",
  calidad: "Las 27 reglas aplicadas a la descarga",
  historico: "Evolución mes a mes del cargue y el registro",
  glosario: "Qué mide cada indicador y cómo se calcula",
};

const VIEWS = [["semaforo", "Semáforo"], ["perfil", "Perfil"], ["mapa", "Mapa"], ["anatomia", "Anatomía del dato"], ["estado", "Estado nutricional"],
  ["critica", "Ruta crítica"], ["gestantes", "Gestantes"], ["operadores", "Operadores"],
  ["calidad", "Calidad del dato"], ["historico", "Histórico"], ["glosario", "Glosario"]];

/* indices de niñas y niños que pasan el filtro */
function idxNN() {
  const out = [];
  for (let i = 0; i < NN_N; i++) {
    if (FCZ >= 0 && N.cz[i] !== FCZ) continue;
    if (FMUN >= 0 && N.mun[i] !== FMUN) continue;
    if (FEAS >= 0 && N.eas[i] !== FEAS) continue;
    out.push(i);
  }
  return out;
}
/* los diccionarios de gestantes son propios: se traduce por nombre */
function gCode(dic, arr, code) { return code < 0 ? -1 : arr.indexOf(dic[code]); }
function idxGS() {
  const cz = FCZ < 0 ? -1 : GDIC.cz.indexOf(DIC.cz[FCZ]);
  const mu = FMUN < 0 ? -1 : GDIC.mun.indexOf(DIC.mun[FMUN]);
  const ea = FEAS < 0 ? -1 : GDIC.eas.indexOf(DIC.eas[FEAS]);
  const out = [];
  for (let i = 0; i < GS_N; i++) {
    if (FCZ >= 0 && G.cz[i] !== cz) continue;
    if (FMUN >= 0 && G.mun[i] !== mu) continue;
    if (FEAS >= 0 && G.eas[i] !== ea) continue;
    out.push(i);
  }
  return out;
}

/* resumen de un conjunto de indices */
function resumen(ix) {
  const r = { n: ix.length, dnt: 0, riesgo: 0, exceso: 0, retraso: 0, glob: 0, nc: 0,
    reciente: 0, canal: 0, ftlcSi: 0, una: 0, mej: 0, ig: 0, emp: 0, irn: 0, irnN: 0,
    pt: new Array(8).fill(0), te: new Array(4).fill(0), pe: new Array(5).fill(0),
    irc: new Array(6).fill(0) };
  for (const i of ix) {
    const p = N.pt[i];
    r.pt[p]++; r.te[N.te[i]]++; r.pe[N.pe[i]]++; r.irc[N.irc[i]]++;
    if (p === 1 || p === 2) { r.dnt++; if (N.can[i] === 1) r.canal++; if (N.ftlc[i] === 1) r.ftlcSi++; }
    if (p === 3) r.riesgo++;
    if (p === 6 || p === 7) r.exceso++;
    if (N.te[i] === 1) r.retraso++;
    if (N.pe[i] === 1) r.glob++;
    if (N.cr[i]) r.nc++;
    if (N.tm[i] >= D.meta.tmax - 1) r.reciente++;
    if (N.nt[i] === 1) r.una++;
    if (N.ev[i] === 1) r.mej++; else if (N.ev[i] === 2) r.ig++; else if (N.ev[i] === 3) r.emp++;
    if (N.irn[i] >= 0) { r.irn += N.irn[i]; r.irnN++; }
  }
  return r;
}
function resumenGS(ix) {
  const r = { n: ix.length, st: new Array(5).fill(0), irc: new Array(6).fill(0) };
  for (const i of ix) { r.st[G.st[i]]++; r.irc[G.irc[i]]++; }
  r.bajo = r.st[1]; r.adec = r.st[2]; r.sobre = r.st[3]; r.obes = r.st[4];
  return r;
}
/* agrupa por una columna y devuelve [{code, lb, r}] ordenado por poblacion */
function porDim(ix, col, dic, min) {
  const m = new Map();
  for (const i of ix) { const k = N[col][i]; (m.get(k) || m.set(k, []).get(k)).push(i); }
  const out = [];
  for (const [k, v] of m) if (v.length >= (min || 1)) out.push({ code: k, lb: dic[k], r: resumen(v), idx: v });
  out.sort((a, b) => b.r.n - a.r.n);
  return out;
}

/* ---------- adaptadores de series ---------- */
const dBandas = r => ({ 1: r.pt[1], 2: r.pt[2], 3: r.pt[3], 4: r.pt[4], 5: r.pt[5], 6: r.pt[6], 7: r.pt[7] });
const BANDAS7 = [
  { k: 1, lb: "Desnutrición aguda severa", c: "var(--d3)" },
  { k: 2, lb: "Desnutrición aguda moderada", c: "var(--d2)" },
  { k: 3, lb: "Riesgo de desnutrición aguda", c: "var(--d1)" },
  { k: 4, lb: "Peso adecuado para la talla", c: "var(--ok)" },
  { k: 5, lb: "Riesgo de sobrepeso", c: "var(--e1)" },
  { k: 6, lb: "Sobrepeso", c: "var(--e2)" },
  { k: 7, lb: "Obesidad", c: "var(--e3)" },
];
const IRN4 = [
  { k: 1, lb: "Adecuado", c: "var(--ok)", d: "0–24 · sin alertas: el estado, la tendencia y el seguimiento están dentro de lo esperado." },
  { k: 2, lb: "Preventivo", c: "var(--d1)", d: "25–49 · amerita seguimiento cercano, todavía sin ser una alerta activa." },
  { k: 3, lb: "Alto riesgo", c: "var(--d2)", d: "50–74 · requiere atención prioritaria del operador." },
  { k: 4, lb: "Crítico", c: "var(--d3)", d: "75–100 · exige respuesta inmediata; el piso clínico puede llevar aquí un puntaje más bajo." },
];
const GST4 = [
  { k: 1, lb: "Bajo peso para la edad gestacional", c: "var(--d2)" },
  { k: 2, lb: "IMC adecuado", c: "var(--ok)" },
  { k: 3, lb: "Sobrepeso", c: "var(--e2)" },
  { k: 4, lb: "Obesidad", c: "var(--e3)" },
];
const EVO3 = [{ k: 1, lb: "Mejora", c: "var(--ok)" }, { k: 2, lb: "Se mantiene", c: "var(--e1)" },
  { k: 3, lb: "Empeora", c: "var(--d2)" }];

const tramoEdad = m => m < 0 ? "sin dato" : m < 12 ? "0 a 11" : m < 24 ? "12 a 23" :
  m < 36 ? "24 a 35" : m < 48 ? "36 a 47" : m < 60 ? "48 a 59" : "60 y más";
const ETN = ["Sin dato", "Indígena", "Afrocolombiano", "No se autorreconoce", "Otro"];

/* =====================================================================
   VISTAS
   ===================================================================== */
function vSemaforo() {
  const s = $("#v-semaforo"); s.textContent = "";
  const ix = idxNN(); const a = resumen(ix);
  const g = resumenGS(idxGS());
  if (!a.n) { s.append(vacio("Ningún beneficiario con la combinación de filtros seleccionada.")); return; }
  const czr = porDim(ix, "cz", DIC.cz, 1);
  /* cupos y beneficiarios-del-trimestre por centro zonal, para el spark
     de la tarjeta de cobertura -- viene de D.uds, no de N.*, asi que se
     calcula aparte de "resumen()" */
  const cobPorCz = new Map();
  (D.uds || []).forEach(u => {
    if (u.cu == null) return;
    const e = cobPorCz.get(u.cz) || cobPorCz.set(u.cz, { cu: 0, bt: 0 }).get(u.cz);
    e.cu += u.cu; e.bt += (u.bt || 0);
  });
  const sparks = {
    dnt: czr.map(x => pct(x.r.dnt, x.r.n)),
    riesgo: czr.map(x => pct(x.r.riesgo, x.r.n)),
    retraso: czr.map(x => pct(x.r.retraso, x.r.n)),
    exceso: czr.map(x => pct(x.r.exceso, x.r.n)),
    cobcupos: czr.map(x => { const e = cobPorCz.get(x.lb); return e && e.cu > 0 ? 100 * e.bt / e.cu : 0; }),
    nc: czr.map(x => pct(x.r.nc, x.r.n)),
  };
  const cob = cobUdsFiltro();
  const cobLbl = D.meta.uds_trimestre && D.meta.uds_trimestre.lbl ? D.meta.uds_trimestre.lbl : null;
  s.append(tiles([
    { t: "Desnutrición aguda", f: "dnt_aguda", tabla: { t: "Desnutrición aguda moderada o severa", idx: () => ix.filter(i => N.pt[i] === 1 || N.pt[i] === 2), ordenar: 9, asc: true, lead: "Los casos clasificados en <b>desnutrición aguda severa o moderada</b> por peso para la talla, según la Resolución 2465 de 2016. Ordenados por puntaje Z de menor a mayor: arriba el caso más comprometido.", pie: "La columna <b>Canalizado</b> en «No» es la que exige gestión: hay caso detectado y no hay remisión registrada." }, v: mil(a.dnt), sp: sparks.dnt, spc: "var(--d2)", d: `${p2(pct(a.dnt, a.n))} · ${mil(a.dnt - a.canal)} sin canalizar`, cls: "crit" },
    { t: "Riesgo de desnutrición", f: "pt", tabla: { t: "Riesgo de desnutrición aguda", idx: () => ix.filter(i => N.pt[i] === 3), ordenar: 9, asc: true, lead: "Peso para la talla entre −2 y −1 desviaciones estándar. Todavía no es desnutrición, pero es el grupo que puede cruzar el umbral entre una toma y la siguiente." }, v: p1(pct(a.riesgo, a.n)), d: mil(a.riesgo) + " niñas y niños", sp: sparks.riesgo, spc: "var(--d1)", cls: "crit" },
    { t: "Retraso en talla", f: "retraso", tabla: { t: "Retraso en talla", idx: () => ix.filter(i => N.te[i] === 1), ordenar: 11, asc: true, lead: "Talla por debajo de −2 desviaciones estándar para la edad. Ordenados por puntaje Z de talla para la edad, de menor a mayor.", pie: "Contraste la <b>edad en meses</b> con el puntaje Z: si el retraso se concentra en los menores de 24 meses, revise cómo se está midiendo la longitud en acostado." }, v: p1(pct(a.retraso, a.n)), d: mil(a.retraso) + " niñas y niños", sp: sparks.retraso, spc: "var(--d2)", cls: "crit" },
    { t: "Sobrepeso u obesidad", f: "exceso", tabla: { t: "Sobrepeso u obesidad", idx: () => ix.filter(i => N.pt[i] === 6 || N.pt[i] === 7), ordenar: 9, lead: "Peso para la talla por encima de +2 desviaciones estándar. Ordenados de mayor a menor puntaje Z." }, v: p1(pct(a.exceso, a.n)), d: mil(a.exceso) + " niñas y niños", sp: sparks.exceso, spc: "var(--e2)", cls: "warn" },
    { t: "Cobertura de toma", f: "cobertura",
      tabla: { t: "Cobertura de toma por unidad de servicio", cols: COLS_UDS_COB,
        idx: () => (D.uds || []).filter(u => u.cu != null
          && (FCZ < 0 || u.cz === DIC.cz[FCZ]) && (FMUN < 0 || u.mu === DIC.mun[FMUN])
          && (FEAS < 0 || u.e === DIC.eas[FEAS].slice(0, 46))),
        ordenar: 6, asc: true,
        lead: "Beneficiarios únicos con una toma en el trimestre " + (cobLbl || "más reciente completo")
          + " frente al cupo autorizado de cada unidad de servicio (reporte de Unidades de Servicio). "
          + "Ordenadas de menor a mayor cobertura: arriba, las que menos están usando su cupo contratado.",
        pie: "Las unidades sin cupo conocido en el reporte de Unidades de Servicio no aparecen en esta lista." },
      v: cob.pct != null ? p1(cob.pct) : "—",
      d: "cupos UDS" + (cobLbl ? " · trim. " + cobLbl : ""),
      sp: sparks.cobcupos, spc: "var(--icbf-verde)",
      cls: cob.pct == null ? "neut" : cob.pct > 85 ? "good" : "warn" },
    { t: "No cumple criterio", f: "criterio", tabla: { t: "Registros que no cumplen criterio", idx: () => ix.filter(i => N.cr[i] === 1), lead: "Registros marcados por el sistema como <b>NO CUMPLE</b> en el campo de criterio." }, v: p1(pct(a.nc, a.n)), d: mil(a.nc) + " registros", sp: sparks.nc, spc: "var(--icbf-naranja)", cls: "warn" },
  ]));

  const critN = a.irc[4], altoN = a.irc[3];
  /* --- hallazgos: lo que un supervisor necesita ver de una --- */
  const sev = a.pt[1], mod = a.pt[2];
  const hall = el("div", "hall");
  const [nCol, nDic, nLb, nMin] = nivelTerritorio();
  const grupos = porDim(ix, nCol, nDic, nMin);
  const corto = x => x.replace(/^CZ /, "");
  const evidDe = (fn, ref, color, top) => () => {
    const filas = grupos.map(x => ({ lb: corto(x.lb), ...fn(x.r) }))
      .sort((a, b) => b.v - a.v).slice(0, top || 9);
    return { filas, ref };
  };
  hall.append(hallazgo({
    sev: sev ? "alta" : "baja", pct: mil(sev + mod),
    t: "Desnutrición aguda moderada o severa",
    d: sev ? "Hay <b>" + mil(sev) + "</b> caso" + (sev === 1 ? "" : "s") + " en grado severo y <b>" + mil(mod) + "</b> en moderado. El severo exige remisión inmediata al sector salud."
       : "<b>" + mil(mod) + "</b> casos en grado moderado y ninguno severo en este conjunto.",
    f: "<b>" + mil(a.dnt - a.canal) + "</b> sin canalización registrada &nbsp;·&nbsp; Res. 2465 de 2016",
  }));
  hall.lastChild.querySelector(".hact").append(btnTabla({ t: "Desnutrición aguda moderada o severa", idx: () => ix.filter(i => N.pt[i] === 1 || N.pt[i] === 2), ordenar: 9, asc: true, lead: "Los <b>" + mil(a.dnt) + "</b> casos que sustentan la tarjeta, con el detalle de cada uno.", pie: "De estos, <b>" + mil(a.dnt - a.canal) + "</b> no tienen canalización registrada." }));
  conEvidencia(hall.lastChild, () => {
    const d = evidDe(r => ({ v: pct(r.dnt, r.n), n: r.dnt }), pct(a.dnt, a.n), "var(--d2)", 9)();
    return {
      t: "Desnutrición aguda por " + nLb,
      lead: "La prevalencia es baja en todas partes, así que en una barra apilada no se vería. Aquí la posición codifica el valor: la línea punteada es la media del conjunto (" + p2f(pct(a.dnt, a.n)) + ").",
      chart: dotsMini(d.filas, d.ref, "var(--d2)"),
      pie: "El número gris a la derecha es el conteo de casos. <b>" + mil(a.dnt) + "</b> en total, de los cuales <b>" + mil(a.dnt - a.canal) + "</b> sin canalizar.",
    };
  });
  hall.append(hallazgo({
    sev: pct(a.retraso, a.n) > 12 ? "alta" : pct(a.retraso, a.n) > 8 ? "media" : "baja",
    pct: p1(pct(a.retraso, a.n)),
    t: "Retraso en talla",
    d: "<b>" + mil(a.retraso) + "</b> niñas y niños con talla baja para su edad. Refleja privación sostenida, no un episodio reciente, y no dispara ninguna alerta operativa automática.",
    f: "Desnutrición crónica &nbsp;·&nbsp; " + (a.dnt ? Math.round(a.retraso / a.dnt) + " veces más frecuente que la aguda" : "sin casos agudos para comparar"),
  }));
  hall.lastChild.querySelector(".hact").append(btnTabla({ t: "Retraso en talla", idx: () => ix.filter(i => N.te[i] === 1), ordenar: 11, asc: true, lead: "Los <b>" + mil(a.retraso) + "</b> casos con talla baja para su edad." }));
  conEvidencia(hall.lastChild, () => {
    const media = pct(a.retraso, a.n);
    const d = evidDe(r => ({ v: pct(r.retraso, r.n), n: r.retraso }), media, "var(--d2)", 9)();
    const cont = el("div");
    cont.append(dotsMini(d.filas, media, "var(--d2)"));
    /* y la curva por edad, que es donde aparece lo raro */
    const pe = new Map();
    for (const i of ix) { const k = tramoEdad(N.em[i]); (pe.get(k) || pe.set(k, []).get(k)).push(i); }
    const ord = ["0 a 11", "12 a 23", "24 a 35", "36 a 47", "48 a 59"].filter(k => (pe.get(k) || []).length >= 300);
    if (ord.length >= 3) {
      const sep = el("div"); sep.style.cssText = "margin:11px 0 6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3)";
      sep.textContent = "Por tramo de edad en meses";
      cont.append(sep);
      cont.append(dotsMini(ord.map(k => { const r = resumen(pe.get(k)); return { lb: k, v: pct(r.retraso, r.n), n: r.retraso }; }), media, "var(--d2)"));
    }
    return {
      t: "Retraso en talla",
      lead: "Arriba, por " + nLb + ". Abajo, por edad — y ahí aparece lo interesante.",
      chart: cont,
      pie: "El retraso <b>debería crecer</b> con la edad, porque la desnutrición crónica se acumula. Si aquí baja, lo más probable es que falle la <b>medición de longitud en menores de dos años</b>, que se toma acostado.",
    };
  });
  hall.append(hallazgo({
    sev: pct(a.exceso, a.n) > 8 ? "media" : "baja", pct: p1(pct(a.exceso, a.n)),
    t: "Malnutrición por exceso",
    d: "<b>" + mil(a.exceso) + "</b> con sobrepeso u obesidad, y <b>" + mil(a.pt[5]) + "</b> más en riesgo de sobrepeso. El flujo entre tomas se mueve hacia este lado.",
    f: "Peso para la talla por encima de +2 DE",
  }));
  hall.lastChild.querySelector(".hact").append(btnTabla({ t: "Sobrepeso u obesidad", idx: () => ix.filter(i => N.pt[i] === 6 || N.pt[i] === 7), ordenar: 9, lead: "Los <b>" + mil(a.exceso) + "</b> casos con peso para la talla por encima de +2 DE." }));
  conEvidencia(hall.lastChild, () => {
    const cont = el("div");
    const media = pct(a.exceso, a.n);
    const d = evidDe(r => ({ v: pct(r.exceso, r.n), n: r.exceso }), media, "var(--e2)", 8)();
    cont.append(dotsMini(d.filas, media, "var(--e2)"));
    const tot = a.pt[4] + a.pt[5] + a.pt[6] + a.pt[7];
    const sep = el("div"); sep.style.cssText = "margin:11px 0 6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3)";
    sep.textContent = "El gradiente completo hacia el exceso";
    cont.append(sep);
    cont.append(dotsMini([
      { lb: "Adecuado", v: pct(a.pt[4], a.n), n: a.pt[4], c: "var(--ok)" },
      { lb: "Riesgo sobrepeso", v: pct(a.pt[5], a.n), n: a.pt[5], c: "var(--e1)" },
      { lb: "Sobrepeso", v: pct(a.pt[6], a.n), n: a.pt[6], c: "var(--e2)", hi: 1 },
      { lb: "Obesidad", v: pct(a.pt[7], a.n), n: a.pt[7], c: "var(--e3)", hi: 1 },
    ], null, "var(--e2)"));
    return {
      t: "Malnutrición por exceso",
      lead: "Arriba, dónde se concentra por " + nLb + ". Abajo, el gradiente completo: las dos últimas filas son las que cuenta la tarjeta.",
      chart: cont,
      pie: "Los <b>" + mil(a.pt[5]) + "</b> en riesgo de sobrepeso todavía no cuentan como exceso, pero son la antesala. El flujo entre tomas se mueve en esa dirección.",
    };
  });
  hall.append(hallazgo({
    sev: pct(a.reciente, a.n) < 75 ? "alta" : pct(a.reciente, a.n) < 85 ? "media" : "baja",
    pct: p1(100 - pct(a.reciente, a.n)),
    t: "Sin valoración reciente",
    d: "<b>" + mil(a.n - a.reciente) + "</b> beneficiarios sin toma en los dos últimos meses del corte comparable, y <b>" + mil(a.una) + "</b> con una sola toma en todo el periodo.",
    f: "Mide gestión del operador, no estado nutricional",
  }));
  hall.lastChild.querySelector(".hact").append(btnTabla({ t: "Sin valoración reciente", idx: () => ix.filter(i => N.tm[i] < D.meta.tmax - 1), ordenar: 16, asc: true, lead: "Los <b>" + mil(a.n - a.reciente) + "</b> beneficiarios sin toma en el corte comparable." }));
  conEvidencia(hall.lastChild, () => {
    const media = 100 - pct(a.reciente, a.n);
    const filas = grupos.map(x => ({ lb: corto(x.lb), v: 100 - pct(x.r.reciente, x.r.n), n: x.r.n - x.r.reciente }))
      .sort((p_, q) => q.v - p_.v).slice(0, 9);
    return {
      t: "Sin valoración reciente por " + nLb,
      lead: "Porcentaje de beneficiarios cuya última toma es anterior al corte comparable (toma " + D.meta.tmax + "). A mayor valor, peor.",
      chart: dotsMini(filas, media, "var(--icbf-naranja)"),
      pie: "Esto <b>no mide nutrición</b>: mide si el operador está haciendo el seguimiento. Un territorio puede tener buenos indicadores simplemente porque dejó de medir.",
    };
  });
  s.append(h2("Qué requiere atención"), hall);
  s.append(lectura(`En este conjunto, <b>${mil(a.retraso)}</b> niñas y niños tienen retraso en talla frente a <b>${mil(a.dnt)}</b> con desnutrición aguda: la desnutrición crónica es <b>${a.dnt ? Math.round(a.retraso / a.dnt) : "—"} veces</b> más frecuente. La aguda exige respuesta esta semana; la crónica describe el territorio y no dispara ninguna alarma automática.`));
  s.append(h2("Prevalencia con y sin los registros no plausibles"));
  s.append(el("p", "note", "El catálogo de depuración ya marca estos registros y dice que se excluyan "
    + "de las prevalencias. Aquí se ve cuánto se mueve cada indicador al hacerlo: si no se mueve, la "
    + "cifra es sólida; si se mueve, el problema está en cómo se midió, no en la nutrición."));
  s.append(panelPlausibilidad(ix));
  s.append(h2("Clasificación de riesgo nutricional", "irn"));
  s.append(el("p", "note", "Índice ponderado por beneficiario. La desnutrición aguda entra por piso clínico, sin importar el puntaje. Promedio del conjunto filtrado: " + (a.irnN ? (a.irn / a.irnN).toFixed(1).replace(".", ",") : "–") + " sobre 100."));
  /* la barra apilada dejaba fuera del denominador a los sin clasificar */
  const sinCl = a.n - IRN4.reduce((z, x) => z + a.irc[x.k], 0);
  const partesIRN = IRN4.map(x => ({
    lb: x.lb, c: x.c, v: a.irc[x.k], d: x.d,
    tabla: { t: "Riesgo nutricional · " + x.lb,
      idx: () => ix.filter(i => N.irc[i] === x.k), ordenar: 9, asc: true,
      lead: "Los <b>" + mil(a.irc[x.k]) + "</b> beneficiarios clasificados como <b>"
        + x.lb.toLowerCase() + "</b> por el índice de riesgo nutricional." },
  }));
  if (sinCl > 0) partesIRN.push({ lb: "Sin clasificar", c: "var(--rule)", v: sinCl,
    d: "excluidos del índice: Flag distinto de cero, puntaje Z fuera de los límites OMS, o sin puntaje Z registrado.",
    tabla: { t: "Riesgo nutricional · sin clasificar",
      idx: () => ix.filter(i => !IRN4.some(x => N.irc[i] === x.k)),
      lead: "Registros a los que no se les pudo calcular el índice, casi siempre por falta de puntaje Z." } });
  s.append(waffle(partesIRN, { cat: "Índice de riesgo nutricional · 0 a 100", tot: a.n }));
  s.append(guia(GUIAS.irn));
  /* el piso clinico no puede operar en silencio: si corrige el puntaje, hay
     que poder ver cuanto corrige y sobre quien */
  const nPiso = ix.filter(subioPorPiso).length;
  if (nPiso) {
    const av = el("div", "aviso");
    const tx = el("div");
    tx.innerHTML = "<b>" + mil(nPiso) + "</b> beneficiario" + (nPiso === 1 ? "" : "s")
      + " (" + p2f(pct(nPiso, a.n)) + ") están en su clase por <b>piso clínico</b> y no por "
      + "su puntaje. El componente antropométrico pesa 50 % y su techo son 90 puntos, "
      + "o sea 45: por debajo del umbral de 50. Sin el piso, una condición ya establecida "
      + "—retraso en talla, desnutrición global, obesidad— no alcanzaba su clase por sí sola.";
    av.append(tx);
    av.append(btnTabla({
      t: "Clasificados por piso clínico",
      idx: () => ix.filter(subioPorPiso), ordenar: 17,
      lead: "Casos cuya clase la fija el <b>hecho clínico</b> y no el puntaje. La columna "
        + "«Riesgo nutricional» trae la clase publicada; el puntaje por sí solo los habría "
        + "dejado una o más clases abajo.",
      pie: "El piso solo <b>sube</b> la clase, nunca la baja. El puntaje se conserva intacto "
        + "y sigue sirviendo para ordenar por prioridad dentro de cada clase.",
    }));
    s.append(av);
  }
  s.append(lectura(`<b>${mil(critN + altoN)}</b> beneficiarios (${p1(pct(critN + altoN, a.n))}) están en alto riesgo o en crítico: es la cola sobre la que vale la pena actuar. Los <b>${mil(critN)}</b> críticos caben en una lista revisable uno por uno.`));

  const dim = FEAS >= 0 ? ["uds", DIC.uds, "Unidades de servicio"]
    : FMUN >= 0 ? ["eas", DIC.eas, "Entidades contratistas"]
    : FCZ >= 0 ? ["mun", DIC.mun, "Municipios"]
    : ["cz", DIC.cz, "Centros zonales"];
  const media = pct(a.retraso, a.n);
  s.append(h2(dim[2] + " ordenados por retraso en talla", "retraso"));
  s.append(el("p", "note", "La línea punteada es la media del conjunto filtrado (" + p2(media) + "). La etiqueta de la derecha es la brecha en puntos porcentuales contra esa media."));
  const g2 = porDim(ix, dim[0], dim[1], dim[0] === "uds" ? 25 : dim[0] === "cz" ? 1 : 60)
    .map(x => ({ lb: x.lb.replace(/^CZ /, ""), v: pct(x.r.retraso, x.r.n), n: x.r.n,
      tip: `<b>${esc(x.lb)}</b><div class="r"><span>Retraso en talla</span><span>${mil(x.r.retraso)} · ${p2(pct(x.r.retraso, x.r.n))}</span></div><div class="r"><span>Beneficiarios</span><span>${mil(x.r.n)}</span></div>` }))
    .sort((p, q) => q.v - p.v).slice(0, 20);
  if (g2.length) {
    s.append(barsDelta(g2, media));
    if (g2.length > 1) {
      const peor = g2[0], mejor = g2[g2.length - 1];
      const veces = mejor.v > 0 ? (peor.v / mejor.v) : 0;
      s.append(lectura(`<b>${esc(peor.lb)}</b> encabeza con ${arriba(p2(peor.v))} de retraso en talla, ${arriba((peor.v - media).toFixed(1).replace(".", ",") + " puntos")} por encima de la media${veces > 1.4 ? ` y ${veces.toFixed(1).replace(".", ",")} veces lo de <b>${esc(mejor.lb)}</b> (${abajo(p2(mejor.v))})` : ""}. Son <b>${mil(Math.round(peor.n * peor.v / 100))}</b> niñas y niños con talla baja para su edad solo en ese grupo.`));
    }
  } else s.append(vacio("Sin grupos con población suficiente."));

  s.append(h2("Ruta crítica de la desnutrición aguda", "canalizacion"));
  s.append(el("p", "note", "Una cascada: cada paso conserva una parte del anterior. Lo que se pierde entre pasos es lo que hay que ir a buscar."));
  s.append(embudo([
    { lb: "Casos detectados", sub: "desnutrición aguda moderada o severa", v: a.dnt, c: "linear-gradient(135deg,var(--d3),var(--d2))" },
    { lb: "Figuran canalizados", sub: "remitidos a salud o a la EAPB", v: a.canal, c: "linear-gradient(135deg,var(--e2),var(--e1))" },
    { lb: "Reciben FTLC", sub: "fórmula terapéutica registrada", v: a.ftlcSi, c: "linear-gradient(135deg,var(--icbf-verde-med),var(--icbf-verde))" },
  ], { cat: "Ruta de atención · Resolución 3280 de 2018" }));
  s.append(a.dnt
    ? lectura(`De <b>${mil(a.dnt)}</b> casos de desnutrición aguda, ${arriba(mil(a.dnt - a.canal))} no tienen canalización registrada y ${arriba(mil(a.dnt - a.ftlcSi))} no figuran recibiendo fórmula terapéutica. El dato no distingue si el vacío es de atención o de registro: por eso la lista nominal está en la pestaña <b>Ruta crítica</b>.`)
    : el("p", "note", "Sin casos agudos en el conjunto filtrado."));

  if (g.n) {
    const gix = idxGS();
    s.append(h2("Personas gestantes", "gest"));
    s.append(tiles([
      { t: "Gestantes vinculadas", v: mil(g.n), d: "última toma del periodo", cls: "neut",
        tabla: { t: "Gestantes vinculadas", idx: () => gix, cols: COLS_GS, ordenar: 12, asc: true,
          lead: "Las <b>" + mil(g.n) + "</b> gestantes vinculadas del conjunto filtrado, en su última toma." } },
      { t: "Exceso de peso", v: p1(pct(g.sobre + g.obes, g.n)), d: mil(g.sobre + g.obes) + " gestantes", cls: "warn",
        tabla: { t: "Sobrepeso u obesidad gestacional", idx: () => gix.filter(i => G.st[i] === 3 || G.st[i] === 4), cols: COLS_GS, ordenar: 9,
          lead: "Las <b>" + mil(g.sobre + g.obes) + "</b> gestantes con sobrepeso u obesidad para su semana de gestación." } },
      { t: "Bajo peso", v: p1(pct(g.bajo, g.n)), d: mil(g.bajo) + " gestantes", cls: "crit",
        tabla: { t: "Bajo peso gestacional", idx: () => gix.filter(i => G.st[i] === 1), cols: COLS_GS, ordenar: 9, asc: true,
          lead: "Las <b>" + mil(g.bajo) + "</b> gestantes con IMC por debajo de lo esperado para su semana de gestación." } },
      { t: "IMC adecuado", v: p1(pct(g.adec, g.n)), d: mil(g.adec) + " gestantes", cls: "good",
        tabla: { t: "IMC adecuado para la edad gestacional", idx: () => gix.filter(i => G.st[i] === 2), cols: COLS_GS,
          lead: "Las <b>" + mil(g.adec) + "</b> gestantes con IMC adecuado para su semana de gestación." } },
    ]));
  }
}
const obj = arr => { const o = {}; arr.forEach((v, i) => o[i] = v); return o; };
function etiquetaFiltro() {
  if (FEAS >= 0) return DIC.eas[FEAS].slice(0, 34);
  if (FMUN >= 0) return DIC.mun[FMUN];
  if (FCZ >= 0) return DIC.cz[FCZ];
  return "Regional Antioquia";
}

function vEstado() {
  const s = $("#v-estado"); s.textContent = "";
  const ix = idxNN(); const a = resumen(ix);
  if (!a.n) { s.append(vacio("Ningún beneficiario con la combinación de filtros seleccionada.")); return; }

  const cab = el("div", "mapsel");
  cab.append(el("div", "note", "Cinco formas de mirar los mismos datos. Cambie el modo para ver la misma información con otro tipo de gráfico."));
  cab.append(selVista(VESTADO, v => { VESTADO = v; vEstado(); }));
  s.append(cab);
  s.append(guia(GUIAS[VESTADO]));
  if (VESTADO === "pts") {
    const lc = el("div", "mapsel");
    const l2 = el("label", "f", "Categoría a comparar");
    const s2 = el("select");
    BANDAS7.forEach(b => { const o = el("option"); o.value = b.k; o.textContent = b.lb;
      if (b.k === VCAT) o.selected = true; s2.append(o); });
    s2.onchange = () => { VCAT = +s2.value; vEstado(); };
    l2.append(s2); lc.append(l2); s.append(lc);
  }

  /* ---------- cortes disponibles segun los filtros activos ---------- */
  const cortes = [];
  if (FCZ < 0) cortes.push(["cz", DIC.cz, "Centro zonal", "pt", 1, k => k.replace(/^CZ /, "")]);
  cortes.push(["mun", DIC.mun, "Municipio de la unidad de servicio", null, FCZ >= 0 ? 30 : 400, k => k]);
  if (FEAS < 0) cortes.push(["eas", DIC.eas, "Entidad contratista", "ido", FCZ >= 0 || FMUN >= 0 ? 30 : 500, k => k]);
  cortes.push(["serv", DIC.serv, "Modalidad de servicio", null, FCZ >= 0 ? 30 : 700, k => k]);
  if (FEAS >= 0 || FMUN >= 0) cortes.push(["uds", DIC.uds, "Unidad de servicio", null, 15, k => k]);

  /* el maximo de cada categoria manda la intensidad de su columna */
  const conMax = (gg) => BANDAS7.map(b => {
    const mx = Math.max(...gg.map(x => pct(x.d[b.k] || 0, x.n)), 0.0001);
    return { ...b, max: mx };
  });

  const pinta = (gg, lb, fk, col) => {
    if (!gg.length) return;
    s.append(h2(lb, fk));
    const CAT = "Peso para la talla · Resolución 2465 de 2016";
    if (VESTADO === "comp") {
      s.append(columnas(gg, BANDAS7, CAT, col, {
        lb: "peso adecuado para la talla",
        color: "var(--icbf-verde-osc)",
        valor: f => pct(f.d[4] || 0, f.n),
      }));
    } else if (VESTADO === "pts") {
      const cat = BANDAS7.find(b => b.k === VCAT) || BANDAS7[0];
      const filas = gg.map(x => ({
        lb: x.lb, v: pct(x.d[cat.k] || 0, x.n), n: x.d[cat.k] || 0, c: cat.c,
        code: x.code, col: col,
        tip: "<b>" + esc(x.lb) + "</b><div class='r'><span><i style='background:" + cat.c
          + "'></i>" + esc(cat.lb) + "</span><span>" + p2f(pct(x.d[cat.k] || 0, x.n))
          + "</span></div><div class='r'><span>Casos</span><span>" + mil(x.d[cat.k] || 0)
          + "</span></div><div class='r'><span>Población</span><span>" + mil(x.n) + "</span></div>",
      })).sort((p_, q) => q.v - p_.v);
      const totC = gg.reduce((v, x) => v + (x.d[cat.k] || 0), 0);
      const totN = gg.reduce((v, x) => v + x.n, 0);
      s.append(dots(filas, { ref: pct(totC, totN), cat: cat.lb + " · Resolución 2465 de 2016",
        leyenda: [{ lb: cat.lb, c: cat.c }, { lb: "media del conjunto", c: "var(--ink3)" }] }));
    } else if (VESTADO === "calor") {
      s.append(calor(gg.map(x => ({ ...x, col: col })), conMax(gg), CAT));
    } else if (VESTADO === "dens") {
      s.append(densidad(gg.map(x => ({ lb: x.lb, vals: x.z || [], code: x.code, col: col })),
        { cat: "Puntaje Z de peso para la talla" }));
    } else {
      s.append(multiples(BANDAS7, gg, { top: 5 }));
    }
  };

  cortes.forEach(([colName, dic, lb, fk, min, fmt]) => {
    const gg = porDim(ix, colName, dic, min).slice(0, 20).map(x => ({
      lb: fmt(x.lb), d: dBandas(x.r), n: x.r.n, code: x.code,
      z: VESTADO === "dens" ? x.idx.map(i => N.zp[i]).filter(z => z > -50) : null,
    }));
    pinta(gg, lb, fk, colName);
  });

  /* ---------- edad y etnia ---------- */
  const porEdad = new Map(), porEtn = new Map();
  for (const i of ix) {
    const k = tramoEdad(N.em[i]); (porEdad.get(k) || porEdad.set(k, []).get(k)).push(i);
    const e = ETN[N.et[i]]; (porEtn.get(e) || porEtn.set(e, []).get(e)).push(i);
  }
  const ordEdad = ["0 a 11", "12 a 23", "24 a 35", "36 a 47", "48 a 59", "60 y más"];
  const edUsa = ordEdad.filter(k => porEdad.has(k) && porEdad.get(k).length >= 25);
  const armar = (mapa, claves, suf) => claves.map(k => {
    const lista = mapa.get(k), r = resumen(lista);
    return { lb: k + (suf || ""), d: dBandas(r), n: r.n,
      z: VESTADO === "dens" ? lista.map(i => N.zp[i]).filter(z => z > -50) : null };
  });

  /* ---------- la curva de crecimiento ---------- */
  s.append(h2("Curva de crecimiento", "te"));
  s.append(el("p", "note", "Talla o longitud contra edad, con la población encima. Las bandas se derivan del propio dato: en cada tramo de tres meses se busca la talla observada donde el puntaje Z cruza cada corte. Es el gráfico con el que trabaja nutrición."));
  const cs = el("div", "crecsel");
  const ls = el("label", "f", "Sexo");
  const ss = el("select");
  [[0, "Ambos"], [1, "Niños"], [2, "Niñas"]].forEach(x => {
    const o = el("option"); o.value = x[0]; o.textContent = x[1];
    if (x[0] === CSEXO) o.selected = true; ss.append(o);
  });
  ss.onchange = () => { CSEXO = +ss.value; vEstado(); };
  ls.append(ss); cs.append(ls);
  const av = el("div", "note");
  av.style.margin = "0 0 0 auto";
  av.innerHTML = "Hasta los 2 años la medida es <b>longitud</b>, tomada acostado; desde los 2, <b>talla</b> de pie.";
  cs.append(av);
  s.append(cs);
  s.append(curvaCrecimiento(ix));
  s.append(legend([
    { lb: "Por debajo de −2 DE", c: "var(--d2)" }, { lb: "Entre −2 y −1", c: "var(--d1)" },
    { lb: "Adecuado", c: "var(--ok)" }, { lb: "Por encima de +1", c: "var(--e1)" },
  ]));

  if (edUsa.length) pinta(armar(porEdad, edUsa, " meses"), "Distribución por tramo de edad", null, null);

  /* la curva de riesgo por edad, en lineas */
  if (edUsa.length >= 3) {
    const rs = edUsa.map(k => resumen(porEdad.get(k)));
    s.append(lineas({
      titulo: "Prevalencia por tramo de edad",
      sub: "Cada punto es el porcentaje de niñas y niños de ese tramo.",
      labels: edUsa,
      series: [
        { lb: "Retraso en talla", c: "var(--d2)", v: rs.map(r => pct(r.retraso, r.n)) },
        { lb: "Sobrepeso u obesidad", c: "var(--e2)", v: rs.map(r => pct(r.exceso, r.n)) },
        { lb: "Riesgo de desnutrición", c: "var(--icbf-naranja)", v: rs.map(r => pct(r.riesgo, r.n)) },
      ],
    }));
    const cand = edUsa.map((k, i) => ({ k: k, v: pct(rs[i].retraso, rs[i].n), n: rs[i].n }))
      .filter(x => x.n >= 500);
    if (cand.length >= 3) {
      const alto = cand.reduce((x, y) => y.v > x.v ? y : x);
      const bajo = cand.reduce((x, y) => y.v < x.v ? y : x);
      s.append(lectura(cand.indexOf(alto) < cand.indexOf(bajo)
        ? `El retraso en talla es <b>más alto en los más pequeños</b>: ${arriba(p2f(alto.v))} en ${alto.k} meses frente a ${abajo(p2f(bajo.v))} en ${bajo.k}. Eso es lo contrario de lo esperado — la desnutrición crónica se acumula con la edad. Un patrón invertido así apunta a la <b>medición de longitud en acostado</b>, que exige dos personas y es la más difícil de hacer bien.`
        : `El retraso en talla <b>crece con la edad</b>: ${abajo(p2f(bajo.v))} en ${bajo.k} meses y ${arriba(p2f(alto.v))} en ${alto.k}. Es el comportamiento esperado de la desnutrición crónica.`));
    }
  }

  const etn = [...porEtn.entries()].filter(kv => kv[1].length >= 20).sort((x, y) => y[1].length - x[1].length);
  if (etn.length > 1) {
    pinta(etn.map(kv => { const r = resumen(kv[1]);
      return { lb: kv[0], d: dBandas(r), n: r.n,
        z: VESTADO === "dens" ? kv[1].map(i => N.zp[i]).filter(z => z > -50) : null }; }),
      "Pertenencia étnica", null, null);
  }

  /* ---------- evolucion ---------- */
  s.append(h2("Evolución entre la primera y la última toma", "evolucion"));
  const tot = a.mej + a.ig + a.emp;
  if (!tot) { s.append(vacio("Sin beneficiarios con dos tomas en el conjunto filtrado.")); return; }
  s.append(el("p", "note", `${mil(tot)} beneficiarios con dos o más tomas (${p1(pct(tot, a.n))} del conjunto).`));
  s.append(stacked([{ lb: etiquetaFiltro(), d: { 1: a.mej, 2: a.ig, 3: a.emp } }], EVO3,
    "Cambio entre la primera y la última toma"));
  const bal = a.mej - a.emp;
  s.append(lectura(Math.abs(bal) < tot * .01
    ? `Mejoras y deterioros se cancelan casi exactamente: <b>${mil(a.mej)}</b> frente a <b>${mil(a.emp)}</b>. Un balance así de simétrico normalmente significa que lo que domina es la variabilidad de la medición, no el efecto del programa. La dirección real está en el gráfico de abajo.`
    : bal > 0 ? `El balance es favorable: ${abajo(mil(bal) + " beneficiarios")} más mejoraron que empeoraron.`
    : `El balance es desfavorable: ${arriba(mil(-bal) + " beneficiarios")} más empeoraron que mejoraron.`));
  s.append(h2("Hacia dónde se mueve la población"));
  s.append(el("p", "note", "Vista regional: las transiciones se calculan sobre el histórico completo de tomas."));
  const bus = (a_, b_) => (D.trans.find(x => x.a === a_ && x.b === b_) || { n: 0 }).n;
  const AD = "PESO ADECUADO PARA LA TALLA", RS = "RIESGO DE SOBREPESO", RD = "RIESGO DE DESNUTRICION AGUDA";
  const pares = [
    { mejor: "Peso adecuado", peor: "Riesgo de sobrepeso", empeora: bus(AD, RS), mejora: bus(RS, AD) },
    { mejor: "Peso adecuado", peor: "Riesgo de desnutrición", empeora: bus(AD, RD), mejora: bus(RD, AD) },
  ];
  s.append(flujo(pares, "Los dos tránsitos que mueven la población"));
  const netoExc = pares[0].empeora - pares[0].mejora, netoDef = pares[1].mejora - pares[1].empeora;
  s.append(lectura(`Los dos flujos van en sentidos opuestos: <b>${mil(Math.abs(netoDef))}</b> beneficiarios netos ${abajo("salieron del déficit")} hacia el peso adecuado, pero <b>${mil(Math.abs(netoExc))}</b> netos ${arriba("se movieron del peso adecuado hacia el exceso")}. La desnutrición se está recuperando y el sobrepeso está avanzando al mismo tiempo. Es el mismo patrón que muestran las gestantes, donde el exceso ya llega al 50,8 %.`));
}

let cS = 11, cA = false, cQ = "", cFil = "criticos";
let VESTADO = "comp", VCAT = 2;
function vCritica() {
  const s = $("#v-critica"); s.textContent = "";
  s.append(h2("Casos que requieren seguimiento nominal", "irn"));
  s.append(el("p", "note", "Listado a nivel de beneficiario. Incluye el número de documento para poder ubicar el caso en el sistema. Las etiquetas de la última columna son las reglas de calidad que incumple el registro; haga clic en el glosario para el detalle de cada una."));

  const box = el("div", "bar");
  const lf = el("label", "f", "Mostrar");
  const sf = el("select");
  [["criticos", "Clasificación crítica"], ["agudos", "Desnutrición aguda"],
   ["sincan", "Aguda sin canalizar"], ["alto", "Alto riesgo y crítico"],
   ["empeora", "Empeoraron entre tomas"]].forEach(([v, t]) => {
    const o = el("option"); o.value = v; o.textContent = t; if (v === cFil) o.selected = true; sf.append(o);
  });
  sf.onchange = () => { cFil = sf.value; vCritica(); };
  lf.append(sf);
  const l = el("label", "f", "Buscar municipio, unidad, operador o documento");
  const inp = el("input"); inp.type = "search"; inp.value = cQ; inp.style.minWidth = "290px";
  inp.oninput = () => { cQ = inp.value; vCritica(); const n = $("#v-critica input[type=search]"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  l.append(inp);
  box.append(lf, l);
  const bajaCritica = el("button", "dbaja");
  bajaCritica.type = "button";
  bajaCritica.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16"/></svg>descargar Excel (CSV)';
  box.append(bajaCritica);
  s.append(box);

  let ix = idxNN().filter(i => {
    const p = N.pt[i], c = N.irc[i];
    if (cFil === "criticos") return c === 4;
    if (cFil === "agudos") return p === 1 || p === 2;
    if (cFil === "sincan") return (p === 1 || p === 2) && N.can[i] !== 1;
    if (cFil === "alto") return c === 3 || c === 4;
    if (cFil === "empeora") return N.ev[i] === 3;
    return false;
  });
  if (cQ) {
    const q = cQ.toUpperCase();
    ix = ix.filter(i => (DIC.mun[N.mun[i]] + " " + DIC.uds[N.uds[i]] + " " + DIC.eas[N.eas[i]] + " " + N.doc[i]).toUpperCase().includes(q));
  }
  box.append(el("div", "pop", `<b>${mil(ix.length)}</b><br>beneficiarios`));
  if (!ix.length) { bajaCritica.disabled = true; s.append(vacio("Ningún beneficiario con estos criterios.")); return; }

  const cols = [{ lb: "Documento" }, { lb: "Centro zonal" }, { lb: "Municipio UDS" }, { lb: "Unidad de servicio" },
    { lb: "Entidad contratista" }, { lb: "Sexo" }, { lb: "Edad (m)", n: 1 }, { lb: "Peso/talla" },
    { lb: "Talla/edad" }, { lb: "Canalizado" }, { lb: "FTLC" }, { lb: "IRN", n: 1 }, { lb: "Tomas", n: 1 }, { lb: "Marcas" }];
  const key = [i => N.doc[i], i => DIC.cz[N.cz[i]], i => DIC.mun[N.mun[i]], i => DIC.uds[N.uds[i]],
    i => DIC.eas[N.eas[i]], i => N.sx[i], i => N.em[i], i => N.pt[i], i => N.te[i],
    i => N.can[i], i => N.ftlc[i], i => N.irn[i], i => N.nt[i], i => N.mk[i]];
  const total = ix.length;
  const ordCritica = ix.slice().sort((p, q) => {
    const x = key[cS](p), y = key[cS](q);
    const r = typeof x === "number" ? (x || 0) - (y || 0) : String(x || "").localeCompare(String(y || ""));
    return cA ? r : -r;
  });
  ix = ordCritica.slice(0, 500);

  /* la descarga lleva TODO el conjunto filtrado, no solo los 500 que se
     pintan en pantalla; los valores van en texto plano, sin pastillas ni HTML */
  bajaCritica.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16"/></svg>'
    + "descargar Excel (" + mil(total) + ")";
  bajaCritica.onclick = () => descargarCSV("Ruta critica", [
    { lb: "Documento", v: i => N.doc[i] },
    { lb: "Centro zonal", v: i => DIC.cz[N.cz[i]] },
    { lb: "Municipio UDS", v: i => DIC.mun[N.mun[i]] },
    { lb: "Unidad de servicio", v: i => DIC.uds[N.uds[i]] },
    { lb: "Entidad contratista", v: i => DIC.eas[N.eas[i]] },
    { lb: "Sexo", v: i => N.sx[i] === 1 ? "Hombre" : N.sx[i] === 2 ? "Mujer" : "" },
    { lb: "Edad (meses)", v: i => N.em[i] < 0 ? "" : N.em[i] },
    { lb: "Peso/talla", v: i => CAT.pt[N.pt[i]] || "" },
    { lb: "Talla/edad", v: i => CAT.te[N.te[i]] || "" },
    { lb: "Canalizado", v: i => N.can[i] === 1 ? "SI" : N.can[i] === 2 ? "NO" : "" },
    { lb: "FTLC", v: i => N.ftlc[i] === 1 ? "SI" : N.ftlc[i] === 2 ? "NO" : "" },
    { lb: "IRN", v: i => N.irn[i] < 0 ? "" : N.irn[i] },
    { lb: "Tomas", v: i => N.nt[i] },
    { lb: "Marcas de calidad", v: i => N.mk[i] || "" },
  ], ordCritica);
  const sn = v => v === 1 ? `<span style="color:var(--ok)">Sí</span>` : v === 2 ? `<span style="color:var(--d2)">No</span>` : `<span style="color:var(--ink3)">Sin dato</span>`;
  s.append(tabla(cols, ix.map(i => {
    const p = N.pt[i];
    return [
      `<code style="font-size:11.5px">${esc(N.doc[i])}</code>`,
      esc(DIC.cz[N.cz[i]].replace(/^CZ /, "")), esc(DIC.mun[N.mun[i]]),
      esc(DIC.uds[N.uds[i]].slice(0, 40)), esc(DIC.eas[N.eas[i]].slice(0, 46)),
      N.sx[i] === 1 ? "H" : N.sx[i] === 2 ? "M" : "–", N.em[i] < 0 ? "–" : N.em[i],
      `<span class="pill" style="background:${p === 1 ? "var(--d3)" : p === 2 ? "var(--d2)" : p === 3 ? "var(--d1)" : p >= 6 ? "var(--e2)" : "var(--ink3)"}">${esc(CAT.pt[p].replace("DESNUTRICION AGUDA ", "DNT ").replace("PESO ADECUADO PARA LA TALLA", "Adecuado") || "Sin clasificar")}</span>`,
      esc(CAT.te[N.te[i]].replace("TALLA ADECUADA PARA LA EDAD", "Adecuada").replace("RETRASO EN TALLA", "Retraso").replace("RIESGO DE BAJA TALLA", "Riesgo") || "–"),
      sn(N.can[i]), sn(N.ftlc[i]),
      N.irn[i] < 0 ? "–" : String(N.irn[i]).replace(".", ","), N.nt[i],
      (N.mk[i] || "").split(";").filter(Boolean).map(m => `<span class="tag">${esc(m)}</span>`).join(""),
    ];
  }), { sort: i => { if (cS === i) cA = !cA; else { cS = i; cA = false; } vCritica(); }, si: cS, asc: cA }));
  if (total > 500) s.append(el("p", "note", `Se muestran los primeros 500 de ${mil(total)} beneficiarios en el orden actual.`));
}

function vGestantes() {
  const s = $("#v-gestantes"); s.textContent = "";
  const ix = idxGS(); const g = resumenGS(ix);
  if (!g.n) { s.append(vacio("Sin gestantes con la combinación de filtros seleccionada.")); return; }
  s.append(tiles([
    { t: "Gestantes vinculadas", f: "gest", v: mil(g.n), d: "última toma del periodo", cls: "neut",
      tabla: { t: "Gestantes vinculadas", idx: () => ix, cols: COLS_GS, ordenar: 12, asc: true,
        lead: "Las <b>" + mil(g.n) + "</b> gestantes vinculadas del conjunto filtrado, en su última toma." } },
    { t: "Bajo peso gestacional", v: p1(pct(g.bajo, g.n)), d: mil(g.bajo) + " gestantes", cls: "crit",
      tabla: { t: "Bajo peso gestacional", idx: () => ix.filter(i => G.st[i] === 1), cols: COLS_GS, ordenar: 9, asc: true,
        lead: "Las <b>" + mil(g.bajo) + "</b> gestantes con IMC por debajo de lo esperado para su semana de gestación, ordenadas de menor a mayor IMC." } },
    { t: "IMC adecuado", v: p1(pct(g.adec, g.n)), d: mil(g.adec) + " gestantes", cls: "good",
      tabla: { t: "IMC adecuado para la edad gestacional", idx: () => ix.filter(i => G.st[i] === 2), cols: COLS_GS,
        lead: "Las <b>" + mil(g.adec) + "</b> gestantes con IMC adecuado para su semana de gestación." } },
    { t: "Exceso de peso", v: p1(pct(g.sobre + g.obes, g.n)), d: `${mil(g.sobre + g.obes)} gestantes · ${mil(g.sobre)} con sobrepeso y ${mil(g.obes)} con obesidad`, cls: "warn",
      tabla: { t: "Sobrepeso u obesidad gestacional", idx: () => ix.filter(i => G.st[i] === 3 || G.st[i] === 4), cols: COLS_GS, ordenar: 9,
        lead: "Las <b>" + mil(g.sobre + g.obes) + "</b> gestantes con sobrepeso u obesidad para su semana de gestación, ordenadas de mayor a menor IMC." } },
  ]));
  const agrupar = (col, dic, min) => {
    const m = new Map();
    for (const i of ix) { const k = G[col][i]; (m.get(k) || m.set(k, []).get(k)).push(i); }
    return [...m.entries()].filter(([, v]) => v.length >= min)
      .map(([k, v]) => ({ lb: dic[k], d: obj(resumenGS(v).st), n: v.length }))
      .sort((a, b) => b.n - a.n).slice(0, 20);
  };
  if (FCZ < 0) { s.append(h2("Estado nutricional por centro zonal", "gest"));
    s.append(stacked(agrupar("cz", GDIC.cz, 1), GST4, "IMC para la edad gestacional")); }
  const pm = agrupar("mun", GDIC.mun, FCZ >= 0 ? 5 : 40);
  if (pm.length > 1) { s.append(h2("Municipio de la unidad de servicio"));
    s.append(stacked(pm, GST4, "IMC para la edad gestacional")); }
  if (FEAS < 0) {
    const pe = agrupar("eas", GDIC.eas, FCZ >= 0 ? 10 : 60);
    if (pe.length > 1) { s.append(h2("Entidad contratista"));
      s.append(stacked(pe.map(x => ({ ...x, lb: x.lb.slice(0, 44) })), GST4, "IMC para la edad gestacional")); }
  }
  const pEd = new Map(), pCt = new Map();
  for (const i of ix) {
    const e = G.ed[i], c = G.ctl[i];
    const ke = e < 0 ? "sin dato" : e < 18 ? "menor de 18" : e < 25 ? "18 a 24" : e < 35 ? "25 a 34" : "35 y más";
    const kc = c < 0 ? "sin dato" : c <= 2 ? "0 a 2 controles" : c <= 5 ? "3 a 5 controles" : "6 o más";
    (pEd.get(ke) || pEd.set(ke, []).get(ke)).push(i);
    (pCt.get(kc) || pCt.set(kc, []).get(kc)).push(i);
  }
  s.append(h2("Edad de la gestante", "gest"));
  s.append(stacked(["menor de 18", "18 a 24", "25 a 34", "35 y más"].filter(k => (pEd.get(k) || []).length >= 8)
    .map(k => ({ lb: k, d: obj(resumenGS(pEd.get(k)).st) })), GST4, "IMC para la edad gestacional"));
  const pEdR = ["menor de 18", "18 a 24", "25 a 34", "35 y más"].filter(k => (pEd.get(k) || []).length >= 8);
  if (pEdR.length >= 2) {
    const r0 = resumenGS(pEd.get(pEdR[0])), rf = resumenGS(pEd.get(pEdR[pEdR.length - 1]));
    s.append(lectura(`El déficit y el exceso se reparten por edad: en <b>${pEdR[0]}</b> el bajo peso llega a ${arriba(p1(pct(r0.bajo, r0.n)))} y la obesidad a ${p1(pct(r0.obes, r0.n))}; en <b>${pEdR[pEdR.length - 1]}</b> se invierte, con ${p1(pct(rf.bajo, rf.n))} de bajo peso y ${arriba(p1(pct(rf.obes, rf.n)))} de obesidad. Son dos problemas distintos que necesitan dos respuestas distintas.`));
  }
  s.append(h2("Controles prenatales realizados", "controles"));
  s.append(stacked(["0 a 2 controles", "3 a 5 controles", "6 o más"].filter(k => (pCt.get(k) || []).length >= 8)
    .map(k => ({ lb: k, d: obj(resumenGS(pCt.get(k)).st) })), GST4, "IMC para la edad gestacional"));
  const c1 = pCt.get("0 a 2 controles"), c3 = pCt.get("6 o más");
  if (c1 && c3 && c1.length >= 20 && c3.length >= 20) {
    const a1 = resumenGS(c1), a3 = resumenGS(c3);
    const dif = Math.abs(pct(a3.adec, a3.n) - pct(a1.adec, a1.n));
    s.append(lectura(dif < 3
      ? `<b>No hay relación visible.</b> Con 0 a 2 controles el ${p1(pct(a1.adec, a1.n))} tiene IMC adecuado; con 6 o más, el ${p1(pct(a3.adec, a3.n))}. Prácticamente idéntico. El número de controles prenatales, tal como está registrado, no está moviendo el estado nutricional — y ese es un hallazgo que vale reportar.`
      : `Con 6 o más controles el IMC adecuado llega al ${p1(pct(a3.adec, a3.n))} frente al ${p1(pct(a1.adec, a1.n))} de quienes tienen 0 a 2: una diferencia de ${dif.toFixed(1).replace(".", ",")} puntos.`));
  }
}

let iS = 2, iA = false;
function vOperadores() {
  const s = $("#v-operadores"); s.textContent = "";
  s.append(h2("Índice de desempeño del operador", "ido"));
  s.append(el("p", "note", "Cero es el mejor resultado. Se recalcula sobre el conjunto filtrado, así que al elegir un centro zonal o un municipio el ranking pasa a ser el de ese territorio. Mínimo 40 beneficiarios."));
  const ix = idxNN();
  const m = new Map();
  for (const i of ix) { const k = N.eas[i]; (m.get(k) || m.set(k, []).get(k)).push(i); }
  const filas = [];
  for (const [k, v] of m) {
    if (v.length < 40) continue;
    const r = resumen(v);
    let marcas = 0;
    for (const i of v) if (/C1|C2|C5|C6|C8|D1/.test(N.mk[i])) marcas++;
    const cob = 100 - pct(r.reciente, r.n), seg = pct(r.una, r.n), cum = pct(r.nc, r.n),
      cal = pct(marcas, r.n), cli = r.dnt ? 100 - pct(r.canal, r.dnt) : 0;
    filas.push({ eas: DIC.eas[k], n: r.n, ido: +(cob * .30 + seg * .20 + cum * .20 + cal * .15 + cli * .15).toFixed(1),
      cob, seg, cum, cal, cli, dnt: r.dnt });
  }
  if (!filas.length) { s.append(vacio("Ningún operador con 40 o más beneficiarios en el conjunto filtrado.")); return; }

  if (filas.length >= 4) {
    const mcx = filas.reduce((t, o) => t + o.cob * o.n, 0) / filas.reduce((t, o) => t + o.n, 0);
    const mcy = filas.reduce((t, o) => t + o.cum * o.n, 0) / filas.reduce((t, o) => t + o.n, 0);
    s.append(matriz(filas.map(o => ({ x: o.cob, y: o.cum, n: o.n, lb: o.eas })), {
      titulo: "Dónde está cada operador",
      sub: "El tamaño del círculo es la población atendida. Las líneas punteadas son las medias del conjunto; el cuadrante superior derecho reúne a los que fallan en las dos cosas a la vez.",
      ejeX: "Beneficiarios sin toma reciente", ejeY: "Registros que no cumplen el criterio",
      cx: mcx, cy: mcy,
    }));
    const pr = filas.filter(o => o.cob > mcx && o.cum > mcy).sort((a, b) => b.n - a.n);
    s.append(lectura(pr.length
      ? `<b>${mil(pr.length)}</b> operadores están por encima de la media en las dos dimensiones a la vez, y entre ellos atienden <b>${mil(pr.reduce((t, o) => t + o.n, 0))}</b> niñas y niños. El más grande es <b>${esc(pr[0].eas.slice(0, 48))}</b>, con ${mil(pr[0].n)} beneficiarios, ${arriba(p1(pr[0].cob))} sin toma reciente y ${arriba(p1(pr[0].cum))} de registros que no cumplen. Ese cuadrante es el orden de las visitas.`
      : `Ningún operador cae en el cuadrante de atención prioritaria: todos están por debajo de la media en al menos una de las dos dimensiones.`));
  }

  const cols = [{ lb: "Entidad contratista" }, { lb: "Beneficiarios", n: 1 }, { lb: "IDO", n: 1 },
    { lb: "Sin toma reciente", n: 1 }, { lb: "Una sola toma", n: 1 }, { lb: "No cumple", n: 1 },
    { lb: "Marcas de calidad", n: 1 }, { lb: "Agudos sin canalizar", n: 1 }];
  const key = [o => o.eas, o => o.n, o => o.ido, o => o.cob, o => o.seg, o => o.cum, o => o.cal, o => o.cli];
  filas.sort((a, b) => { const x = key[iS](a), y = key[iS](b);
    const r = typeof x === "number" ? x - y : String(x).localeCompare(String(y)); return iA ? r : -r; });
  const medIdo = filas.reduce((x, o) => x + o.ido * o.n, 0) / filas.reduce((x, o) => x + o.n, 0);
  const maxIdo = Math.max(...filas.map(o => o.ido), 50);
  const celIdo = o => {
    const d = el("div");
    d.style.cssText = "display:flex;align-items:center;gap:9px;min-width:150px";
    const b = bullet(o.ido, medIdo, maxIdo);
    b.style.flex = "1";
    const n = el("span");
    n.style.cssText = "font-family:var(--mono);font-weight:700;font-variant-numeric:tabular-nums";
    n.textContent = String(o.ido).replace(".", ",");
    d.append(b, n);
    return d.outerHTML;
  };
  s.append(tabla(cols, filas.map(o => [esc(o.eas), mil(o.n), celIdo(o),
    p1(o.cob), p1(o.seg), p1(o.cum), p1(o.cal), o.dnt ? p1(o.cli) : "–"]),
    { sort: i => { if (iS === i) iA = !iA; else { iS = i; iA = false; } vOperadores(); }, si: iS, asc: iA }));
  const ord = filas.slice().sort((a, b) => b.ido - a.ido);
  s.append(lectura(`El índice va de ${abajo(String(ord[ord.length - 1].ido).replace(".", ","))} a ${arriba(String(ord[0].ido).replace(".", ","))} sobre 100 entre ${mil(filas.length)} operadores. Esa dispersión es la que permite sustentar una decisión: si todos estuvieran en un rango de dos o tres puntos, el índice no serviría para priorizar nada.`));
}

function vCalidad() {
  const s = $("#v-calidad"); s.textContent = "";
  s.append(h2("Reglas de depuración aplicadas a la descarga", "calidad"));
  s.append(el("p", "note", "Estas 27 reglas se evalúan sobre las " + mil(D.meta.filas_nn) + " filas de toma, antes de deduplicar; por eso son cifras regionales y no responden a los filtros. Ninguna regla borra datos: cada una marca y deja constancia en un log trazable."));
  s.append(reglasPuntos(D.reglas, {
    A: "Integridad de la descarga",
    B: "Validez de dominio · catálogo Res. 2465",
    C: "Plausibilidad biológica · límites OMS",
    D: "Coherencia interna",
    E: "Completitud",
    F: "Duplicidad",
    G: "Seguimiento",
  }));

  const peor = D.reglas.slice().sort((a, b) => b.pct - a.pct)[0];
  const d1 = D.reglas.find(x => x.cod === "D1");
  s.append(lectura(`La regla más disparada es <b>${esc(peor.cod)}</b> — ${esc(peor.desc.toLowerCase())} — con ${arriba(mil(peor.n) + " registros")} (${p2(peor.pct)}).${d1 && d1.n === 0 ? ` En cambio <b>D1</b> está en cero: la clasificación que entrega el sistema coincide exactamente con el puntaje Z en las ${mil(D.meta.filas_nn)} filas, así que ${abajo("la clasificación antropométrica es confiable")}. Lo que falla es todo lo que la rodea.` : ""}`));
  s.append(h2("Unidades de servicio con mayor tasa de marcas", "talla_inf"));
  s.append(el("p", "note", "Porcentaje de beneficiarios con al menos una marca de plausibilidad o coherencia. Responde a los filtros. Mínimo 25 beneficiarios. Es la lista de reinducción."));
  const ix = idxNN(); const m = new Map();
  for (const i of ix) { const k = N.uds[i]; (m.get(k) || m.set(k, []).get(k)).push(i); }
  const filas = [];
  for (const [k, v] of m) {
    if (v.length < 25) continue;
    let c = 0; for (const i of v) if (/C1|C2|C5|C6|C8|D1|D3|D4/.test(N.mk[i])) c++;
    if (!c) continue;
    filas.push({ uds: DIC.uds[k], cz: DIC.cz[N.cz[v[0]]], mun: DIC.mun[N.mun[v[0]]],
      eas: DIC.eas[N.eas[v[0]]], n: v.length, pct: 100 * c / v.length });
  }
  filas.sort((a, b) => b.pct - a.pct);
  if (!filas.length) { s.append(vacio("Sin unidades marcadas en el conjunto filtrado.")); return; }
  s.append(tabla([{ lb: "Centro zonal" }, { lb: "Municipio UDS" }, { lb: "Unidad de servicio" },
    { lb: "Entidad contratista" }, { lb: "Beneficiarios", n: 1 }, { lb: "% con marcas", n: 1 }],
    filas.slice(0, 30).map(x => [esc(x.cz.replace(/^CZ /, "")), esc(x.mun), esc(x.uds.slice(0, 40)),
      esc(x.eas.slice(0, 44)), mil(x.n),
      `<span style="color:${x.pct > 20 ? "var(--d2)" : "var(--ink)"}">${p1(x.pct)}</span>`])));
}

/* ---------- historico: volumen de cargue, cobertura de reporte y estado
   nutricional mes a mes. Se agrega por centro zonal (no por municipio ni
   entidad): el reporte trae toda la historia de tomas en cada descarga. ---------- */
function bloqueHistorico(s, etiquetas, d, cfgBk) {
  s.append(lineas({
    titulo: "Volumen de cargue",
    sub: "Registros de toma cargados cada mes y beneficiarios únicos detrás de ellos.",
    labels: etiquetas, suf: "", fmt: mil, ejeFmt: mil,
    series: [
      { lb: "Registros cargados", c: "var(--icbf-verde)", v: d.registros },
      { lb: "Beneficiarios únicos", c: "var(--icbf-naranja)", v: d.beneficiarios },
    ],
  }));
  s.append(lineas({
    titulo: "Cobertura de reporte",
    sub: `Entidades y unidades de servicio que cargaron al menos un registro ese mes, frente al total que reportó en algún momento del corte (${mil(d.eas_univ)} entidades · ${mil(d.uds_univ)} unidades).`,
    labels: etiquetas,
    series: [
      { lb: "Entidades contratistas", c: "var(--icbf-verde)", v: d.eas_rep.map(v => pct(v, d.eas_univ)) },
      { lb: "Unidades de servicio", c: "var(--d1)", v: d.uds_rep.map(v => pct(v, d.uds_univ)) },
    ],
  }));
  s.append(lineas({
    titulo: "Estado nutricional en el tiempo",
    sub: "Participación de cada categoría entre los registros cargados cada mes. No es una cohorte: cada mes es un corte distinto de la misma población, con su propia mezcla de beneficiarios evaluados.",
    labels: etiquetas,
    series: cfgBk.map(b => ({ lb: b.lb, c: b.c, v: d.bk[b.k].map((v, i) => pct(v, d.registros[i])) })),
  }));
}
function vHistorico() {
  const s = $("#v-historico"); s.textContent = "";
  s.append(el("p", "note", "El histórico recorre TODAS las tomas del corte, no solo la última, y no filtra por vinculación: mide cuánto se está cargando cada mes, no la prevalencia clínica (para eso está 'Estado nutricional')."));
  if (FMUN >= 0 || FEAS >= 0) s.append(el("p", "note", "Esta vista se agrega por centro zonal: los filtros de municipio y entidad contratista no aplican aquí."));

  const czNom = FCZ >= 0 ? DIC.cz[FCZ] : null;
  const hn = D.historico.nn, hg = D.historico.gs;
  const dn = czNom ? hn.cz[czNom] : hn.total;
  const dg = czNom ? hg.cz[czNom] : hg.total;

  s.append(h2(czNom ? `Niñas y niños · ${czNom}` : "Niñas y niños · toda la regional"));
  if (!dn) { s.append(vacio("Sin tomas registradas para este centro zonal.")); }
  else bloqueHistorico(s, hn.etiquetas, dn, [
    { k: "adecuado", lb: "Adecuado", c: "var(--ok)" },
    { k: "riesgo", lb: "Riesgo", c: "var(--icbf-naranja)" },
    { k: "exceso", lb: "Sobrepeso u obesidad", c: "var(--e2)" },
    { k: "aguda", lb: "Desnutrición aguda", c: "var(--d2)" },
  ]);

  s.append(h2(czNom ? `Gestantes · ${czNom}` : "Gestantes · toda la regional"));
  if (!dg) { s.append(vacio("Sin tomas registradas para este centro zonal.")); }
  else bloqueHistorico(s, hg.etiquetas, dg, [
    { k: "adecuado", lb: "IMC adecuado", c: "var(--ok)" },
    { k: "bajopeso", lb: "Bajo peso gestacional", c: "var(--d2)" },
    { k: "sobrepeso", lb: "Sobrepeso", c: "var(--icbf-naranja)" },
    { k: "obesidad", lb: "Obesidad", c: "var(--e2)" },
  ]);
}

function vGlosario() {
  const s = $("#v-glosario"); s.textContent = "";
  s.append(h2("Glosario técnico"));
  s.append(el("p", "note", "Cada indicador de este tablero con su definición, los campos exactos del reporte descargado del sistema y su método de cálculo. Haga clic en cualquier tarjeta para abrir la ficha completa."));
  const g = el("div", "gloss-list");
  Object.entries(FICHAS).forEach(([k, f]) => {
    const c = el("button", "gcard"); c.type = "button";
    c.innerHTML = `<div class="kk">${esc(f.k)}</div><h4>${esc(f.t)}</h4><p>${esc(f.q)}</p>`;
    c.onclick = () => ficha(k);
    g.append(c);
  });
  s.append(g);
}


/* =====================================================================
   MAPA - coropleta municipal
   La cartografia trae 146 poligonos: 124 municipios y las 22 comunas y
   corregimientos de Medellin. El reporte no desagrega Medellin por comuna,
   pero SI trae el centro zonal de cada beneficiario, y la cartografia
   asigna cada comuna a un centro zonal: por eso las comunas se pintan con
   el valor de su centro zonal. El cruce se hace por nombre normalizado con
   una tabla de alias para las variantes que no coinciden.
   ===================================================================== */
const RAMPA = ["#DCE8F3", "#A8C6E0", "#6E9DC6", "#3C7FB5", "#00528D"];
const INDIC = [
  { k: "retraso", lb: "Retraso en talla", f: "retraso", v: r => pct(r.retraso, r.n), inv: 0 },
  { k: "dnt", lb: "Desnutricion aguda", f: "dnt_aguda", v: r => pct(r.dnt, r.n), inv: 0 },
  { k: "riesgo", lb: "Riesgo de desnutricion aguda", f: "pt", v: r => pct(r.riesgo, r.n), inv: 0 },
  { k: "exceso", lb: "Sobrepeso u obesidad", f: "exceso", v: r => pct(r.exceso, r.n), inv: 0 },
  { k: "glob", lb: "Desnutricion global", f: "pe", v: r => pct(r.glob, r.n), inv: 0 },
  { k: "nc", lb: "No cumple criterio", f: "criterio", v: r => pct(r.nc, r.n), inv: 0 },
  /* "v" no se usa para esta: es una metrica de OFERTA (cupos UDS del
     ultimo trimestre completo), no de la mezcla de beneficiarios filtrada
     -- vMapa() la calcula aparte, a partir de D.uds. Se deja v de relleno
     por si algo mas la llegara a invocar. */
  { k: "cob", lb: "Cobertura de toma" + (D.meta.uds_trimestre && D.meta.uds_trimestre.lbl
      ? " · trim. " + D.meta.uds_trimestre.lbl : ""),
    f: "cobertura", v: r => pct(r.reciente, r.n), inv: 1 },
  { k: "irn", lb: "Riesgo nutricional promedio", f: "irn", v: r => r.irnN ? r.irn / r.irnN : 0, inv: 0 },
];
let MIND = "retraso", MCAPA = "auto", MZOOM = 1;
/* instancia de Leaflet activa; se destruye antes de crear la siguiente,
   si no cada cambio de filtro deja un mapa fantasma con sus listeners */
let MAPINST = null;
/* indice codigo -> posicion, para no recorrer el diccionario por cada UDS */
const CU_IDX = (() => { const m = new Map(); DIC.cu.forEach((c, i) => m.set(c, i)); return m; })();
/* la capa se decide sola salvo que el usuario la fije */
const capaEfectiva = () => MCAPA !== "auto" ? MCAPA
  : (FEAS >= 0 || FMUN >= 0) ? "amb" : "cor";
const fnum = (v, k) => k === "irn" ? v.toFixed(1).replace(".", ",") + " / 100" : p2(v);

function vMapa() {
  const s = $("#v-mapa"); s.textContent = "";
  const ind = INDIC.find(x => x.k === MIND);
  const sel = el("div", "mapsel");
  const l = el("label", "f", "Indicador");
  const sl = el("select");
  INDIC.forEach(x => { const o = el("option"); o.value = x.k; o.textContent = x.lb; if (x.k === MIND) o.selected = true; sl.append(o); });
  sl.onchange = () => { MIND = sl.value; vMapa(); };
  l.append(sl); sel.append(l);
  const lc = el("label", "f", "Capa");
  const sc = el("select");
  [["auto", "Automática"], ["cor", "Coropleta municipal"], ["uds", "Unidades de servicio"],
   ["amb", "Municipios y unidades"]].forEach(x => {
    const o = el("option"); o.value = x[0]; o.textContent = x[1];
    if (x[0] === MCAPA) o.selected = true; sc.append(o);
  });
  sc.onchange = () => { MCAPA = sc.value; vMapa(); };
  lc.append(sc); sel.append(lc);
  const hint = el("div", "note");
  hint.style.margin = "0 0 0 auto";
  hint.textContent = "Clic en un municipio para filtrar todo el tablero por el.";
  sel.append(hint);
  s.append(h2("Distribucion territorial", ind.f), sel);

  const ix = idxNN();
  const porMun = new Map(), porMed = new Map();
  for (const i of ix) {
    const m = N.mun[i];
    (porMun.get(m) || porMun.set(m, []).get(m)).push(i);
    if (DIC.mun[m] === "MEDELLIN") {
      const c = DIC.cz[N.cz[i]];
      (porMed.get(c) || porMed.set(c, []).get(c)).push(i);
    }
  }
  const alias = D.alias || {};
  const esCob = ind.k === "cob";
  /* Cobertura de toma por cupos UDS: suma de beneficiarios unicos con
     toma en el trimestre / suma de cupos, por UDS agregada a municipio o
     centro zonal. Es una metrica de OFERTA fija por corte -- no cambia
     con el filtro de poblacion/edad, solo con el geografico del propio
     mapa -- y las UDS sin cupo conocido en el reporte de Unidades de
     Servicio quedan afuera de la cuenta para no distorsionarla. */
  let cobPorMu = null, cobPorCz = null, cobTot = null;
  if (esCob && D.uds) {
    cobPorMu = new Map(); cobPorCz = new Map(); cobTot = { cu: 0, bt: 0 };
    D.uds.forEach(u => {
      if (u.cu == null) return;
      cobTot.cu += u.cu; cobTot.bt += (u.bt || 0);
      const nomMu = alias[u.mu] || u.mu;
      const eMu = cobPorMu.get(nomMu) || cobPorMu.set(nomMu, { cu: 0, bt: 0 }).get(nomMu);
      eMu.cu += u.cu; eMu.bt += (u.bt || 0);
      const eCz = cobPorCz.get(u.cz) || cobPorCz.set(u.cz, { cu: 0, bt: 0 }).get(u.cz);
      eCz.cu += u.cu; eCz.bt += (u.bt || 0);
    });
  }
  const cobPct = grp => grp && grp.cu > 0 ? 100 * grp.bt / grp.cu : null;

  const resDe = new Map(), valorMun = new Map();
  for (const [m, v] of porMun) {
    const nom = alias[DIC.mun[m]] || DIC.mun[m];
    const r = resumen(v);
    resDe.set(nom, { r: r, code: m });
    valorMun.set(nom, esCob ? cobPct(cobPorMu.get(nom)) : ind.v(r));
  }
  const resMed = new Map();
  for (const [c, v] of porMed) resMed.set(c, resumen(v));

  /* el mapa SIEMPRE se dibuja: si no hay dispersion, se usa un solo tono */
  const CAPA = capaEfectiva();
  const vals = Array.from(valorMun.values()).filter(v => v > 0).sort((a, b) => a - b);
  const q = p => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
  let cortes = vals.length >= 5 ? [q(.2), q(.4), q(.6), q(.8)].map(v => +v.toFixed(2)) : [];
  cortes = cortes.filter((v, i) => i === 0 || v > cortes[i - 1]);
  const escalaPlana = cortes.length === 0;
  const paso = v => {
    if (escalaPlana) return v > 0 ? 3 : 1;
    let i = 0; while (i < cortes.length && v > cortes[i]) i++;
    return ind.inv ? RAMPA.length - 1 - i : i;
  };

  /* si hay filtro y el acercamiento esta activo, el encuadre es el de la
     seleccion; si no, toda Antioquia */
  const enFiltro = ft => {
    if (FMUN >= 0) { const e = resDe.get(ft.nom); if (e && e.code === FMUN) return true;
                     if (!ft.cod && DIC.mun[FMUN] === "MEDELLIN") return true; return false; }
    if (FCZ >= 0) return ft.cz === DIC.cz[FCZ];
    return resDe.has(ft.nom) || (!ft.cod && resMed.size);
  };
  let bb = D.mapa.bbox.slice();
  const hayFiltro = FCZ >= 0 || FMUN >= 0 || FEAS >= 0;
  if (hayFiltro && MZOOM) {
    const xs = [], ys = [];
    D.mapa.f.forEach(ft => { if (enFiltro(ft)) ft.g.forEach(r => r.forEach(c => { xs.push(c[0]); ys.push(c[1]); })); });
    if (FEAS >= 0 || (FMUN >= 0 && xs.length === 0)) {
      /* un operador puede no tener poligono propio: se encuadra por sus puntos */
      const cods = new Set();
      for (const i of ix) cods.add(DIC.cu[N.cu[i]]);
      D.uds.forEach(u => { if (cods.has(u.c)) { xs.push(u.x); ys.push(u.y); } });
    }
    if (xs.length) {
      const mx = Math.max(0.06, (Math.max(...xs) - Math.min(...xs)) * 0.16);
      const my = Math.max(0.06, (Math.max(...ys) - Math.min(...ys)) * 0.16);
      bb = [Math.min(...xs) - mx, Math.min(...ys) - my, Math.max(...xs) + mx, Math.max(...ys) + my];
    }
  }
  /* ---- mapa real con Leaflet + teselas de OpenStreetMap -----------------
     Reemplaza el dibujo simplificado por un mapa con calles, relieve y
     precision geografica real. Necesita internet para las teselas: sin
     conexion el fondo queda gris, pero los poligonos, los puntos, los
     clics y los filtros siguen funcionando igual -- solo cambia el fondo. */
  if (MAPINST) { MAPINST.remove(); MAPINST = null; }
  const wrap = el("div", "mapwrap");
  const mapDiv = el("div", "leafmap");
  mapDiv.setAttribute("role", "img");
  mapDiv.setAttribute("aria-label", "Mapa de Antioquia por " + ind.lb);
  wrap.append(mapDiv);
  s.append(wrap);   // debe estar en el documento antes de que Leaflet mida el contenedor

  const map = L.map(mapDiv, { scrollWheelZoom: true });
  MAPINST = map;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, minZoom: 6,
    attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const sinDato = [];
  const capaPolis = L.layerGroup().addTo(map);
  D.mapa.f.forEach(ft => {
    let r = null, etiqueta = ft.nom, muCode = null, v;
    if (!ft.cod) {
      r = resMed.get(ft.cz) || null;
      etiqueta = "Medellin - " + ft.nom;
      const md = resDe.get("MEDELLIN"); if (md) muCode = md.code;
      v = esCob ? cobPct(cobPorCz.get(ft.cz)) : (r ? ind.v(r) : null);
    } else {
      const e = resDe.get(ft.nom);
      if (e) { r = e.r; muCode = e.code; }
      v = valorMun.has(ft.nom) ? valorMun.get(ft.nom) : null;
    }
    const dentro = !hayFiltro || enFiltro(ft);
    const sel = FMUN >= 0 && muCode === FMUN;
    const fillIn = CAPA === "uds" ? "#F2F7F2" : (v == null ? "#E9EFEA" : RAMPA[paso(v)]);
    /* opacidad baja a proposito: con el fondo de calles debajo, un relleno
       casi solido tapa el mapa y todo se ve igual de "ruidoso". Con menos
       opacidad el color sigue identificando el nivel, pero se nota que
       hay un mapa real debajo, no un bloque de color */
    const estilo = dentro
      ? { fillColor: fillIn, fillOpacity: .45, color: sel ? "#0C1912" : "#FDFEFD", weight: sel ? 2.2 : .8 }
      : { fillColor: "#EDF3EC", fillOpacity: .3, color: "#DDE8DB", weight: .6 };
    const latlngs = ft.g.map(ring => ring.map(c => [c[1], c[0]]));
    const poly = L.polygon(latlngs, { ...estilo, stroke: true });
    const html = v == null
      ? "<b>" + esc(etiqueta) + "</b><div class='r'><span>"
        + (esCob ? "Sin UDS con cupo conocido aqui" : "Sin beneficiarios en el filtro actual") + "</span></div>"
      : "<b>" + esc(etiqueta) + "</b><div class='r'><span>" + esc(ind.lb) + "</span><span>" + fnum(v, ind.k) + "</span></div>"
        + (r ? "<div class='r'><span>Beneficiarios</span><span>" + mil(r.n) + "</span></div>" : "")
        + "<div class='r'><span>Centro zonal</span><span>" + esc(ft.cz) + "</span></div>";
    poly.on("mousemove", e => showTT(e.originalEvent, html));
    poly.on("mouseout", hideTT);
    if (dentro) {
      poly.on("mouseover", () => poly.setStyle({ color: "#4F8245", weight: 1.8 }));
      poly.on("mouseout", () => poly.setStyle({ color: sel ? "#0C1912" : "#FDFEFD", weight: sel ? 2.2 : .8 }));
    }
    if (muCode != null) poly.on("click", () => { FMUN = FMUN === muCode ? -1 : muCode; hideTT(); render(); });
    poly.addTo(capaPolis);
    if (v == null && ft.cod && dentro) sinDato.push(ft.nom);
  });

  /* ---- capa de unidades de servicio ---- */
  let pts = [];
  if (CAPA !== "cor" && D.uds && D.uds.length) {
    const porUds = new Map();
    for (const i of ix) { const k = N.cu[i]; (porUds.get(k) || porUds.set(k, []).get(k)).push(i); }
    D.uds.forEach(u => {
      const code = CU_IDX.has(u.c) ? CU_IDX.get(u.c) : -1;
      const lista = (code >= 0 ? porUds.get(code) : null) || [];
      if (esCob) {
        if (u.cu == null) return;   // sin cupo conocido: no participa de este indicador
        pts.push({ u: u, r: lista.length ? resumen(lista) : { n: 0 }, v: u.cb, ix: lista });
      } else {
        if (!lista.length) return;
        const r = resumen(lista);
        /* 'lista' se guarda: es la que abre la tabla al hacer clic */
        pts.push({ u: u, r: r, v: ind.v(r), ix: lista });
      }
    });
    const tamPor = p => esCob ? (p.u.cu || 0) : p.r.n;
    const mb = Math.max(1, ...pts.map(tamPor));
    pts.sort((a, b) => tamPor(b) - tamPor(a));
    const capaPts = L.layerGroup().addTo(map);
    pts.forEach(p => {
      const radio = (hayFiltro && MZOOM ? 4 : 2.5) + (hayFiltro && MZOOM ? 13 : 8) * Math.sqrt(tamPor(p) / mb);
      const c = L.circleMarker([p.u.y, p.u.x], {
        radius: radio, fillColor: RAMPA[paso(p.v)], fillOpacity: .88,
        color: "#FDFEFD", weight: .8,
      });
      const html = "<b>" + esc(p.u.n) + "</b>"
        + "<div class='r'><span>" + esc(ind.lb) + "</span><span>" + fnum(p.v, ind.k) + "</span></div>"
        + (esCob
          ? "<div class='r'><span>Cupos UDS</span><span>" + mil(p.u.cu) + "</span></div>"
            + "<div class='r'><span>Con toma en el trimestre</span><span>" + mil(p.u.bt || 0) + "</span></div>"
          : "<div class='r'><span>Beneficiarios</span><span>" + mil(p.r.n) + "</span></div>")
        + "<div class='r'><span>Municipio</span><span>" + esc(p.u.mu) + "</span></div>"
        + "<div class='r'><span>Operador</span><span>" + esc(p.u.e) + "</span></div>"
        + "<div class='r'><span>Modalidad</span><span>" + esc(p.u.s) + "</span></div>"
        + (p.u.z ? "<div class='r'><span>Zona</span><span>" + (p.u.z === "R" ? "Rural" : p.u.z === "C" ? "Cabecera" : esc(p.u.z)) + "</span></div>" : "");
      c.on("mousemove", e => showTT(e.originalEvent, html
        + (p.ix.length ? "<div class='r'><span>Clic</span><span>ver los registros</span></div>" : "")));
      c.on("mouseout", hideTT);
      c.on("mouseover", () => c.setStyle({ color: "#0C1912", weight: 1.6 }));
      c.on("mouseout", () => c.setStyle({ color: "#FDFEFD", weight: .8 }));
      if (p.ix.length) c.on("click", () => {
        hideTT();
        tablaRegistros({
          t: p.u.n,
          idx: () => p.ix,
          ordenar: 9, asc: true,
          lead: "Los <b>" + mil(p.r.n) + "</b> beneficiarios de esta unidad de servicio. "
            + esc(p.u.mu) + " · " + esc(p.u.s) + (p.u.z ? " · " + (p.u.z === "R" ? "zona rural" : "cabecera") : "")
            + "<br>Operador: " + esc(p.u.e),
          pie: "Ordenados por puntaje Z de peso para la talla, de menor a mayor: arriba el caso más "
            + "comprometido de la unidad. Los encabezados reordenan la tabla.",
        });
      });
      c.addTo(capaPts);
    });
    s.dataset.pts = pts.length;
  } else {
    s.dataset.pts = "";
  }

  map.fitBounds([[bb[1], bb[0]], [bb[3], bb[2]]], { padding: [10, 10] });
  if (hayFiltro) {
    const vb = el("button", "volver", MZOOM ? "Ver toda Antioquia" : "Acercar a la selección");
    vb.type = "button";
    vb.onclick = () => { MZOOM = MZOOM ? 0 : 1; vMapa(); };
    wrap.append(vb);
  }

  const leg = el("div", "mapleg");
  if (escalaPlana) {
    const sw = el("div", "sw"); const b = el("i"); b.style.background = RAMPA[3];
    sw.append(b, el("span", null, "con casos")); leg.append(sw);
    const sw2 = el("div", "sw"); const b2 = el("i"); b2.style.background = RAMPA[1];
    sw2.append(b2, el("span", null, "sin casos")); leg.append(sw2);
  } else {
  leg.append(el("span", null, ind.inv ? "mayor" : "menor"));
  RAMPA.forEach((c, i) => {
    const sw = el("div", "sw"); const b = el("i"); b.style.background = c;
    const lo = i === 0 ? 0 : cortes[i - 1], hi = i < cortes.length ? cortes[i] : null;
    const n1 = ind.k === "irn" ? lo.toFixed(0) : lo.toFixed(1).replace(".", ",") + "%";
    const n2 = hi == null ? null : (ind.k === "irn" ? hi.toFixed(0) : hi.toFixed(1).replace(".", ",") + "%");
    sw.append(b, el("span", null, n2 == null ? "≥" + n1 : n1 + "–" + n2));
    leg.append(sw);
  });
  leg.append(el("span", null, ind.inv ? "menor" : "mayor"));
  }
  const nd = el("div", "sw"); const nb = el("i"); nb.style.background = "#E9EFEA";
  nd.append(nb, el("span", null, "sin dato")); leg.append(nd);
  wrap.append(leg);
  if (CAPA !== "cor" && s.dataset.pts) wrap.append(el("div", "nomatch",
    s.dataset.pts + " unidades de servicio ubicadas. El tamaño del círculo es "
    + (esCob ? "el cupo autorizado" : "la población atendida") + "; el color, el indicador elegido."));
  if (sinDato.length && !hayFiltro) wrap.append(el("div", "nomatch",
    (esCob ? "Sin UDS con cupo conocido: " : "Sin beneficiarios en el filtro actual: ")
    + sinDato.slice(0, 8).join(", ")
    + (sinDato.length > 8 ? " y " + (sinDato.length - 8) + " mas" : "")));
  /* wrap ya esta en el documento desde antes de inicializar Leaflet */

  const rank = Array.from(valorMun.entries())
    .filter(k => resDe.has(k[0]) && resDe.get(k[0]).r.n >= 60)
    .map(k => ({ lb: k[0], v: k[1], n: resDe.get(k[0]).r.n }))
    .sort((a, b) => b.v - a.v);
  const media = esCob ? cobPct(cobTot) : ind.v(resumen(ix));
  if (rank.length < 3 && CAPA !== "cor") {
    s.append(lectura("Con este filtro queda " + (rank.length === 1 ? "un solo territorio" : mil(rank.length) + " territorios")
      + ", así que la comparación entre municipios no aplica. El mapa muestra las <b>unidades de servicio</b>: el tamaño del círculo es la población atendida y el color, el indicador elegido."));
  }
  if (rank.length >= 3) {
    const alto = ind.inv ? rank[rank.length - 1] : rank[0];
    const bajo = ind.inv ? rank[0] : rank[rank.length - 1];
    s.append(lectura("El extremo lo marca <b>" + esc(alto.lb) + "</b> con "
      + arriba(fnum(alto.v, ind.k)) + " sobre " + mil(alto.n) + " beneficiarios, frente a <b>"
      + esc(bajo.lb) + "</b> con " + abajo(fnum(bajo.v, ind.k))
      + ". La media del conjunto filtrado es " + fnum(media, ind.k)
      + ". Solo se comparan municipios con 60 o mas beneficiarios."));
    s.append(h2("Municipios ordenados por " + ind.lb.toLowerCase()));
    s.append(barsDelta(rank.slice(0, 18).map(x => ({
      lb: x.lb, v: x.v, n: x.n,
      tip: "<b>" + esc(x.lb) + "</b><div class='r'><span>" + esc(ind.lb) + "</span><span>"
        + fnum(x.v, ind.k) + "</span></div><div class='r'><span>Beneficiarios</span><span>"
        + mil(x.n) + "</span></div>",
    })), media));
  }
}


/* =====================================================================
   ANATOMIA DEL DATO
   Fuente tecnica: ICBF, Anexo 1 "Orientaciones para la toma de medidas
   antropometricas", A14.G4.PP, version 1 del 15/05/2026.
   ===================================================================== */
const ICOM = {
  peso: "M7 7h10l2.2 12.2a1 1 0 0 1-1 1.8H5.8a1 1 0 0 1-1-1.8L7 7zm2-1.5a3 3 0 1 1 6 0V7H9V5.5z",
  talla: "M4 3h5v18H4V3zm0 3.6h2.4M4 10.2h3.4M4 13.8h2.4M4 17.4h3.4M13 21V9.5a3.5 3.5 0 1 1 7 0V21",
  cinta: "M4.5 9.5h15v5h-15v-5zm2.5 0v2m2.5-2v3m2.5-3v2m2.5-2v3m2.5-3v2",
  cefalico: "M12 3.5c-4 0-7 2.8-7 6.4 0 2.3 1.2 3.7 2 4.6.6.7.9 1.3.9 2.2V19h8.2v-2.3c0-.9.3-1.5.9-2.2.8-.9 2-2.3 2-4.6 0-3.6-3-6.4-7-6.4z",
  calc: "M6 3h12v18H6V3zm2.5 4h7M8.5 11h1.5m3 0h1.5M8.5 14.5h1.5m3 0h1.5M8.5 18h1.5m3 0h1.5",
};

/* ---------- histograma ---------- */
function histograma(vals, cfg) {
  const v = vals.filter(x => x >= cfg.min && x <= cfg.max).sort((a, b) => a - b);
  if (v.length < 30) return el("div", "note", "Sin datos suficientes para el histograma.");
  const nb = cfg.bins || 34;
  const lo = cfg.min, hi = cfg.max, w = (hi - lo) / nb;
  const b = new Array(nb).fill(0);
  v.forEach(x => { const k = Math.min(nb - 1, Math.floor((x - lo) / w)); b[k]++; });
  const mx = Math.max(...b);
  const cont = el("div");
  const h = el("div", "hist");
  b.forEach((c, i) => {
    const bar = el("i");
    bar.style.height = Math.max(1, 100 * c / mx) + "%";
    bar.style.background = cfg.color;
    const a1 = (lo + i * w), a2 = a1 + w;
    const html = "<b>" + a1.toFixed(1).replace(".", ",") + " a " + a2.toFixed(1).replace(".", ",") + " " + cfg.u + "</b>"
      + "<div class='r'><span>Beneficiarios</span><span>" + mil(c) + "</span></div>"
      + "<div class='r'><span>Del total medido</span><span>" + p2f(100 * c / v.length) + "</span></div>";
    bar.onmousemove = e => showTT(e, html); bar.onmouseleave = hideTT;
    h.append(bar);
  });
  cont.append(h);
  const ej = el("div", "hejes");
  ej.append(el("span", null, lo.toFixed(0) + " " + cfg.u), el("span", null, ((lo + hi) / 2).toFixed(0)), el("span", null, hi.toFixed(0) + " " + cfg.u));
  cont.append(ej);
  const q = pp => v[Math.min(v.length - 1, Math.floor(pp * v.length))];
  const st = el("div", "hstat");
  st.innerHTML = "mediana <b>" + q(.5).toFixed(1).replace(".", ",") + " " + cfg.u + "</b>"
    + "<span>rango intercuartil <b>" + q(.25).toFixed(1).replace(".", ",") + " – " + q(.75).toFixed(1).replace(".", ",") + "</b></span>"
    + "<span>n = <b>" + mil(v.length) + "</b></span>";
  cont.append(st);
  return cont;
}

/* ---------- preferencia de digito ---------- */
function digitos(vals, cfg) {
  const c = new Array(10).fill(0);
  let n = 0;
  vals.forEach(x => { if (x > 0) { c[Math.round(x * 10) % 10]++; n++; } });
  if (!n) return el("div", "note", "Sin datos.");
  const esperado = n / 10, mx = Math.max(...c);
  const cont = el("div");
  const g = el("div", "dig");
  c.forEach((v, i) => {
    const col = el("div", "col" + (v > esperado * 1.35 ? " alto" : ""));
    const bar = el("i");
    bar.style.height = Math.max(2, 100 * v / mx) + "%";
    if (v <= esperado * 1.35) bar.style.background = cfg.color;
    const html = "<b>Termina en ," + i + "</b><div class='r'><span>Registros</span><span>" + mil(v) + "</span></div>"
      + "<div class='r'><span>Observado</span><span>" + p2f(100 * v / n) + "</span></div>"
      + "<div class='r'><span>Esperado</span><span>10,00 %</span></div>";
    bar.onmousemove = e => showTT(e, html); bar.onmouseleave = hideTT;
    col.append(bar, el("span", null, "," + i));
    g.append(col);
  });
  cont.append(g);
  const ref = el("div", "digref");
  ref.style.marginTop = "-" + (100 * esperado / mx * 1.2 + 18) + "px";
  ref.append(el("span", null, "10 % esperado"));
  const st = el("div", "hstat");
  const pico = c.indexOf(mx);
  st.innerHTML = "el dígito <b>," + pico + "</b> aparece en el <b>" + p2f(100 * mx / n)
    + "</b> de los registros, cuando lo esperable es 10 %";
  cont.append(st);
  return cont;
}

function vAnatomia() {
  const s = $("#v-anatomia"); s.textContent = "";
  const ix = idxNN();
  if (!ix.length) { s.append(vacio("Sin beneficiarios con estos filtros.")); return; }
  const col = k => ix.map(i => N[k][i]);

  s.append(lectura("Todo el seguimiento nutricional arranca con <b>cuatro números</b> que alguien toma con un instrumento. Lo demás —los puntajes Z, los estados, los índices— se calcula a partir de ellos. Esta sección muestra unos y otros por separado, con la técnica que exige el <b>Anexo 1 del ICBF sobre toma de medidas antropométricas</b>."));

  /* --------- medidas que se toman --------- */
  s.append(h2("Lo que se mide con un instrumento", "medicion"));
  const em = col("em");
  const men2 = ix.filter(i => N.em[i] >= 0 && N.em[i] < 24).length;
  const may2 = ix.filter(i => N.em[i] >= 24).length;
  const aplPB = ix.filter(i => N.em[i] >= 6 && N.em[i] <= 59).length;
  const conPB = ix.filter(i => N.em[i] >= 6 && N.em[i] <= 59 && N.pb[i] > 0).length;
  const aplPC = ix.filter(i => N.em[i] >= 0 && N.em[i] < 60).length;
  const conPC = ix.filter(i => N.em[i] >= 0 && N.em[i] < 60 && N.pc[i] > 0).length;

  const tarjeta = (cfg) => {
    const c = el("div", "med");
    const mt = el("div", "mt");
    mt.innerHTML = '<div class="ic"><svg viewBox="0 0 24 24"><path d="' + ICOM[cfg.ic] + '"/></svg></div>'
      + '<div><h4>' + esc(cfg.t) + '</h4><div class="u">' + esc(cfg.u2) + '</div></div>'
      + '<span class="tag2 ' + (cfg.calc ? "calc" : "mide") + '">' + (cfg.calc ? "SE CALCULA" : "SE MIDE") + '</span>';
    c.append(mt);
    const b = el("div", "mb2");
    const dl = el("dl");
    cfg.datos.forEach(d => { dl.append(el("dt", null, esc(d[0])), el("dd", null, d[1])); });
    b.append(dl);
    if (cfg.chart) b.append(cfg.chart);
    if (cfg.cob) {
      const cb = el("div", "cob");
      const pct_ = 100 * cfg.cob[0] / cfg.cob[1];
      cb.innerHTML = '<span>Cobertura</span><span class="bar2"><i style="width:' + pct_.toFixed(1)
        + '%;background:' + (pct_ > 90 ? "var(--icbf-verde)" : pct_ > 50 ? "var(--icbf-naranja)" : "var(--icbf-rojo)")
        + '"></i></span><b>' + p1(pct_) + '</b>';
      b.append(cb);
    }
    c.append(b);
    return c;
  };

  const meds = el("div", "medidas");
  meds.append(tarjeta({
    t: "Peso", u2: "kilogramos", ic: "peso",
    datos: [
      ["Instrumento", "<b>Pesabebés</b> en menores de 2 años; <b>báscula de piso</b> en mayores. Báscula de plataforma si hay movilidad reducida."],
      ["Técnica", "Con la mínima ropa posible, sobre superficie plana y con el equipo tarado en cero. Sin pesabebés, se pesa al cuidador con y sin el niño y se resta."],
      ["Precisión", "Aproximar a <b>50–100 g</b> según la sensibilidad del equipo."],
      ["Repetir si", "la segunda medida varía más de <b>dos veces la sensibilidad</b> de la báscula: se toma una tercera y se promedian las dos más cercanas."],
    ],
    chart: histograma(col("kg"), { min: 2, max: 32, u: "kg", color: "var(--icbf-verde)", bins: 34 }),
  }));
  meds.append(tarjeta({
    t: "Talla o longitud", u2: "centímetros", ic: "talla",
    datos: [
      ["Instrumento", "<b>Infantómetro</b> en menores de 2 años; <b>tallímetro</b> en mayores."],
      ["Son dos medidas distintas", "En menores de 2 años se mide <b>acostado</b> y se llama <b>longitud</b>, sin importar si el niño ya camina. Desde los 2 años se mide <b>de pie</b> y se llama <b>talla</b>."],
      ["Técnica", "La longitud exige dos personas: una sostiene la cabeza, la otra estira las rodillas y desliza la pieza móvil contra las plantas."],
      ["Repetir si", "varía más de <b>0,5 cm</b> entre la primera y la segunda medida."],
    ],
    chart: histograma(col("cm"), { min: 45, max: 125, u: "cm", color: "var(--icbf-azul)", bins: 34 }),
  }));
  meds.append(tarjeta({
    t: "Perímetro de brazo", u2: "centímetros · MUAC", ic: "cinta",
    datos: [
      ["Aplica a", "niñas y niños de <b>6 a 59 meses</b>."],
      ["Instrumento", "cinta métrica flexible no extensible de máximo 5 mm de ancho; se sugiere la cinta MUAC."],
      ["Técnica", "brazo no dominante en ángulo de 90°, se marcan acromion y olécranon y se mide en el <b>punto medio</b> entre ambos."],
      ["Repetir si", "varía más de <b>0,3 cm</b> entre las dos medidas."],
    ],
    chart: histograma(col("pb"), { min: 8, max: 26, u: "cm", color: "var(--icbf-naranja)", bins: 30 }),
    cob: [conPB, aplPB],
  }));
  meds.append(tarjeta({
    t: "Perímetro cefálico", u2: "centímetros", ic: "cefalico",
    datos: [
      ["Aplica a", "niñas y niños <b>menores de 5 años</b>."],
      ["Técnica", "cinta alrededor de la cabeza pasando por la glabela y la parte más saliente del occipital, horizontal en todo su recorrido."],
      ["Repetir si", "varía más de <b>0,3 cm</b>."],
      ["En este corte", conPC < aplPC * 0.02
        ? "<b style='color:var(--icbf-rojo)'>prácticamente no se está tomando</b>: solo " + mil(conPC) + " de " + mil(aplPC) + " niñas y niños a los que aplica."
        : mil(conPC) + " registros con dato."],
    ],
    cob: [conPC, aplPC],
  }));
  s.append(meds);

  /* --------- la frontera de los dos años --------- */
  s.append(h2("La frontera de los dos años"));
  s.append(el("p", "note", "A los dos años cambia todo en la medición de la estatura: el instrumento, "
    + "la postura, el número de personas que hacen falta y hasta el nombre de la medida, que pasa de "
    + "longitud a talla. Este gráfico muestra cuánta población cae a cada lado de esa frontera; el "
    + "recuadro que va después dice por qué importa."));
  s.append(mosaico([
    { lb: "Longitud · acostado · infantómetro", v: men2, c: "var(--e2)" },
    { lb: "Talla · de pie · tallímetro", v: may2, c: "var(--icbf-verde)" },
  ], { cat: "Técnica de medición según la edad" }));
  s.append(guia(GUIAS.tecnica));
  const rMen = resumen(ix.filter(i => N.em[i] >= 0 && N.em[i] < 24));
  const rMay = resumen(ix.filter(i => N.em[i] >= 24));
  s.append(lectura("El retraso en talla marca <b>" + p2f(pct(rMen.retraso, rMen.n)) + "</b> en los menores de dos años frente a <b>"
    + p2f(pct(rMay.retraso, rMay.n)) + "</b> en los mayores. La desnutrición crónica se acumula con la edad, así que debería ser al revés. "
    + (pct(rMen.retraso, rMen.n) > pct(rMay.retraso, rMay.n)
      ? "Que se invierta justo en la frontera donde cambia la técnica apunta a la <b>medición de longitud en acostado</b>, que exige dos personas y es la más difícil de hacer bien."
      : "Aquí el patrón es el esperado.")));

  /* --------- preferencia de digito --------- */
  s.append(h2("¿Se está redondeando el peso?"));
  s.append(el("p", "note", "Si el peso se registra con la precisión que pide la guía, los diez decimales posibles deberían repartirse parejo, cerca del 10 % cada uno. Un pico en ,0 y ,5 delata que se está aproximando a kilos y medios kilos."));
  const pan = el("div", "panel");
  pan.append(digitos(col("kg"), { color: "var(--icbf-verde)" }));
  s.append(pan);
  const cd = new Array(10).fill(0); let nd = 0;
  ix.forEach(i => { if (N.kg[i] > 0) { cd[Math.round(N.kg[i] * 10) % 10]++; nd++; } });
  const exceso = (cd[0] + cd[5]) / nd * 100;
  s.append(lectura(exceso > 26
    ? "Los decimales <b>,0</b> y <b>,5</b> concentran el <b>" + p1(exceso) + "</b> de los registros, cuando entre los dos deberían sumar 20 %. Es <b>preferencia de dígito</b>: se está redondeando a kilos y medios kilos en vez de anotar los 50 o 100 gramos que exige la guía. No invalida el dato, pero introduce un error sistemático que se propaga al puntaje Z."
    : "Los decimales se reparten de forma razonablemente pareja: no hay señal fuerte de redondeo."));

  /* --------- lo que se calcula --------- */
  s.append(h2("Lo que se calcula a partir de esas medidas"));
  s.append(el("p", "note", "Ninguno de estos campos se mide: todos salen de combinar las medidas anteriores con la edad, el sexo y las tablas de referencia de la OMS."));
  const calc = el("div", "medidas");
  const zt = col("zt").filter(x => x > -50 && Math.abs(x) <= 6);
  const zp = col("zp").filter(x => x > -50 && Math.abs(x) <= 6);
  calc.append(tarjeta({
    t: "Puntaje Z de talla para la edad", u2: "desviaciones estándar", ic: "calc", calc: 1,
    datos: [
      ["Entra", "talla o longitud, edad en meses y sexo."],
      ["Sale de", "las tablas LMS de los Patrones de Crecimiento Infantil de la <b>OMS 2006</b>."],
      ["Se interpreta", "por debajo de −2 DE es retraso en talla, según la <b>Resolución 2465 de 2016</b>."],
      ["Ojo", "<b>no se puede imputar</b> si falta: requiere miles de valores de referencia por edad y sexo."],
    ],
    chart: histograma(zt, { min: -4, max: 4, u: "DE", color: "var(--d2)", bins: 32 }),
  }));
  calc.append(tarjeta({
    t: "Puntaje Z de peso para la talla", u2: "desviaciones estándar", ic: "calc", calc: 1,
    datos: [
      ["Entra", "peso, talla o longitud y sexo. <b>No usa la edad.</b>"],
      ["Se interpreta", "por debajo de −2 DE es desnutrición aguda; por encima de +2 DE, sobrepeso."],
      ["Es el indicador", "de emergencia: detecta el déficit reciente, no el acumulado."],
    ],
    chart: histograma(zp, { min: -4, max: 4, u: "DE", color: "var(--e2)", bins: 32 }),
  }));
  const flags = ix.filter(i => N.fl[i] > 0).length;
  calc.append(tarjeta({
    t: "Flag de plausibilidad", u2: "marca del sistema", ic: "calc", calc: 1,
    datos: [
      ["Qué hace", "marca las mediciones biológicamente imposibles según los límites de la OMS."],
      ["Verificado", (() => { const f = D.calidad_extra.flag, okD = f.ok_dentro || 0, okF = f.ok_fuera || 0, malD = f.mal_dentro || 0, malF = f.mal_fuera || 0;
        return "con Flag = 0 el " + p1(pct(okD, okD + okF)) + " tiene el puntaje Z dentro de los límites OMS; con Flag distinto de cero, el " + p1(pct(malF, malD + malF)) + " los supera."; })()],
      ["En este corte", "<b>" + mil(flags) + "</b> registros marcados (" + p2f(pct(flags, ix.length)) + ")."],
      ["Uso", "el tablero los excluye del índice de riesgo y los deja como <b>no evaluables</b>."],
    ],
  }));
  calc.append(tarjeta({
    t: "Criterio de cumplimiento", u2: "marca del sistema", ic: "calc", calc: 1,
    datos: [
      ["Qué hace", "el sistema evalúa si el registro nutricional cumple lo exigido."],
      ["No mide nutrición", "mide <b>disciplina de registro</b>. Su dispersión entre centros zonales de la misma regional llega a ser de " + (() => {
        const g = porDim(idxNN(), "cz", DIC.cz, 300).map(x => pct(x.r.nc, x.r.n)).filter(v => v > 0);
        return (g.length > 1 ? Math.max(...g) / Math.min(...g) : 1).toFixed(1).replace(".", ",");
      })() + " veces."],
      ["En este corte", "<b>" + p1(pct(resumen(ix).nc, ix.length)) + "</b> en NO CUMPLE."],
    ],
  }));
  s.append(calc);

  s.append(el("p", "note", "Fuente técnica: ICBF, <b>Anexo 1. Orientaciones para la toma de medidas antropométricas</b>, A14.G4.PP versión 1 del 15/05/2026, y Resolución 2465 de 2016 del Ministerio de Salud sobre los Patrones de Crecimiento Infantil de la OMS."));
}


/* =====================================================================
   PERFIL
   Una figura por poblacion, con las llamadas ancladas al punto anatomico
   donde se toma cada medida. A la izquierda lo que se mide; a la derecha
   lo que se calcula.
   ===================================================================== */
const FIG = {"nn":{"w":241,"h":620,"src":"data:image/png;base64,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"},"gs":{"w":252,"h":620,"src":"data:image/png;base64,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"}};
let PPOB = "nn";

function llamada(cfg) {
  const d = el("div", "llam " + cfg.lado);
  d.style.top = cfg.top + "px";
  if (cfg.chip) {
    const c = el("span", "chip3"); c.style.background = cfg.color; c.textContent = cfg.chip;
    d.append(c);
  }
  d.append(el("div", "lt", esc(cfg.t)));
  const v = el("div", "lv");
  v.innerHTML = '<span style="color:' + cfg.color + '">' + cfg.v + "</span>"
    + (cfg.u ? '<span class="lu">' + esc(cfg.u) + "</span>" : "");
  d.append(v);
  if (cfg.d) d.append(el("div", "ld", cfg.d));
  if (cfg.barra != null) {
    const b = el("div", "lb2");
    const i = el("i");
    i.style.width = Math.max(2, Math.min(100, cfg.barra)) + "%";
    i.style.background = cfg.color;
    b.append(i); d.append(b);
  }
  if (cfg.tip) { d.onmousemove = e => showTT(e, cfg.tip); d.onmouseleave = hideTT; }
  return d;
}

function vPerfil() {
  const s = $("#v-perfil"); s.textContent = "";
  const ix = idxNN(), a = resumen(ix);
  const gx = idxGS(), g = resumenGS(gx);

  const sel = el("div", "perfsel");
  const l = el("span", "poplab", "Población a mostrar");
  const tog = el("div", "poptog"); tog.setAttribute("role", "group"); tog.setAttribute("aria-label", "Población a mostrar");
  [["nn", "Niñas y niños"], ["gs", "Personas gestantes"]].forEach(x => {
    const b = el("button", "popbtn", esc(x[1])); b.type = "button";
    b.setAttribute("aria-pressed", String(x[0] === PPOB));
    b.onclick = () => { PPOB = x[0]; vPerfil(); };
    tog.append(b);
  });
  sel.append(l, tog);
  const nota = el("div", "note");
  nota.style.margin = "0 0 0 auto";
  nota.innerHTML = "Pase el cursor para saber <b>cómo se lee</b> cada tarjeta, o haga clic en «ver detalle» para el gráfico que la sustenta.";
  sel.append(nota);
  s.append(h2("Perfil del conjunto", PPOB === "nn" ? "medicion" : "gest"), sel);

  if (PPOB === "nn" && !a.n) { s.append(vacio("Sin beneficiarios con estos filtros.")); return; }
  if (PPOB === "gs" && !g.n) { s.append(vacio("Sin gestantes con estos filtros.")); return; }

  const wrap = el("div", "perf");
  const fig = el("div", "pfig");
  const img = el("img");
  img.src = FIG[PPOB].src;
  img.alt = PPOB === "nn" ? "Figura de niña o niño" : "Figura de persona gestante";
  fig.append(img);

  /* ---- las llamadas, con su ancla en coordenadas relativas ---- */
  /* el corte territorial mas fino que permitan los filtros activos */
  const [nCol, nDic, nLb, nMin] = nivelTerritorio();
  const corto = z => String(z == null ? "?" : z).replace(/^CZ /, "");
  const un = v => (v || 0).toFixed(1).replace(".", ",");
  /* la guia pide anotar el peso a 50 o 100 gramos y la talla a 0,1 cm; si el
     ultimo digito se concentra en 0 y 5 es que se esta redondeando a ojo */
  const redondos = arr => { let n = 0, r = 0;
    arr.forEach(x => { if (x > 0) { n++; if (Math.round(x * 10) % 5 === 0) r++; } });
    return n ? 100 * r / n : 0; };
  const sub = txt => { const d = el("div", "evsub"); d.textContent = txt; return d; };
  const pila = (...partes) => { const c = el("div"); partes.forEach(x => x && c.append(x)); return c; };
  const lee = (txt, filas) => "<b>Cómo se lee</b><p>" + txt + "</p>"
    + (filas || []).map(f => "<div class='r'><span>" + f[0] + "</span><span>" + f[1] + "</span></div>").join("");

  const L = [];
  if (PPOB === "nn") {
    const col = k => ix.map(i => N[k][i]);
    const med = arr => { const v = arr.filter(x => x > 0).sort((p_, q) => p_ - q);
      return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const KG = col("kg"), CM = col("cm"), PB = col("pb"), PC = col("pc");
    const rKG = redondos(KG), rCM = redondos(CM);
    const conPB = ix.filter(i => N.em[i] >= 6 && N.em[i] <= 59 && N.pb[i] > 0).length;
    const aplPB = ix.filter(i => N.em[i] >= 6 && N.em[i] <= 59).length;
    const conPC = ix.filter(i => N.em[i] >= 0 && N.em[i] < 60 && N.pc[i] > 0).length;
    const aplPC = ix.filter(i => N.em[i] >= 0 && N.em[i] < 60).length;
    const GT = porDim(ix, nCol, nDic, nMin);
    /* grafico de puntos del indicador pedido, por el territorio vigente */
    const terr = (fn, ref, color, tope) => dotsMini(
      GT.map(z => Object.assign({ lb: corto(z.lb) }, fn(z))).sort((z, q) => q.v - z.v).slice(0, tope || 8),
      ref, color);
    /* el retraso deberia crecer con la edad; si baja, falla la medicion en acostado */
    const rb = resumen(ix.filter(i => N.em[i] >= 0 && N.em[i] < 24));
    const ra = resumen(ix.filter(i => N.em[i] >= 24));

    L.push(
      { lado: "izq", top: 24, ancla: [50, 6], color: "var(--icbf-azul)",
        t: "Perímetro cefálico", v: p1(pct(conPC, aplPC)), u: "de cobertura",
        d: "solo <b>" + mil(conPC) + "</b> de " + mil(aplPC) + " menores de 5 años tienen el dato",
        barra: pct(conPC, aplPC),
        tip: lee("Se encabeza con la <b>cobertura</b>, no con la medida: con casi ningún registro, "
          + "una mediana de perímetro cefálico no representaría nada. La barra es esa misma cobertura.",
          [["Con dato", mil(conPC) + " de " + mil(aplPC)], ["Debería tomarse a", "todo menor de 5 años"],
           ["Dónde se mide", "glabela y occipital"]]),
        evid: () => ({
          t: "Perímetro cefálico · cobertura",
          lead: "La guía lo pide en toda valoración de menores de cinco años. En la práctica no se está tomando en ningún territorio.",
          chart: terr(z => { const ap = z.idx.filter(i => N.em[i] >= 0 && N.em[i] < 60).length;
              const cn = z.idx.filter(i => N.em[i] >= 0 && N.em[i] < 60 && N.pc[i] > 0).length;
              return { v: pct(cn, ap), n: cn, hi: cn === 0 }; }, pct(conPC, aplPC), "var(--icbf-azul)", 9),
          pie: "Cinta flexible por la glabela y la parte más saliente del occipital. <b>Repetir si varía más de 0,3 cm.</b> "
            + "Es el tamizaje de micro y macrocefalia: sin él no hay forma de detectarlas.",
        }) },

      { lado: "izq", top: 232, ancla: [24, 43], color: "var(--icbf-naranja)",
        t: "Perímetro de brazo", v: p1(pct(conPB, aplPB)), u: "de cobertura",
        d: "mediana <b>" + un(med(PB)) + " cm</b> · aplica de 6 a 59 meses",
        barra: pct(conPB, aplPB),
        tip: lee("Encabeza la <b>cobertura</b> porque es lo que varía entre territorios; la mediana "
          + "va debajo. El MUAC detecta desnutrición aguda por sí solo, sin necesitar peso ni talla.",
          [["Con dato", mil(conPB) + " de " + mil(aplPB)], ["Brazo", "el no dominante"],
           ["Dónde se mide", "punto medio acromion-olécranon"]]),
        evid: () => ({
          t: "Perímetro de brazo · MUAC",
          lead: "Aplica de 6 a 59 meses. Es la única medida que clasifica desnutrición aguda por sí sola, y por eso su cobertura importa.",
          chart: pila(
            histograma(PB, { min: 9, max: 24, u: "cm", color: "var(--icbf-naranja)", bins: 28 }),
            sub("Cobertura por " + nLb),
            terr(z => { const ap = z.idx.filter(i => N.em[i] >= 6 && N.em[i] <= 59).length;
                const cn = z.idx.filter(i => N.em[i] >= 6 && N.em[i] <= 59 && N.pb[i] > 0).length;
                return { v: pct(cn, ap), n: cn }; }, pct(conPB, aplPB), "var(--icbf-naranja)", 9)),
          pie: "Cinta en el brazo izquierdo relajado, sin apretar. <b>Repetir si varía más de 0,3 cm.</b>",
        }) },

      { lado: "izq", top: 400, ancla: [50, 40], color: "var(--icbf-verde-osc)",
        t: "Peso", v: p1(rKG), u: "termina en ,0 o ,5",
        d: "mediana <b>" + un(med(KG)) + " kg</b> · debería anotarse a 50 o 100 gramos",
        barra: rKG,
        tip: lee("La mediana de peso <b>casi no cambia al filtrar</b>, porque la manda la mezcla de "
          + "edades y esa es parecida en todo el departamento. Por eso encabeza el <b>redondeo del "
          + "registro</b>, que sí distingue territorios y dice cómo se está pesando. Si no hubiera "
          + "preferencia de dígito, esta cifra rondaría el 20 %.",
          [["Esperado sin sesgo", "20,0 %"], ["Observado", p1(rKG)],
           ["Mediana", un(med(KG)) + " kg"], ["Instrumento", "pesabebés hasta los 2 años"]]),
        evid: () => ({
          t: "Peso · distribución y precisión del registro",
          lead: "Arriba, cómo se reparte el peso en el conjunto filtrado. Abajo, con qué dígito termina lo anotado.",
          chart: pila(
            histograma(KG, { min: 2, max: 32, u: "kg", color: "var(--icbf-verde-osc)", bins: 30 }),
            sub("Último dígito registrado"),
            digitos(KG, { color: "var(--icbf-verde-osc)" })),
          pie: "Cada dígito debería aportar cerca del 10 %. Los picos en <b>0 y 5</b> delatan que se redondea "
            + "a kilos y medios kilos, cuando la guía pide aproximar a 50 o 100 gramos.",
        }) },

      { lado: "izq", top: 540, ancla: [50, 92], color: "var(--icbf-verde-med)",
        t: "Talla o longitud", v: p1(rCM), u: "termina en ,0 o ,5",
        d: "mediana <b>" + un(med(CM)) + " cm</b> · acostado hasta los 2 años, de pie desde los 2",
        barra: rCM,
        tip: lee("Mismo criterio que el peso: la mediana depende de la edad y no discrimina, así que "
          + "encabeza el <b>redondeo</b>. La talla es la medida más difícil de tomar bien y la que "
          + "más pesa en el retraso en talla, el hallazgo principal del conjunto.",
          [["Esperado sin sesgo", "20,0 %"], ["Observado", p1(rCM)],
           ["Mediana", un(med(CM)) + " cm"], ["Hasta los 2 años", "acostado, con dos personas"]]),
        evid: () => ({
          t: "Talla o longitud",
          lead: "Hasta los 2 años es <b>longitud</b>, acostado con infantómetro y dos personas. Desde los 2, <b>talla</b> de pie con tallímetro.",
          chart: pila(
            histograma(CM, { min: 45, max: 125, u: "cm", color: "var(--icbf-verde-med)", bins: 30 }),
            sub("Retraso en talla según cómo se mide"),
            dotsMini([
              { lb: "Menores de 2 años · acostado", v: pct(rb.retraso, rb.n), n: rb.retraso, hi: true },
              { lb: "2 años o más · de pie", v: pct(ra.retraso, ra.n), n: ra.retraso },
            ], pct(a.retraso, a.n), "var(--d2)")),
          pie: "El retraso <b>debería crecer</b> con la edad, porque es privación acumulada. Que salga más alto "
            + "en los pequeños apunta a la medición en acostado, que exige dos personas. <b>Repetir si varía más de 0,5 cm.</b>",
        }) },

      { lado: "der", top: 24, ancla: [50, 22], color: a.pt[1] + a.pt[2] ? "var(--d2)" : "var(--ok)",
        chip: "SE CALCULA",
        t: "Peso para la talla", v: p1(pct(a.pt[4], a.n)), u: "adecuado",
        d: "<b>" + mil(a.dnt) + "</b> con desnutrición aguda · <b>" + mil(a.exceso) + "</b> con exceso",
        barra: pct(a.pt[4], a.n),
        tip: lee("Compara el peso con lo esperado <b>para la talla que ya tiene</b>, no para su edad. "
          + "Detecta el problema reciente: si adelgazó, se ve aquí. La cifra grande es la franja verde "
          + "central; lo que falta para 100 está repartido entre déficit y exceso.",
          [["Adecuado", mil(a.pt[4])], ["Desnutrición aguda", mil(a.dnt)],
           ["Riesgo", mil(a.riesgo)], ["Sobrepeso u obesidad", mil(a.exceso)]]),
        evid: () => ({
          t: "Peso para la talla",
          lead: "El gradiente completo, del déficit al exceso, y dónde se concentra la desnutrición aguda.",
          chart: pila(
            dotsMini(BANDAS7.map(x => ({ lb: x.lb, v: pct(a.pt[x.k], a.n), n: a.pt[x.k], c: x.c,
              hi: x.k === 1 || x.k === 2 })), null, "var(--ok)"),
            sub("Desnutrición aguda por " + nLb),
            terr(z => ({ v: pct(z.r.dnt, z.r.n), n: z.r.dnt }), pct(a.dnt, a.n), "var(--d2)", 9)),
          pie: "Puntos de corte de la <b>Resolución 2465 de 2016</b> sobre patrones OMS 2006. En el segundo gráfico "
            + "la línea punteada es la media del conjunto.",
        }) },

      { lado: "der", top: 196, ancla: [50, 66], color: "var(--d2)", chip: "SE CALCULA",
        t: "Talla para la edad", v: p1(pct(a.retraso, a.n)), u: "retraso",
        d: mil(a.retraso) + " con talla baja para su edad",
        barra: pct(a.retraso, a.n) * 3,
        tip: lee("Talla por debajo de <b>−2 desviaciones estándar</b> frente a la referencia OMS de su "
          + "edad y sexo. Es desnutrición <b>crónica</b>: no se corrige con una intervención puntual "
          + "y no revierte después de los primeros años. La barra va amplificada ×3 para que se vea.",
          [["Con retraso", mil(a.retraso) + " de " + mil(a.n)],
           ["Menores de 2 años", p2f(pct(rb.retraso, rb.n))], ["2 años o más", p2f(pct(ra.retraso, ra.n))]]),
        evid: () => ({
          t: "Retraso en talla por " + nLb,
          lead: "Es el hallazgo dominante del conjunto: mucho más frecuente que la desnutrición aguda, y de reversión mucho más lenta.",
          chart: terr(z => ({ v: pct(z.r.retraso, z.r.n), n: z.r.retraso }), pct(a.retraso, a.n), "var(--d2)", 10),
          pie: "La línea punteada es la media del conjunto (<b>" + p2f(pct(a.retraso, a.n)) + "</b>). "
            + "El número pequeño en gris es el conteo de casos, no el porcentaje.",
        }) },

      { lado: "der", top: 360, ancla: [50, 52], color: "var(--icbf-magenta)", chip: "SE CALCULA",
        t: "Peso para la edad", v: p1(pct(a.glob, a.n)), u: "desnutrición global",
        d: mil(a.glob) + " beneficiarios", barra: pct(a.glob, a.n) * 8,
        tip: lee("Peso por debajo de −2 DE <b>para la edad</b>. Es un indicador mixto: puede venir de "
          + "delgadez reciente, de talla baja acumulada, o de ambas. Por eso no se interpreta solo, "
          + "sino junto a las dos tarjetas de arriba. La barra va amplificada ×8.",
          [["Desnutrición global", mil(a.glob) + " de " + mil(a.n)],
           ["Categorías de exceso", "no aplica en menores de 5"]]),
        evid: () => ({
          t: "Desnutrición global por " + nLb,
          lead: "Peso bajo para la edad. Al mezclar las dos causas, sirve para vigilar tendencia pero no para decidir la conducta clínica.",
          chart: terr(z => ({ v: pct(z.r.glob, z.r.n), n: z.r.glob }), pct(a.glob, a.n), "var(--icbf-magenta)", 10),
          pie: "La norma <b>no define categorías de exceso</b> para peso/edad en menores de cinco años: por eso "
            + "el sistema marca «No Aplica» cuando el puntaje Z supera +1.",
        }) },

      { lado: "der", top: 512, ancla: [62, 78], color: "var(--icbf-verde-osc)", chip: "SE CALCULA",
        t: "Riesgo nutricional", v: p1(pct(a.irc[1], a.n)), u: "adecuado",
        d: "<b>" + mil(a.irc[4]) + "</b> críticos · <b>" + mil(a.irc[3]) + "</b> en alto riesgo",
        barra: pct(a.irc[1], a.n),
        tip: lee("Índice propio, no del sistema. Resume en un solo número el estado antropométrico "
          + "(50 %), la tendencia entre tomas (20 %), la oportunidad del seguimiento (15 %) y los "
          + "factores asociados (15 %). Sirve para <b>ordenar por prioridad</b>, no para diagnosticar.",
          [["Adecuado", mil(a.irc[1])], ["Preventivo", mil(a.irc[2])],
           ["Alto riesgo", mil(a.irc[3])], ["Crítico", mil(a.irc[4])]]),
        evid: () => ({
          t: "Índice de riesgo nutricional",
          lead: "La desnutrición aguda entra por piso clínico: severa siempre es crítico, y moderada sin canalizar también.",
          chart: pila(
            dotsMini(IRN4.map(x => ({ lb: x.lb, v: pct(a.irc[x.k], a.n), n: a.irc[x.k], c: x.c, hi: x.k >= 3 })),
              null, "var(--ok)"),
            sub("Alto riesgo y crítico por " + nLb),
            terr(z => ({ v: pct(z.r.irc[3] + z.r.irc[4], z.r.n), n: z.r.irc[3] + z.r.irc[4] }),
              pct(a.irc[3] + a.irc[4], a.n), "var(--d2)", 9)),
          pie: "Es un ordenamiento de gestión construido aquí, no una clasificación normativa. "
            + "La conducta clínica se decide con las tarjetas de la izquierda y con el peso para la talla.",
        }) },
    );
  } else {
    const colg = k => gx.map(i => G[k][i]);
    const medg = arr => { const v = arr.filter(x => x > 0).sort((p_, q) => p_ - q);
      return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const KG = colg("kg"), CM = colg("cm"), IMC = colg("imc"), ED = colg("ed"), SG = colg("sg");
    const rKG = redondos(KG);
    const menor18 = gx.filter(i => G.ed[i] >= 0 && G.ed[i] < 18).length;
    const c6 = gx.filter(i => G.ctl[i] >= 6).length;
    const conSG = gx.filter(i => G.sg[i] > 0).length;
    const t1 = gx.filter(i => G.sg[i] > 0 && G.sg[i] < 14).length;
    /* porDim recorre N; las gestantes tienen su propio diccionario */
    const gCol = GDIC[nCol] ? nCol : "cz", gDic = GDIC[nCol] || GDIC.cz;
    const gLb = GDIC[nCol] ? nLb : "centro zonal";
    const grupos = (() => {
      const m = new Map();
      for (const i of gx) { const k = G[gCol][i]; (m.get(k) || m.set(k, []).get(k)).push(i); }
      const out = [];
      for (const [k, v] of m) if (v.length >= 25) out.push({ lb: corto(gDic[k]), r: resumenGS(v), idx: v });
      return out;
    })();
    const terrG = (fn, ref, color, tope) => dotsMini(
      grupos.map(z => Object.assign({ lb: z.lb }, fn(z))).sort((z, q) => q.v - z.v).slice(0, tope || 8),
      ref, color);

    L.push(
      { lado: "izq", top: 30, ancla: [52, 10], color: "var(--icbf-azul)",
        t: "Gestación adolescente", v: p1(pct(menor18, g.n)), u: "menores de 18 años",
        d: "<b>" + mil(menor18) + "</b> de " + mil(g.n) + " gestantes · mediana <b>" + medg(ED) + " años</b>",
        barra: pct(menor18, g.n) * 4,
        tip: lee("Encabeza el <b>porcentaje de menores de 18</b> y no la mediana de edad, porque la "
          + "mediana ronda los 24 o 25 años en todos los territorios y no distingue nada. La gestación "
          + "adolescente sí varía, y es riesgo nutricional y obstétrico a la vez. Barra amplificada ×4.",
          [["Menores de 18", mil(menor18)], ["Mediana de edad", medg(ED) + " años"],
           ["Total gestantes", mil(g.n)]]),
        evid: () => ({
          t: "Gestación adolescente por " + gLb,
          lead: "La adolescente aún está creciendo: compite por nutrientes con el feto, y su requerimiento no es el de una gestante adulta.",
          chart: terrG(z => { const m = z.idx.filter(i => G.ed[i] >= 0 && G.ed[i] < 18).length;
              return { v: pct(m, z.r.n), n: m }; }, pct(menor18, g.n), "var(--icbf-azul)", 9),
          pie: "La línea punteada es la media del conjunto. En menores de 15 años la ganancia de peso "
            + "esperada es mayor que la de una gestante adulta con el mismo IMC.",
        }) },

      { lado: "izq", top: 210, ancla: [64, 34], color: "var(--icbf-verde-osc)",
        t: "Peso y talla", v: p1(rKG), u: "termina en ,0 o ,5",
        d: "mediana <b>" + un(medg(KG)) + " kg</b> · talla <b>" + un(medg(CM)) + " cm</b> · IMC <b>"
          + un(medg(IMC)) + "</b>",
        barra: rKG,
        tip: lee("La mediana de peso se mueve apenas entre territorios (67 a 72 kg), así que encabeza "
          + "el <b>redondeo del registro</b>. Importa porque el IMC gestacional se calcula con este "
          + "peso: si se anota redondeado, la clasificación de la gestante se desplaza.",
          [["Esperado sin sesgo", "20,0 %"], ["Observado", p1(rKG)],
           ["Mediana de peso", un(medg(KG)) + " kg"], ["Mediana de IMC", un(medg(IMC))]]),
        evid: () => ({
          t: "Peso de la gestante · distribución y precisión",
          lead: "El peso alimenta el IMC, y el IMC decide la clasificación. Un redondeo grueso mueve casos de una categoría a otra.",
          chart: pila(
            histograma(KG, { min: 38, max: 110, u: "kg", color: "var(--icbf-verde-osc)", bins: 30 }),
            sub("Último dígito registrado"),
            digitos(KG, { color: "var(--icbf-verde-osc)" })),
          pie: "Cada dígito debería aportar cerca del 10 %. Los picos en <b>0 y 5</b> indican redondeo a "
            + "kilos y medios kilos en la báscula.",
        }) },

      { lado: "izq", top: 380, ancla: [40, 58], color: "var(--icbf-magenta)",
        t: "Captación temprana", v: conSG ? p1(pct(t1, conSG)) : "—", u: "en el primer trimestre",
        d: "mediana <b>" + medg(SG) + " semanas</b> al momento de la valoración",
        barra: pct(t1, conSG) * 2,
        tip: lee("Encabeza la <b>proporción valorada antes de la semana 14</b>, no la mediana de "
          + "semanas, que ronda las 25 en todos lados. Entre más temprano se valora, más tiempo queda "
          + "para corregir el estado nutricional antes del parto. Barra amplificada ×2.",
          [["Primer trimestre", mil(t1) + " de " + mil(conSG)],
           ["Mediana", medg(SG) + " semanas"], ["Con dato de semanas", mil(conSG)]]),
        evid: () => ({
          t: "Semana de gestación en la valoración",
          lead: "Dónde se concentran las valoraciones a lo largo del embarazo. Lo que cae a la derecha llegó con poco margen de intervención.",
          chart: pila(
            histograma(SG, { min: 4, max: 42, u: "sem", color: "var(--icbf-magenta)", bins: 30 }),
            sub("Captación en el primer trimestre por " + gLb),
            terrG(z => { const m = z.idx.filter(i => G.sg[i] > 0 && G.sg[i] < 14).length;
                const cn = z.idx.filter(i => G.sg[i] > 0).length;
                return { v: pct(m, cn), n: m }; }, pct(t1, conSG), "var(--icbf-magenta)", 9)),
          pie: "La ganancia de peso recomendada se define <b>según el IMC del primer trimestre</b>. "
            + "Una captación tardía obliga a estimarlo hacia atrás.",
        }) },

      { lado: "izq", top: 530, ancla: [46, 94], color: "var(--icbf-verde-med)",
        t: "Controles prenatales", v: p1(pct(c6, g.n)), u: "con 6 o más",
        d: mil(c6) + " de " + mil(g.n) + " gestantes", barra: pct(c6, g.n),
        tip: lee("Proporción con al menos <b>seis controles</b>, el mínimo que fija la Resolución 3280 "
          + "de 2018 para una gestación sin complicaciones. No es una medida antropométrica: es el "
          + "dato de acceso a salud que acompaña a las tres de arriba.",
          [["Con 6 o más", mil(c6) + " de " + mil(g.n)], ["Mínimo normativo", "6 controles"]]),
        evid: () => ({
          t: "Controles prenatales por " + gLb,
          lead: "Sin control prenatal no hay quien detecte a tiempo el bajo peso ni el exceso, por más que la UDS registre la valoración.",
          chart: terrG(z => { const m = z.idx.filter(i => G.ctl[i] >= 6).length;
              return { v: pct(m, z.r.n), n: m }; }, pct(c6, g.n), "var(--icbf-verde-med)", 9),
          pie: "Referencia: <b>Resolución 3280 de 2018</b>, ruta materno-perinatal.",
        }) },

      { lado: "der", top: 30, ancla: [52, 24], color: "var(--ok)", chip: "SE CALCULA",
        t: "IMC adecuado", v: p1(pct(g.adec, g.n)), u: "para la edad gestacional",
        d: mil(g.adec) + " de " + mil(g.n) + " gestantes", barra: pct(g.adec, g.n),
        tip: lee("El IMC de una gestante <b>no se lee con las tablas de adulto</b>: se compara contra "
          + "lo esperado para la semana de gestación, porque el aumento de peso es parte del embarazo "
          + "normal. Menos de la mitad del conjunto queda en rango.",
          [["Adecuado", mil(g.adec)], ["Bajo peso", mil(g.bajo)],
           ["Sobrepeso", mil(g.sobre)], ["Obesidad", mil(g.obes)]]),
        evid: () => ({
          t: "IMC para la edad gestacional",
          lead: "Las cuatro categorías del conjunto filtrado, y qué tan lejos del rango adecuado está cada territorio.",
          chart: pila(
            dotsMini(GST4.map(x => ({ lb: x.lb, v: pct(g.st[x.k], g.n), n: g.st[x.k], c: x.c, hi: x.k !== 2 })),
              null, "var(--ok)"),
            sub("IMC adecuado por " + gLb),
            terrG(z => ({ v: pct(z.r.adec, z.r.n), n: z.r.adec }), pct(g.adec, g.n), "var(--ok)", 9)),
          pie: "Aquí <b>más alto es mejor</b>, al revés que en el resto de gráficos del tablero.",
        }) },

      { lado: "der", top: 210, ancla: [44, 56], color: "var(--e2)", chip: "SE CALCULA",
        t: "Exceso de peso", v: p1(pct(g.sobre + g.obes, g.n)), u: "sobrepeso u obesidad",
        d: "<b>" + mil(g.sobre) + "</b> sobrepeso · <b>" + mil(g.obes) + "</b> obesidad",
        barra: pct(g.sobre + g.obes, g.n),
        tip: lee("Suma sobrepeso y obesidad. Es el problema <b>más frecuente</b> del componente de "
          + "gestantes, muy por encima del bajo peso, y suele pasar desapercibido porque el programa "
          + "está diseñado mirando el déficit.",
          [["Exceso total", mil(g.sobre + g.obes)], ["Sobrepeso", mil(g.sobre)],
           ["Obesidad", mil(g.obes)], ["Bajo peso, en contraste", mil(g.bajo)]]),
        evid: () => ({
          t: "Exceso de peso gestacional por " + gLb,
          lead: "Sobrepeso más obesidad para la edad gestacional. Se asocia a diabetes gestacional, preeclampsia y macrosomía.",
          chart: terrG(z => ({ v: pct(z.r.sobre + z.r.obes, z.r.n), n: z.r.sobre + z.r.obes }),
            pct(g.sobre + g.obes, g.n), "var(--e2)", 10),
          pie: "El complemento alimentario está pensado para cerrar brechas por déficit. En una gestante con "
            + "exceso, la conducta es <b>orientación alimentaria</b>, no más aporte calórico.",
        }) },

      { lado: "der", top: 380, ancla: [42, 60], color: "var(--d2)", chip: "SE CALCULA",
        t: "Bajo peso gestacional", v: p1(pct(g.bajo, g.n)), u: "para la edad gestacional",
        d: mil(g.bajo) + " gestantes", barra: pct(g.bajo, g.n) * 3,
        tip: lee("IMC por debajo de lo esperado para la semana de gestación. Es el grupo de <b>mayor "
          + "riesgo de bajo peso al nacer</b> y el destinatario directo del complemento alimentario. "
          + "Barra amplificada ×3 para que sea comparable con las de arriba.",
          [["Bajo peso", mil(g.bajo) + " de " + mil(g.n)],
           ["Exceso, en contraste", mil(g.sobre + g.obes)]]),
        evid: () => ({
          t: "Bajo peso gestacional por " + gLb,
          lead: "Menos frecuente que el exceso, pero de consecuencia más inmediata sobre el peso al nacer.",
          chart: terrG(z => ({ v: pct(z.r.bajo, z.r.n), n: z.r.bajo }), pct(g.bajo, g.n), "var(--d2)", 10),
          pie: "Un territorio con bajo peso alto y captación tardía es la combinación más desfavorable: "
            + "el déficit se detecta cuando ya queda poco embarazo por delante.",
        }) },

      { lado: "der", top: 530, ancla: [60, 82], color: "var(--icbf-verde-osc)", chip: "SE CALCULA",
        t: "Riesgo gestacional", v: p1(pct(g.irc[1], g.n)), u: "adecuado",
        d: "<b>" + mil(g.irc[3] + g.irc[4]) + "</b> en alto riesgo o crítico",
        barra: pct(g.irc[1], g.n),
        tip: lee("Índice propio, equivalente al de niñas y niños pero adaptado: combina el IMC "
          + "gestacional, los controles prenatales, la edad de la gestante y la oportunidad del "
          + "seguimiento. Sirve para <b>priorizar</b>, no para diagnosticar.",
          [["Adecuado", mil(g.irc[1])], ["Preventivo", mil(g.irc[2])],
           ["Alto riesgo", mil(g.irc[3])], ["Crítico", mil(g.irc[4])]]),
        evid: () => ({
          t: "Índice de riesgo gestacional",
          lead: "Las cuatro categorías del conjunto, y dónde se acumulan las gestantes que requieren atención prioritaria.",
          chart: pila(
            dotsMini(IRN4.map(x => ({ lb: x.lb, v: pct(g.irc[x.k], g.n), n: g.irc[x.k], c: x.c, hi: x.k >= 3 })),
              null, "var(--ok)"),
            sub("Alto riesgo y crítico por " + gLb),
            terrG(z => ({ v: pct(z.r.irc[3] + z.r.irc[4], z.r.n), n: z.r.irc[3] + z.r.irc[4] }),
              pct(g.irc[3] + g.irc[4], g.n), "var(--d2)", 9)),
          pie: "Es un ordenamiento de gestión construido aquí, no una clasificación normativa.",
        }) },
    );
  }
  L.forEach(x => {
    const nodo = llamada(x);
    if (x.evid) conEvidenciaEl(nodo, x.evid);
    fig.append(nodo);
  });

  /* ---- las lineas guia, en coordenadas relativas al contenedor ---- */
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "guias");
  svg.setAttribute("viewBox", "0 0 1000 640");
  svg.setAttribute("preserveAspectRatio", "none");
  fig.append(svg);
  s.append(wrap);
  wrap.append(fig);

  /* Acomodo y trazado. No va dentro de requestAnimationFrame porque el
     navegador no lo ejecuta con la pestana en segundo plano, y entonces la
     seccion se quedaria sin acomodar. Leer getBoundingClientRect ya fuerza
     el maquetado, asi que la posicion real se conoce de inmediato. */
  const mk2 = (tag, at) => { const n = document.createElementNS(NS, tag);
    for (const q in at) n.setAttribute(q, at[q]); return n; };

  const acomodar = () => {
    /* si una tarjeta se monta sobre la de abajo, se empuja; el top escrito
       es la posicion deseada, no una imposicion */
    ["izq", "der"].forEach(lado => {
      const col = [...fig.querySelectorAll(".llam." + lado)]
        .sort((x, y) => x.offsetTop - y.offsetTop);
      for (let k = 1; k < col.length; k++) {
        const piso = col[k - 1].offsetTop + col[k - 1].offsetHeight + 12;
        if (col[k].offsetTop < piso) col[k].style.top = piso + "px";
      }
    });
    /* el alto lo manda la tarjeta que baje mas; si no, la ultima tapa la leyenda */
    let fondo = 0;
    [...fig.querySelectorAll(".llam")].forEach(d => {
      fondo = Math.max(fondo, d.offsetTop + d.offsetHeight);
    });
    if (fondo) fig.style.height = Math.max(640, fondo + 14) + "px";

    /* se vuelve a trazar desde cero, para poder llamar esto varias veces */
    svg.textContent = "";
    const rc = fig.getBoundingClientRect();
    const ri = img.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + rc.width + " " + rc.height);
    if (!ri.width) return;   /* la imagen aun no mide: se trazara al cargar */
    [...fig.querySelectorAll(".llam")].forEach((d, k) => {
      const cfg = L[k];
      if (!cfg) return;
      const r = d.getBoundingClientRect();
      const x0 = (cfg.lado === "izq" ? r.right : r.left) - rc.left;
      const y0 = r.top - rc.top + r.height / 2;
      const x1 = ri.left - rc.left + ri.width * cfg.ancla[0] / 100;
      const y1 = ri.top - rc.top + ri.height * cfg.ancla[1] / 100;
      const mx = cfg.lado === "izq" ? x0 + (x1 - x0) * .45 : x0 - (x0 - x1) * .45;
      svg.append(mk2("path", { d: "M" + x0 + " " + y0 + " L" + mx + " " + y0 + " L" + x1 + " " + y1,
        stroke: cfg.color, opacity: ".72" }));
      svg.append(mk2("circle", { cx: x1, cy: y1, r: 5, fill: cfg.color }));
      svg.append(mk2("circle", { cx: x0, cy: y0, r: 3.2, fill: cfg.color }));
    });
  };

  acomodar();
  requestAnimationFrame(acomodar);
  /* el ancho de la figura es 'auto': hasta que el PNG no se decodifica mide
     cero y los anclajes se apilarian en el centro */
  if (!img.complete) img.addEventListener("load", acomodar, { once: true });

  const lg = el("div", "perfleg");
  lg.innerHTML = '<span><i style="background:var(--icbf-verde-osc)"></i>Se mide con un instrumento</span>'
    + '<span><i style="background:var(--icbf-azul)"></i>Se calcula a partir de las medidas</span>';
  wrap.append(lg);

  /* ---- lo que ya estaba en el semáforo, aquí resumido ---- */
  if (PPOB === "nn") {
    s.append(h2("Lo que requiere atención", "irn"));
    s.append(bars([
      { lb: "Desnutrición aguda", v: pct(a.dnt, a.n), tabla: { t: "Desnutrición aguda moderada o severa", idx: () => ix.filter(i => N.pt[i] === 1 || N.pt[i] === 2), ordenar: 9, asc: true, lead: "Los <b>" + mil(a.dnt) + "</b> casos que componen la barra, del más comprometido en adelante." }, c: "linear-gradient(180deg,var(--d2),var(--d3))", txt: mil(a.dnt) + " · " + p2f(pct(a.dnt, a.n)) },
      { lb: "Riesgo de desnutrición", v: pct(a.riesgo, a.n), tabla: { t: "Riesgo de desnutrición aguda", idx: () => ix.filter(i => N.pt[i] === 3), ordenar: 9, asc: true, lead: "Peso para la talla entre −2 y −1 desviaciones estándar." }, c: "linear-gradient(180deg,var(--d1),var(--d2))", txt: mil(a.riesgo) + " · " + p2f(pct(a.riesgo, a.n)) },
      { lb: "Retraso en talla", v: pct(a.retraso, a.n), tabla: { t: "Retraso en talla", idx: () => ix.filter(i => N.te[i] === 1), ordenar: 11, asc: true, lead: "Los <b>" + mil(a.retraso) + "</b> casos con talla baja para su edad." }, c: "linear-gradient(180deg,var(--d2),var(--d3))", txt: mil(a.retraso) + " · " + p2f(pct(a.retraso, a.n)) },
      { lb: "Sobrepeso u obesidad", v: pct(a.exceso, a.n), tabla: { t: "Sobrepeso u obesidad", idx: () => ix.filter(i => N.pt[i] === 6 || N.pt[i] === 7), ordenar: 9, lead: "Peso para la talla por encima de +2 desviaciones estándar." }, c: "linear-gradient(180deg,var(--e1),var(--e2))", txt: mil(a.exceso) + " · " + p2f(pct(a.exceso, a.n)) },
      { lb: "Sin toma reciente", v: 100 - pct(a.reciente, a.n), tabla: { t: "Sin valoración reciente", idx: () => ix.filter(i => N.tm[i] < D.meta.tmax - 1), ordenar: 16, asc: true, lead: "Última toma anterior al corte comparable (toma " + D.meta.tmax + ")." }, c: "linear-gradient(180deg,var(--icbf-naranja),#D96200)", txt: mil(a.n - a.reciente) + " · " + p2f(100 - pct(a.reciente, a.n)) },
      { lb: "No cumple criterio", v: pct(a.nc, a.n), tabla: { t: "Registros que no cumplen criterio", idx: () => ix.filter(i => N.cr[i] === 1), lead: "Registros marcados por el sistema como <b>NO CUMPLE</b> en el campo de criterio." }, c: "linear-gradient(180deg,var(--icbf-amarillo),var(--icbf-naranja))", txt: mil(a.nc) + " · " + p2f(pct(a.nc, a.n)) },
    ]));
    s.append(lectura("Este perfil resume <b>" + mil(a.n) + "</b> niñas y niños del conjunto filtrado. Las cuatro medidas de la izquierda son lo único que alguien tomó físicamente; todo lo de la derecha sale de combinarlas con la edad, el sexo y las tablas de la OMS."));
  } else {
    s.append(h2("Estado nutricional de la gestante", "gest"));
    s.append(stacked([{ lb: etiquetaFiltro(), d: obj(g.st) }],
      [{ k: 1, lb: "Bajo peso", c: "var(--d2)" }, { k: 2, lb: "IMC adecuado", c: "var(--ok)" },
       { k: 3, lb: "Sobrepeso", c: "var(--e2)" }, { k: 4, lb: "Obesidad", c: "var(--e3)" }],
      "IMC para la edad gestacional"));
    s.append(lectura("Este perfil resume <b>" + mil(g.n) + "</b> gestantes del conjunto filtrado. Solo <b>" + p1(pct(g.adec, g.n)) + "</b> tiene IMC adecuado; el exceso de peso llega al <b>" + p1(pct(g.sobre + g.obes, g.n)) + "</b>."));
  }
}

/* el acomodo de las llamadas depende del ancho: si cambia, se rehace */
let reflujoPerfil = null;
addEventListener("resize", () => {
  if (typeof TAB === "undefined" || TAB !== "perfil") return;
  clearTimeout(reflujoPerfil);
  reflujoPerfil = setTimeout(() => { cerrarEvid(); vPerfil(); }, 180);
});

/* =====================================================================
   FILTROS ENCADENADOS Y RENDER
   ===================================================================== */
function opciones(sel, pares, valor, todos) {
  sel.textContent = "";
  const o = el("option"); o.value = "-1"; o.textContent = todos; sel.append(o);
  pares.forEach(([code, lb, n]) => {
    const x = el("option"); x.value = String(code);
    x.textContent = lb + " (" + mil(n) + ")";
    if (code === valor) x.selected = true;
    sel.append(x);
  });
  if (!pares.some(([c]) => c === valor)) sel.value = "-1";
}

function refrescarFiltros() {
  /* cada selector se puebla con lo que sobrevive a los OTROS dos filtros */
  const cuenta = (col, omitir) => {
    const m = new Map();
    for (let i = 0; i < NN_N; i++) {
      if (omitir !== "cz" && FCZ >= 0 && N.cz[i] !== FCZ) continue;
      if (omitir !== "mun" && FMUN >= 0 && N.mun[i] !== FMUN) continue;
      if (omitir !== "eas" && FEAS >= 0 && N.eas[i] !== FEAS) continue;
      m.set(N[col][i], (m.get(N[col][i]) || 0) + 1);
    }
    return m;
  };
  const arm = (col, dic, omitir) => [...cuenta(col, omitir).entries()]
    .map(([c, n]) => [c, dic[c], n]).sort((a, b) => a[1].localeCompare(b[1]));
  opciones($("#fcz"), arm("cz", DIC.cz, "cz"), FCZ, "Todos los centros zonales");
  opciones($("#fmun"), arm("mun", DIC.mun, "mun"), FMUN, "Todos los municipios");
  opciones($("#feas"), arm("eas", DIC.eas, "eas"), FEAS, "Todas las entidades");
  if ($("#fcz").value === "-1") FCZ = -1;
  if ($("#fmun").value === "-1") FMUN = -1;
  if ($("#feas").value === "-1") FEAS = -1;
}

function render() {
  refrescarFiltros();
  const a = resumen(idxNN()); const g = resumenGS(idxGS());
  const lat = $("#lateral");
  const filtrado = FCZ >= 0 || FMUN >= 0 || FEAS >= 0;
  lat.innerHTML = '<div class="t">' + (filtrado ? "Selección actual" : "Regional completa") + '</div>'
    + '<div class="n"><b>' + mil(a.n) + '</b><span>niñas y niños</span></div>'
    + '<div class="n"><b>' + mil(g.n) + '</b><span>gestantes</span></div>'
    + '<div class="c">Corte ' + esc(D.meta.corte) + ' · tomas de ' + esc(D.meta.periodo)
    + ' · ' + DIC.cz.length + ' centros zonales</div>'
    + '<div class="v2"><i></i>versión ' + esc(D.meta.build || "—") + '</div>';
  const tt2 = VIEWS.find(v => v[0] === TAB);
  $("#tsec").textContent = tt2 ? tt2[1] : "";
  $("#tsub").textContent = SUBS[TAB] || "";
  VIEWS.forEach(([id]) => { $("#v-" + id).hidden = id !== TAB; });
  /* La alerta del corte se repetia en las diez vistas. Un aviso que aparece
     en cada pantalla se vuelve decorado y deja de leerse: se muestra solo en
     la vista de entrada, que es donde alguien llega por primera vez -- y
     solo si de verdad hay algo que anunciar (init() la deja vacia cuando
     el corte desigual es una decision del equipo, no un hallazgo). */
  $("#warn").hidden = TAB !== VIEWS[0][0] || !$("#warn").innerHTML.trim();
  ({ semaforo: vSemaforo, perfil: vPerfil, mapa: vMapa, anatomia: vAnatomia, estado: vEstado, critica: vCritica, gestantes: vGestantes,
     operadores: vOperadores, calidad: vCalidad, historico: vHistorico, glosario: vGlosario })[TAB]();
  [...$("#nav").children].forEach(b => b.setAttribute("aria-selected", b.dataset.id === TAB));
}

(function init() {
  $("#meta").textContent = `Corte ${D.meta.corte} · tomas de ${D.meta.periodo}`;
  const falt = D.meta.faltantes || [];
  const wn = $("#warn");
  if (falt.length) {
    wn.innerHTML = `<span class="ic">!</span><span>Faltan los archivos de <b>${falt.map(esc).join(", ")}</b> en la carpeta de niñas y niños: esa población no está incluida en ninguna cifra.</span>`;
  } else if ((D.meta.rezagados || []).length) {
    /* Decision del equipo: todos los centros zonales se evalúan hasta la
       toma comparable (julio), por diseño y no por accidente de descarga.
       Ya no se anuncia como un hallazgo -- el detalle sigue disponible en
       la ficha "Cobertura de la toma" del glosario para quien lo busque. */
    wn.innerHTML = "";
  } else {
    wn.innerHTML = `<span class="ic" style="background:var(--icbf-verde);color:#fff">&#10003;</span><span>Descarga completa: llegaron los <b>17 centros zonales</b> en las dos poblaciones, con el mismo corte. Las cifras cubren toda la regional.</span>`;
  }
  $("#fcz").onchange = e => { FCZ = +e.target.value; render(); };
  $("#fmun").onchange = e => { FMUN = +e.target.value; render(); };
  $("#feas").onchange = e => { FEAS = +e.target.value; render(); };
  $("#reset").onclick = () => { FCZ = FMUN = FEAS = -1; render(); };
  VIEWS.forEach(([id, lb]) => {
    const b = el("button"); b.dataset.id = id; b.setAttribute("role", "tab"); b.type = "button";
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICO[id] || "") + '"/></svg>';
    b.append(document.createTextNode(lb));
    b.onclick = () => { TAB = id; render(); scrollTo({ top: 0, behavior: "smooth" }); };
    $("#nav").append(b);
  });
  $("#foot").innerHTML = `Leído de ${DIC.cz.length * 2} archivos de Cuéntame · Sistema de Información Primera Infancia. Cifras deduplicadas a la última toma y filtradas a beneficiarios vinculados; el municipio es siempre el de la <b>unidad de servicio</b>, no el de residencia. Clasificación antropométrica según la <b>Resolución 2465 de 2016</b> sobre los Patrones de Crecimiento Infantil de la OMS. Generado por <code>procesar_reportes.py</code>.<br>Contiene número de documento del beneficiario para permitir la ubicación del caso en el sistema: <b>tratar como información de uso interno</b>. No incluye nombres.<br>Colores institucionales del Manual de Imagen Corporativa del ICBF; las rampas de los gráficos se derivaron de esos tonos y se validaron para visión con deficiencia cromática.`;
  render();
})();
</script>
