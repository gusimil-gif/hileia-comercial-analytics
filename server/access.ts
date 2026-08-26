import { TRPCError } from "@trpc/server";
import { profileValues } from "../drizzle/schema";
import { protectedProcedure } from "./_core/trpc";

export type Profile = (typeof profileValues)[number];

export function requireProfiles(...profiles: Profile[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!profiles.includes(ctx.user.role as Profile)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para esta ação." });
    }
    return next({ ctx });
  });
}

export const administratorProcedure = requireProfiles("Administrador");
export const commercialProcedure = requireProfiles("Administrador", "Gerência Comercial", "Analista");
