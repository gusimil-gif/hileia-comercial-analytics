import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditEvents, classificationRules, commercialMovements, importBatches, importRows, routeRules, sourceFiles } from "../drizzle/schema";

const state = vi.hoisted(() => ({ batches: [] as Array<Record<string, unknown>>, inserts: [] as Array<{ table: unknown; values: unknown }>, updates: [] as Array<{ table: unknown; values: unknown }> }));

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({ from: (table: unknown) => ({ where: () => { const result = table === importBatches ? state.batches : []; Object.assign(result, { limit: async () => table === importBatches ? state.batches : [] }); return result; }, innerJoin: () => ({ where: async () => [] }) }) }),
    insert: (table: unknown) => ({ values: async (values: Record<string, unknown>) => { state.inserts.push({ table, values }); if (table === importBatches) state.batches.push(values); return { insertId: 1 }; } }),
    update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { state.updates.push({ table, values }); } }) }),
  }),
  recordAudit: async () => undefined,
}));
vi.mock("./storage", () => ({ storagePut: async () => ({ key: "imports/test.xlsx", url: "https://storage.test/test.xlsx" }) }));

import { importsRouter } from "./routers/imports";
import type { TrpcContext } from "./_core/context";

function context(role: "Analista" | "Consulta"): TrpcContext { return { user: { id: 1, openId: role, name: role, email: null, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("fluxo de importação e reversão controlada", () => {
  beforeEach(() => { state.batches.length = 0; state.inserts.length = 0; state.updates.length = 0; });
  it("importa um lote para perfil autorizado e o reverte sem apagar seus registros", async () => {
    const caller = importsRouter.createCaller(context("Analista"));
    const payload = Buffer.from("PKconteudo").toString("base64");
    const imported = await caller.create({ fileName: "referencia.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", payloadBase64: payload, rows: [{ Data: "2026-08-26", Cliente: "C-1", Setor: "100", "Valor líquido": "100" }], mapping: {} });
    expect(imported.validRows).toBe(1);
    expect(state.inserts.some(entry => entry.table === importBatches)).toBe(true);
    expect(state.inserts.some(entry => entry.table === sourceFiles)).toBe(true);
    expect(state.inserts.some(entry => entry.table === importRows)).toBe(true);
    await expect(caller.revert({ batchId: imported.batchId, reason: "Reversão de teste controlada" })).resolves.toEqual({ success: true });
    expect(state.updates.some(entry => entry.table === commercialMovements)).toBe(true);
    expect(state.updates.some(entry => entry.table === importBatches)).toBe(true);
  });
  it("bloqueia a reversão para o perfil Consulta", async () => {
    const caller = importsRouter.createCaller(context("Consulta"));
    await expect(caller.revert({ batchId: "lote", reason: "Reversão de teste controlada" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
