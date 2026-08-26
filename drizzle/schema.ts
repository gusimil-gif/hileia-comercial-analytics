import {
  bigint,
  boolean,
  date,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const profileValues = ["Administrador", "Gerência Comercial", "Analista", "Consulta"] as const;
export const movementCategories = ["Venda", "Devolução", "Bonificação", "Outros", "Cancelado"] as const;
export const batchStatuses = ["Rascunho", "Validado", "Importado", "Revertido", "Com erro"] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", profileValues).default("Consulta").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 32 }),
  address: text("address"),
  neighborhood: varchar("neighborhood", { length: 120 }),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 16 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customerAddresses = mysqlTable("customer_addresses", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => customers.id),
  address: text("address").notNull(),
  neighborhood: varchar("neighborhood", { length: 120 }),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 16 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  geocodingStatus: mysqlEnum("geocodingStatus", ["Pendente", "Validado", "Inválido"]).default("Pendente").notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const internalRegions = mysqlTable("internal_regions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
});

export const formalRegions = mysqlTable("formal_regions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  source: varchar("source", { length: 160 }),
  active: boolean("active").default(true).notNull(),
});

export const commercialSectors = mysqlTable("commercial_sectors", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  internalRegionId: int("internalRegionId").references(() => internalRegions.id),
  formalRegionId: int("formalRegionId").references(() => formalRegions.id),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const commercialPeople = mysqlTable("commercial_people", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  role: mysqlEnum("role", ["Responsável", "Representante", "Supervisor"]).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("commercial_people_unique").on(table.name, table.role)]);

