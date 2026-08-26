import { existsSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { calculateKpis } from "../shared/commercial";

const uploadDirectory = "/home/ubuntu/upload";
const edilenePath = path.join(uploadDirectory, "Fat.Edilene.xlsx");
const adolfoPath = path.join(uploadDirectory, "Fat.Adolfo-Comercial.xlsx");

function findRowValue(filePath: string, label: string, occurrence = 0) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const normalizedLabel = label.trim().toUpperCase();
  const matches = rows.map(row => ({ row, labelIndex: row.findIndex(cell => String(cell ?? "").trim().toUpperCase() === normalizedLabel) })).filter(item => item.labelIndex >= 0);
  if (!matches[occurrence]) throw new Error(`Rótulo não encontrado: ${label}`);
  const value = matches[occurrence].row.slice(matches[occurrence].labelIndex + 1).find(cell => typeof cell === "number" || (typeof cell === "string" && /^-?[\d.,]+$/.test(cell.trim())));
  return Number(value);
}

describe.skipIf(!existsSync(edilenePath) || !existsSync(adolfoPath))("conciliação com os anexos reais de agosto de 2026", () => {
  it("reproduz o líquido de Fat.Edilene e mantém a diferença do relatório Adolfo segregada", () => {
    const grossRevenue = findRowValue(edilenePath, "Totais:", 0);
    const returns = findRowValue(edilenePath, "Totais:", 1);
    const expectedNet = findRowValue(edilenePath, "Total Líquido:");
    const adolfoTotal = findRowValue(adolfoPath, "TOTAL GERAL SUPERVISOR:");
    const calculated = calculateKpis([
      { category: "Venda", netValue: grossRevenue, weightKg: 0, customerCode: "anexo", invoiceNumber: "edilene-venda" },
      { category: "Devolução", netValue: returns, weightKg: 0, customerCode: "anexo", invoiceNumber: "edilene-devolucao" },
    ]);
    expect(calculated.netRevenue).toBeCloseTo(expectedNet, 2);
    expect(grossRevenue - adolfoTotal).toBeGreaterThan(0);
    expect(calculated.bonusValue).toBe(0);
  });
});
