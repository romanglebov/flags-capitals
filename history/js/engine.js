/* Хранилище данных и граф преемственности государств. Без зависимостей от DOM. */
(function (global) {
  'use strict';

  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /** Дата → десятичный год. Принимает 1991, '1991', '-500', '1991-12', '1991-12-26'. */
  function dec(d) {
    if (d === null || d === undefined || d === '') return null;
    if (typeof d === 'number') return d;
    const m = /^(-?\d{1,5})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(String(d).trim());
    if (!m) return NaN;
    const y = +m[1], mo = m[2] ? +m[2] : null, da = m[3] ? +m[3] : null;
    if (mo === null) return y + 0.5;                       // год без месяца — середина года
    return y + (mo - 1) / 12 + (da === null ? 15 : da - 1) / 366;
  }

  function yearOf(d) {
    if (d === null || d === undefined) return null;
    return typeof d === 'number' ? Math.floor(d) : parseInt(String(d), 10);
  }

  function fmtYear(y) {
    if (y === null || y === undefined || isNaN(y)) return '';
    return y < 0 ? `${-y} до н. э.` : String(y);
  }

  /** '1991-12-26' → '26 декабря 1991' */
  function fmtDate(d) {
    if (d === null || d === undefined) return '';
    if (typeof d === 'number') return fmtYear(Math.floor(d));
    const m = /^(-?\d{1,5})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(String(d));
    if (!m) return String(d);
    const y = fmtYear(+m[1]);
    if (m[3]) return `${+m[3]} ${MONTHS[+m[2] - 1]} ${y}`;
    if (m[2]) return `${['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'][+m[2] - 1]} ${y}`;
    return y;
  }

  function fmtSpan(from, to, opts = {}) {
    const a = opts.fromLabel || fmtYear(yearOf(from));
    const b = to === null || to === undefined ? (opts.open || 'н. в.') : (opts.toLabel || fmtYear(yearOf(to)));
    return a === b ? a : `${a} — ${b}`;
  }

  const now = new Date();
  const NOW = now.getFullYear() + now.getMonth() / 12 + (now.getDate() - 1) / 366;

  const DB = {
    entities: new Map(),
    events: [],
    eventIds: new Set(),
    sources: [],
    warnings: [],

    /** Добавить пакет данных: { source?, entities: [...], events: [...] } */
    add(pack) {
      const src = pack.source || 'неизвестный файл';
      this.sources.push(src);
      for (const e of pack.entities || []) {
        if (!e.id) { this.warn(src, 'сущность без id', e); continue; }
        const prev = this.entities.get(e.id);
        // Повторное объявление дополняет запись (так разные файлы могут расширять одну страну)
        const merged = prev ? mergeEntity(prev, e) : Object.assign({ rulers: [], flags: [], religions: [], capitals: [], documents: [], notes: [], sourcesList: [] }, e);
        merged.sourcesList = (prev ? prev.sourcesList : []).concat(src);
        this.entities.set(e.id, merged);
      }
      for (const ev of pack.events || []) {
        if (!ev.id) { this.warn(src, 'событие без id', ev); continue; }
        if (this.eventIds.has(ev.id)) { this.warn(src, `повтор события ${ev.id}`); continue; }
        this.eventIds.add(ev.id);
        this.events.push(Object.assign({ from: [], to: [], involves: [], documents: [], _src: src }, ev));
      }
      this._index = null;
    },

    warn(src, msg, obj) { this.warnings.push(`[${src}] ${msg}`); if (obj && typeof console !== 'undefined') console.warn('[history]', src, msg, obj); },

    get(id) { return this.entities.get(id) || null; },

    index() {
      if (this._index) return this._index;
      const byTo = new Map(), byFrom = new Map(), byAny = new Map();
      const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
      for (const ev of this.events) {
        ev._dec = dec(ev.date);
        for (const id of ev.to) push(byTo, id, ev);
        for (const id of ev.from) push(byFrom, id, ev);
        for (const id of new Set([...ev.from, ...ev.to, ...ev.involves])) push(byAny, id, ev);
      }
      for (const e of this.entities.values()) {
        e._start = dec(e.start);
        e._end = e.end === null || e.end === undefined ? null : dec(e.end);
      }
      this._index = { byTo, byFrom, byAny };
      return this._index;
    },

    /** Событие, создавшее сущность (она в to и не в from; partial не считается) */
    originEvent(id) {
      const list = (this.index().byTo.get(id) || []).filter(ev => !ev.partial && !ev.from.includes(id));
      return list.sort((a, b) => a._dec - b._dec)[0] || null;
    },
    /** Событие, завершившее сущность */
    endEvent(id) {
      const list = (this.index().byFrom.get(id) || []).filter(ev => !ev.partial && !ev.to.includes(id));
      return list.sort((a, b) => b._dec - a._dec)[0] || null;
    },
    /** Предшественники: все from тех непарциальных событий, где сущность в to */
    predecessors(id) {
      const out = [];
      for (const ev of this.index().byTo.get(id) || []) {
        if (ev.partial) continue;
        for (const f of ev.from) if (f !== id && !out.includes(f)) out.push(f);
      }
      return out;
    },
    successors(id) {
      const out = [];
      for (const ev of this.index().byFrom.get(id) || []) {
        if (ev.partial) continue;
        for (const t of ev.to) if (t !== id && !out.includes(t)) out.push(t);
      }
      return out;
    },
    eventsOf(id) { return (this.index().byAny.get(id) || []).slice().sort((a, b) => b._dec - a._dec); },

    /** Главная линия: от фокуса назад по первичным предшественникам */
    trunk(focusId) {
      const chain = [], seen = new Set();
      let cur = focusId;
      while (cur && !seen.has(cur) && this.get(cur)) {
        chain.push(cur); seen.add(cur);
        const ev = this.originEvent(cur);
        if (!ev) break;
        const cands = ev.from.filter(f => f !== cur && this.get(f));
        cur = (ev.primary && cands.includes(ev.primary)) ? ev.primary : cands[0];
      }
      return chain;
    },

    /** Все предки фокуса (включая его самого), в порядке обхода в ширину */
    ancestry(focusId) {
      const seen = new Set([focusId]), order = [focusId];
      for (let i = 0; i < order.length; i++) {
        for (const p of this.predecessors(order[i])) {
          if (!seen.has(p) && this.get(p)) { seen.add(p); order.push(p); }
        }
      }
      return order;
    },

    /** Проверка целостности; возвращает список проблем */
    validate() {
      const issues = this.warnings.slice();
      this.index();
      for (const e of this.entities.values()) {
        if (!e.name) issues.push(`${e.id}: нет названия`);
        if (e._start === null || isNaN(e._start)) issues.push(`${e.id}: некорректная дата start (${e.start})`);
        if (e._end !== null && isNaN(e._end)) issues.push(`${e.id}: некорректная дата end (${e.end})`);
        if (e._end !== null && e._start > e._end) issues.push(`${e.id}: start позже end`);
        for (const key of ['rulers', 'flags', 'religions', 'capitals']) {
          for (const it of e[key] || []) if (isNaN(dec(it.from))) issues.push(`${e.id}.${key}: некорректная дата ${it.from}`);
        }
        for (const key of ['documents', 'notes']) {
          for (const it of e[key] || []) if (isNaN(dec(it.date))) issues.push(`${e.id}.${key}: некорректная дата ${it.date}`);
        }
      }
      for (const ev of this.events) {
        if (isNaN(ev._dec) || ev._dec === null) issues.push(`событие ${ev.id}: некорректная дата ${ev.date}`);
        for (const id of [...ev.from, ...ev.to, ...ev.involves]) {
          if (!this.get(id)) issues.push(`событие ${ev.id}: неизвестная сущность «${id}»`);
        }
        if (ev.primary && !ev.from.includes(ev.primary)) issues.push(`событие ${ev.id}: primary не входит в from`);
      }
      return issues;
    },
  };

  function mergeEntity(a, b) {
    const out = Object.assign({}, a);
    for (const [k, v] of Object.entries(b)) {
      if (Array.isArray(v) && Array.isArray(a[k])) out[k] = a[k].concat(v);
      else out[k] = v;
    }
    return out;
  }

  global.HistoryDB = DB;
  global.HistoryUtil = { dec, yearOf, fmtYear, fmtDate, fmtSpan, NOW };
})(typeof window !== 'undefined' ? window : globalThis);
