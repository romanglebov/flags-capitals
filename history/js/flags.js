/* Флаги и символы. Каждый флаг описывается объектом, см. README.md → «Флаги». */
(function (global) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Глифы рисуются в поле 30×20
  const GLYPHS = {
    trident: fg => `<path d="M15 3.5V15.5M9.5 4.5V11Q9.5 15.5 15 15.5Q20.5 15.5 20.5 11V4.5M15 15.5V18" fill="none" stroke="${fg}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 2.2l1.2 1.8-1.2 1.8-1.2-1.8z" fill="${fg}"/>`,
    eagle: fg => `<g fill="${fg}"><path d="M15 6.2L8 2.8 7.5 6.2 9.4 7.6 7.4 8.6 9.9 10 8.4 11 12 12 13.5 14.4 15 13 16.5 14.4 18 12 21.6 11 20.1 10 22.6 8.6 20.6 7.6 22.5 6.2 22 2.8z"/><path d="M15 13l-2 4.8 2-1.1 2 1.1z"/><circle cx="12.6" cy="3.8" r="1.3"/><circle cx="17.4" cy="3.8" r="1.3"/></g><path d="M13.1 4.6l1.4 2.4M16.9 4.6l-1.4 2.4" stroke="${fg}" stroke-width="1.1"/>`,
    tamga: fg => `<path d="M9 4V8.5Q15 12 21 8.5V4M15 10.4V17M12 17H18" fill="none" stroke="${fg}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    crescent: (fg, bg) => `<circle cx="14" cy="10" r="5.4" fill="${fg}"/><circle cx="16.2" cy="9" r="4.6" fill="${bg}"/><path d="M20 6.4l.6 1.4 1.5.1-1.2.9.4 1.5-1.3-.8-1.3.8.4-1.5-1.2-.9 1.5-.1z" fill="${fg}"/>`,
    bell: fg => `<g fill="${fg}"><path d="M15 4.6Q11.2 4.6 11 9.2L10 14H20L19 9.2Q18.8 4.6 15 4.6Z"/><circle cx="15" cy="15.7" r="1.3"/><rect x="14.2" y="2.6" width="1.6" height="2.2" rx=".6"/></g>`,
    cross: fg => `<path d="M15 3V17.5M13 5.4H17M11.2 8.4H18.8M12.6 14.2L17.4 12.2" fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round"/>`,
    spear: fg => `<path d="M15 2l1.4 3.6H13.6z" fill="${fg}"/><path d="M15 5.6V18" stroke="${fg}" stroke-width="1.4"/><path d="M12.4 7.4Q15 10.6 17.6 7.4" fill="none" stroke="${fg}" stroke-width="1.4"/><circle cx="15" cy="7.2" r="1.4" fill="${fg}"/>`,
    dragon: () => `<path d="M5 13.5Q9 7.5 13 12T21 11.5 26 8" fill="none" stroke="#1F4FA0" stroke-width="2.2" stroke-linecap="round"/><circle cx="6.5" cy="5.5" r="2" fill="#C8102E"/>`,
    wheel: fg => `<circle cx="15" cy="10" r="5" fill="none" stroke="${fg}" stroke-width="1.5"/><path d="M15 5V15M10 10H20M11.5 6.5l7 7M18.5 6.5l-7 7" stroke="${fg}" stroke-width="1.1"/>`,
    star: fg => `<path d="M15 3.6l1.7 4.4 4.7.3-3.6 3 1.2 4.6L15 13.3 11 15.9l1.2-4.6-3.6-3 4.7-.3z" fill="${fg}"/>`,
  };

  function hammerSickle(fg) {
    return `<g fill="none" stroke="${fg}" stroke-linecap="round"><path d="M6 1.9l.5 1.1 1.2.1-.9.8.3 1.2L6 4.5 4.9 5.1l.3-1.2-.9-.8 1.2-.1z" fill="${fg}" stroke="none"/><path d="M4.3 6.7a2.8 2.8 0 1 0 4.1 1.1" stroke-width=".9"/><path d="M4.6 10.4L8 7" stroke-width=".9"/><path d="M7.2 6.2l1.6 1.6" stroke-width="1.3"/></g>`;
  }

  function svgOf(f) {
    const W = 30, H = 20;
    let body = '';
    switch (f.type) {
      case 'stripes': {
        const n = f.colors.length, v = f.dir === 'v';
        body = f.colors.map((c, i) => v
          ? `<rect x="${(W / n) * i}" y="0" width="${W / n + .05}" height="${H}" fill="${c}"/>`
          : `<rect x="0" y="${(H / n) * i}" width="${W}" height="${H / n + .05}" fill="${c}"/>`).join('');
        if (f.glyph && GLYPHS[f.glyph]) body += GLYPHS[f.glyph](f.fg || '#F2C230', f.colors[0]);
        break;
      }
      case 'ussr':
        body = `<rect width="${W}" height="${H}" fill="${f.bg || '#CC0000'}"/>` + hammerSickle(f.fg || '#FFD700');
        break;
      case 'canton':
        body = `<rect width="${W}" height="${H}" fill="${f.bg || '#CC0000'}"/>`;
        if (f.box) body += `<rect width="12" height="8" fill="${f.box}"/>`;
        body += `<text x="${f.box ? 6 : 1.4}" y="5.4" font-family="Arial,sans-serif" font-weight="700" font-size="${f.size || 3.6}" fill="${f.color || '#F2C230'}"${f.box ? ' text-anchor="middle"' : ''}>${esc(f.text || '')}</text>`;
        if (f.sickle) body += hammerSickle(f.color || '#F2C230');
        break;
      case 'symbol':
        body = `<rect width="${W}" height="${H}" fill="${f.bg || '#7A1F1F'}"/>` + (GLYPHS[f.glyph] ? GLYPHS[f.glyph](f.fg || '#F2C230', f.bg || '#7A1F1F') : '');
        break;
      case 'plain':
        body = `<rect width="${W}" height="${H}" fill="${f.color || '#999'}"/>`;
        break;
      default: { // initials
        const t = (f.text || '?').slice(0, 3);
        body = `<rect width="${W}" height="${H}" fill="${f.bg || '#6B7C80'}"/><text x="15" y="13.4" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${t.length > 2 ? 7 : 8.5}" fill="${f.color || '#fff'}">${esc(t)}</text>`;
      }
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
  }

  function initialsOf(name) {
    const w = String(name || '?').replace(/[«»"()]/g, '').split(/[\s-]+/).filter(Boolean);
    return (w.length > 1 ? w.slice(0, 2).map(x => x[0]).join('') : (w[0] || '?').slice(0, 2)).toUpperCase();
  }

  /** HTML плитки флага. flag может быть null — тогда инициалы. */
  function tile(flag, opts = {}) {
    const cls = 'ft' + (opts.cls ? ' ' + opts.cls : '') + (flag && flag.conventional ? ' conv' : '');
    const title = opts.title ? ` title="${esc(opts.title)}"` : '';
    if (flag && (flag.type === 'img' || flag.code)) {
      const src = flag.src || `../flags/${flag.code}.svg`;
      return `<span class="${cls}"${title}><img src="${esc(src)}" alt="" loading="lazy"></span>`;
    }
    const f = flag || { type: 'initials', text: initialsOf(opts.name), bg: opts.color };
    return `<span class="${cls}"${title}>${svgOf(f)}</span>`;
  }

  global.Flags = { tile, svgOf, initialsOf, GLYPHS: Object.keys(GLYPHS) };
})(typeof window !== 'undefined' ? window : globalThis);