export const priceTables = mysqlTable("price_tables", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const productGroups = mysqlTable("product_groups", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  parentName: varchar("parentName", { length: 160 }),
  active: boolean("active").default(true).notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  groupId: int("groupId").references(() => productGroups.id),
  subgroup: varchar("subgroup", { length: 160 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const commercialRoutes = mysqlTable("commercial_routes", {
  id: int("id").autoincrement().primaryKey(),
  internalRegion: varchar("internalRegion", { length: 160 }),
  formalRegion: varchar("formalRegion", { length: 160 }),
  newNomenclature: varchar("newNomenclature", { length: 180 }).notNull(),
  responsible: varchar("responsible", { length: 120 }),
  priceTable: varchar("priceTable", { length: 120 }),
  state: varchar("state", { length: 2 }),
  cities: json("cities"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const routeRules = mysqlTable("route_rules", {
  id: int("id").autoincrement().primaryKey(),
  routeId: int("routeId").notNull().references(() => commercialRoutes.id),
  scope: mysqlEnum("scope", ["Cliente", "Setor", "Localidade"]).notNull(),
  customerCode: varchar("customerCode", { length: 32 }),
  sectorCode: varchar("sectorCode", { length: 255 }),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 2 }),
  startsAt: date("startsAt").notNull(),
  endsAt: date("endsAt"),
  version: int("version").default(1).notNull(),
  source: varchar("source", { length: 160 }).notNull(),
  note: text("note"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("route_rules_scope_idx").on(table.scope, table.customerCode, table.sectorCode)]);

export const customerRouteExceptions = mysqlTable("customer_route_exceptions", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => customers.id),
  routeId: int("routeId").notNull().references(() => commercialRoutes.id),
  startsAt: date("startsAt").notNull(),
  endsAt: date("endsAt"),
  source: varchar("source", { length: 160 }).notNull(),
  note: text("note"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("customer_route_exception_idx").on(table.customerId, table.startsAt, table.endsAt)]);

export const classificationRules = mysqlTable("classification_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  priority: int("priority").default(100).notNull(),
  movementType: varchar("movementType", { length: 80 }),
  cfop: varchar("cfop", { length: 16 }),
  operationNature: varchar("operationNature", { length: 180 }),
  invoiceStatus: varchar("invoiceStatus", { length: 80 }),
  category: mysqlEnum("category", movementCategories).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const importBatches = mysqlTable("import_batches", {
  id: varchar("id", { length: 32 }).primaryKey(),
  sourceHash: varchar("sourceHash", { length: 128 }).notNull(),
  sourceName: varchar("sourceName", { length: 255 }).notNull(),
  status: mysqlEnum("status", batchStatuses).default("Rascunho").notNull(),
  importedBy: int("importedBy").notNull().references(() => users.id),
  totalRows: int("totalRows").default(0).notNull(),
  validRows: int("validRows").default(0).notNull(),
  errorRows: int("errorRows").default(0).notNull(),
  totalValue: decimal("totalValue", { precision: 18, scale: 2 }).default("0").notNull(),
  totalWeightKg: decimal("totalWeightKg", { precision: 18, scale: 3 }).default("0").notNull(),
  mapping: json("mapping"),
  revertedAt: timestamp("revertedAt"),
  revertedBy: int("revertedBy").references(() => users.id),
  reversalReason: text("reversalReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("import_batches_hash_unique").on(table.sourceHash)]);

export const sourceFiles = mysqlTable("source_files", {
  id: varchar("id", { length: 32 }).primaryKey(),
  batchId: varchar("batchId", { length: 32 }).notNull().references(() => importBatches.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 120 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  sourceHash: varchar("sourceHash", { length: 128 }).notNull(),
  sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const importRows = mysqlTable("import_rows", {
  id: varchar("id", { length: 32 }).primaryKey(),
  batchId: varchar("batchId", { length: 32 }).notNull().references(() => importBatches.id),
  rowNumber: int("rowNumber").notNull(),
  rawData: json("rawData").notNull(),
  normalizedData: json("normalizedData"),
  errors: json("errors"),
  status: mysqlEnum("status", ["Válida", "Com erro", "Ignorada"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("import_rows_batch_row_unique").on(table.batchId, table.rowNumber)]);

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  branch: varchar("branch", { length: 64 }).notNull(),
  number: varchar("number", { length: 64 }).notNull(),
  series: varchar("series", { length: 32 }).notNull(),
  emissionDate: date("emissionDate"),
  status: varchar("status", { length: 80 }),
  customerId: int("customerId").references(() => customers.id),
  originInvoiceNumber: varchar("originInvoiceNumber", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("invoices_unique_key").on(table.branch, table.number, table.series)]);

export const commercialMovements = mysqlTable("commercial_movements", {
  id: varchar("id", { length: 32 }).primaryKey(),
  batchId: varchar("batchId", { length: 32 }).notNull().references(() => importBatches.id),
  importRowId: varchar("importRowId", { length: 32 }).references(() => importRows.id),
  movementDate: date("movementDate"),
  emissionDate: date("emissionDate"),
  branch: varchar("branch", { length: 64 }),
  invoiceNumber: varchar("invoiceNumber", { length: 64 }),
  invoiceSeries: varchar("invoiceSeries", { length: 32 }),
  invoiceId: int("invoiceId").references(() => invoices.id),
  invoiceStatus: varchar("invoiceStatus", { length: 80 }),
  movementType: varchar("movementType", { length: 80 }),
  cfop: varchar("cfop", { length: 16 }),
  operationNature: varchar("operationNature", { length: 180 }),
  customerId: int("customerId").references(() => customers.id),
  customerCode: varchar("customerCode", { length: 32 }),
  customerName: varchar("customerName", { length: 255 }),
  productId: int("productId").references(() => products.id),
  productCode: varchar("productCode", { length: 64 }),
  productName: varchar("productName", { length: 255 }),
  productGroup: varchar("productGroup", { length: 160 }),
  originalSector: varchar("originalSector", { length: 32 }),
  commercialRegion: varchar("commercialRegion", { length: 160 }),
  newNomenclature: varchar("newNomenclature", { length: 180 }),
  responsible: varchar("responsible", { length: 120 }),
  representative: varchar("representative", { length: 120 }),
  supervisor: varchar("supervisor", { length: 120 }),
  priceTable: varchar("priceTable", { length: 120 }),
  quantity: decimal("quantity", { precision: 18, scale: 3 }).default("0").notNull(),
  weightKg: decimal("weightKg", { precision: 18, scale: 3 }).default("0").notNull(),
  productValue: decimal("productValue", { precision: 18, scale: 2 }).default("0").notNull(),
  discountValue: decimal("discountValue", { precision: 18, scale: 2 }).default("0").notNull(),
  netValue: decimal("netValue", { precision: 18, scale: 2 }).default("0").notNull(),
  returnValue: decimal("returnValue", { precision: 18, scale: 2 }).default("0").notNull(),
  bonusValue: decimal("bonusValue", { precision: 18, scale: 2 }).default("0").notNull(),
  originInvoiceNumber: varchar("originInvoiceNumber", { length: 64 }),
  campaign: varchar("campaign", { length: 255 }),
  category: mysqlEnum("category", movementCategories).default("Outros").notNull(),
  classificationRuleId: int("classificationRuleId").references(() => classificationRules.id),
  classificationStatus: mysqlEnum("classificationStatus", ["Classificado", "Pendente"]).default("Pendente").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("movements_date_idx").on(table.movementDate),
  index("movements_customer_idx").on(table.customerCode),
  index("movements_sector_idx").on(table.originalSector),
  index("movements_category_idx").on(table.category),
]);

export const fundPolicies = mysqlTable("fund_policies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  percentage: decimal("percentage", { precision: 7, scale: 4 }).notNull(),
  basisMonths: int("basisMonths").default(6).notNull(),
  startsAt: date("startsAt").notNull(),
  endsAt: date("endsAt"),
  active: boolean("active").default(true).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const promotionalFunds = mysqlTable("promotional_funds", {
  id: varchar("id", { length: 32 }).primaryKey(),
  customerId: int("customerId").notNull().references(() => customers.id),
  policyId: int("policyId").references(() => fundPolicies.id),
  basePeriodStart: date("basePeriodStart").notNull(),
  basePeriodEnd: date("basePeriodEnd").notNull(),
  baseRevenue: decimal("baseRevenue", { precision: 18, scale: 2 }).notNull(),
  percentage: decimal("percentage", { precision: 7, scale: 4 }).notNull(),
  generatedValue: decimal("generatedValue", { precision: 18, scale: 2 }).notNull(),
  availableFrom: date("availableFrom").notNull(),
  availableUntil: date("availableUntil").notNull(),
  usedValue: decimal("usedValue", { precision: 18, scale: 2 }).default("0").notNull(),
  cancelledValue: decimal("cancelledValue", { precision: 18, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["Disponível", "Utilizada", "Expirada", "Cancelada"]).default("Disponível").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const fundMovements = mysqlTable("fund_movements", {
  id: varchar("id", { length: 32 }).primaryKey(),
  fundId: varchar("fundId", { length: 32 }).notNull().references(() => promotionalFunds.id),
  type: mysqlEnum("type", ["Geração", "Utilização", "Cancelamento", "Expiração"]).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  campaign: varchar("campaign", { length: 255 }),
  proofKey: varchar("proofKey", { length: 500 }),
  responsible: varchar("responsible", { length: 120 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const importMappings = mysqlTable("import_mappings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 160 }).notNull(),
  sourceSignature: varchar("sourceSignature", { length: 255 }).notNull(),
  mapping: json("mapping").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("import_mapping_owner_name").on(table.userId, table.name)]);

export const savedViews = mysqlTable("saved_views", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 160 }).notNull(),
  target: varchar("target", { length: 80 }).notNull(),
  filters: json("filters").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 120 }).notNull(),
  entityId: varchar("entityId", { length: 64 }),
  previousValue: json("previousValue"),
  newValue: json("newValue"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_logs_entity_idx").on(table.entity, table.entityId), index("audit_logs_created_idx").on(table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
