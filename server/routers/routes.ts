import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { commercialRoutes, routeRules } from "../../drizzle/schema";
import { administratorProcedure, commercialProcedure } from "../access";
import { getDb, recordAudit } from "../db";
import { router } from "../_core/trpc";

const ruleInput = z.object({ routeId: z.number().int().optional(), ruleId: z.number().int().optional(), internalRegion: z.string().min(2).max(160), newNomenclature: z.string().min(2).max(180), responsible: z.string().max(120).optional(), priceTable: z.string().max(120).optional(), scope: z.enum(["Cliente", "Setor", "Localidade"]), customerCode: z.string().max(32).optional(), sectorCode: z.string().max(255).optional(), city: z.string().max(120).optional(), state: z.string().length(2).optional(), startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), note: z.string().max(1000).optional() });

function overlaps(startsAt: string, endsAt: string | undefined, currentStart: Date, currentEnd: Date | null) {
  const start = new Date(`${startsAt}T00:00:00Z`).getTime(); const end = endsAt ? new Date(`${endsAt}T23:59:59Z`).getTime() : Number.POSITIVE_INFINITY; const existingStart = currentStart.getTime(); const existingEnd = currentEnd?.getTime() ?? Number.POSITIVE_INFINITY; return start <= existingEnd && existingStart <= end;
}

export const routesRouter = router({
  list: commercialProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ ruleId: routeRules.id, routeId: commercialRoutes.id, scope: routeRules.scope, customerCode: routeRules.customerCode, sectorCode: routeRules.sectorCode, city: routeRules.city, state: routeRules.state, startsAt: routeRules.startsAt, endsAt: routeRules.endsAt, version: routeRules.version, source: routeRules.source, note: routeRules.note, active: routeRules.active, internalRegion: commercialRoutes.internalRegion, formalRegion: commercialRoutes.formalRegion, newNomenclature: commercialRoutes.newNomenclature, responsible: commercialRoutes.responsible, priceTable: commercialRoutes.priceTable }).from(routeRules).innerJoin(commercialRoutes, eq(routeRules.routeId, commercialRoutes.id)); }),
  save: administratorProcedure.input(ruleInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível.");
    if (input.endsAt && input.endsAt < input.startsAt) throw new Error("A vigência final não pode ser anterior à inicial.");
    if (input.scope === "Cliente" && !input.customerCode) throw new Error("Informe o cliente para uma exceção por cliente.");
    if (input.scope === "Setor" && !input.sectorCode) throw new Error("Informe o setor para uma regra por setor.");
    const current = await db.select().from(routeRules).where(eq(routeRules.scope, input.scope));
    const keyConflicts = current.filter(item => item.id !== input.ruleId && item.active && (input.scope === "Cliente" ? item.customerCode === input.customerCode : input.scope === "Setor" ? item.sectorCode === input.sectorCode : item.city === input.city && item.state === input.state) && overlaps(input.startsAt, input.endsAt, item.startsAt, item.endsAt));
    if (keyConflicts.length) throw new Error("Há sobreposição de vigência para esta regra territorial. Revise o período ou desative a versão anterior.");
    let routeId: number;
    let version = 1;
    if (input.ruleId) {
      const [previous] = await db.select().from(routeRules).where(eq(routeRules.id, input.ruleId)).limit(1);
      if (!previous) throw new Error("A regra original não foi encontrada.");
      const startsAt = new Date(`${input.startsAt}T00:00:00Z`);
      const previousEnd = new Date(startsAt); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
      if (previousEnd < previous.startsAt) throw new Error("Uma nova versão deve iniciar após a vigência da regra original.");
      await db.update(routeRules).set({ active: false, endsAt: previousEnd }).where(eq(routeRules.id, previous.id));
      const created = await db.insert(commercialRoutes).values({ internalRegion: input.internalRegion, newNomenclature: input.newNomenclature, responsible: input.responsible || null, priceTable: input.priceTable || null });
      routeId = Number(created[0].insertId); version = previous.version + 1;
    } else {
      const created = await db.insert(commercialRoutes).values({ internalRegion: input.internalRegion, newNomenclature: input.newNomenclature, responsible: input.responsible || null, priceTable: input.priceTable || null });
      routeId = Number(created[0].insertId);
    }
    const values = { routeId, scope: input.scope, customerCode: input.customerCode || null, sectorCode: input.sectorCode || null, city: input.city || null, state: input.state || null, startsAt: new Date(`${input.startsAt}T00:00:00Z`), endsAt: input.endsAt ? new Date(`${input.endsAt}T00:00:00Z`) : null, source: "Cadastro administrativo", note: input.note || null } as const;
    await db.insert(routeRules).values({ ...values, version, active: true });
    await recordAudit({ id: nanoid(), userId: ctx.user.id, action: input.ruleId ? "VERSIONAR_REGRA_ROTA" : "CRIAR_REGRA_ROTA", entity: "Setores e Rotas", entityId: String(routeId), newValue: { ...input, version } });
    return { success: true, routeId };
  }),
  toggle: administratorProcedure.input(z.object({ ruleId: z.number().int(), active: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); await db.update(routeRules).set({ active: input.active }).where(eq(routeRules.id, input.ruleId)); await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "ATIVAR_REGRA_ROTA", entity: "Setores e Rotas", entityId: String(input.ruleId), newValue: { active: input.active } }); return { success: true }; }),
});
