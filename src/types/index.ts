export interface Divida {
  id: string;
  pessoa: string;
  empresa: string | null;
  descricao: string | null;
  valor_compra: number;
  data_compra: string; // 'YYYY-MM-DD'
  criado_em: string;
}

export interface Pagamento {
  id: string;
  divida_id: string;
  valor: number;
  data: string; // 'YYYY-MM-DD'
  criado_em: string;
}

// Estado calculado de uma dívida num dado dia.
export interface EstadoDivida {
  principal: number;        // saldo de produto ainda devido
  juros: number;            // juros em aberto (acumulado)
  total: number;            // principal + juros
  jurosProximo: number;     // 20% sobre o principal atual
  ciclosFechados: number;   // quantos fechamentos de 30 dias já passaram
  proxFechamento: string | null; // data do próximo fechamento
  diasProxFechamento: number | null;
  fechaHoje: boolean;       // hoje fechou um ciclo (entrou juros novo)
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
  dividas: DividaComEstado[];
  totalDevido: number;
  principal: number;
  juros: number;
}
