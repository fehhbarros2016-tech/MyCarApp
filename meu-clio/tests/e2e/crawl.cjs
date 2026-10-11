// uso: BASE=... BYPASS=... node crawl.js 390 [theme]
const { chromium } = require('playwright');
const BASE = process.env.BASE, BYPASS = process.env.BYPASS;
const width = Number(process.argv[2] || 390), theme = process.argv[3] || '';
const PAGES = ['/', '/gastos', '/gastos/rapidos', '/buscar?q=comb', '/combustivel', '/combustivel/novo', '/combustivel/nivel', '/relatorios',
  '/mais', '/manutencao', '/manutencao?t=plano', '/manutencao?t=pecas', '/manutencao?t=pneus', '/manutencao?t=problemas', '/manutencao?t=oficinas',
  '/parcelas', '/planejamento', '/agenda', '/viagens', '/multas', '/carro', '/linha-do-tempo', '/resumo/2026-09', '/retrospectiva/2026',
  '/relatorio-venda', '/configuracoes?t=geral', '/configuracoes?t=visual', '/configuracoes?t=inicio', '/configuracoes?t=veiculo',
  '/configuracoes?t=avisos', '/configuracoes?t=seguranca', '/configuracoes?t=dados', '/configuracoes?t=avancado', '/configuracoes?t=sobre', '/configuracoes/categorias'];
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    extraHTTPHeaders: { 'x-vercel-protection-bypass': BYPASS, 'x-vercel-set-bypass-cookie': 'true' } });
  const p = await ctx.newPage();
  const errs = []; const cons = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 140)); });
  await p.goto(BASE + '/bem-vindo');
  if (p.url().includes('bem-vindo')) {
    await p.fill('#name', process.env.NAME || 'Felipe'); await p.fill('#key', process.env.KEY); await p.keyboard.press('Enter');
    await p.waitForURL((u) => !String(u).includes('bem-vindo'), { timeout: 30000 });
  }
  for (const path of PAGES) {
    errs.length = 0; cons.length = 0;
    const t0 = Date.now();
    let status = 0;
    try { const r = await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 }); status = r.status(); } catch (e) { status = 'TIMEOUT'; }
    if (theme) await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await p.waitForTimeout(500);
    const info = await p.evaluate(() => {
      const over = document.documentElement.scrollWidth - innerWidth;
      const wide = over > 0 ? [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.className.toString().slice(0, 40) || e.tagName) : [];
      return { appErr: /Application error|server-side exception/.test(document.body.innerText), over, wide, h1: document.querySelector('h1')?.textContent?.slice(0, 30) ?? '' };
    });
    console.log(JSON.stringify({ path, status, ms: Date.now() - t0, ...info, errs: [...errs], cons: [...new Set(cons)].slice(0, 3) }));
  }
  await br.close();
})().catch((e) => { console.log('FATAL', e.message); process.exit(1); });
