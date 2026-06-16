'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Wallet,
  Receipt,
} from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import {
  calcular,
  agruparPorCliente,
  brl,
  dataBRcompleta,
  hojeSP,
  JUROS_PCT,
} from '@/lib/calculos';
import type { Divida, Pagamento, DividaComEstado } from '@/types';

type Aba = 'aberto' | 'quitadas';

export default function Painel() {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>('aberto');
  const [novaCompra, setNovaCompra] = useState(false);
  const [compraCliente, setCompraCliente] = useState<{
    pessoa: string;
    empresa: string;
  } | null>(null);
  const [pagando, setPagando] = useState<DividaComEstado | null>(null);
  const hoje = hojeSP();

  async function carregar() {
    setCarregando(true);
    const [d, p] = await Promise.all([
      supabase.from('dividas').select('*').order('data_compra', { ascending: false }),
      supabase.from('pagamentos').select('*'),
    ]);
    setDividas((d.data ?? []) as Divida[]);
    setPagamentos((p.data ?? []) as Pagamento[]);
    setCarregando(false);
  }
  useEffect(() => {
    carregar();
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
  const quitadas = useMemo(() => itens.filter((i) => i.estado.quitada), [itens]);
  const clientes = useMemo(() => agruparPorCliente(abertas), [abertas]);

  const totais = useMemo(() => {
    const naRua = abertas.reduce((s, i) => s + i.estado.total, 0);
    const produto = abertas.reduce((s, i) => s + i.estado.principal, 0);
    const juros = abertas.reduce((s, i) => s + i.estado.juros, 0);
    return { naRua, produto, juros };
  }, [abertas]);

  async function excluir(d: Divida) {
    if (!confirm(`Excluir a compra de ${d.pessoa} (${brl(d.valor_compra)})?`)) return;
    await supabase.from('dividas').delete().eq('id', d.id);
    carregar();
  }

  return (
    <main className="max-w-2xl mx-auto px-5 pb-28 pt-6">
      <Nav />

      {/* Hero */}
      <section className="bg-ink text-paper rounded-2xl p-6 mb-3">
        <p className="eyebrow text-paper/60">Dinheiro na rua</p>
        <p className="num text-4xl sm:text-5xl font-semibold mt-1 mb-4">
          {brl(totais.naRua)}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-paper/10 rounded-xl px-3 py-2.5">
            <p className="text-[0.7rem] text-paper/60 mb-0.5">Produto a receber</p>
            <p className="num text-lg font-medium">{brl(totais.produto)}</p>
          </div>
          <div className="bg-green/30 rounded-xl px-3 py-2.5">
            <p className="text-[0.7rem] text-paper/70 mb-0.5">Juros acumulado</p>
            <p className="num text-lg font-medium">{brl(totais.juros)}</p>
          </div>
        </div>
      </section>

      <button
        onClick={() => setNovaCompra(true)}
        className="w-full bg-green text-white rounded-2xl py-3.5 font-medium flex items-center justify-center gap-2 hover:opacity-90 transition mb-6"
      >
        <Plus size={18} /> Nova compra a prazo
      </button>

      {/* Abas */}
      <div className="flex gap-1 mb-3 bg-card border border-line rounded-xl p-1">
        {(
          [
            ['aberto', `Em aberto${clientes.length ? ` (${clientes.length})` : ''}`],
            ['quitadas', 'Quitadas'],
          ] as [Aba, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex-1 text-sm rounded-lg py-2 transition ${
              aba === id ? 'bg-ink text-paper font-medium' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-muted text-sm py-10 text-center">Carregando…</p>
      ) : aba === 'aberto' ? (
        clientes.length === 0 ? (
          <Vazio onNova={() => setNovaCompra(true)} />
        ) : (
          <div className="space-y-2">
            {clientes.map((c) => (
              <CardCliente
                key={c.chave}
                cliente={c}
                onPagar={(i) => setPagando(i)}
                onExcluir={excluir}
                onAdicionarCompra={(pessoa, empresa) =>
                  setCompraCliente({ pessoa, empresa: empresa ?? '' })
                }
              />
            ))}
          </div>
        )
      ) : quitadas.length === 0 ? (
        <p className="text-ink-soft text-center py-12">Nada quitado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {quitadas.map((i) => (
            <li
              key={i.divida.id}
              className="bg-card border border-line rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {i.divida.pessoa}
                  {i.divida.empresa ? ` · ${i.divida.empresa}` : ''}
                </p>
                <p className="text-sm text-ink-soft truncate">
                  {i.divida.descricao || 'Compra'} · {brl(i.divida.valor_compra)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-green text-sm font-medium">Quitada</p>
                <p className="num text-xs text-muted">pago {brl(i.estado.totalPago)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(novaCompra || compraCliente) && (
        <FormCompra
          pessoaInicial={compraCliente?.pessoa ?? ''}
          empresaInicial={compraCliente?.empresa ?? ''}
          fixarCliente={!!compraCliente}
          onFechar={() => {
            setNovaCompra(false);
            setCompraCliente(null);
          }}
          onSalvo={() => {
            setNovaCompra(false);
            setCompraCliente(null);
            carregar();
          }}
        />
      )}
      {pagando && (
        <FormPagamento
          item={pagando}
          onFechar={() => setPagando(null)}
          onSalvo={() => {
            setPagando(null);
            carregar();
          }}
        />
      )}
    </main>
  );
}

function CardCliente({
  cliente,
  onPagar,
  onExcluir,
  onAdicionarCompra,
}: {
  cliente: ReturnType<typeof agruparPorCliente>[number];
  onPagar: (i: DividaComEstado) => void;
  onExcluir: (d: Divida) => void;
  onAdicionarCompra: (pessoa: string, empresa: string | null) => void;
}) {
  const [aberto, setAberto] = useState(cliente.dividas.length <= 2);

  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-paper/50 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          {aberto ? (
            <ChevronDown size={18} className="text-muted shrink-0" />
          ) : (
            <ChevronRight size={18} className="text-muted shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">{cliente.pessoa}</p>
            {cliente.empresa && (
              <p className="text-xs text-muted truncate">{cliente.empresa}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 pl-3">
          <p className="num font-semibold">{brl(cliente.totalDevido)}</p>
          <p className="text-[0.7rem] text-muted">
            {cliente.dividas.length} compra{cliente.dividas.length > 1 ? 's' : ''}
          </p>
        </div>
      </button>

      {aberto && (
        <div className="border-t border-line divide-y divide-line">
          {cliente.dividas.map((i) => (
            <LinhaDivida
              key={i.divida.id}
              item={i}
              onPagar={() => onPagar(i)}
              onExcluir={() => onExcluir(i.divida)}
            />
          ))}
          <button
            onClick={() => onAdicionarCompra(cliente.pessoa, cliente.empresa)}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-green font-medium hover:bg-green-soft transition"
          >
            <Plus size={15} /> Adicionar compra deste cliente
          </button>
        </div>
      )}
    </div>
  );
}

function LinhaDivida({
  item,
  onPagar,
  onExcluir,
}: {
  item: DividaComEstado;
  onPagar: () => void;
  onExcluir: () => void;
}) {
  const [hist, setHist] = useState(false);
  const { divida: d, estado: e, pagamentos } = item;

  const fechamento =
    e.diasProxFechamento === 0
      ? 'fecha hoje'
      : e.diasProxFechamento === 1
        ? 'fecha amanhã'
        : `fecha em ${e.diasProxFechamento} dias`;

  return (
    <div className="p-4 bg-paper/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{d.descricao || 'Compra'}</p>
          <p className="text-xs text-muted mt-0.5">
            pegou {dataBRcompleta(d.data_compra)} · {brl(d.valor_compra)} ·{' '}
            <span className={e.fechaHoje ? 'text-amber font-medium' : ''}>{fechamento}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="num font-semibold">{brl(e.total)}</p>
        </div>
      </div>

      {/* breakdown */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Mini label="Produto" valor={brl(e.principal)} />
        <Mini label="Juros aberto" valor={brl(e.juros)} destaque />
        <Mini label={`Juros do mês (${Math.round(JUROS_PCT * 100)}%)`} valor={brl(e.jurosProximo)} />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onPagar}
          className="text-sm bg-green text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition inline-flex items-center gap-1.5"
        >
          <Wallet size={15} /> Pagamento
        </button>
        {pagamentos.length > 0 && (
          <button
            onClick={() => setHist((v) => !v)}
            className="text-sm text-ink-soft hover:text-ink px-3 py-1.5 rounded-lg hover:bg-card transition inline-flex items-center gap-1.5"
          >
            <Receipt size={15} /> {pagamentos.length} pagto{pagamentos.length > 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={onExcluir}
          className="text-muted hover:text-amber px-2 py-1.5 rounded-lg hover:bg-amber-soft transition ml-auto"
          title="Excluir compra"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {hist && pagamentos.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-line space-y-1">
          {[...pagamentos]
            .sort((a, b) => (a.data < b.data ? 1 : -1))
            .map((p) => (
              <li key={p.id} className="flex justify-between text-sm text-ink-soft">
                <span>{dataBRcompleta(p.data)}</span>
                <span className="num">{brl(p.valor)}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function Mini({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className={`rounded-lg px-2.5 py-2 ${destaque ? 'bg-amber-soft' : 'bg-card'}`}>
      <p className="text-[0.62rem] text-muted leading-tight">{label}</p>
      <p className={`num text-sm font-medium ${destaque ? 'text-amber' : ''}`}>{valor}</p>
    </div>
  );
}

function Vazio({ onNova }: { onNova: () => void }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-ink-soft mb-4">Nenhuma compra a prazo em aberto.</p>
      <button onClick={onNova} className="text-green font-medium inline-flex items-center gap-1.5">
        <Plus size={16} /> Cadastrar a primeira
      </button>
    </div>
  );
}

function FormCompra({
  onFechar,
  onSalvo,
  pessoaInicial = '',
  empresaInicial = '',
  fixarCliente = false,
}: {
  onFechar: () => void;
  onSalvo: () => void;
  pessoaInicial?: string;
  empresaInicial?: string;
  fixarCliente?: boolean;
}) {
  const [pessoa, setPessoa] = useState(pessoaInicial);
  const [empresa, setEmpresa] = useState(empresaInicial);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataCompra, setDataCompra] = useState(hojeSP());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar() {
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    if (!pessoa.trim()) return setErro('Informe o nome da pessoa.');
    if (!v || v <= 0) return setErro('Informe o valor do produto.');
    if (!dataCompra) return setErro('Informe a data da compra.');

    setSalvando(true);
    const { error } = await supabase.from('dividas').insert({
      pessoa: pessoa.trim(),
      empresa: empresa.trim() || null,
      descricao: descricao.trim() || null,
      valor_compra: v,
      data_compra: dataCompra,
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    onSalvo();
  }

  return (
    <Modal
      titulo={fixarCliente ? 'Nova compra' : 'Nova compra a prazo'}
      onFechar={onFechar}
    >
      {fixarCliente ? (
        <div className="bg-paper border border-line rounded-xl px-3 py-2.5 text-sm">
          <span className="text-muted">Cliente: </span>
          <span className="font-medium">
            {pessoaInicial}
            {empresaInicial ? ` · ${empresaInicial}` : ''}
          </span>
        </div>
      ) : (
        <>
          <Campo label="Nome da pessoa">
            <input value={pessoa} onChange={(e) => setPessoa(e.target.value)} placeholder="Ex: João Silva" className="campo" autoFocus />
          </Campo>
          <Campo label="Empresa (opcional)">
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: Mercadinho do João" className="campo" />
          </Campo>
        </>
      )}
      <Campo label="Produto / pedido (opcional)">
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: 2 caixas de organizadores" className="campo" autoFocus={fixarCliente} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Valor do produto (R$)">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className="campo num" />
        </Campo>
        <Campo label="Data da compra">
          <input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} className="campo" />
        </Campo>
      </div>
      <p className="text-xs text-muted">
        O 1º fechamento de juros (20%) cai 30 dias depois da compra.
      </p>
      {erro && <p className="text-amber text-sm">{erro}</p>}
      <button onClick={salvar} disabled={salvando} className="w-full bg-green text-white rounded-xl py-3 font-medium hover:opacity-90 transition disabled:opacity-50">
        {salvando ? 'Salvando…' : 'Salvar compra'}
      </button>
    </Modal>
  );
}

function FormPagamento({
  item,
  onFechar,
  onSalvo,
}: {
  item: DividaComEstado;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const { divida: d, estado: e } = item;
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeSP());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar() {
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    if (!v || v <= 0) return setErro('Informe o valor pago.');
    if (!data) return setErro('Informe a data.');

    setSalvando(true);
    const { error } = await supabase.from('pagamentos').insert({
      divida_id: d.id,
      valor: v,
      data,
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    onSalvo();
  }

  return (
    <Modal titulo="Registrar pagamento" onFechar={onFechar}>
      <div className="bg-paper border border-line rounded-xl p-3 text-sm space-y-1">
        <p className="font-medium">
          {d.pessoa}
          {d.empresa ? ` · ${d.empresa}` : ''}
        </p>
        <div className="flex justify-between text-ink-soft">
          <span>Produto devedor</span>
          <span className="num">{brl(e.principal)}</span>
        </div>
        <div className="flex justify-between text-amber">
          <span>Juros em aberto</span>
          <span className="num">{brl(e.juros)}</span>
        </div>
        <div className="flex justify-between font-medium border-t border-line pt-1 mt-1">
          <span>Total devido</span>
          <span className="num">{brl(e.total)}</span>
        </div>
      </div>
      <p className="text-xs text-muted">
        O pagamento abate primeiro o juros, depois o produto. Para zerar de vez:{' '}
        <button
          type="button"
          className="text-green font-medium underline"
          onClick={() => setValor(e.total.toFixed(2).replace('.', ','))}
        >
          {brl(e.total)}
        </button>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Valor pago (R$)">
          <input value={valor} onChange={(ev) => setValor(ev.target.value)} inputMode="decimal" placeholder="0,00" className="campo num" autoFocus />
        </Campo>
        <Campo label="Data do pagamento">
          <input type="date" value={data} onChange={(ev) => setData(ev.target.value)} className="campo" />
        </Campo>
      </div>
      {erro && <p className="text-amber text-sm">{erro}</p>}
      <button onClick={salvar} disabled={salvando} className="w-full bg-green text-white rounded-xl py-3 font-medium hover:opacity-90 transition disabled:opacity-50">
        {salvando ? 'Salvando…' : 'Salvar pagamento'}
      </button>
    </Modal>
  );
}

function Modal({
  titulo,
  children,
  onFechar,
}: {
  titulo: string;
  children: React.ReactNode;
  onFechar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-5"
      onClick={onFechar}
    >
      <div
        className="bg-paper w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto space-y-3"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{titulo}</h2>
          <button onClick={onFechar} className="text-muted hover:text-ink p-1">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow text-muted block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
