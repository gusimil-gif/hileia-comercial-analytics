import crypto from "node:crypto";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { classificationRules, commercialMovements, commercialRoutes, importBatches, importMappings, importRows, routeRules, sourceFiles } from "../../drizzle/schema";
import { calculateKpis } from "../../shared/commercial";
import { commercialProcedure, requireProfiles } from "../access";
import { classifyMovement, normalizeRow, type ImportMapping, type SourceRow } from "../commercial";
import { getDb, recordAudit } from "../db";
import { storagePut } from "../storage";
import { router } from "../_core/trpc";

const rawRow = z.record(z.string(), z.unknown());
const importInput = z.object({ fileName: z.string().min(1).max(255), contentType: z.enum(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "application/vnd.ms-excel"]), payloadBase64: z.string().min(1).max(20_000_000), rows: z.array(rawRow).min(1).max(50_000), mapping: z.record(z.string(), z.string()).default({}) });

function movementValues(batchId: string, importRowId: string, normalized: ReturnType<typeof normalizeRow>["movement"], classification: ReturnType<typeof classifyMovement>): typeof commercialMovements.$inferInsert {
  return { id: nanoid(), batchId, importRowId, movementDate: normalized.movementDate ? new Date(`${normalized.movementDate}T00:00:00Z`) : undefined, emissionDate: normalized.emissionDate ? new Date(`${normalized.emissionDate}T00:00:00Z`) : undefined, branch: normalized.branch, invoiceNumber: normalized.invoiceNumber, invoiceSeries: normalized.invoiceSeries, invoiceStatus: normalized.invoiceStatus, movementType: normalized.movementType, cfop: normalized.cfop, operationNature: normalized.operationNature, customerCode: normalized.customerCode, customerName: normalized.customerName, productCode: normalized.productCode, productName: normalized.productName, productGroup: normalized.productGroup, originalSector: normalized.originalSector, commercialRegion: normalized.commercialRegion, newNomenclature: normalized.newNomenclature, responsible: normalized.responsible, representative: normalized.representative, supervisor: normalized.supervisor, priceTable: normalized.priceTable, quantity: String(normalized.quantity), weightKg: String(normalized.weightKg), productValue: String(normalized.productValue), discountValue: String(normalized.discountValue), netValue: String(normalized.netValue || normalized.productValue), returnValue: String(normalized.returnValue), bonusValue: String(normalized.bonusValue), originInvoiceNumber: normalized.originInvoiceNumber, campaign: normalized.campaign, category: classification.category, classificationRuleId: classification.ruleId, classificationStatus: classification.status };
}

export function applyRoute<T extends ReturnType<typeof normalizeRow>["movement"]>(movement: T, rules: Array<{ scope: "Cliente" | "Setor" | "Localidade"; customerCode: string | null; sectorCode: string | null; city: string | null; state: string | null; startsAt: Date; endsAt: Date | null; internalRegion: string | null; newNomenclature: string; responsible: string | null; priceTable: string | null }>) {
  const date = movement.movementDate ? new Date(`${movement.movementDate}T00:00:00Z`) : new Date();
  const active = rules.filter(rule => rule.startsAt <= date && (!rule.endsAt || rule.endsAt >= date));
  const matchCustomer = active.find(rule => rule.scope === "Cliente" && rule.customerCode === movement.customerCode);
  const matchSector = active.find(rule => rule.scope === "Setor" && Boolean(movement.originalSector) && (rule.sectorCode ?? "").split("/").includes(movement.originalSector ?? ""));
  const matchLocality = active.find(rule => rule.scope === "Localidade" && Boolean(movement.commercialRegion) && rule.city?.toLowerCase() === movement.commercialRegion?.toLowerCase());
  const match = matchCustomer ?? matchSector ?? matchLocality;
  return match ? { ...movement, commercialRegion: match.internalRegion ?? movement.commercialRegion, newNomenclature: match.newNomenclature, responsible: match.responsible ?? movement.responsible, priceTable: match.priceTable ?? movement.priceTable } : movement;
}

