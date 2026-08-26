import type { Classification, NormalizedMovement } from "../shared/commercial";
import { normalizeKey, parseBrazilianDate, parseBrazilianNumber } from "../shared/commercial";

export type SourceRow = Record<string, unknown>;
export type ImportMapping = Record<string, string>;
export type Rule = { id: number; category: Classification; movementType: string | null; cfop: string | null; operationNature: string | null; invoiceStatus: string | null; priority: number };

const aliases: Record<string, string[]> = {
  branch: ["filial", "unidade", "un"], invoiceNumber: ["numerodanota", "numeronf", "nf", "notafiscal", "numero"], invoiceSeries: ["serie"],
  emissionDate: ["dataemissao", "emissao"], movementDate: ["datamovimento", "data", "movimento"], movementType: ["tipomovimento", "tipo"], cfop: ["cfop"], operationNature: ["naturezaoperacao", "natureza"], invoiceStatus: ["situacaonf", "situacao", "statusnf"],
  customerCode: ["codigocliente", "codcliente", "clienteid"], customerName: ["nomecliente", "cliente", "razaosocial"], productCode: ["codigoproduto", "codproduto"], productName: ["descricaoproduto", "produto", "nomeproduto"], productGroup: ["grupo", "grupoprodutos"],
  originalSector: ["setororiginal", "setor"], commercialRegion: ["regiaocomercial", "regiao"], newNomenclature: ["novanomenclatura", "nomenclatura"], responsible: ["responsavel"], representative: ["representante", "vendedor"], supervisor: ["supervisor"], priceTable: ["tabelapreco", "tabela"],
  quantity: ["quantidade", "qtd"], weightKg: ["pesoemkg", "pesokg", "peso"], productValue: ["valordosprodutos", "valorprodutos", "valorbruto"], discountValue: ["desconto"], netValue: ["valorliquido", "liquido", "valor"], returnValue: ["valordadevolucao", "devolucao"], bonusValue: ["valordabonificacao", "bonificacao"], originInvoiceNumber: ["numeronfdeorigem", "nforigem"], campaign: ["campanha", "acaopromocional"],
};

function valueFor(row: SourceRow, field: string, mapping: ImportMapping) {
  const wanted = mapping[field];
  const entries = Object.entries(row);
  if (wanted) return entries.find(([key]) => key === wanted)?.[1];
  const candidates = aliases[field] ?? [];
  return entries.find(([key]) => candidates.includes(normalizeKey(key)))?.[1];
}

function textValue(value: unknown) { return value === null || value === undefined ? undefined : String(value).trim() || undefined; }

export function normalizeRow(row: SourceRow, mapping: ImportMapping): { movement: NormalizedMovement; errors: string[] } {
  const movement: NormalizedMovement = {
    branch: textValue(valueFor(row, "branch", mapping)), invoiceNumber: textValue(valueFor(row, "invoiceNumber", mapping)), invoiceSeries: textValue(valueFor(row, "invoiceSeries", mapping)),
    emissionDate: parseBrazilianDate(valueFor(row, "emissionDate", mapping)), movementDate: parseBrazilianDate(valueFor(row, "movementDate", mapping)), movementType: textValue(valueFor(row, "movementType", mapping)), cfop: textValue(valueFor(row, "cfop", mapping)), operationNature: textValue(valueFor(row, "operationNature", mapping)), invoiceStatus: textValue(valueFor(row, "invoiceStatus", mapping)),
    customerCode: textValue(valueFor(row, "customerCode", mapping)), customerName: textValue(valueFor(row, "customerName", mapping)), productCode: textValue(valueFor(row, "productCode", mapping)), productName: textValue(valueFor(row, "productName", mapping)), productGroup: textValue(valueFor(row, "productGroup", mapping)),
    originalSector: textValue(valueFor(row, "originalSector", mapping)), commercialRegion: textValue(valueFor(row, "commercialRegion", mapping)), newNomenclature: textValue(valueFor(row, "newNomenclature", mapping)), responsible: textValue(valueFor(row, "responsible", mapping)), representative: textValue(valueFor(row, "representative", mapping)), supervisor: textValue(valueFor(row, "supervisor", mapping)), priceTable: textValue(valueFor(row, "priceTable", mapping)),
    quantity: parseBrazilianNumber(valueFor(row, "quantity", mapping)), weightKg: parseBrazilianNumber(valueFor(row, "weightKg", mapping)), productValue: parseBrazilianNumber(valueFor(row, "productValue", mapping)), discountValue: parseBrazilianNumber(valueFor(row, "discountValue", mapping)), netValue: parseBrazilianNumber(valueFor(row, "netValue", mapping)), returnValue: parseBrazilianNumber(valueFor(row, "returnValue", mapping)), bonusValue: parseBrazilianNumber(valueFor(row, "bonusValue", mapping)), originInvoiceNumber: textValue(valueFor(row, "originInvoiceNumber", mapping)), campaign: textValue(valueFor(row, "campaign", mapping)),
  };
  const errors: string[] = [];
  if (!movement.netValue && !movement.productValue && !movement.returnValue && !movement.bonusValue) errors.push("Nenhum valor financeiro reconhecido na linha.");
  if (!movement.movementDate && !movement.emissionDate) errors.push("Data do movimento ou data de emissão ausente ou inválida.");
  return { movement, errors };
}

function matches(ruleValue: string | null, actual?: string) {
  return !ruleValue || normalizeKey(ruleValue) === normalizeKey(actual ?? "");
}

export function classifyMovement(movement: NormalizedMovement, rules: Rule[]) {
  const rule = [...rules].sort((a, b) => a.priority - b.priority).find(candidate => matches(candidate.movementType, movement.movementType) && matches(candidate.cfop, movement.cfop) && matches(candidate.operationNature, movement.operationNature) && matches(candidate.invoiceStatus, movement.invoiceStatus));
  return rule ? { category: rule.category, status: "Classificado" as const, ruleId: rule.id } : { category: "Outros" as const, status: "Pendente" as const, ruleId: undefined };
}
