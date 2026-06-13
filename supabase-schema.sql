-- ============================================================
--  Mia Utilidades · Cobranças (venda a prazo com juros)
--  Cole no Supabase: SQL Editor > New query > Run
-- ============================================================

-- Cada COMPRA a prazo vira uma dívida.
create table if not exists public.dividas (
  id            uuid primary key default gen_random_uuid(),
  pessoa        text not null,                  -- nome da pessoa
  empresa       text,                           -- empresa (opcional)
  descricao     text,                           -- produto / pedido
  valor_compra  numeric(12,2) not null,         -- valor do produto (principal)
  data_compra   date not null,                  -- quando pegou a mercadoria
  criado_em     timestamptz not null default now()
);

-- Cada PAGAMENTO que o cliente faz numa dívida.
create table if not exists public.pagamentos (
  id          uuid primary key default gen_random_uuid(),
  divida_id   uuid not null references public.dividas(id) on delete cascade,
  valor       numeric(12,2) not null,
  data        date not null,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_dividas_pessoa      on public.dividas (pessoa);
create index if not exists idx_dividas_data        on public.dividas (data_compra);
create index if not exists idx_pagamentos_divida   on public.pagamentos (divida_id);

-- ------------------------------------------------------------
-- App de uso interno protegido por senha (igual à calculadora):
-- liberamos acesso pela chave anon.
-- ------------------------------------------------------------
alter table public.dividas    enable row level security;
alter table public.pagamentos enable row level security;

drop policy if exists "acesso_total_anon" on public.dividas;
create policy "acesso_total_anon" on public.dividas
  for all using (true) with check (true);

drop policy if exists "acesso_total_anon" on public.pagamentos;
create policy "acesso_total_anon" on public.pagamentos
  for all using (true) with check (true);
