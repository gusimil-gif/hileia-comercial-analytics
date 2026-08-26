import { describe, expect, it } from "vitest";
import { applyRoute } from "./routers/imports";

const today = new Date("2026-08-26T00:00:00Z");
const rules = [
  { scope: "Localidade" as const, customerCode: null, sectorCode: null, city: "Belém", state: "PA", startsAt: today, endsAt: null, internalRegion: "Local", newNomenclature: "Rota local", responsible: "Local", priceTable: "Local" },
  { scope: "Setor" as const, customerCode: null, sectorCode: "100/206", city: null, state: null, startsAt: today, endsAt: null, internalRegion: "Setor", newNomenclature: "Rota setor", responsible: "Setor", priceTable: "Setor" },
  { scope: "Cliente" as const, customerCode: "C-1", sectorCode: null, city: null, state: null, startsAt: today, endsAt: null, internalRegion: "Cliente", newNomenclature: "Rota cliente", responsible: "Cliente", priceTable: "Cliente" },
];

describe("resolução territorial", () => {
  it("prioriza cliente, depois setor e por fim localidade", () => {
    const base = { movementDate: "2026-08-26", customerCode: "C-1", originalSector: "100", commercialRegion: "Belém", newNomenclature: undefined, responsible: undefined, priceTable: undefined };
    expect(applyRoute(base, rules).newNomenclature).toBe("Rota cliente");
    expect(applyRoute({ ...base, customerCode: "C-2" }, rules).newNomenclature).toBe("Rota setor");
    expect(applyRoute({ ...base, customerCode: "C-2", originalSector: "999" }, rules).newNomenclature).toBe("Rota local");
  });

  it("mantém o mesmo enriquecimento territorial na importação e no reprocessamento", () => {
    const sourceMovement = { movementDate: "2026-08-26", customerCode: "C-2", originalSector: "100", commercialRegion: "Belém", newNomenclature: undefined, responsible: undefined, priceTable: undefined };
    const imported = applyRoute(sourceMovement, rules);
    const reprocessed = applyRoute({ ...sourceMovement }, rules);
    expect(reprocessed).toEqual(imported);
  });
});
