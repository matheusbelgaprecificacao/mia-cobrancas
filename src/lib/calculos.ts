import type {
  Divida,
  Pagamento,
  EstadoDivida,
  DividaComEstado,
  Cliente,
} from '@/types';

export const JUROS_PCT = 0.2;
export const CICLO_DIAS = 30;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---- Datas (YYYY-MM-DD em UTC, sem fuso) ----
export function hojeSP(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function parseISO(d: string): Date {
  return new Date(d + 'T00:00:00Z');
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDias(d: string, n: number): string {
  const dt = parseISO(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toISO(dt);
}
export function diffDias(a: string, b: string): number {
  return Math.floor((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

// ---- Motor de cálculo ----
export function calcular(
  divida: Divida,
  pagamentos: Pagamento[],
  hoje: string = hojeSP(),
): EstadoDivida {
  const jurosPct = divida.juros_pct ?? JUROS_PCT;
  const cicloDias = divida.ciclo_dias ?? CICLO_DIAS;
  const dias = Math.max(0, diffDias(divida.data_compra, hoje));
  const ciclosFechados = cicloDias > 0 ? Math.floor(dias / cicloDias) : 0;

  type Ev = { date: string; tipo: 'juros' | 'pag'; valor: number; ord: number };
  const eventos: Ev[] = [];
  for (let k = 1; k <= ciclosFechados; k++) {
    eventos.push({
      date: addDias(divida.data_compra, k * cicloDias),
      tipo: 'juros',
      valor: 0,
      ord: 0,
    });
  }
  for (const p of pagamentos) {
    eventos.push({ date: p.data, tipo: 'pag', valor: p.valor, ord: 1 });
  }
  eventos.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.ord - b.ord,
  );

  let P = round2(divida.valor_compra);
  let J = 0;
  let jurosPago = 0;

  for (const e of eventos) {
    if (e.tipo === 'juros') {
      J = round2(J + round2(P * jurosPct));
    } else {
      let pago = e.valor;
      const abateJuros = Math.min(pago, J);
      J = round2(J - abateJuros);
      jurosPago = round2(jurosPago + abateJuros);
      pago = round2(pago - abateJuros);
      const abateProduto = Math.min(pago, P);
      P = round2(P - abateProduto);
    }
  }

  const totalPago = round2(pagamentos.reduce((s, p) => s + p.valor, 0));
  const quitada = P <= 0.009 && J <= 0.009;
  const proxFechamento = quitada
    ? null
    : addDias(divida.data_compra, (ciclosFechados + 1) * cicloDias);
  const diasProxFechamento = proxFechamento ? diffDias(hoje, proxFechamento) : null;
  const fechaHoje =
    !quitada &&
    ciclosFechados >= 1 &&
    addDias(divida.data_compra, ciclosFechados * cicloDias) === hoje;

  return {
    principal: P,
    juros: J,
    total: round2(P + J),
    jurosProximo: round2(P * jurosPct),
    jurosPago,
    ciclosFechados,
    proxFechamento,
    diasProxFechamento,
    fechaHoje,
    totalPago,
    quitada,
  };
}

// ---- Agrupar por cliente ----
export function agruparPorCliente(itens: DividaComEstado[]): Cliente[] {
  const mapa = new Map<string, Cliente>();
  for (const it of itens) {
    const pessoa = it.divida.pessoa.trim();
    const empresa = it.divida.empresa?.trim() || null;
    const chave = `${pessoa.toLowerCase()}|${(empresa ?? '').toLowerCase()}`;
    let c = mapa.get(chave);
    if (!c) {
      c = {
        chave,
        pessoa,
        empresa,
        telefone: null,
        dividas: [],
        totalDevido: 0,
        principal: 0,
        juros: 0,
      };
      mapa.set(chave, c);
    }
    c.dividas.push(it);
    if (!c.telefone && it.divida.telefone) c.telefone = it.divida.telefone;
    c.totalDevido = round2(c.totalDevido + it.estado.total);
    c.principal = round2(c.principal + it.estado.principal);
    c.juros = round2(c.juros + it.estado.juros);
  }
  return Array.from(mapa.values()).sort((a, b) => b.totalDevido - a.totalDevido);
}

// ---- Formatação ----
export function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function dataBR(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
export function dataBRcompleta(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ---- WhatsApp ----
export function digitosTelefone(tel: string): string {
  return tel.replace(/\D/g, '');
}
export function linkWhatsApp(telefone: string, texto: string): string {
  let n = digitosTelefone(telefone);
  if (n.length > 0 && n.length <= 11) n = '55' + n; // adiciona DDI Brasil se faltar
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}
export function mensagemCobranca(cliente: Cliente): string {
  const linhas: string[] = [];
  linhas.push('Bom dia! 👋');
  linhas.push('');
  linhas.push(`Segue o valor a pagar: *${brl(cliente.juros)}*`);
  linhas.push('');
  linhas.push('Essa é a chave pix, é só copiar e colar:');
  linhas.push('Matheus Souza Belga');
  linhas.push('Banco C6 Bank');
  linhas.push('Chave Pix: Celular');
  linhas.push('👉 21982581421');
  linhas.push('');
  linhas.push('ASSIM QUE FIZER O PIX ME ENVIE O COMPROVANTE ❗❗❗');
  linhas.push('');
  linhas.push('🔑 Chave pix (copia e cola)');
  linhas.push('👉 21982581421');
  linhas.push('');
  linhas.push('OBS: confirmar os dados antes do envio do valor.');
  return linhas.join('\n');
}
