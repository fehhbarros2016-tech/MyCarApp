// Auditoria visual automática: contraste de texto, texto cortado e alvos de toque pequenos.
// uso: node audit.js <width> <theme|-> path...
const { chromium } = require('playwright');
const [width, theme, ...paths] = process.argv.slice(2);
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: Number(width), height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.BYPASS } });
  const p = await ctx.newPage();
  await p.goto(process.env.BASE + '/bem-vindo');
  if (p.url().includes('bem-vindo')) { await p.fill('#name', process.env.NAME || 'Felipe'); await p.fill('#key', process.env.KEY); await p.keyboard.press('Enter'); await p.waitForURL((u) => !String(u).includes('bem-vindo')); }
  for (const path of paths) {
    await p.goto(process.env.BASE + path, { waitUntil: 'networkidle' });
    if (theme !== '-') await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
      const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
      const pageBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 6, g: 17, b: 12, a: 1 };
      const bgOf = (el) => {
        const layers = [];
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.backgroundImage !== 'none' && !cs.backgroundImage.includes('gradient')) return null;
          const c = parse(cs.backgroundColor);
          if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
        }
        let acc = pageBg;
        for (const l of layers.reverse()) acc = blend(l, acc);
        return acc;
      };
      const low = [], cut = [], small = [];
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > 2400) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (own && !el.closest('.money') && cs.webkitTextFillColor !== 'rgba(0, 0, 0, 0)' && !el.closest('[aria-hidden="true"]') && !el.closest('svg')) {
          const fg = parse(cs.color); const bg = bgOf(el);
          if (fg && bg) {
            const f = blend(fg, bg); const L1 = lum(f), L2 = lum(bg);
            const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
            const big = parseFloat(cs.fontSize) >= 18 || (parseFloat(cs.fontSize) >= 14 && Number(cs.fontWeight) >= 700);
            if (ratio < (big ? 3 : 4.0)) low.push(`${ratio.toFixed(1)} ${el.tagName}.${String(el.className).slice(0, 24)} "${el.textContent.trim().slice(0, 22)}"`);
          }
          if (el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && cs.overflowX !== 'visible' && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') cut.push(`${el.tagName}.${String(el.className).slice(0, 24)} "${el.textContent.trim().slice(0, 22)}"`);
        }
        if ((el.tagName === 'BUTTON' || el.tagName === 'A') && (rect.height < 28 || rect.width < 28) && el.textContent.trim().length < 3 && !el.closest('.chips-scroll')) small.push(`${el.tagName}.${String(el.className).slice(0, 20)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
      const word = document.querySelector('.word');
      const wordFit = word ? Math.round(word.getBoundingClientRect().right - word.parentElement.getBoundingClientRect().right) : null;
      return { low: [...new Set(low)].slice(0, 8), cut: [...new Set(cut)].slice(0, 5), small: [...new Set(small)].slice(0, 4), wordFit };
    });
    console.log(JSON.stringify({ path, ...r }));
  }
  await br.close();
})();
