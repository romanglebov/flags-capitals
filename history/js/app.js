/* Отрисовка интерактивного древа. Данные — HistoryDB (engine.js), флаги — Flags (flags.js). */
(function () {
  'use strict';
  const { dec, yearOf, fmtYear, fmtDate, fmtSpan, NOW } = HistoryUtil;
  const DB = HistoryDB;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ── Справочники ── */
  const REL = {
    pagan: { c: '#6F9E3C', n: 'Язычество' }, orthodox: { c: '#D9A21B', n: 'Православие' }, islam: { c: '#1E9E62', n: 'Ислам' },
    tengri: { c: '#4A86D6', n: 'Тенгрианство' }, buddhism: { c: '#E07B1A', n: 'Буддизм' }, atheism: { c: '#8B9196', n: 'Атеизм' },
    secular: { c: '#7AA6B6', n: 'Светское государство' }, other: { c: '#9C7BC0', n: 'Другое' },
  };
  const I = { // иконки 20×20, stroke
    merge: 'M5 18L10 10 15 18M10 10V2.5', absorb: 'M4 17L10 10M10 17.5V2.5', split: 'M10 18V10M10 10L4.5 3M10 10L15.5 3',
    transform: 'M10 18V3M5.5 7.5L10 3 14.5 7.5', spawn: 'M10 18V2.5M10 11L16 4.5', territory: 'M3 5.5L8 3.5 12 5.5 17 3.5V14.5L12 16.5 8 14.5 3 16.5Z',
    religion: 'M10 2.5V17.5M6 6.5H14M7 11.5L13 9.5', battle: 'M4 4L16 16M16 4L4 16M3 13L7 17M17 13L13 17', treaty: 'M5 2.5H15V17.5H5ZM8 7H12M8 10H12M8 13H11',
    collapse: 'M4 4L16 16M16 4L4 16', founding: 'M5 17.5V2.5H15L12.5 6.5 15 10.5H5', dependency: 'M8 6.5H5.5A3.5 3.5 0 0 0 5.5 13.5H8M12 6.5H14.5A3.5 3.5 0 0 1 14.5 13.5H12M7.5 10H12.5',
    revolution: 'M10 2.5L12 8H17.5L13 11.5 14.8 17 10 13.6 5.2 17 7 11.5 2.5 8H8Z',
    ruler: 'M3 15L4 6 8 10 10 3.5 12 10 16 6 17 15Z', doc: 'M5 2.5H15V17.5H5ZM8 7H12M8 10H12M8 13H11', flag: 'M5 18V2.5M5 3.5H15L13 7 15 10.5H5',
    note: 'M10 6V10.5M10 13.5V14', capital: 'M3.5 17.5V8.5L10 3.5 16.5 8.5V17.5ZM8 17.5V12H12V17.5',
  };
  const EV = {
    merge: ['Объединение', '#1F8A52'], absorb: ['Присоединение', '#1F8A52'], split: ['Распад', '#C93A32'], transform: ['Преобразование', '#2F68B0'],
    spawn: ['Выделение', '#16878D'], territory: ['Территории', '#B87B1E'], religion: ['Религия', '#C4920F'], battle: ['Война', '#A83A3A'],
    treaty: ['Договор', '#5A6E80'], collapse: ['Конец', '#6E7479'], founding: ['Начало', '#1C6E9E'], dependency: ['Зависимость', '#7C5BA6'], revolution: ['Революция', '#C0392B'],
  };
  const FILTERS = [
    ['rulers', 'Правители'], ['docs', 'Документы'], ['flags', 'Флаги'], ['religion', 'Религия'], ['notes', 'Заметки'], ['branches', 'Ветви'],
  ];
  const PALETTE = ['#2F68B0', '#C0392B', '#1F8A52', '#B87B1E', '#7C5BA6', '#16878D', '#A0522D', '#5A6E80'];
  const icon = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 20 20" aria-hidden="true"><path d="${I[k] || I.note}"/></svg>`;

  const S = { focus: null, filters: Object.fromEntries(FILTERS.map(f => [f[0], true])), rows: [], lane: new Map(), trunk: [], drawn: new Set() };
  try { const saved = JSON.parse(localStorage.getItem('history.filters') || 'null'); if (saved) Object.assign(S.filters, saved); } catch (e) { /* нет хранилища */ }

  const ent = id => DB.get(id);
  const colorOf = id => { const e = ent(id); if (e && e.color) return e.color; let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return PALETTE[Math.abs(h) % PALETTE.length]; };
  const nameOf = id => { const e = ent(id); return e ? (e.short || e.name) : id; };
  const flagAt = (e, d) => { const fl = (e.flags || []).filter(f => dec(f.from) <= (d ?? Infinity)); return (fl.length ? fl[fl.length - 1] : (e.flags || [])[0]) || null; };
  const tileOf = (id, d, cls) => { const e = ent(id); const f = e ? flagAt(e, d) : null; return Flags.tile(f && f.flag, { cls, name: e ? (e.short || e.name) : id, color: colorOf(id), title: f && f.name }); };
  const spanOf = e => fmtSpan(e.start, e.end, { fromLabel: e.startLabel, toLabel: e.endLabel });
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const yearsWord = n => `${n} ${plural(n, 'год', 'года', 'лет')}`;

  /* ── Построение модели ── */
  function build(focus) {
    S.focus = focus;
    S.trunk = DB.trunk(focus);
    const anc = DB.ancestry(focus);
    S.drawn = new Set(anc);
    const trunkSet = new Set(S.trunk);

    // Дорожки (lanes): главная линия стремится к дорожке 0
    const lanes = [];
    const iv = id => { const e = ent(id); return [e._start, e._end === null ? NOW : e._end]; };
    const linked = (a, b) => S.trunk.includes(a) && S.trunk.includes(b); // главная линия идёт последовательно
    const fits = (l, id) => { const [s, t] = iv(id); return (lanes[l] || []).every(([a, b, o]) => linked(id, o) ? (t <= a + 1e-6 || s >= b - 1e-6) : (t < a - 3 || s > b + 3)); };
    const put = (id, from) => { let l = from; while (!fits(l, id)) l++; (lanes[l] = lanes[l] || []).push([...iv(id), id]); S.lane.set(id, l); };
    S.lane = new Map();
    for (const id of S.trunk) put(id, 0);
    for (const id of anc) if (!S.lane.has(id)) put(id, 1);
    S.nLanes = Math.max(1, lanes.length);

    // Строки ленты
    const rows = [];
    const synth = new Map(); // id сущности → синтетические события
    for (const id of anc) {
      const e = ent(id);
      if (!DB.originEvent(id)) {
        const ev = { id: '_start_' + id, synthetic: true, type: 'founding', date: e.start, dateLabel: e.startLabel, _dec: e._start, title: `Возникновение: ${e.name}`, text: e.origin || '', from: [], to: [id], involves: [], documents: [] };
        synth.set('o:' + id, ev);
      }
      if (e._end !== null && !DB.endEvent(id)) {
        const ev = { id: '_end_' + id, synthetic: true, type: 'collapse', date: e.end, dateLabel: e.endLabel, _dec: e._end, title: `Конец: ${e.name}`, text: '', from: [id], to: [], involves: [], documents: [] };
        synth.set('e:' + id, ev);
      }
    }
    S.synth = synth;
    const origin = id => DB.originEvent(id) || synth.get('o:' + id);
    const ending = id => DB.endEvent(id) || synth.get('e:' + id);
    S.origin = origin; S.ending = ending;

    for (const id of S.trunk) {
      const e = ent(id);
      const endEv = ending(id);
      const hDec = e._end === null ? Infinity : endEv._dec;
      rows.push({ k: 'header', ent: id, dec: hDec, rank: 3 });
      const lo = e._start, hi = e._end === null ? NOW : hDec;
      const cl = d => Math.min(hi - 1e-4, Math.max(lo + 1e-4, d));
      (e.rulers || []).forEach(it => rows.push({ k: 'ruler', f: 'rulers', ent: id, it, dec: cl(dec(it.from)), rank: 1 }));
      (e.documents || []).forEach(it => rows.push({ k: 'doc', f: 'docs', ent: id, it, dec: cl(dec(it.date)), rank: 1 }));
      (e.flags || []).slice(1).forEach(it => rows.push({ k: 'flag', f: 'flags', ent: id, it, dec: cl(dec(it.from)), rank: 1 }));
      (e.religions || []).slice(1).forEach(it => rows.push({ k: 'religion', f: 'religion', ent: id, it, dec: cl(dec(it.from)), rank: 1 }));
      (e.capitals || []).slice(1).forEach(it => rows.push({ k: 'capital', f: 'notes', ent: id, it, dec: cl(dec(it.from)), rank: 1 }));
      (e.notes || []).forEach(it => rows.push({ k: 'note', f: 'notes', ent: id, it, dec: cl(dec(it.date)), rank: 1 }));
    }
    const allEvents = DB.events.concat([...synth.values()]);
    for (const ev of allEvents) {
      if (ev._dec === undefined) ev._dec = dec(ev.date);
      const parts = [...ev.from, ...ev.to, ...ev.involves];
      if (!parts.some(p => S.drawn.has(p))) continue;
      const side = !parts.some(p => trunkSet.has(p));
      rows.push({ k: 'event', f: side ? 'branches' : null, ev, dec: ev._dec, rank: 2, side });
    }
    rows.sort((a, b) => (b.dec - a.dec) || (a.rank - b.rank));
    S.rows = rows;
    S.eventsAll = allEvents;
  }

  /** Узловая дорожка события */
  function nodeLane(ev) {
    const d = id => S.drawn.has(id);
    const C = ev.from.filter(id => ev.to.includes(id) && d(id));
    if (C.length) return S.lane.get(C[0]);
    const T = ev.to.filter(id => !ev.from.includes(id) && d(id));
    const F = ev.from.filter(id => !ev.to.includes(id) && d(id));
    const pick = arr => arr.find(id => S.trunk.includes(id)) || arr[0];
    if (T.length) return S.lane.get(pick(T));
    if (F.length) return S.lane.get(pick(F));
    const V = ev.involves.filter(d);
    if (V.length) return S.lane.get(pick(V));
    return 0;
  }

  /* ── HTML строк ── */
  function chip(id, d) {
    const e = ent(id);
    return `<button class="chip${S.drawn.has(id) ? ' drawn' : ''}" data-open="${esc(id)}" style="--c:${colorOf(id)}">${tileOf(id, d)}<span>${esc(e ? (e.short || e.name) : id)}</span></button>`;
  }
  function relBadge(r) { const k = REL[r.kind] || REL.other; return `<span class="rel" style="--r:${k.c}">${esc(r.name)}</span>`; }

  function headerHTML(r) {
    const e = ent(r.ent);
    const endY = e._end === null ? new Date().getFullYear() : yearOf(e.end);
    const len = endY - yearOf(e.start);
    const rels = (e.religions || []).map(relBadge).join(' ');
    const caps = [...new Set((e.capitals || []).map(c => c.name))].join(' → ');
    const ruler = (e.rulers || []).length;
    const flags = (e.flags || []);
    return `<div class="yr"><b>${esc(e._end === null ? 'Сегодня' : fmtYear(endY))}</b></div>
      <article class="card head" style="--c:${colorOf(r.ent)}">
        <div class="hd" data-anchor>
          ${tileOf(r.ent, e._end === null ? NOW : e._end, 'big')}
          <div><h2>${esc(e.name)}</h2><p class="span">${esc(spanOf(e))} · ${yearsWord(Math.max(len, 0))}</p></div>
        </div>
        ${e.type ? `<p class="type">${esc(e.type)}</p>` : ''}
        <dl class="facts">
          ${caps ? `<div><dt>Столица</dt><dd>${esc(caps)}</dd></div>` : ''}
          ${rels ? `<div><dt>Религия</dt><dd>${rels}</dd></div>` : ''}
          ${ruler ? `<div><dt>Правители</dt><dd>${ruler} · ${esc(e.rulers[0].name)}${ruler > 1 ? ' … ' + esc(e.rulers[ruler - 1].name) : ''}</dd></div>` : ''}
          ${flags.length > 1 ? `<div><dt>Флаги</dt><dd class="fl-row">${flags.map(f => Flags.tile(f.flag, { title: `${f.name || ''} (с ${fmtYear(yearOf(f.from))})`, name: e.name })).join('')}</dd></div>` : ''}
        </dl>
        ${e.summary ? `<p class="sum">${esc(e.summary)}</p>` : ''}
        <button class="more" data-open="${esc(r.ent)}">Подробнее о государстве</button>
      </article>`;
  }

  function eventHTML(r) {
    const ev = r.ev, t = EV[ev.type] || EV.treaty;
    const label = ev.dateLabel || fmtDate(ev.date);
    const F = ev.from, T = ev.to, V = ev.involves.filter(id => !F.includes(id) && !T.includes(id));
    const cont = F.filter(id => T.includes(id));
    let parts = '';
    if (!ev.synthetic) {
      const fOnly = F.filter(id => !T.includes(id)), tOnly = T.filter(id => !F.includes(id));
      const [lf, lt] = ev.partial ? ['От', 'К'] : ['Из', cont.length ? 'Появились' : 'В'];
      if (fOnly.length) parts += `<div class="pl"><span class="lab">${lf}</span>${fOnly.map(id => chip(id, ev._dec - .01)).join('')}</div>`;
      if (cont.length && fOnly.length) parts += `<div class="pl"><span class="lab">${ev.type === 'absorb' ? 'Вошли в' : 'Остались'}</span>${cont.map(id => chip(id, ev._dec)).join('')}</div>`;
      else if (cont.length) parts += `<div class="pl"><span class="lab">${ev.type === 'spawn' ? 'Из состава' : 'Участник'}</span>${cont.map(id => chip(id, ev._dec)).join('')}</div>`;
      if (tOnly.length) parts += `<div class="pl"><span class="lab">${lt}</span>${tOnly.map(id => chip(id, ev._dec + .01)).join('')}</div>`;
      if (V.length) parts += `<div class="pl"><span class="lab">Участники</span>${V.map(id => chip(id, ev._dec)).join('')}</div>`;
    }
    const docs = (ev.documents || []).map(d => `<li>${icon('doc')}<span><b>${esc(d.title)}</b>${d.date ? ` <em>${esc(fmtDate(d.date))}</em>` : ''}</span></li>`).join('');
    const yr = yearOf(ev.date);
    return `<div class="yr"><b>${esc(fmtYear(yr))}</b></div>
      <article class="card ev${r.side ? ' side' : ''}${ev.disputed ? ' disputed' : ''}" style="--t:${t[1]}">
        <div class="hd" data-anchor><span class="badge">${icon(ev.type)}</span>
          <div><small>${esc(label)} · ${esc(t[0])}</small><h3>${esc(ev.title)}</h3></div></div>
        ${ev.text ? `<p>${esc(ev.text)}</p>` : ''}
        ${parts ? `<div class="parts">${parts}</div>` : ''}
        ${docs ? `<ul class="docs">${docs}</ul>` : ''}
        ${ev.disputed ? `<p class="disp"><b>Статус оспаривается.</b> ${esc(ev.disputed)}</p>` : ''}
      </article>`;
  }

  function miniHTML(r) {
    const it = r.it, e = ent(r.ent);
    let body = '', ic = r.k, yr = yearOf(it.from ?? it.date);
    if (r.k === 'ruler') body = `<b>${esc(it.name)}</b> <span class="mt">${esc(it.title || '')}</span> <span class="per">${esc(fmtSpan(it.from, it.to, { open: 'н. в.' }))}</span>${it.note ? `<span class="nt">${esc(it.note)}</span>` : ''}`;
    else if (r.k === 'doc') body = `<b>${esc(it.title)}</b>${it.text ? `<span class="nt">${esc(it.text)}</span>` : ''}`;
    else if (r.k === 'flag') body = `${Flags.tile(it.flag, { name: e.name })}<span><b>Новый флаг:</b> ${esc(it.name || '')}${it.note ? `<span class="nt">${esc(it.note)}</span>` : ''}</span>`;
    else if (r.k === 'religion') body = `<b>Религия:</b> ${relBadge(it)}${it.note ? `<span class="nt">${esc(it.note)}</span>` : ''}`;
    else if (r.k === 'capital') body = `<b>Столица — ${esc(it.name)}</b>`;
    else body = `<span>${esc(it.text)}</span>`;
    return `<div class="yr"><b>${esc(fmtYear(yr))}</b></div>
      <div class="mini k-${r.k}" data-anchor style="--c:${colorOf(r.ent)}">${r.k === 'flag' ? '' : icon(ic, 'mi')}<span class="yi">${esc(fmtYear(yr))}</span><div class="mb">${body}</div></div>`;
  }

  /* ── Рендер ── */
  function render() {
    const focus = S.focus, fe = ent(focus);
    document.title = `Древо государства: ${fe.short || fe.name}`;
    const visible = S.rows.filter(r => !r.f || S.filters[r.f]);
    S.visible = visible;
    const tree = $('#tree');
    let prev = visible.length ? Math.min(visible[0].dec, NOW + 1) : NOW, html = '';
    visible.forEach((r, i) => {
      const d = Math.min(r.dec, NOW + 1);
      const gap = Math.min(150, 7 * Math.sqrt(Math.max(0, prev - d))) + (r.k === 'header' || r.k === 'event' ? 10 : 2);
      prev = d;
      const inner = r.k === 'header' ? headerHTML(r) : r.k === 'event' ? eventHTML(r) : miniHTML(r);
      html += `<div class="row k-${r.k}" data-i="${i}" style="margin-top:${gap.toFixed(1)}px">${inner}</div>`;
    });
    const el = earliestLabel();
    html += `<div class="row k-end" style="margin-top:40px"><div class="yr"></div><div class="endcap"><b>Начало известной истории</b><p>${el.label ? `Раньше: ${esc(el.label)}` : `Раньше ${esc(fmtYear(Math.floor(el.d)))} года`} — письменных свидетельств о предках этого государства в базе нет. Дальше — археология и данные, которые ещё предстоит добавить.</p></div></div>`;
    tree.innerHTML = `<svg id="lanes" aria-hidden="true"></svg><div id="labels"></div>` + html;
    renderHero();
    layout();
  }

  function earliestLabel() {
    let best = null;
    for (const id of S.drawn) { const e = ent(id); if (!best || e._start < best._start) best = e; }
    return { d: best._start, label: best.startLabel || '' };
  }

  function renderHero() {
    const fe = ent(S.focus);
    const el = earliestLabel();
    const nEv = S.rows.filter(r => r.k === 'event').length;
    $('#hero').innerHTML = `
      <div class="hero-in">
        <div class="hero-flag">${tileOf(S.focus, NOW, 'hero')}</div>
        <div>
          <p class="kicker">Древо государства</p>
          <h1>${esc(fe.short || fe.name)}</h1>
          <p class="lead">Сверху — настоящее, ниже — прошлое. Линии — государства, из которых сложилась страна; узлы — объединения, распады, присоединения. Листайте вниз, чтобы пройти путь от ${fe._end === null ? 'сегодняшнего дня' : fmtYear(yearOf(fe.end)) + ' года'} к самым ранним известным предкам (${el.label ? esc(el.label) : esc(fmtYear(Math.floor(el.d)))}).</p>
          <p class="stats"><span><b>${S.drawn.size}</b> ${plural(S.drawn.size, 'государство', 'государства', 'государств')} в древе</span><span><b>${nEv}</b> ${plural(nEv, 'веха', 'вехи', 'вех')}</span><span><b>${S.trunk.length}</b> ${plural(S.trunk.length, 'эпоха', 'эпохи', 'эпох')} главной линии</span></p>
        </div>
      </div>
      <nav class="eras" aria-label="Эпохи">${S.trunk.map(id => `<button data-jump="${esc(id)}" style="--c:${colorOf(id)}">${tileOf(id, ent(id)._end ?? NOW)}<span><b>${esc(nameOf(id))}</b><small>${esc(spanOf(ent(id)))}</small></span></button>`).join('')}</nav>
      <details class="legend"><summary>Как читать древо</summary>
        <div class="lg">
          <p><svg width="40" height="14"><line x1="4" y1="7" x2="36" y2="7" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg> Главная линия — государства, прямо предшествовавшие выбранному</p>
          <p><svg width="40" height="14"><line x1="4" y1="7" x2="36" y2="7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg> Боковые ветви — земли, вошедшие в его состав</p>
          <p><svg width="40" height="14"><line x1="4" y1="7" x2="36" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/></svg> Связь без слияния: войны, зависимость, договоры</p>
          <p class="rels">Полоса рядом с линией — религия: ${Object.values(REL).map(r => `<span class="rel" style="--r:${r.c}">${r.n}</span>`).join(' ')}</p>
          <p>Флаг со штриховкой — условный символ: до XVII века государственных флагов в современном смысле не было.</p>
        </div></details>`;
  }

  /* ── Геометрия: замер строк и линии ── */
  function layout() {
    const tree = $('#tree'), svg = $('#lanes'), labels = $('#labels');
    if (!tree || !svg) return;
    const W = window.innerWidth;
    const sp = W < 520 ? 11 : W < 900 ? 17 : 24;
    const yw = W >= 720 ? 66 : 0;
    const pad = 12;
    const lw = pad * 2 + (S.nLanes - 1) * sp + 6;
    tree.style.setProperty('--yw', yw + 'px');
    tree.style.setProperty('--lw', lw + 'px');
    const xOf = l => lw - pad - 6 - l * sp;

    const top0 = tree.getBoundingClientRect().top;
    const rowsEl = tree.querySelectorAll('.row[data-i]');
    const anchors = [], evY = new Map(), rowY = [];
    rowsEl.forEach(el => {
      const i = +el.dataset.i, r = S.visible[i];
      const a = el.querySelector('[data-anchor]') || el;
      const rc = a.getBoundingClientRect();
      const y = rc.top - top0 + Math.min(rc.height / 2, 22);
      rowY[i] = y;
      anchors.push({ d: Math.min(r.dec, NOW + 1), y });
      if (r.k === 'event') evY.set(r.ev.id, y);
    });
    const H = tree.scrollHeight;
    const interp = d => {
      if (!anchors.length) return 0;
      if (d >= anchors[0].d) return anchors[0].y;
      for (let i = 1; i < anchors.length; i++) {
        const a = anchors[i - 1], b = anchors[i];
        if (d >= b.d) return b.d === a.d ? b.y : a.y + (b.y - a.y) * (a.d - d) / (a.d - b.d);
      }
      return anchors[anchors.length - 1].y + 30;
    };
    const yOfEv = ev => evY.has(ev.id) ? evY.get(ev.id) : interp(ev._dec);
    const D = 24;

    // Вертикальные отрезки сущностей
    const span = new Map();
    for (const id of S.drawn) {
      const e = ent(id), l = S.lane.get(id);
      let top, bottom;
      if (e._end === null) top = anchors.length ? anchors[0].y - 14 : 0;
      else { const ev = S.ending(id); const y = yOfEv(ev); top = nodeLane(ev) === l ? y : y + D; }
      const oev = S.origin(id), yo = yOfEv(oev);
      bottom = nodeLane(oev) === l ? yo : Math.min(yo - D, Math.max(top + 4, interp(e._start)));
      if (bottom < top + 4) bottom = top + 4;
      span.set(id, { top, bottom, x: xOf(l) });
    }
    S.span = span;

    let g = '';
    const lineW = id => S.trunk.includes(id) ? 4 : 2.5;
    // религиозные полосы
    for (const id of S.drawn) {
      const e = ent(id), sp_ = span.get(id), rel = e.religions || [];
      rel.forEach((r, i) => {
        const a = i + 1 < rel.length ? interp(dec(rel[i + 1].from)) : sp_.top;
        const b = i === 0 ? sp_.bottom : interp(dec(r.from));
        const y1 = Math.max(sp_.top, Math.min(a, b)), y2 = Math.min(sp_.bottom, Math.max(a, b));
        if (y2 - y1 > 1) g += `<line class="relband" x1="${sp_.x - 4.5}" x2="${sp_.x - 4.5}" y1="${y1}" y2="${y2}" stroke="${(REL[r.kind] || REL.other).c}"/>`;
      });
    }
    // линии сущностей
    for (const id of S.drawn) {
      const sp_ = span.get(id);
      g += `<line class="lane${S.trunk.includes(id) ? ' trunk' : ''}" data-open="${id}" x1="${sp_.x}" x2="${sp_.x}" y1="${sp_.top}" y2="${sp_.bottom}" stroke="${colorOf(id)}" stroke-width="${lineW(id)}"/>`;
      g += `<line class="hit" data-open="${id}" x1="${sp_.x}" x2="${sp_.x}" y1="${sp_.top}" y2="${sp_.bottom}"/>`;
    }
    // связи событий
    const alive = (id, y) => { const s = span.get(id); return s && y >= s.top - 1 && y <= s.bottom + 1; };
    for (const ev of S.eventsAll) {
      const parts = [...ev.from, ...ev.to, ...ev.involves];
      if (!parts.some(p => S.drawn.has(p))) continue;
      const nl = nodeLane(ev), xN = xOf(nl), yN = yOfEv(ev);
      const t = EV[ev.type] || EV.treaty;
      if (!ev.partial) {
        for (const f of ev.from) {
          if (ev.to.includes(f) || !S.drawn.has(f) || S.lane.get(f) === nl) continue;
          const xf = xOf(S.lane.get(f)), y0 = yN + D;
          g += `<path class="link" d="M${xf} ${y0}C${xf} ${y0 - D * .55} ${xN} ${yN + D * .45} ${xN} ${yN}" stroke="${colorOf(f)}" stroke-width="${lineW(f)}"/>`;
        }
        for (const tId of ev.to) {
          if (ev.from.includes(tId) && !ev.to.every(x => ev.from.includes(x))) { /* продолжающаяся */ }
          if (ev.from.includes(tId) || !S.drawn.has(tId) || S.lane.get(tId) === nl) continue;
          const xt = xOf(S.lane.get(tId)), yb = span.get(tId).bottom, k = Math.min(D, (yN - yb) * .55);
          g += `<path class="link" d="M${xN} ${yN}C${xN} ${yN - k} ${xt} ${yb + k} ${xt} ${yb}" stroke="${colorOf(tId)}" stroke-width="${lineW(tId)}"/>`;
        }
      }
      // пунктир между участниками без слияния
      const rel = parts.filter(p => S.drawn.has(p) && alive(p, yN));
      if ((ev.involves.length || ev.partial) && rel.length > 1) {
        const xs = rel.map(p => xOf(S.lane.get(p)));
        g += `<line class="inv" x1="${Math.min(...xs)}" x2="${Math.max(...xs)}" y1="${yN}" y2="${yN}" stroke="${t[1]}"/>`;
        xs.forEach(x => { g += `<circle cx="${x}" cy="${yN}" r="2.6" fill="${t[1]}"/>`; });
      }
      if (evY.has(ev.id)) {
        g += `<line class="tick" x1="${xN + 6}" x2="${lw}" y1="${yN}" y2="${yN}" stroke="${t[1]}"/>`;
        g += `<circle class="node${ev.disputed ? ' disp' : ''}" cx="${xN}" cy="${yN}" r="${ev.synthetic ? 4 : 5.5}" stroke="${t[1]}"/>`;
      }
    }
    // точки строк главной линии
    S.visible.forEach((r, i) => {
      if (r.k === 'event' || rowY[i] === undefined) return;
      const x = xOf(S.lane.get(r.ent)), y = rowY[i], c = colorOf(r.ent);
      if (r.k === 'header') {
        g += `<line class="tick head" x1="${x}" x2="${lw}" y1="${y}" y2="${y}" stroke="${c}"/><rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="3" fill="${c}" class="hnode"/>`;
      } else {
        g += `<line class="tick mini" x1="${x + 3}" x2="${lw}" y1="${y}" y2="${y}" stroke="${c}"/><circle cx="${x}" cy="${y}" r="2.6" fill="${c}" class="mnode"/>`;
      }
    });
    svg.setAttribute('width', lw);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${lw} ${H}`);
    svg.innerHTML = g;

    // подписи боковых ветвей
    let lh = '';
    for (const id of S.drawn) {
      if (S.trunk.includes(id)) continue;
      const s = span.get(id), avail = s.bottom - s.top - 34;
      if (avail < 44) continue;
      lh += `<button class="lane-label" data-open="${id}" style="left:${s.x}px;top:${s.top + 20}px;max-height:${Math.min(avail, 260)}px;--c:${colorOf(id)}" title="${esc(ent(id).name)}">${esc(nameOf(id))}</button>`;
    }
    labels.innerHTML = lh;
    S.anchors = anchors;
    onScroll();
  }

  /* ── Индикатор «где мы сейчас» ── */
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const tree = $('#tree'); if (!tree || !S.anchors || !S.anchors.length) return;
      const mid = window.innerHeight * 0.42 - tree.getBoundingClientRect().top;
      const el = $('#where');
      if (mid < S.anchors[0].y) { el.hidden = true; return; }
      let a = S.anchors[0];
      for (const x of S.anchors) { if (x.y <= mid) a = x; else break; }
      const d = a.d;
      const id = S.trunk.find(t => { const e = ent(t); return e._start <= d + 1e-3 && (e._end === null || e._end >= d - 1e-3); }) || S.trunk[0];
      el.hidden = false;
      el.innerHTML = `${tileOf(id, d)}<b>${esc(d > NOW ? 'Сегодня' : fmtYear(Math.floor(d)))}</b><span>${esc(nameOf(id))}</span>`;
    });
  }

  /* ── Карточка государства ── */
  function openDrawer(id) {
    const e = ent(id); if (!e) return;
    const list = (arr, fn) => arr && arr.length ? arr.map(fn).join('') : '';
    const preds = DB.predecessors(id), succs = DB.successors(id);
    const evs = DB.eventsOf(id);
    const sparse = !(e.rulers || []).length && !e.summary && !(e.documents || []).length;
    $('#drawer-body').innerHTML = `
      <div class="dh" style="--c:${colorOf(id)}">
        ${tileOf(id, e._end ?? NOW, 'big')}
        <div><h2 id="drawer-title">${esc(e.name)}</h2><p class="span">${esc(spanOf(e))}</p></div>
      </div>
      ${e.type ? `<p class="type">${esc(e.type)}</p>` : ''}
      ${e.summary ? `<p>${esc(e.summary)}</p>` : ''}
      ${e.origin ? `<p class="muted">${esc(e.origin)}</p>` : ''}
      ${sparse ? `<p class="sparse">Подробная история этого государства пока не добавлена. Её можно дописать в файлах <code>history/data/</code> — см. README.</p>` : ''}
      ${id !== S.focus ? `<button class="btn" data-focus="${esc(id)}">Построить древо для «${esc(e.short || e.name)}»</button>` : ''}
      ${(e.flags || []).length ? `<h3>Флаги и символы</h3><div class="flags">${list(e.flags, f => `<figure>${Flags.tile(f.flag, { cls: 'big', name: e.name })}<figcaption><b>${esc(f.name || 'Флаг')}</b><small>с ${esc(fmtYear(yearOf(f.from)))}${f.note ? ' · ' + esc(f.note) : ''}</small></figcaption></figure>`)}</div>` : ''}
      ${(e.capitals || []).length ? `<h3>Столицы</h3><ul class="plain">${list(e.capitals, c => `<li><span class="per">с ${esc(fmtYear(yearOf(c.from)))}</span> ${esc(c.name)}</li>`)}</ul>` : ''}
      ${(e.religions || []).length ? `<h3>Религия</h3><ul class="plain">${list(e.religions, r => `<li><span class="per">с ${esc(fmtYear(yearOf(r.from)))}</span> ${relBadge(r)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</li>`)}</ul>` : ''}
      ${(e.rulers || []).length ? `<h3>Правители</h3><ol class="rulers">${list(e.rulers, r => `<li><span class="per">${esc(fmtSpan(r.from, r.to))}</span><span><b>${esc(r.name)}</b> <small>${esc(r.title || '')}</small></span></li>`)}</ol>` : ''}
      ${(e.documents || []).length ? `<h3>Документы</h3><ul class="plain">${list(e.documents, d => `<li><span class="per">${esc(fmtYear(yearOf(d.date)))}</span> <b>${esc(d.title)}</b>${d.text ? `<small>${esc(d.text)}</small>` : ''}</li>`)}</ul>` : ''}
      ${preds.length ? `<h3>Предшественники</h3><div class="chips">${preds.map(p => chip(p)).join('')}</div>` : ''}
      ${succs.length ? `<h3>Преемники</h3><div class="chips">${succs.map(p => chip(p)).join('')}</div>` : ''}
      ${evs.length ? `<h3>События</h3><ul class="plain">${evs.map(v => `<li><span class="per">${esc(fmtYear(yearOf(v.date)))}</span> ${esc(v.title)}</li>`).join('')}</ul>` : ''}
      <p class="src">Источник данных: ${esc((e.sourcesList || []).join(', '))}</p>`;
    const dr = $('#drawer');
    dr.hidden = false;
    requestAnimationFrame(() => dr.classList.add('open'));
    $('#drawer-body').scrollTop = 0;
    $('#drawer .x').focus({ preventScroll: true });
  }
  function closeDrawer() { const dr = $('#drawer'); dr.classList.remove('open'); setTimeout(() => { dr.hidden = true; }, 220); }

  /* ── Управление ── */
  function setFocus(id, keepScroll) {
    if (!ent(id)) id = 'ru';
    if (!$('#drawer').hidden) closeDrawer();
    build(id);
    $('#focus').value = id;
    render();
    if (!keepScroll) window.scrollTo({ top: 0 });
  }

  function initControls() {
    // выбор страны
    const all = [...DB.entities.values()];
    const cur = all.filter(e => e._end === null).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    const hist = all.filter(e => e._end !== null).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    $('#focus').innerHTML = `<optgroup label="Современные государства">${cur.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</optgroup>
      <optgroup label="Исторические государства">${hist.map(e => `<option value="${esc(e.id)}">${esc(e.name)} (${esc(spanOf(e))})</option>`).join('')}</optgroup>`;
    $('#focus').addEventListener('change', ev => { location.hash = '#' + ev.target.value; });
    // фильтры
    $('#filters').innerHTML = FILTERS.map(([k, n]) => `<button type="button" data-filter="${k}" aria-pressed="${S.filters[k]}">${icon(k === 'docs' ? 'doc' : k === 'rulers' ? 'ruler' : k === 'flags' ? 'flag' : k === 'religion' ? 'religion' : k === 'branches' ? 'spawn' : 'note')}${n}</button>`).join('');
    $('#filters').addEventListener('click', ev => {
      const b = ev.target.closest('[data-filter]'); if (!b) return;
      const k = b.dataset.filter; S.filters[k] = !S.filters[k]; b.setAttribute('aria-pressed', S.filters[k]);
      try { localStorage.setItem('history.filters', JSON.stringify(S.filters)); } catch (e) { /* ignore */ }
      // сохранить позицию относительно ближайшей строки
      render();
    });
    document.addEventListener('click', ev => {
      const f = ev.target.closest('[data-focus]');
      if (f) { closeDrawer(); location.hash = '#' + f.dataset.focus; return; }
      const j = ev.target.closest('[data-jump]');
      if (j) {
        const i = S.visible.findIndex(r => r.k === 'header' && r.ent === j.dataset.jump);
        const el = document.querySelector(`.row[data-i="${i}"]`);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
        return;
      }
      const o = ev.target.closest('[data-open]');
      if (o) { openDrawer(o.dataset.open); return; }
      if (ev.target.closest('#drawer .x') || ev.target.id === 'drawer') closeDrawer();
    });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeDrawer(); });
    window.addEventListener('scroll', onScroll, { passive: true });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
    window.addEventListener('hashchange', () => setFocus(decodeURIComponent(location.hash.slice(1)) || 'ru'));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    if ('ResizeObserver' in window) { let w = 0; new ResizeObserver(en => { const nw = en[0].contentRect.width; if (Math.abs(nw - w) > 1) { w = nw; layout(); } }).observe($('#tree')); }
  }

  function start() {
    const issues = DB.validate();
    if (issues.length) console.warn('[history] Проблемы в данных:\n' + issues.join('\n'));
    initControls();
    setFocus(decodeURIComponent(location.hash.slice(1)) || 'ru', true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
