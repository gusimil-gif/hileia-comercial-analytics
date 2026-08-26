import { createContext, useContext, useMemo, useState } from "react";

export type CommercialFilters = { startDate?: string; endDate?: string; commercialRegion?: string; sector?: string; customerCode?: string; productCode?: string; category?: "Venda" | "Devolução" | "Bonificação" | "Outros" | "Cancelado" };
type FilterContextValue = { filters: CommercialFilters; setFilters: (filters: CommercialFilters) => void; clearFilters: () => void; activeCount: number };
const CommercialFiltersContext = createContext<FilterContextValue | null>(null);

export function CommercialFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<CommercialFilters>({});
  const value = useMemo(() => ({ filters, setFilters, clearFilters: () => setFilters({}), activeCount: Object.values(filters).filter(Boolean).length }), [filters]);
  return <CommercialFiltersContext.Provider value={value}>{children}</CommercialFiltersContext.Provider>;
}

export function useCommercialFilters() {
  const context = useContext(CommercialFiltersContext);
  if (!context) throw new Error("useCommercialFilters requer CommercialFiltersProvider");
  return context;
}
