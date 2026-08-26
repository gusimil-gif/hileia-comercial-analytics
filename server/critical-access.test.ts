import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function consultationContext(): TrpcContext {
  return { user: { id: 9, openId: "consulta", name: "Consulta", email: null, loginMethod: "manus", role: "Consulta", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("operações comerciais críticas", () => {
  it("bloqueia reversão, utilização de verba e alteração de rota para o perfil Consulta", async () => {
    const caller = appRouter.createCaller(consultationContext());
    await expect(caller.imports.revert({ batchId: "lote", reason: "Motivo de reversão controlada" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.funds.useFund({ fundId: "verba", amount: 10, campaign: "Campanha teste", purpose: "Campanha promocional" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.routes.save({ internalRegion: "Teste", newNomenclature: "Teste", scope: "Setor", sectorCode: "100", startsAt: "2026-08-26" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
