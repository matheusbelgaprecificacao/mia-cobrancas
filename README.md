# Cobranças · Mia Utilidades

Controle de **venda a prazo com juros** + lembretes no Telegram.
Mesma nuvem da calculadora: **Vercel** (site) + **Supabase** (banco).

## Como funciona o cálculo

Cada **compra a prazo** vira uma dívida ligada à **pessoa + empresa**.

- A pessoa pega R$ X em produto numa data.
- A cada **30 dias** entra **20% de juros sobre o saldo de produto** que ela ainda deve.
- Quando ela paga, o valor **abate primeiro o juros, depois o produto**.
- Enquanto sobrar produto, todo mês entra 20% de novo (sobre o saldo novo).
- Some todos os meses sem pagar → o juros vai **acumulando**.

Exemplo: pega R$ 1.000 →
- Paga só R$ 200 (o juros) → ainda deve R$ 1.000 de produto.
- Paga R$ 400 → R$ 200 quitam o juros e R$ 200 abatem o produto → sobra R$ 800.
  No mês seguinte o juros vira 20% de 800 = R$ 160.

O painel **agrupa por cliente** (a mesma pessoa pode ter várias compras separadas)
e mostra, por compra: produto devedor, juros em aberto, total e o juros do mês.

Tem duas abas no topo:
- **Visão geral** (dashboard): dinheiro na rua, produto × lucro (juros), lucro
  projetado do próximo mês, total já recebido, gráfico de quanto cada cliente deve,
  recebimentos por mês e uma tabela por cliente.
- **Cobranças**: cadastrar compras, registrar pagamentos e acompanhar cada dívida.

---

## PASSO 1 — Subir o código no GitHub

Crie um repositório **`mia-cobrancas`** e suba todos os arquivos desta pasta
(igual fez com o `mia-precificador`).

## PASSO 2 — Criar as tabelas no Supabase

1. Abra o seu projeto no Supabase (o mesmo da calculadora).
2. **SQL Editor → New query**, cole o conteúdo de **`supabase-schema.sql`** e **Run**.
3. Cria duas tabelas: `dividas` (as compras) e `pagamentos`.

> As chaves do Supabase (URL e anon key) são as mesmas da calculadora.

## PASSO 3 — Criar o bot do Telegram

1. No Telegram, abra o **@BotFather** e envie **/newbot**.
2. Dê um nome e um usuário terminando em `bot`.
3. Guarde o **token** que ele devolve (`123456789:ABC...`).

## PASSO 4 — Descobrir o seu chat_id

1. Mande qualquer mensagem para o **seu novo bot**.
2. Abra no navegador (troque `SEU_TOKEN`):
   `https://api.telegram.org/botSEU_TOKEN/getUpdates`
3. Pegue o número em `"chat":{"id": ...}` — é o seu **chat_id**.

## PASSO 5 — Deploy no Vercel

1. **vercel.com → New Project → Import** o repositório `mia-cobrancas`.
2. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | sua URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sua anon key |
   | `NEXT_PUBLIC_APP_PASSWORD` | senha para entrar no site |
   | `TELEGRAM_BOT_TOKEN` | token do passo 3 |
   | `TELEGRAM_CHAT_ID` | número do passo 4 |
   | `CRON_SECRET` | um texto aleatório longo (invente) |

3. **Deploy** e aguarde ~2 minutos.

## PASSO 6 — Testar o lembrete agora

No navegador, abra (trocando os dois valores):
`https://SEU-SITE.vercel.app/api/cron/lembretes?secret=SEU_CRON_SECRET`

A mensagem deve chegar no seu Telegram. Se der erro, a página diz o motivo.

## PASSO 7 — Agendamento

Já configurado em `vercel.json` para rodar **todo dia às 09:00 (Brasília)**.
O robô avisa as compras que **fecham 30 dias no dia** (hora de cobrar o mês) e o
total na rua. No plano gratuito o horário pode variar dentro da hora.

---

## Ideias para depois

- Avisar 1–2 dias antes do fechamento.
- Comandos no Telegram (ex.: `/rua`, `/cliente João`).
- Editar uma compra já lançada; recibo por cliente.
- Mudar o juros ou o prazo por cliente (hoje é 20% / 30 dias fixos).
