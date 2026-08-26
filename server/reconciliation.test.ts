import { describe, expect, it } from "vitest";
import { calculateKpis } from "../shared/commercial";

describe("caso de referência de agosto de 2026", () => {
  it("confere o cálculo líquido e preserva a diferença como movimento pendente, sem inseri-la como bonificação", () => {
    const sales = 8772189.91;
    const returns = 503137.33;
    const referenceAdolfo = 8771833.09;
    const result = calculateKpis([
      { category: "Venda", netValue: sales, weightKg: 0, customerCode: "referência", invoiceNumber: "vendas" },
      { category: "Devolução", netValue: returns, weightKg: 0, customerCode: "referência", invoiceNumber: "devolução" },
      { category: "Outros", netValue: sales - referenceAdolfo, weightKg: 0, customerCode: "referência", invoiceNumber: "pendência" },
    ]);
    expect(result.netRevenue).toBeCloseTo(8269052.58, 2);
    expect(result.otherValue).toBeCloseTo(356.82, 2);
    expect(result.bonusValue).toBe(0);
  });
});
