import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { classificationRules, movementCategories } from "../../drizzle/schema";
import { administratorProcedure, commercialProcedure } from "../access";
import { getDb, recordAudit } from "../db";
import { router } from "../_core/trpc";

const ruleInput = z.object({ name: z.string().min(3).max(160), priority: z.number().int().min(1).max(9999).default(100), movementType: z.string().max(80).optional(), cfop: z.string().max(16).optional(), operationNature: z.string().max(180).optional(), invoiceStatus: z.string().max(80).optional(), category: z.enum(movementCategories) });

export const classificationRouter = router({
  list: commercialProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(classificationRules).orderBy(classificationRules.priority, desc(classificationRules.createdAt)) : []; }),
  create: administratorProcedure.input(ruleInput).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); const created = await db.insert(classificationRules).values({ ...input, movementType: input.movementType || null, cfop: input.cfop || null, operationNature: input.operationNature || null, invoiceStatus: input.invoiceStatus || null }); await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "CRIAR_REGRA_CLASSIFICACAO", entity: "Regra de classificação", newValue: input }); return { success: true, id: Number(created[0].insertId) }; }),
  update: administratorProcedure.input(ruleInput.extend({ id: z.number().int() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); const { id, ...values } = input; await db.update(classificationRules).set({ ...values, movementType: values.movementType || null, cfop: values.cfop || null, operationNature: values.operationNature || null, invoiceStatus: values.invoiceStatus || null }).where(eq(classificationRules.id, id)); await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "EDITAR_REGRA_CLASSIFICACAO", entity: "Regra de classificação", entityId: String(id), newValue: values }); return { success: true }; }),
  toggle: administratorProcedure.input(z.object({ id: z.number().int(), active: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível."); await db.update(classificationRules).set({ active: input.active }).where(eq(classificationRules.id, input.id)); await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "ATIVAR_REGRA_CLASSIFICACAO", entity: "Regra de classificação", entityId: String(input.id), newValue: { active: input.active } }); return { success: true }; }),
});
