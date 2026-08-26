export const DATA_DICTIONARY = [
  "filial", "número da NF", "série", "data de emissão", "data do movimento", "tipo de movimento", "CFOP", "natureza da operação", "situação da NF", "código do cliente", "nome do cliente", "CNPJ", "setor original", "região comercial", "nova nomenclatura", "responsável", "representante", "supervisor", "tabela de preço", "código do produto", "descrição do produto", "grupo", "subgrupo", "quantidade", "peso em kg", "valor dos produtos", "desconto", "valor líquido", "valor da devolução", "valor da bonificação", "número da NF de origem", "campanha",
] as const;

export const KPI_FORMULAS = {
  faturamentoBruto: "Soma dos movimentos classificados como Venda.",
  faturamentoLiquido: "Vendas − Devoluções.",
  pesoLiquido: "Peso de vendas − Peso devolvido.",
  bonificacoes: "Soma segregada de bonificações em R$ e kg; não compõe receita automaticamente.",
  clientesAtendidos: "Clientes distintos com venda líquida positiva no período.",
  ticketMedio: "Faturamento líquido dividido pelo número de notas de venda válidas.",
  valorPorKg: "Faturamento líquido dividido pelo peso líquido.",
  taxaDevolucao: "Devoluções divididas pelo faturamento bruto.",
  taxaBonificacao: "Valor da bonificação dividido pelo faturamento bruto.",
} as const;

export type Classification = "Venda" | "Devolução" | "Bonificação" | "Outros" | "Cancelado";

export type NormalizedMovement = {
  movementDate?: string;
  emissionDate?: string;
  branch?: string;
  invoiceNumber?: string;
  invoiceSeries?: string;
  invoiceStatus?: string;
  movementType?: string;
  cfop?: string;
  operationNature?: string;
  customerCode?: string;
  customerName?: string;
  productCode?: string;
  productName?: string;
  productGroup?: string;
  originalSector?: string;
  commercialRegion?: string;
  newNomenclature?: string;
  responsible?: string;
  representative?: string;
  supervisor?: string;
  priceTable?: string;
  quantity: number;
  weightKg: number;
  productValue: number;
  discountValue: number;
  netValue: number;
  returnValue: number;
  bonusValue: number;
  originInvoiceNumber?: string;
  campaign?: string;
};

export function normalizeKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseBrazilianNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/R\$|kg|\s/g, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
}

export function parseBrazilianDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 25000 && value < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
    return epoch.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

export function calculateKpis(rows: Array<{ category: Classification; netValue: number; weightKg: number; customerCode?: string; invoiceNumber?: string }>) {
  const totals = rows.reduce((acc, row) => {
    const value = row.netValue || 0;
    const weight = row.weightKg || 0;
    if (row.category === "Venda") { acc.sales += value; acc.salesWeight += weight; if (row.customerCode) acc.customers.add(row.customerCode); if (row.invoiceNumber) acc.invoices.add(row.invoiceNumber); }
    if (row.category === "Devolução") { acc.returns += value; acc.returnWeight += weight; }
    if (row.category === "Bonificação") { acc.bonuses += value; acc.bonusWeight += weight; }
    if (row.category === "Outros") acc.other += value;
    if (row.category === "Cancelado") acc.cancelled += value;
    return acc;
  }, { sales: 0, returns: 0, bonuses: 0, other: 0, cancelled: 0, salesWeight: 0, returnWeight: 0, bonusWeight: 0, customers: new Set<string>(), invoices: new Set<string>() });
  const netRevenue = totals.sales - totals.returns;
  const netWeight = totals.salesWeight - totals.returnWeight;
  return {
    grossRevenue: totals.sales, returnValue: totals.returns, bonusValue: totals.bonuses, otherValue: totals.other, cancelledValue: totals.cancelled,
    netRevenue, netWeight, bonusWeight: totals.bonusWeight, physicalMovement: totals.salesWeight + totals.bonusWeight - totals.returnWeight, financialOperational: netRevenue, customerCount: totals.customers.size, invoiceCount: totals.invoices.size,
    ticketAverage: totals.invoices.size ? netRevenue / totals.invoices.size : 0,
    valuePerKg: netWeight ? netRevenue / netWeight : 0,
    returnRate: totals.sales ? totals.returns / totals.sales : 0,
    bonusRate: totals.sales ? totals.bonuses / totals.sales : 0,
  };
}

export function calculateFundKpis(rows: Array<{ generatedValue: number; usedValue: number; cancelledValue: number }>) {
  const total = rows.reduce((acc, row) => ({ generated: acc.generated + row.generatedValue, used: acc.used + row.usedValue, cancelled: acc.cancelled + row.cancelledValue }), { generated: 0, used: 0, cancelled: 0 });
  const available = total.generated - total.used - total.cancelled;
  return { generated: total.generated, used: total.used, cancelled: total.cancelled, available, utilizationRate: total.generated ? total.used / total.generated : 0 };
}

export function validateFundUsage(input: { available: number; amount: number; purpose: "Campanha promocional" | "Redução de preço"; fundCustomerId: number; targetCustomerId?: number }) {
  if (input.purpose === "Redução de preço") throw new Error("A verba promocional não pode ser utilizada para redução direta de preços.");
  if (input.targetCustomerId && input.targetCustomerId !== input.fundCustomerId) throw new Error("A verba não pode ser transferida entre clientes.");
  if (input.amount <= 0 || input.amount > input.available) throw new Error("O valor solicitado supera o saldo disponível da verba.");
}
