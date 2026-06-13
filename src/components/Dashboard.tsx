'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Wallet, Users, Receipt, CalendarClock } from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import { calcular, agruparPorCliente, brl, hojeSP } from '@/lib/calculos';
import type { Divida, Pagamento, DividaComEstado } from '@/types';

const COR = {
  ink: '#1A1C22',
  green: '#11795B',
  amber: '#B8501C',
  muted: '#898E98',
  line: '#E7E3DA',
};

export default function Dashboard() {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const hoje = hojeSP();

  useEffect(() => {
    (async () => {
      const [d, p] = await Promise.all([
        supabase.from('dividas').select('*'),
        supabase.from('pagamentos').select('*'),
      ]);
      setDividas((d.data ?? []) as Divida[]);
      setPagamentos((p.data ?? []) as Pagamento[]);
      setCarregando(false);
    })();
  }, []);

  const itens: DividaComEstado[] = useMemo(() => {
    const porDivida = new Map<string, Pagamento[]>();
    for (const p of pagamentos) {
      const arr = porDivida.get(p.divida_id) ?? [];
      arr.push(p);
      porDivida.set(p.divida_id, arr);
    }
    return dividas.map((d) => {
      const pags = porDivida.get(d.id) ?? [];
      return { divida: d, pagamentos: pags, estado: calcular(d, pags, hoje) };
    });
  }, [dividas, pagamentos, hoje]);

  const abertas = useMemo(() => itens.filter((i) => !i.estado.quitada), [itens]);
  const clientes = useMemo(() => agruparPorCliente(abertas), [abertas]);

  const m = useMemo(() => {
    const naRua = abertas.reduce((s, i) => s + i.estado.total, 0);
    const produto = abertas.reduce((s, i) => s + i.estado.principal, 0);
    const juros = abertas.reduce((s, i) => s + i.estado.juros, 0);
    const lucroProx = abertas.reduce((s, i) => s + i.estado.jurosProximo, 0);
    const jaRecebido = pagamentos.reduce((s, p) => s + p.valor, 0);
    const fecham7 = abertas.filter(
      (i) => (i.estado.diasProxFechamento ?? 99) <= 7,
    ).length;
    return {
      naRua,
      produto,
      juros,
      lucroProx,
      jaRecebido,
      fecham7,
      nClientes: clientes.length,
      nDividas: abertas.length,
    };
  }, [abertas, clientes, pagamentos]);

  const composicao = useMemo(
    () => [
      { name: 'Produto', value: Math.round(m.produto * 100) / 100, cor: COR.muted },
      { name: 'Juros (lucro)', value: Math.round(m.juros * 100) / 100, cor: COR.green },
    ],
    [m],
  );

  const topClientes = useMemo(
    () =>
      clientes
        .slice(0, 6)
        .map((c) => ({
          nome: c.pessoa,
          Produto: Math.round(c.principal * 100) / 100,
          Juros: Math.round(c.juros * 100) / 100,
        }))
        .reverse(),
    [clientes],
  );

  const recebidoMes = useMemo(() => {
    const porMes = new Map<string, number>();
    for (const p of pagamentos) {
      const k = p.data.slice(0, 7);
      porMes.set(k, (porMes.get(k) ?? 0) + p.valor);
    }
    return Array.from(porMes.keys())
      .sort()
      .slice(-6)
      .map((k) => {
        const [y, mm] = k.split('-');
        return { mes: `${mm}/${y.slice(2)}`, valor: Math.round((porMes.get(k) ?? 0) * 100) / 100 };
      });
  }, [pagamentos]);

  const proximos = useMemo(
    () =>
      abertas
        .filter((i) => {
          const d = i.estado.diasProxFechamento;
          return d !== null && d <= 5;
        })
        .sort(
          (a, b) =>
            (a.estado.diasProxFechamento ?? 99) -
            (b.estado.diasProxFechamento ?? 99),
        ),
    [abertas],
  );

  if (carregando) {
    return (
      <main className="max-w-2xl mx-auto px-5 pt-6">
        <Nav />
        <p className="text-muted text-sm py-10 text-center">Carregando…</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-5 pb-28 pt-6">
      <Nav />

      {/* Na rua */}
      <section className="bg-ink text-paper rounded-2xl p-6 mb-3">
        <p className="eyebrow text-paper/60">Dinheiro na rua</p>
        <p className="num text-4xl sm:text-5xl font-semibold mt-1 mb-4">{brl(m.naRua)}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-paper/10 rounded-xl px-3 py-2.5">
            <p className="text-[0.7rem] text-paper/60 mb-0.5">Produto a receber</p>
            <p className="num text-lg font-medium">{brl(m.produto)}</p>
          </div>
          <div className="bg-green/30 rounded-xl px-3 py-2.5">
            <p className="text-[0.7rem] text-paper/70 mb-0.5">Lucro em juros</p>
            <p className="num text-lg font-medium">{brl(m.juros)}</p>
          </div>
        </div>
      </section>

      {/* Cartões */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card
          icon={<TrendingUp size={16} className="text-green" />}
          label="Lucro projetado (próx. mês)"
          valor={brl(m.lucroProx)}
          nota="20% sobre os saldos atuais"
        />
        <Card
          icon={<Wallet size={16} className="text-ink-soft" />}
          label="Já recebido"
          valor={brl(m.jaRecebido)}
          nota="soma de todos os pagamentos"
        />
        <Card
          icon={<Users size={16} className="text-ink-soft" />}
          label="Clientes em aberto"
          valor={String(m.nClientes)}
        />
        <Card
          icon={<Receipt size={16} className="text-ink-soft" />}
          label="Compras em aberto"
          valor={String(m.nDividas)}
        />
      </div>

      {proximos.length > 0 && (
        <section className="bg-amber-soft border border-amber/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-amber" />
            <p className="eyebrow text-amber">Vencimentos próximos (5 dias)</p>
          </div>
          <ul className="space-y-2">
            {proximos.map((i) => {
              const d = i.estado.diasProxFechamento ?? 0;
              const quando =
                d === 0
                  ? 'fecha hoje'
                  : d === 1
                    ? 'fecha amanhã'
                    : `fecha em ${d} dias`;
              return (
                <li
                  key={i.divida.id}
                  className="flex items-center justify-between gap-3 bg-card rounded-xl px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {i.divida.pessoa}
                      {i.divida.empresa ? ` · ${i.divida.empresa}` : ''}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {i.divida.descricao || 'Compra'} · cobrar juros{' '}
                      {brl(i.estado.jurosProximo)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      d === 0 ? 'text-amber' : 'text-ink-soft'
                    }`}
                  >
                    {quando}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-[0.7rem] text-muted mt-2">
            No dia do fechamento, o aviso também chega no seu Telegram.
          </p>
        </section>
      )}

      {abertas.length === 0 ? (
        <p className="text-ink-soft text-center py-12">
          Sem dívidas em aberto. Cadastre uma compra na aba Cobranças.
        </p>
      ) : (
        <>
          {/* Composição */}
          <Bloco titulo="Composição do que está na rua">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={composicao}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {composicao.map((c, i) => (
                    <Cell key={i} fill={c.cor} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => brl(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Bloco>

          {/* Top clientes */}
          <Bloco titulo="Quanto cada cliente te deve">
            <ResponsiveContainer width="100%" height={Math.max(160, topClientes.length * 46)}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 8, right: 12 }}>
                <XAxis type="number" tickFormatter={(v) => brl(Number(v))} tick={{ fontSize: 11, fill: COR.muted }} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={92}
                  tick={{ fontSize: 12, fill: COR.ink }}
                  tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + '…' : v)}
                />
                <Tooltip formatter={(v: any) => brl(Number(v))} cursor={{ fill: '#00000008' }} />
                <Legend />
                <Bar dataKey="Produto" stackId="a" fill={COR.ink} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Juros" stackId="a" fill={COR.green} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Bloco>

          {/* Recebido por mês */}
          {recebidoMes.length > 0 && (
            <Bloco titulo="Recebido por mês">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recebidoMes} margin={{ left: 0, right: 8 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: COR.muted }} />
                  <YAxis tickFormatter={(v) => brl(Number(v))} tick={{ fontSize: 11, fill: COR.muted }} width={70} />
                  <Tooltip formatter={(v: any) => brl(Number(v))} cursor={{ fill: '#00000008' }} />
                  <Bar dataKey="valor" name="Recebido" fill={COR.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Bloco>
          )}

          {/* Tabela por cliente */}
          <Bloco titulo="Detalhe por cliente">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-left">
                    <th className="font-medium py-2 px-1">Cliente</th>
                    <th className="font-medium py-2 px-1 text-right">Produto</th>
                    <th className="font-medium py-2 px-1 text-right">Juros</th>
                    <th className="font-medium py-2 px-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.chave} className="border-t border-line">
                      <td className="py-2.5 px-1">
                        <p className="font-medium">{c.pessoa}</p>
                        {c.empresa && <p className="text-xs text-muted">{c.empresa}</p>}
                      </td>
                      <td className="py-2.5 px-1 text-right num">{brl(c.principal)}</td>
                      <td className="py-2.5 px-1 text-right num text-green">{brl(c.juros)}</td>
                      <td className="py-2.5 px-1 text-right num font-semibold">{brl(c.totalDevido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Bloco>
        </>
      )}
    </main>
  );
}

function Card({
  icon,
  label,
  valor,
  nota,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[0.7rem] text-ink-soft leading-tight">{label}</p>
      </div>
      <p className="num text-xl font-semibold">{valor}</p>
      {nota && <p className="text-[0.65rem] text-muted mt-0.5">{nota}</p>}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-2xl p-4 mb-3">
      <p className="eyebrow text-muted mb-3">{titulo}</p>
      {children}
    </section>
  );
}
