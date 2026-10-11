# Testes no navegador (Playwright)

Rodam contra um deploy (preview ou produção). Não ficam no build do app.

```bash
npm i playwright@1.48.2 && npx playwright install chromium
export BASE=https://seu-deploy.vercel.app KEY='chave de acesso' BYPASS='token de bypass (só para preview protegido)'
node tests/e2e/crawl.cjs 390          # todas as telas: erros, status e rolagem lateral
node tests/e2e/crawl.cjs 390 light    # idem no tema claro
node tests/e2e/audit.cjs 390 light / /mais   # contraste e texto cortado
node tests/e2e/flows.cjs              # fluxos que gravam (registros "teste-auto-v05", excluir depois)
```
