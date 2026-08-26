import { describe, expect, it } from "vitest";
import { calculateFundKpis, calculateKpis, parseBrazilianNumber, validateFundUsage } from "../shared/commercial";
import { classifyMovement } from "./commercial";

describe("fórmulas comerciais", () => {
  it("calcula receita líquida sem tratar bonificação como receita", () => {
    const result = calculateKpis([
      { category: "Venda", netValue: 1000, weightKg: 100, customerCode: "1", invoiceNumber: "10" },
      { category: "Devolução", netValue: 120, weightKg: 12, customerCode: "1", invoiceNumber: "11" },
      { category: "Bonificação", netValue: 50, weightKg: 5, customerCode: "1", invoiceNumber: "12" },
    ]);
    expect(result.netRevenue).toBe(880);
    expect(result.netWeight).toBe(88);
    expect(result.bonusValue).toBe(50);
  });

  it("mantém movimento sem regra como Outros pendente", () => {
    const result = classifyMovement({ quantity: 0, weightKg: 0, productValue: 0, discountValue: 0, netValue: 356.82, returnValue: 0, bonusValue: 0 }, []);
    expect(result).toMatchObject({ category: "Outros", status: "Pendente" });
  });

  it("interpreta moeda brasileira", () => {
    expect(parseBrazilianNumber("R$ 8.772.189,91")).toBe(8772189.91);
  });

  it("calcula saldo e utilização de verbas sem transferir valores entre clientes", () => {
    expect(calculateFundKpis([{ generatedValue: 1000, usedValue: 250, cancelledValue: 100 }])).toMatchObject({ available: 650, utilizationRate: 0.25 });
  });

  it("bloqueia redução de preço, transferência e valor acima do saldo de verba", () => {
    expect(() => validateFundUsage({ available: 100, amount: 10, purpose: "Redução de preço", fundCustomerId: 1 })).toThrow("redução direta de preços");
    expect(() => validateFundUsage({ available: 100, amount: 10, purpose: "Campanha promocional", fundCustomerId: 1, targetCustomerId: 2 })).toThrow("transferida entre clientes");
    expect(() => validateFundUsage({ available: 100, amount: 101, purpose: "Campanha promocional", fundCustomerId: 1 })).toThrow("saldo disponível");
    expect(() => validateFundUsage({ available: 100, amount: 10, purpose: "Campanha promocional", fundCustomerId: 1, targetCustomerId: 1 })).not.toThrow();
  });
});
