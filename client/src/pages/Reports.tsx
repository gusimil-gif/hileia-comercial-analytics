import { useMemo } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCommercialFilters } from "@/contexts/CommercialFilters";

const reports = [
  { title: "Faturamento por região e setor", detail: "bySector" }, { title: "Faturamento por produto e grupo", detail: "byProductGroup" }, { title: "Produto, cliente e região", detail: "byCustomer" }, { title: "Participação regional", detail: "byRegion" }, { title: "Ranking ABC de clientes", detail: "byCustomer" }, { title: "Ranking ABC de produtos", detail: "byProduct" }, { title: "Bonificações emitidas", detail: "byCategory" }, { title: "Verbas versus faturamento", detail: "byCustomer" }, { title: "Devoluções detalhadas", detail: "byInvoice" }, { title: "Outros/Não classificados", detail: "byCategory" }, { title: "Conciliação por arquivo", detail: "byBatch" }, { title: "Adolfo – Comercial", detail: "byResponsible" },
] as const;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Reports() {
  const coverage = trpc.imports.fieldCoverage.useQuery();
  const { filters } = useCommercialFilters();
  const reconciliation = trpc.imports.reconciliation.useQuery(filters);
  const missing = coverage.data?.missing ?? [];
  const canExport = !missing.length && Boolean(reconciliation.data?.count);
  const description = useMemo(() => missing.length ? `Campos pendentes: ${missing.join(", ")}.` : "Os campos mínimos disponíveis permitem o cálculo do relatório.", [missing]);
  function reportRows(detail: typeof reports[number]["detail"]) { const rows = reconciliation.data?.details?.[detail]?.rows ?? []; const label = reconciliation.data?.details?.[detail]?.label ?? "Dimensão"; return { label, rows: rows.map(row => ({ [label]: row.label, Linhas: row.count, Vendas: row.sales, Devoluções: row.returns, Bonificações: row.bonuses, Faturamento_líquido: row.netValue, Peso_kg: row.weightKg })) }; }

  function exportXlsx(title: string, detail: typeof reports[number]["detail"]) { const data = reportRows(detail); const worksheet = XLSX.utils.json_to_sheet(data.rows); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório"); XLSX.writeFile(workbook, `${title.replaceAll(" ", "-")}.xlsx`); }
  function exportCsv(title: string, detail: typeof reports[number]["detail"]) { const data = reportRows(detail); const worksheet = XLSX.utils.json_to_sheet(data.rows); const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ";" }); const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${title.replaceAll(" ", "-")}.csv`; link.click(); URL.revokeObjectURL(url); }
  function exportPdf(title: string, detail: typeof reports[number]["detail"]) { const data = reportRows(detail); const pdf = new jsPDF({ orientation: "landscape" }); pdf.setFontSize(15); pdf.text(`Hiléia Comercial Analytics — ${title}`, 14, 16); pdf.setFontSize(8); pdf.text(`Emitido em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" })}`, 14, 22); autoTable(pdf, { startY: 28, head: [[data.label, "Linhas", "Vendas", "Devoluções", "Bonificações", "Líquido", "Peso (kg)"]], body: data.rows.map(row => [String(row[data.label]), row.Linhas, currency.format(row.Vendas), currency.format(row.Devoluções), currency.format(row.Bonificações), currency.format(row.Faturamento_líquido), row.Peso_kg.toLocaleString("pt-BR")]), styles: { fontSize: 8 } }); pdf.save(`${title.replaceAll(" ", "-")}.pdf`); }

  return <div><PageHeader eyebrow="RELATÓRIOS COMERCIAIS" title="Leituras filtráveis, prontas para decisão" description="Selecione uma visão e exporte o recorte em Excel, CSV ou PDF. A plataforma nunca preenche campos comerciais ausentes com suposições."/><Card className="rounded-3xl border-[#ecd8bd] bg-white"><CardContent className="p-6"><div className="flex gap-3 rounded-2xl bg-[#fff8e8] p-4"><Info className="mt-0.5 h-5 w-5 shrink-0 text-[#c66c16]"/><div><p className="font-semibold text-[#483422]">Cobertura do conjunto importado</p><p className="mt-1 text-sm text-[#756656]">{description}</p>{missing.length ? <Badge className="mt-3 bg-[#fff0d5] text-[#774a17] hover:bg-[#fff0d5]">Dados insuficientes</Badge> : <Badge className="mt-3 bg-[#edf8ef] text-[#16803c] hover:bg-[#edf8ef]">Campos disponíveis</Badge>}</div></div><div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{reports.map((report, index) => <div key={report.title} className="rounded-2xl border border-[#eee0cf] p-4"><div className="flex items-start justify-between gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fff0d5] text-xs font-bold text-[#9e5719]">{String(index + 1).padStart(2, "0")}</span>{canExport ? <Badge variant="outline" className="border-[#c8e5d1] text-[10px] text-[#16803c]">Disponível</Badge> : <Badge variant="outline" className="border-[#efc4bf] text-[10px] text-[#b42318]">Dados insuficientes</Badge>}</div><p className="mt-4 text-sm font-bold text-[#32271f]">{report.title}</p><p className="mt-1 text-xs leading-5 text-[#7d6d5f]">Exporta o recorte atual com filtros e a dimensão de análise correspondente.</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!canExport} className="rounded-lg text-xs" onClick={() => exportXlsx(report.title, report.detail)}><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5"/>Excel</Button><Button variant="outline" size="sm" disabled={!canExport} className="rounded-lg text-xs" onClick={() => exportCsv(report.title, report.detail)}><Download className="mr-1.5 h-3.5 w-3.5"/>CSV</Button><Button variant="outline" size="sm" disabled={!canExport} className="rounded-lg text-xs" onClick={() => exportPdf(report.title, report.detail)}><FileText className="mr-1.5 h-3.5 w-3.5"/>PDF</Button></div></div>)}</div></CardContent></Card></div>;
}
