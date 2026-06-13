export interface Divida {
  id: string;
  pessoa: string;
  empresa: string | null;
  descricao: string | null;
  valor_compra: number;
  data_compra: string; // 'YYYY-MM-DD'
  telefone: string | null;
  observacoes: string | null;
  juros_pct: number | null;  // ex: 0.20 = 20% ao mês
  ciclo_dias: number | null; // ex: 30
  criado_em: string;
}

export interface Pagamento {
  id: string;
  divida_id: string;
  valor: number;
  data: string; // 'YYYY-MM-DD'
  criado_em: string;
}

export interface EstadoDivida {
  principal: number;
  juros: number;
  total: number;
  jurosProximo: number;
  jurosPago: number;       // juros já recebido (lucro realizado)
  ciclosFechados: number;
  proxFechamento: string | null;
  diasProxFechamento: number | null;
  fechaHoje: boolean;
  totalPago: number;
  quitada: boolean;
}

export interface DividaComEstado {
  divida: Divida;
  pagamentos: Pagamento[];
  estado: EstadoDivida;
}

export interface Cliente {
  chave: string;
  pessoa: string;
  empresa: string | null;
  telefone: string | null;
  dividas: DividaComEstado[];
  totalDevido: number;
  principal: number;
  juros: number;
}