export const importsRouter = router({
  mappings: commercialProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) return [];
    return db.select().from(importMappings).where(eq(importMappings.userId, ctx.user.id)).orderBy(desc(importMappings.updatedAt));
  }),
  saveMapping: commercialProcedure.input(z.object({ name: z.string().min(3).max(160), sourceSignature: z.string().min(1).max(255), mapping: z.record(z.string(), z.string()) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível.");
    const id = nanoid();
    await db.insert(importMappings).values({ id, userId: ctx.user.id, name: input.name, sourceSignature: input.sourceSignature, mapping: input.mapping }).onDuplicateKeyUpdate({ set: { sourceSignature: input.sourceSignature, mapping: input.mapping, updatedAt: new Date() } });
    await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "SALVAR_MAPEAMENTO", entity: "Modelo de mapeamento", entityId: id, newValue: { name: input.name, sourceSignature: input.sourceSignature } });
    return { success: true, id };
  }),
  list: commercialProcedure.query(async () => {
    const db = await getDb(); if (!db) return [];
    return db.select().from(importBatches).orderBy(desc(importBatches.createdAt)).limit(100);
  }),
  preview: commercialProcedure.input(z.object({ rows: z.array(rawRow).min(1).max(100), mapping: z.record(z.string(), z.string()).default({}) })).query(async ({ input }) => {
    const mapping = input.mapping as ImportMapping;
    return input.rows.slice(0, 20).map((row, index) => ({ line: index + 1, ...normalizeRow(row as SourceRow, mapping) }));
  }),
  create: commercialProcedure.input(importInput).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível.");
    const buffer = Buffer.from(input.payloadBase64, "base64");
    if (!buffer.length || buffer.length > 15 * 1024 * 1024) throw new Error("O arquivo deve ter até 15 MB.");
    const extension = input.fileName.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) throw new Error("Formato não permitido. Use .xlsx, .xls ou .csv.");
    if ((extension === "xlsx" || extension === "xls") && buffer.subarray(0, 2).toString() !== "PK" && extension === "xlsx") throw new Error("O conteúdo não corresponde a uma planilha XLSX válida.");
    const sourceHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const duplicate = await db.select({ id: importBatches.id }).from(importBatches).where(eq(importBatches.sourceHash, sourceHash)).limit(1);
    if (duplicate[0]) throw new Error("Arquivo duplicado: este lote já foi importado.");
    const batchId = nanoid();
    const original = await storagePut(`imports/${ctx.user.id}/${batchId}/${input.fileName}`, buffer, input.contentType);
    const rules = await db.select().from(classificationRules).where(eq(classificationRules.active, true));
    const territorialRules = await db.select({ scope: routeRules.scope, customerCode: routeRules.customerCode, sectorCode: routeRules.sectorCode, city: routeRules.city, state: routeRules.state, startsAt: routeRules.startsAt, endsAt: routeRules.endsAt, internalRegion: commercialRoutes.internalRegion, newNomenclature: commercialRoutes.newNomenclature, responsible: commercialRoutes.responsible, priceTable: commercialRoutes.priceTable }).from(routeRules).innerJoin(commercialRoutes, eq(routeRules.routeId, commercialRoutes.id)).where(eq(routeRules.active, true));
    const mapped = input.rows.map((row, index) => {
      const parsed = normalizeRow(row as SourceRow, input.mapping as ImportMapping);
      const classification = classifyMovement(parsed.movement, rules);
      return { index, raw: row, ...parsed, movement: applyRoute(parsed.movement, territorialRules), classification };
    });
    const valid = mapped.filter(item => item.errors.length === 0);
    const totalValue = valid.reduce((sum, item) => sum + (item.movement.netValue || item.movement.productValue), 0);
    const totalWeight = valid.reduce((sum, item) => sum + item.movement.weightKg, 0);
    await db.insert(importBatches).values({ id: batchId, sourceHash, sourceName: input.fileName, status: valid.length ? "Importado" : "Com erro", importedBy: ctx.user.id, totalRows: input.rows.length, validRows: valid.length, errorRows: mapped.length - valid.length, totalValue: String(totalValue), totalWeightKg: String(totalWeight), mapping: input.mapping });
    await db.insert(sourceFiles).values({ id: nanoid(), batchId, fileName: input.fileName, contentType: input.contentType, storageKey: original.key, sourceHash, sizeBytes: buffer.length });
    for (const item of mapped) {
      const rowId = nanoid();
      await db.insert(importRows).values({ id: rowId, batchId, rowNumber: item.index + 1, rawData: item.raw, normalizedData: item.movement, errors: item.errors, status: item.errors.length ? "Com erro" : "Válida" });
      if (!item.errors.length) await db.insert(commercialMovements).values(movementValues(batchId, rowId, item.movement, item.classification));
    }
    await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "IMPORTAR_LOTE", entity: "Lote de importação", entityId: batchId, newValue: { fileName: input.fileName, sourceHash, totalRows: input.rows.length, validRows: valid.length, errorRows: mapped.length - valid.length } });
    return { batchId, sourceHash, totalRows: input.rows.length, validRows: valid.length, errorRows: mapped.length - valid.length, storageUrl: original.url };
  }),
  errors: commercialProcedure.input(z.object({ batchId: z.string().min(1) })).query(async ({ input }) => {
    const db = await getDb(); if (!db) return [];
    return db.select().from(importRows).where(and(eq(importRows.batchId, input.batchId), eq(importRows.status, "Com erro"))).orderBy(importRows.rowNumber);
  }),
  reprocessRow: requireProfiles("Administrador", "Gerência Comercial", "Analista").input(z.object({ batchId: z.string().min(1), rowId: z.string().min(1), mapping: z.record(z.string(), z.string()).default({}) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível.");
    const [row] = await db.select().from(importRows).where(and(eq(importRows.id, input.rowId), eq(importRows.batchId, input.batchId))).limit(1);
    if (!row) throw new Error("Linha não encontrada.");
    const parsed = normalizeRow(row.rawData as SourceRow, input.mapping as ImportMapping);
    const rules = await db.select().from(classificationRules).where(eq(classificationRules.active, true));
    const territorialRules = await db.select({ scope: routeRules.scope, customerCode: routeRules.customerCode, sectorCode: routeRules.sectorCode, city: routeRules.city, state: routeRules.state, startsAt: routeRules.startsAt, endsAt: routeRules.endsAt, internalRegion: commercialRoutes.internalRegion, newNomenclature: commercialRoutes.newNomenclature, responsible: commercialRoutes.responsible, priceTable: commercialRoutes.priceTable }).from(routeRules).innerJoin(commercialRoutes, eq(routeRules.routeId, commercialRoutes.id)).where(eq(routeRules.active, true));
    const enrichedMovement = applyRoute(parsed.movement, territorialRules);
    const classification = classifyMovement(parsed.movement, rules);
    await db.update(importRows).set({ normalizedData: enrichedMovement, errors: parsed.errors, status: parsed.errors.length ? "Com erro" : "Válida" }).where(eq(importRows.id, input.rowId));
    if (!parsed.errors.length) {
      const existing = await db.select({ id: commercialMovements.id }).from(commercialMovements).where(eq(commercialMovements.importRowId, input.rowId)).limit(1);
      const values = movementValues(input.batchId, input.rowId, enrichedMovement, classification);
      if (!existing[0]) await db.insert(commercialMovements).values(values);
      else { const { id, ...updateValues } = values; await db.update(commercialMovements).set(updateValues).where(eq(commercialMovements.id, existing[0].id)); }
    }
    await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "REPROCESSAR_LINHA", entity: "Linha importada", entityId: input.rowId, newValue: { status: parsed.errors.length ? "Com erro" : "Válida", errors: parsed.errors } });
    return { success: true, errors: parsed.errors };
  }),
  revert: requireProfiles("Administrador", "Gerência Comercial", "Analista").input(z.object({ batchId: z.string().min(1), reason: z.string().min(8).max(500) })).mutation(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível.");
    const batch = await db.select().from(importBatches).where(eq(importBatches.id, input.batchId)).limit(1);
    if (!batch[0]) throw new Error("Lote não encontrado.");
    if (batch[0].status === "Revertido") throw new Error("Este lote já foi revertido.");
    await db.update(commercialMovements).set({ active: false }).where(eq(commercialMovements.batchId, input.batchId));
    await db.update(importBatches).set({ status: "Revertido", revertedAt: new Date(), revertedBy: ctx.user.id, reversalReason: input.reason }).where(eq(importBatches.id, input.batchId));
    await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "REVERTER_LOTE", entity: "Lote de importação", entityId: input.batchId, previousValue: { status: batch[0].status }, newValue: { status: "Revertido", reason: input.reason } });
    return { success: true };
  }),
  reconciliation: commercialProcedure.input(z.object({ batchId: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(), commercialRegion: z.string().optional(), sector: z.string().optional(), customerCode: z.string().optional(), productCode: z.string().optional(), category: z.enum(["Venda", "Devolução", "Bonificação", "Outros", "Cancelado"]).optional() }).optional()).query(async ({ input }) => {
    const db = await getDb(); if (!db) return { status: "Pendente de classificação", totals: calculateKpis([]), byCategory: [], count: 0 };
    const conditions = [eq(commercialMovements.active, true)];
    if (input?.batchId) conditions.push(eq(commercialMovements.batchId, input.batchId));
    if (input?.startDate) conditions.push(gte(commercialMovements.movementDate, new Date(`${input.startDate}T00:00:00Z`)));
    if (input?.endDate) conditions.push(lte(commercialMovements.movementDate, new Date(`${input.endDate}T23:59:59Z`)));
    if (input?.commercialRegion) conditions.push(eq(commercialMovements.commercialRegion, input.commercialRegion));
    if (input?.sector) conditions.push(eq(commercialMovements.originalSector, input.sector));
    if (input?.customerCode) conditions.push(eq(commercialMovements.customerCode, input.customerCode));
    if (input?.productCode) conditions.push(eq(commercialMovements.productCode, input.productCode));
    if (input?.category) conditions.push(eq(commercialMovements.category, input.category));
    const movements = await db.select({ category: commercialMovements.category, netValue: commercialMovements.netValue, weightKg: commercialMovements.weightKg, customerCode: commercialMovements.customerCode, invoiceNumber: commercialMovements.invoiceNumber, classificationStatus: commercialMovements.classificationStatus }).from(commercialMovements).where(and(...conditions));
    const typed = movements.map(row => ({ category: row.category, netValue: Number(row.netValue), weightKg: Number(row.weightKg), customerCode: row.customerCode ?? undefined, invoiceNumber: row.invoiceNumber ?? undefined }));
    const pending = movements.filter(item => item.classificationStatus === "Pendente").length;
    const totals = calculateKpis(typed);
    const allRows = await db.select({ batchId: commercialMovements.batchId, invoiceNumber: commercialMovements.invoiceNumber, movementDate: commercialMovements.movementDate, customerName: commercialMovements.customerName, productName: commercialMovements.productName, productGroup: commercialMovements.productGroup, commercialRegion: commercialMovements.commercialRegion, originalSector: commercialMovements.originalSector, responsible: commercialMovements.responsible, category: commercialMovements.category, netValue: commercialMovements.netValue, weightKg: commercialMovements.weightKg }).from(commercialMovements).where(and(...conditions));
    const breakdown = (label: string, key: (row: typeof allRows[number]) => string | null) => {
      const values = new Map<string, { label: string; sales: number; returns: number; bonuses: number; other: number; netValue: number; weightKg: number; count: number }>();
      for (const row of allRows) { const id = key(row) || "Não informado"; const current = values.get(id) ?? { label: id, sales: 0, returns: 0, bonuses: 0, other: 0, netValue: 0, weightKg: 0, count: 0 }; const value = Number(row.netValue); current.count += 1; current.weightKg += Number(row.weightKg); if (row.category === "Venda") current.sales += value; else if (row.category === "Devolução") current.returns += value; else if (row.category === "Bonificação") current.bonuses += value; else current.other += value; current.netValue = current.sales - current.returns; values.set(id, current); }
      return { label, rows: Array.from(values.values()).sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue)).slice(0, 50) };
    };
    return { status: pending ? "Pendente de classificação" : "Conciliado", totals, pending, count: movements.length, details: { byInvoice: breakdown("NF", row => row.invoiceNumber), byDay: breakdown("Dia", row => row.movementDate ? row.movementDate.toISOString().slice(0, 10) : null), byCustomer: breakdown("Cliente", row => row.customerName), byProduct: breakdown("Produto", row => row.productName), byProductGroup: breakdown("Grupo de produto", row => row.productGroup), byRegion: breakdown("Região", row => row.commercialRegion), bySector: breakdown("Setor", row => row.originalSector), byResponsible: breakdown("Responsável", row => row.responsible), byCategory: breakdown("Tipo de movimento", row => row.category), byBatch: breakdown("Lote de importação", row => row.batchId) } };
  }),
  fieldCoverage: commercialProcedure.query(async () => {
    const db = await getDb(); if (!db) return { available: [], missing: ["Dados insuficientes"] };
    const batches = await db.select({ mapping: importBatches.mapping }).from(importBatches).where(eq(importBatches.status, "Importado"));
    const available = new Set<string>();
    batches.forEach(batch => Object.keys((batch.mapping ?? {}) as Record<string, string>).forEach(field => available.add(field)));
    const requiredForFullReports = ["movementDate", "customerCode", "originalSector", "commercialRegion", "productCode", "productGroup", "weightKg", "netValue", "cfop", "operationNature"];
    return { available: Array.from(available), missing: requiredForFullReports.filter(field => !available.has(field)) };
  }),
});
