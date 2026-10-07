# Meu Clio

App pessoal (PWA) para controlar gastos, parcelas e manutenção do carro. Next.js + TypeScript na Vercel, banco no Supabase.

Arquitetura completa: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Colocar no ar (primeira vez)

### 1. Supabase
1. Crie um projeto em supabase.com (região São Paulo).
2. Abra **SQL Editor** e rode, nesta ordem, o conteúdo de:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_views.sql`
   - `supabase/migrations/0003_fuel_gauge.sql`
   - `supabase/migrations/0004_half_bars.sql`
   - `supabase/migrations/0005_function_search_path.sql`
   - `supabase/migrations/0006_app_completo.sql`
3. Em **Project Settings → API**, copie a **Project URL** e a **service_role key**.

### 2. Variáveis de ambiente
O arquivo `.env.local` já vem com `ACCESS_KEY_HASH` (hash da sua chave de acesso) e `SESSION_SECRET` preenchidos. Complete:
- `SUPABASE_URL` = Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key

Nunca use o prefixo `NEXT_PUBLIC_` nessas chaves. O `.env.local` não vai para o GitHub.

### 3. GitHub e Vercel
1. Crie um repositório **privado** no GitHub e envie esta pasta (o `.env.local` fica de fora sozinho).
2. Na Vercel: **Add New → Project**, importe o repositório.
3. Em **Settings → Environment Variables**, cadastre as 5 variáveis do `.env.local`. Em produção, use `NEXT_PUBLIC_APP_ENV=production`.
4. Deploy.

### 4. iPhone
Abra o endereço da Vercel no Safari → Compartilhar → **Adicionar à Tela de Início**. Na primeira abertura, digite seu nome e a chave de acesso.

## Rodar no computador
```bash
npm install
npm run dev        # http://localhost:3000
```

## Regras do banco
- Mudança de estrutura = **nova** migration em `supabase/migrations` (ex.: `0003_...sql`). Nunca editar uma migration já aplicada.
- `npm run check:migrations` bloqueia `DROP`, `TRUNCATE` e `DELETE` sem `WHERE`, a menos que a migration tenha a linha
  `-- DESTRUTIVO: aprovado por Gabriel em AAAA-MM-DD`.
- Gastos usam exclusão lógica (`deleted_at`); veículos são arquivados, nunca apagados.

## Acesso
- Sem login: nome + chave de acesso uma vez por aparelho; depois um cookie seguro vale 1 ano.
- Trocar a chave: `npm run chave`, cole o novo `ACCESS_KEY_HASH` na Vercel e faça redeploy.
- Desconectar todos os aparelhos: troque o `SESSION_SECRET` na Vercel.
- O navegador nunca acessa o banco; a chave pública do Supabase não é usada e o RLS bloqueia tudo para ela.
