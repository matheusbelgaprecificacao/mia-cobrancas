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
  MessageCircle,
  Pencil,
  Search,
  Phone,
} from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/lib/supabase';
import {
  calcular,
  agruparPorCliente,
  brl,
  dataBRcompleta,
  hojeSP,
  linkWhatsApp,
  mensagemCobranca,
  JUROS_PCT,
  CICLO_DIAS,
} from '@/lib/calculos';
import type { Divida, Pagamento, DividaComEstado, Cliente } from '@/types';

type Aba = 'aberto' | 'quitadas';

export default function Painel() {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>('aberto');
  const [busca, setBusca] = useState('');
  const [novaCompra, setNovaCompra] = useState(false);
  const [compraCliente, setCompraCliente] = useState<{
    pessoa: string;
    empresa: string;
    telefone: string;
  } | null>(null);
  const [editandoDivida, setEditandoDivida] = useState<Divida | null>(null);
  const [pagando, setPagando] = useState<DividaComEstado | null>(null);
  const [editandoPagamento, setEditandoPagamento] = useState<{
    pagamento: Pagamento;
    item: DividaComEstado;
  } | null>(null);
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

  const clientesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.pessoa.toLowerCase().includes(q) ||
        (c.empresa ?? '').toLowerCase().includes(q),
    );
  }, [clientes, busca]);

  async function excluirDivida(d: Divida) {
    if (!confirm(`Excluir a compra de ${d.pessoa} (${brl(d.valor_compra)})?`)) return;
    await supabase.from('dividas').delete().eq('id', d.id);
    carregar();
  }
  async function excluirPagamento(p: Pagamento) {
    if (!confirm(`Excluir o pagamento de ${brl(p.valor)}?`)) return;
    await supabase.from('pagamentos').delete().eq('id', p.id);
    carregar();
  }

  function fecharForms() {
    setNovaCompra(false);
    setCompraCliente(null);
    setEditandoDivida(null);
    setPagando(null);
    setEditandoPagamento(null);
  }
  function recarregarEFechar() {
    fecharForms();
    carregar();
  }

  return (
    <main className="max-w-2xl mx-auto px-5 pb-28 pt-6">
      <Nav />

      <button
        onClick={() => setNovaCompra(true)}
        className="w-full bg-green text-white rounded-2xl py-3.5 font-medium flex items-center justify-center gap-2 hover:opacity-90 transition mb-4"
      >
        <Plus size={18} /> Nova compra a prazo
      </button>

      {/* Busca */}
      <div className="flex items-center gap-2 border border-line rounded-xl px-3 py-2 bg-card mb-3">
        <Search size={16} className="text-muted shrink-0" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente…"
          className="bg-transparent outline-none w-full text-sm text-ink"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="text-muted hover:text-ink">
            <X size={15} />
          </button>
        )}
      </div>

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
        clientesFiltrados.length === 0 ? (
          busca ? (
            <p className="text-ink-soft text-center py-12">Nenhum cliente encontrado.</p>
          ) : (
            <Vazio onNova={() => setNovaCompra(true)} />
          )
        ) : (
          <div className="space-y-2">
            {clientesFiltrados.map((c) => (
              <CardCliente
                key={c.chave}
                cliente={c}
                onPagar={(i) => setPagando(i)}
                onExcluir={excluirDivida}
                onEditarDivida={(d) => setEditandoDivida(d)}
                onEditarPagamento={(pagamento, item) =>
                  setEditandoPagamento({ pagamento, item })
                }
                onExcluirPagamento={excluirPagamento}
                onAdicionarCompra={(pessoa, empresa, telefone) =>
                  setCompraCliente({
                    pessoa,
                    empresa: empresa ?? '',
                    telefone: telefone ?? '',
                  })
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

      {(novaCompra || compraCliente || editandoDivida) && (
        <FormCompra
          dividaEditar={editandoDivida}
          pessoaInicial={compraCliente?.pessoa ?? ''}
          empresaInicial={compraCliente?.empresa ?? ''}
          telefoneInicial={compraCliente?.telefone ?? ''}
          fixarCliente={!!compraCliente}
          onFechar={fecharForms}
          onSalvo={recarregarEFechar}
        />
      )}
      {pagando && (
        <FormPagamento
          item={pagando}
          onFechar={fecharForms}
          onSalvo={recarregarEFechar}
        />
      )}
      {editandoPagamento && (
        <FormPagamento
          item={editandoPagamento.item}
          pagamentoEditar={editandoPagamento.pagamento}
          onFechar={fecharForms}
          onSalvo={recarregarEFechar}
        />
      )}
    </main>
  );
}

function CardCliente({
  cliente,
  onPagar,
  onExcluir,
  onEditarDivida,
  onEditarPagamento,
  onExcluirPagamento,
  onAdicionarCompra,
}: {
  cliente: Cliente;
  onPagar: (i: DividaComEstado) => void;
  onExcluir: (d: Divida) => void;
  onEditarDivida: (d: Divida) => void;
  onEditarPagamento: (p: Pagamento, item: DividaComEstado) => void;
  onExcluirPagamento: (p: Pagamento) => void;
  onAdicionarCompra: (pessoa: string, empresa: string | null, telefone: string | null) => void;
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
        <div className="border-t border-line">
          {/* Barra de cobrança */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-paper/40 border-b border-line">
            {cliente.telefone ? (
              <a
                href={linkWhatsApp(cliente.telefone, mensagemCobranca(cliente))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm bg-green text-white rounded-lg py-2 font-medium inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition"
              >
                <MessageCircle size={15} /> Cobrar no WhatsApp
              </a>
            ) : (
              <span className="flex-1 text-xs text-muted inline-flex items-center gap-1.5">
                <Phone size={13} /> Sem telefone — adicione editando uma compra
              </span>
            )}
          </div>

          <div className="divide-y divide-line">
            {cliente.dividas.map((i) => (
              <LinhaDivida
                key={i.divida.id}
                item={i}
                onPagar={() => onPagar(i)}
                onExcluir={() => onExcluir(i.divida)}
                onEditar={() => onEditarDivida(i.divida)}
                onEditarPagamento={(p) => onEditarPagamento(p, i)}
                onExcluirPagamento={onExcluirPagamento}
              />
            ))}
            <button
              onClick={() =>
                onAdicionarCompra(cliente.pessoa, cliente.empresa, cliente.telefone)
              }
              className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-green font-medium hover:bg-green-soft transition"
            >
              <Plus size={15} /> Adicionar compra deste cliente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinhaDivida({
  item,
  onPagar,
  onExcluir,
  onEditar,
  onEditarPagamento,
  onExcluirPagamento,
}: {
  item: DividaComEstado;
  onPagar: () => void;
  onExcluir: () => void;
  onEditar: () => void;
  onEditarPagamento: (p: Pagamento) => void;
  onExcluirPagamento: (p: Pagamento) => void;
}) {
  const [hist, setHist] = useState(false);
  const { divida: d, estado: e, pagamentos } = item;

  const fechamento =
    e.diasProxFechamento === 0
      ? 'fecha hoje'
      : e.diasProxFechamento === 1
        ? 'fecha amanhã'
        : `fecha em ${e.diasProxFechamento} dias`;

  const pctMes = Math.round((d.juros_pct ?? JUROS_PCT) * 100);
  const personalizado =
    (d.juros_pct ?? JUROS_PCT) !== JUROS_PCT || (d.ciclo_dias ?? CICLO_DIAS) !== CICLO_DIAS;

  return (
    <div className="p-4 bg-paper/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{d.descricao || 'Compra'}</p>
          <p className="text-xs text-muted mt-0.5">
            pegou {dataBRcompleta(d.data_compra)} · {brl(d.valor_compra)} ·{' '}
            <span className={e.fechaHoje ? 'text-amber font-medium' : ''}>{fechamento}</span>
          </p>
          {personalizado && (
            <p className="text-[0.7rem] text-muted mt-0.5">
              {pctMes}% a cada {d.ciclo_dias ?? CICLO_DIAS} dias
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="num font-semibold">{brl(e.total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Mini label="Produto" valor={brl(e.principal)} />
        <Mini label="Juros aberto" valor={brl(e.juros)} destaque />
        <Mini label={`Juros do mês (${pctMes}%)`} valor={brl(e.jurosProximo)} />
      </div>

      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <button
          onClick={onPagar}
          className="text-sm bg-green text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition inline-flex items-center gap-1.5"
        >
          <Wallet size={15} /> Pagamento
        </button>
        <button
          onClick={onEditar}
          className="text-sm text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-card transition inline-flex items-center gap-1.5"
        >
          <Pencil size={14} /> Editar
        </button>
        {pagamentos.length > 0 && (
          <button
            onClick={() => setHist((v) => !v)}
            className="text-sm text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-card transition inline-flex items-center gap-1.5"
          >
            <Receipt size={14} /> {pagamentos.length} pagto{pagamentos.length > 1 ? 's' : ''}
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
        <ul className="mt-3 pt-3 border-t border-line space-y-1.5">
          {[...pagamentos]
            .sort((a, b) => (a.data < b.data ? 1 : -1))
            .map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{dataBRcompleta(p.data)}</span>
                <div className="flex items-center gap-2">
                  <span className="num">{brl(p.valor)}</span>
                  <button
                    onClick={() => onEditarPagamento(p)}
                    className="text-muted hover:text-ink"
                    title="Editar pagamento"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onExcluirPagamento(p)}
                    className="text-muted hover:text-amber"
                    title="Excluir pagamento"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
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
  dividaEditar = null,
  pessoaInicial = '',
  empresaInicial = '',
  telefoneInicial = '',
  fixarCliente = false,
}: {
  onFechar: () => void;
  onSalvo: () => void;
  dividaEditar?: Divida | null;
  pessoaInicial?: string;
  empresaInicial?: string;
  telefoneInicial?: string;
  fixarCliente?: boolean;
}) {
  const ed = dividaEditar;
  const [pessoa, setPessoa] = useState(ed?.pessoa ?? pessoaInicial);
  const [empresa, setEmpresa] = useState(ed?.empresa ?? empresaInicial);
  const [telefone, setTelefone] = useState(ed?.telefone ?? telefoneInicial);
  const [descricao, setDescricao] = useState(ed?.descricao ?? '');
  const [valor, setValor] = useState(ed ? String(ed.valor_compra).replace('.', ',') : '');
  const [dataCompra, setDataCompra] = useState(ed?.data_compra ?? hojeSP());
  const [observacoes, setObservacoes] = useState(ed?.observacoes ?? '');
  const [jurosPct, setJurosPct] = useState(
    String(Math.round((ed?.juros_pct ?? JUROS_PCT) * 100)),
  );
  const [cicloDias, setCicloDias] = useState(String(ed?.ciclo_dias ?? CICLO_DIAS));
  const [avancado, setAvancado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const titulo = ed ? 'Editar compra' : fixarCliente ? 'Nova compra' : 'Nova compra a prazo';

  async function salvar() {
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    const jp = parseFloat(jurosPct.replace(',', '.'));
    const cd = parseInt(cicloDias, 10);
    if (!pessoa.trim()) return setErro('Informe o nome da pessoa.');
    if (!v || v <= 0) return setErro('Informe o valor do produto.');
    if (!dataCompra) return setErro('Informe a data da compra.');
    if (isNaN(jp) || jp < 0) return setErro('Juros inválido.');
    if (isNaN(cd) || cd < 1) return setErro('Prazo inválido.');

    const dados = {
      pessoa: pessoa.trim(),
      empresa: empresa.trim() || null,
      telefone: telefone.trim() || null,
      descricao: descricao.trim() || null,
      valor_compra: v,
      data_compra: dataCompra,
      observacoes: observacoes.trim() || null,
      juros_pct: jp / 100,
      ciclo_dias: cd,
    };

    setSalvando(true);
    const { error } = ed
      ? await supabase.from('dividas').update(dados).eq('id', ed.id)
      : await supabase.from('dividas').insert(dados);
    setSalvando(false);
    if (error) return setErro(error.message);
    onSalvo();
  }

  const clienteFixo = fixarCliente && !ed;

  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      {clienteFixo ? (
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
            <input value={pessoa} onChange={(e) => setPessoa(e.target.value)} placeholder="Ex: João Silva" className="campo" autoFocus={!ed} />
          </Campo>
          <Campo label="Empresa (opcional)">
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex: Mercadinho do João" className="campo" />
          </Campo>
        </>
      )}
      <Campo label="Telefone / WhatsApp (opcional)">
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="Ex: 21 99999-9999" className="campo" />
      </Campo>
      <Campo label="Produto / pedido (opcional)">
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: 2 caixas de organizadores" className="campo" autoFocus={clienteFixo} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Valor do produto (R$)">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className="campo num" />
        </Campo>
        <Campo label="Data da compra">
          <input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} className="campo" />
        </Campo>
      </div>

      <button
        type="button"
        onClick={() => setAvancado((v) => !v)}
        className="text-xs text-ink-soft hover:text-ink inline-flex items-center gap-1"
      >
        {avancado ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Opções avançadas (juros e prazo)
      </button>

      {avancado && (
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Juros ao mês (%)">
            <input value={jurosPct} onChange={(e) => setJurosPct(e.target.value)} inputMode="decimal" className="campo num" />
          </Campo>
          <Campo label="Prazo (dias)">
            <input value={cicloDias} onChange={(e) => setCicloDias(e.target.value)} inputMode="numeric" className="campo num" />
          </Campo>
        </div>
      )}

      <Campo label="Observações (opcional)">
        <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex: paga sempre dia 10" className="campo" />
      </Campo>

      {!ed && (
        <p className="text-xs text-muted">
          O 1º fechamento de juros cai {cicloDias || CICLO_DIAS} dias depois da compra.
        </p>
      )}
      {erro && <p className="text-amber text-sm">{erro}</p>}
      <button onClick={salvar} disabled={salvando} className="w-full bg-green text-white rounded-xl py-3 font-medium hover:opacity-90 transition disabled:opacity-50">
        {salvando ? 'Salvando…' : ed ? 'Salvar alterações' : 'Salvar compra'}
      </button>
    </Modal>
  );
}

function FormPagamento({
  item,
  onFechar,
  onSalvo,
  pagamentoEditar = null,
}: {
  item: DividaComEstado;
  onFechar: () => void;
  onSalvo: () => void;
  pagamentoEditar?: Pagamento | null;
}) {
  const { divida: d, estado: e } = item;
  const ep = pagamentoEditar;
  const [valor, setValor] = useState(ep ? String(ep.valor).replace('.', ',') : '');
  const [data, setData] = useState(ep?.data ?? hojeSP());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar() {
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    if (!v || v <= 0) return setErro('Informe o valor pago.');
    if (!data) return setErro('Informe a data.');

    setSalvando(true);
    const { error } = ep
      ? await supabase.from('pagamentos').update({ valor: v, data }).eq('id', ep.id)
      : await supabase.from('pagamentos').insert({ divida_id: d.id, valor: v, data });
    setSalvando(false);
    if (error) return setErro(error.message);
    onSalvo();
  }

  return (
    <Modal titulo={ep ? 'Editar pagamento' : 'Registrar pagamento'} onFechar={onFechar}>
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
      {!ep && (
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
      )}

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
        {salvando ? 'Salvando…' : ep ? 'Salvar alterações' : 'Salvar pagamento'}
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
