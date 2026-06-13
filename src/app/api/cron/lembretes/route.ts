import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarTelegram } from '@/lib/telegram';
import { calcular, brl, dataBR, hojeSP } from '@/lib/calculos';
import type { Divida, Pagamento, DividaComEstado } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  }

  const hoje = hojeSP();

  const [dRes, pRes] = await Promise.all([
    supabase.from('dividas').select('*'),
    supabase.from('pagamentos').select('*'),
  ]);
  if (dRes.error) return NextResponse.json({ erro: dRes.error.message }, { status: 500 });
  if (pRes.error) return NextResponse.json({ erro: pRes.error.message }, { status: 500 });

  const dividas = (dRes.data ?? []) as Divida[];
  const pagamentos = (pRes.data ?? []) as Pagamento[];
  const porDivida = new Map<string, Pagamento[]>();
  for (const p of pagamentos) {
    const arr = porDivida.get(p.divida_id) ?? [];
    arr.push(p);
    porDivida.set(p.divida_id, arr);
  }

  const itens: DividaComEstado[] = dividas.map((d) => ({
    divida: d,
    pagamentos: porDivida.get(d.id) ?? [],
    estado: calcular(d, porDivida.get(d.id) ?? [], hoje),
  }));

  const abertas = itens.filter((i) => !i.estado.quitada);
  const fechamHoje = abertas.filter((i) => i.estado.fechaHoje);

  const naRua = abertas.reduce((s, i) => s + i.estado.total, 0);
  const totalProduto = abertas.reduce((s, i) => s + i.estado.principal, 0);
  const totalJuros = abertas.reduce((s, i) => s + i.estado.juros, 0);

  const linhas: string[] = [];
  linhas.push(`☀️ <b>Cobranças Mia · ${dataBR(hoje)}</b>`);
  linhas.push('');

  if (fechamHoje.length > 0) {
    linhas.push('🔔 <b>Fecha hoje — hora de cobrar</b>');
    for (const i of fechamHoje) {
      const quem = i.divida.empresa
        ? `${i.divida.pessoa} (${i.divida.empresa})`
        : i.divida.pessoa;
      const prod = i.divida.descricao ? ` — ${i.divida.descricao}` : '';
      linhas.push(`• <b>${quem}</b>${prod}`);
      linhas.push(
        `   produto ${brl(i.estado.principal)} · juros ${brl(i.estado.juros)} · total <b>${brl(i.estado.total)}</b>`,
      );
      linhas.push(`   cobrar pelo menos os juros: <b>${brl(i.estado.juros)}</b>`);
    }
    linhas.push('');
  } else {
    linhas.push('✅ Nenhuma cobrança fecha hoje.');
    linhas.push('');
  }

  linhas.push('— — —');
  linhas.push(`💰 <b>Na rua:</b> ${brl(naRua)} (${abertas.length} dívidas)`);
  linhas.push(`📦 Produto: ${brl(totalProduto)} · 📈 Juros: ${brl(totalJuros)}`);

  try {
    await enviarTelegram(linhas.join('\n'));
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fecha_hoje: fechamHoje.length,
    abertas: abertas.length,
    na_rua: naRua,
  });
}
