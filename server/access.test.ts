import { describe, expect, it } from "vitest";
import { profileValues } from "../drizzle/schema";

describe("perfis comerciais", () => {
  it("preserva exatamente os quatro perfis obrigatórios", () => {
    expect(profileValues).toEqual(["Administrador", "Gerência Comercial", "Analista", "Consulta"]);
  });
});

