import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { profileValues, users } from "../drizzle/schema";
import { administratorProcedure, commercialProcedure } from "./access";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, listAuditLogs, recordAudit, upsertUser } from "./db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { importsRouter } from "./routers/imports";
import { classificationRouter } from "./routers/classification";
import { routesRouter } from "./routers/routes";
import { fundsRouter } from "./routers/funds";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    mode: publicProcedure.query(() => ({ external: ENV.externalAuth })),
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(8).max(200) })).mutation(async ({ ctx, input }) => {
      if (!ENV.externalAuth) throw new Error("O login externo não está habilitado.");
      const email = input.email.trim().toLowerCase();
      if (!ENV.externalAdminEmail || !ENV.externalAdminPassword || !safeEqual(email, ENV.externalAdminEmail.trim().toLowerCase()) || !safeEqual(input.password, ENV.externalAdminPassword)) throw new Error("E-mail ou senha inválidos.");
      const openId = `local:${email}`;
      await upsertUser({ openId, name: ENV.externalAdminName, email, loginMethod: "password", role: "Administrador", lastSignedIn: new Date() });
      const token = await sdk.createSessionToken(openId, { name: ENV.externalAdminName });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 365 * 24 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
    profiles: protectedProcedure.query(() => profileValues),
    updateProfile: administratorProcedure.input(z.object({ userId: z.number().int(), role: z.enum(profileValues) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const previous = await db.select({ id: users.id, role: users.role, name: users.name }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!previous[0]) throw new Error("Usuário não encontrado.");
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await recordAudit({ id: nanoid(), userId: ctx.user.id, action: "ALTERAR_PERFIL", entity: "Usuário", entityId: String(input.userId), previousValue: previous[0], newValue: { role: input.role } });
      return { success: true };
    }),
  }),
  governance: router({
    audit: commercialProcedure.input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional()).query(({ input }) => listAuditLogs(input?.limit ?? 50)),
  }),
  imports: importsRouter,
  classification: classificationRouter,
  routes: routesRouter,
  funds: fundsRouter,
});

export type AppRouter = typeof appRouter;
