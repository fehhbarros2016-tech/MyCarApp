// Fluxos de ponta a ponta (cria registros marcados "teste-auto-v05" que depois são excluídos).
const { chromium } = require('playwright');
const B = process.env.BASE, M = 'teste-auto-v05';
const only = process.argv.slice(2);
const PNG = Buffer.from('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', 'base64');
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.BYPASS } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 150)));
  const toast = async (re, t = 15000) => (await p.locator('.toast', { hasText: re }).first().waitFor({ timeout: t }), true);
  const step = async (name, fn) => {
    const e0 = errs.length;
    try { await fn(); console.log('OK  ', name, errs.length > e0 ? 'PAGEERR ' + errs.slice(e0).join(' | ') : ''); }
    catch (e) { console.log('FAIL', name, '::', e.message.split('\n')[0].slice(0, 220), errs.slice(e0).join(' | ')); }
  };
  const go = (path) => p.goto(B + path, { waitUntil: 'networkidle' });
  const sheet = () => p.locator('.sheet').last();

  await go('/bem-vindo');
  if (p.url().includes('bem-vindo')) { await p.fill('#name', process.env.NAME || 'Felipe'); await p.fill('#key', process.env.KEY); await p.keyboard.press('Enter'); await p.waitForURL((u) => !String(u).includes('bem-vindo')); }
  const only_ = (n) => !only.length || only.includes(n);

  if (only_('gasto')) await step('gasto recorrente + favorito', async () => {
    await go('/gastos');
    await p.locator('.ph-action button', { hasText: 'Novo' }).click();
    await sheet().locator('#amount').fill('12,34');
    await sheet().locator('.cat-grid button', { hasText: 'Lavagem' }).click();
    await sheet().locator('input[name=note]').fill(M);
    await sheet().locator('.seg button', { hasText: 'Mensal' }).click();
    await sheet().locator('button[aria-label="Salvar como favorito"]').click();
    await sheet().locator('button', { hasText: 'Salvar gasto' }).click();
    await toast(/repete todo mês/);
    await go('/gastos');
    await p.locator('.xrow', { hasText: M }).first().waitFor({ timeout: 8000 });
    const tag = await p.locator('.xrow', { hasText: M }).first().locator('.xtag').first().textContent();
    if (tag !== 'recorrente') throw new Error('sem etiqueta recorrente: ' + tag);
  });

  if (only_('fav')) await step('favorito no + (um toque e desfazer)', async () => {
    await go('/');
    await p.locator('button.fab').click();
    await p.locator('.fav-chip', { hasText: M }).click();
    await toast(/lançado/);
    await p.locator('.toast button', { hasText: 'Desfazer' }).click();
    await toast(/Desfeito/);
  });

  if (only_('km')) await step('km atual: nova leitura vira o km atual e dá para apagar', async () => {
    await go('/');
    const before = (await p.locator('.tile', { hasText: 'Km atual' }).locator('b').textContent()).trim();
    await p.locator('button.fab').click();
    await p.locator('.q-item', { hasText: 'Km atual' }).click();
    await sheet().locator('input[name=km]').fill('191900');
    await sheet().locator('button', { hasText: 'Salvar km' }).click();
    await toast(/Quilometragem atualizada/);
    await p.waitForTimeout(1500);
    const after = (await p.locator('.tile', { hasText: 'Km atual' }).locator('b').textContent()).trim();
    if (after !== '191.900') throw new Error(`km atual ${before} -> ${after}`);
    await p.locator('button.fab').click();
    await p.locator('.q-item', { hasText: 'Km atual' }).click();
    await sheet().locator('.odo-hist li', { hasText: '191.900' }).locator('button').click();
    await toast(/Leitura removida/);
    await p.keyboard.press('Escape');
    await go('/');
    const back = (await p.locator('.tile', { hasText: 'Km atual' }).locator('b').textContent()).trim();
    if (back !== before) throw new Error(`depois de apagar: ${back} (antes ${before})`);
  });

  if (only_('problema')) await step('problema: anotar e resolver', async () => {
    await go('/');
    await p.locator('button.fab').click();
    await p.locator('.q-item', { hasText: 'Problema' }).click();
    await sheet().locator('input[name=title]').fill(M + ' barulho');
    await sheet().locator('.seg button', { hasText: 'Sério' }).click();
    await sheet().locator('button', { hasText: 'Anotar problema' }).click();
    await toast(/Problema anotado/);
    await go('/manutencao?t=problemas');
    const li = p.locator('.issue-list li', { hasText: M });
    await li.locator('button', { hasText: 'Resolvido' }).click();
    await sheet().locator('textarea[name=resolution]').fill('ok');
    await sheet().locator('button', { hasText: 'Marcar como resolvido' }).click();
    await toast(/resolvido/);
  });

  if (only_('pneu')) await step('pneus: calibrei hoje', async () => {
    await go('/manutencao?t=pneus');
    await p.locator('button', { hasText: 'Calibrei hoje' }).first().click();
    await toast(/Calibragem registrada/);
    await go('/manutencao?t=pneus');
    await p.locator('.ev-list li', { hasText: 'Calibragem' }).first().waitFor({ timeout: 8000 });
  });

  if (only_('peca')) await step('peça com foto', async () => {
    await go('/manutencao?t=pecas&nova=1');
    await sheet().locator('input[type=file]').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG });
    await p.waitForTimeout(800);
    await sheet().locator('input[name=name]').fill(M + ' bateria');
    await sheet().locator('input[name=price]').fill('10');
    await sheet().locator('button[aria-label="Lançar nos gastos"]').click();
    await sheet().locator('button', { hasText: 'Salvar peça' }).click();
    await toast(/Peça salva/);
    await go('/manutencao?t=pecas');
    const card = p.locator('.part-card', { hasText: M });
    const n = await card.count();
    const html = n ? (await card.first().innerHTML()).slice(0, 300) : (await p.locator('main').innerText()).slice(0, 300);
    const src = n ? await card.first().locator('img').getAttribute('src').catch(() => null) : null;
    const st = src ? (await p.request.get(B + src)).status() : null;
    console.log('   diag peça', n, src, st, html.replace(/\s+/g, ' '));
    const img = card.locator('img');
    await img.waitFor({ timeout: 8000 });
    await p.waitForTimeout(800);
    const w = await img.evaluate((i) => i.naturalWidth);
    if (!w) throw new Error('imagem não carregou');
  });

  if (only_('multa')) await step('multa grave soma 5 pontos', async () => {
    await go('/multas');
    await p.locator('.ph-action button', { hasText: 'Nova' }).click();
    await sheet().locator('input[name=description]').fill(M + ' multa');
    await sheet().locator('.sev-grid button', { hasText: 'Grave' }).click();
    await sheet().locator('button', { hasText: 'Registrar multa' }).click();
    await toast(/Multa registrada/);
    await go('/multas');
    const t = await p.locator('.cnh .ring-c b').textContent();
    if (!/[1-9]/.test(t)) throw new Error('pontos: ' + t);
  });

  if (only_('viagem')) await step('viagem: começar, marcar gasto e encerrar', async () => {
    await go('/viagens');
    await p.locator('.ph-action button', { hasText: 'Nova viagem' }).click();
    await sheet().locator('input[name=name]').fill(M + ' viagem');
    await sheet().locator('button', { hasText: 'Começar viagem' }).click();
    await toast(/Viagem criada/);
    await go('/viagens');
    await p.locator('.trip-active', { hasText: M }).waitFor();
    await p.locator('.trip-active button', { hasText: 'Encerrar' }).click();
    await toast(/encerrada/);
  });

  if (only_('plano')) await step('plano: criar item e "Fiz"', async () => {
    await go('/manutencao?t=plano');
    const zero = p.locator('button', { hasText: 'Criar do zero' });
    if (await zero.count()) await zero.click(); else await p.locator('.ph-action button', { hasText: 'Item' }).click();
    await sheet().locator('input[name=name]').fill(M + ' item');
    await sheet().locator('input[name=intervalKm]').fill('10000');
    await sheet().locator('button', { hasText: 'Adicionar ao plano' }).click();
    await toast(/adicionado/);
    await go('/manutencao?t=plano');
    await p.locator('.plan-list li', { hasText: M }).locator('.plan-do').click();
    await sheet().locator('input[name=labor]').fill('1');
    await sheet().locator('input[name=km]').fill('191891');
    await sheet().locator('button', { hasText: 'Salvar manutenção' }).click();
    await toast(/plano atualizado/);
    await go('/manutencao?t=plano');
    const when = await p.locator('.plan-list li', { hasText: M }).locator('.plan-when').textContent();
    if (!/faltam 10\.000 km/.test(when)) throw new Error('status: ' + when);
  });

  if (only_('busca')) await step('busca: "lavag" e "conbustivel"', async () => {
    await go('/buscar');
    await p.locator('.search-bar input').fill('lavag');
    await p.locator('.search-cat', { hasText: 'Lavagem' }).waitFor({ timeout: 5000 });
    await p.locator('.search-bar input').fill('conbustivel');
    await p.locator('.search-cat', { hasText: 'Combustível' }).waitFor({ timeout: 5000 });
  });

  if (only_('tema')) await step('tema claro salvo e de volta ao escuro', async () => {
    await go('/configuracoes?t=visual');
    await p.locator('.theme-grid button', { hasText: 'Claro' }).click();
    await p.waitForTimeout(1500);
    await go('/');
    const t = await p.evaluate(() => document.documentElement.dataset.theme);
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await go('/configuracoes?t=visual');
    await p.locator('.theme-grid button', { hasText: 'Escuro' }).click();
    await p.waitForTimeout(1500);
    if (t !== 'light' || !bg.includes('238')) throw new Error(`tema ${t} fundo ${bg}`);
  });

  if (only_('veiculo')) await step('trocar veículo e voltar', async () => {
    await go('/carro');
    await p.locator('button', { hasText: 'Adicionar veículo' }).click();
    await sheet().locator('input[name=name]').fill(M + ' carro');
    await sheet().locator('input[name=make]').fill('Teste');
    await sheet().locator('input[name=model]').fill('Gol');
    await sheet().locator('button', { hasText: 'Adicionar veículo' }).click();
    await toast(/Veículo adicionado/);
    await go('/');
    const word = await p.locator('.word').textContent();
    const svg = await p.locator('.car-svg').count();
    await go('/carro');
    const row = p.locator('.set-item', { hasText: 'Meu Clio' });
    await row.locator('button', { hasText: 'Usar este' }).click();
    await p.waitForURL(B + '/', { timeout: 15000 });
    await go('/carro');
    const t = p.locator('.set-item', { hasText: M });
    await t.locator('button', { hasText: 'Arquivar' }).click();
    await t.locator('button', { hasText: 'Confirmar' }).click();
    await toast(/arquivado/);
    if (word !== 'GOL' || !svg) throw new Error(`palavra ${word} svg ${svg}`);
  });

  if (only_('faceid')) await step('Face ID (autenticador virtual): ativar, bloquear, destravar, desligar', async () => {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    await go('/configuracoes?t=seguranca');
    await p.locator('button[aria-label="Bloquear com Face ID"]').click();
    await toast(/Face ID ativado/);
    // o HTML do servidor já vem bloqueado; com o autenticador virtual o desbloqueio automático acontece na hora
    const html = await (await p.request.get(B + '/')).text();
    if (!html.includes('class="lock"')) throw new Error('servidor não mandou a tela de bloqueio');
    await go('/');
    await p.waitForTimeout(1500);
    if (await p.locator('.lock').count()) await p.locator('.lock button', { hasText: 'Desbloquear' }).click();
    await p.locator('.lock').waitFor({ state: 'detached', timeout: 8000 });
    await go('/configuracoes?t=seguranca');
    await p.waitForTimeout(1500);
    if (await p.locator('.lock').count()) { await p.locator('.lock button', { hasText: 'Desbloquear' }).click(); await p.locator('.lock').waitFor({ state: 'detached' }); }
    await p.locator('button[aria-label="Bloquear com Face ID"]').click();
    await toast(/Bloqueio desligado/);
    const c = await p.evaluate(() => document.cookie);
    if (c.includes('mc_lock=1')) throw new Error('cookie ficou');
  });

  console.log('pageerrors total', errs.length, errs.slice(0, 3).join(' | '));
  await br.close();
})();
