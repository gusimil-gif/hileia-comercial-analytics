import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileUp, Loader2, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ParsedFile = { file: File; rows: Record<string, unknown>[]; headers: string[]; base64: string };
const allowed = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"] as const;
const mapFields = [
  ["movementDate", "Data do movimento"], ["invoiceNumber", "Número da NF"], ["customerCode", "Código do cliente"], ["customerName", "Nome do cliente"], ["originalSector", "Setor"], ["productCode", "Código do produto"], ["productName", "Descrição do produto"], ["productGroup", "Grupo"], ["weightKg", "Peso em kg"], ["netValue", "Valor líquido"], ["cfop", "CFOP"], ["operationNature", "Natureza"],
] as const;

function toBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let start = 0; start < bytes.length; start += 8192) {
    const chunk = bytes.subarray(start, start + 8192);
    const chars: number[] = [];
    for (let index = 0; index < chunk.length; index += 1) chars.push(chunk[index]);
    binary += String.fromCharCode.apply(null, chars);
  }
  return btoa(binary);
}

function readCommercialRows(sheet: XLSX.WorkSheet) {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const headerIndex = matrix.findIndex(row => {
    const cells = row.map(normalized);
    return cells.some(cell => cell === "nf" || cell.includes("nota fiscal")) && cells.some(cell => cell.includes("cliente")) && cells.some(cell => cell.includes("peso"));
  });
  if (headerIndex < 0) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    return { rows, headers: rows.length ? Object.keys(rows[0]) : [] };
  }
  const headers = matrix[headerIndex].map((cell, index) => String(cell || `Coluna ${index + 1}`).trim());
  const rows = matrix.slice(headerIndex + 1).flatMap(row => {
    const first = normalized(row[0]);
    const isRepeatedHeader = row.some(cell => normalized(cell) === "nf") || first.includes("representante") || first.includes("total");
    const hasInvoice = /^\d{4,}$/.test(first.replace(/\D/g, ""));
    if (isRepeatedHeader || !hasInvoice) return [];
    return [Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))];
  });
  return { rows, headers };
}

export default function ImportCenter() {
  const [queue, setQueue] = useState<ParsedFile[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingName, setMappingName] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const utils = trpc.useUtils();
  const batches = trpc.imports.list.useQuery();
  const mappings = trpc.imports.mappings.useQuery();
  const errors = trpc.imports.errors.useQuery({ batchId: selectedBatch ?? "pendente" }, { enabled: Boolean(selectedBatch) });
  const create = trpc.imports.create.useMutation({ onSuccess: () => utils.imports.list.invalidate() });
  const reverse = trpc.imports.revert.useMutation({ onSuccess: () => utils.imports.list.invalidate() });
  const saveMapping = trpc.imports.saveMapping.useMutation({ onSuccess: () => { utils.imports.mappings.invalidate(); toast.success("Modelo de mapeamento salvo."); } });
  const reprocess = trpc.imports.reprocessRow.useMutation({ onSuccess: () => { errors.refetch(); utils.imports.list.invalidate(); } });
  const preview = useMemo(() => queue[0]?.rows.slice(0, 5) ?? [], [queue]);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const parsed: ParsedFile[] = [];
    for (const file of Array.from(files)) {
      try {
        if (file.size > 15 * 1024 * 1024) throw new Error("Arquivo acima de 15 MB");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const { rows, headers } = readCommercialRows(sheet);
        if (!rows.length) throw new Error("Não foram encontradas linhas tabulares");
        parsed.push({ file, rows, headers, base64: toBase64(buffer) });
      } catch (error) {
        toast.error(`${file.name}: ${error instanceof Error ? error.message : "falha ao ler"}`);
      }
    }
    setQueue(current => [...current, ...parsed]);
  }

  async function importAll() {
    if (!queue.length) return;
    setBusy(true);
    try {
      for (const item of queue) {
        const contentType = allowed.includes(item.file.type as (typeof allowed)[number]) ? item.file.type as (typeof allowed)[number] : item.file.name.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        await create.mutateAsync({ fileName: item.file.name, contentType, payloadBase64: item.base64, rows: item.rows, mapping });
      }
      toast.success("Lote(s) importado(s) com rastreabilidade preservada.");
      setQueue([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar os arquivos.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrentMapping() {
    if (!queue[0] || !mappingName.trim()) { toast.error("Informe um nome para o modelo de mapeamento."); return; }
    await saveMapping.mutateAsync({ name: mappingName.trim(), sourceSignature: queue[0].headers.join(" | ").slice(0, 255), mapping });
  }

  async function reverseBatch(batchId: string) {
    const reason = window.prompt("Informe o motivo da reversão controlada (mínimo de 8 caracteres):");
    if (!reason) return;
    try { await reverse.mutateAsync({ batchId, reason }); toast.success("Lote revertido; o histórico foi preservado."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao reverter lote."); }
  }

  async function reprocessErrors() {
    if (!selectedBatch || !errors.data?.length) return;
    for (const row of errors.data) await reprocess.mutateAsync({ batchId: selectedBatch, rowId: row.id, mapping });
    toast.success("Linhas reprocessadas. Consulte novamente o relatório de erros.");
  }

  async function reprocessOne(rowId: string) {
    if (!selectedBatch) return;
    await reprocess.mutateAsync({ batchId: selectedBatch, rowId, mapping });
    toast.success("Linha reprocessada.");
  }

  return (
    <div>
      <PageHeader eyebrow="CENTRAL DE IMPORTAÇÕES" title="Receba, valide e preserve a origem" description="Importe vários arquivos Excel ou CSV. O original é protegido, associado a um hash e vinculado ao lote antes de qualquer análise." action={<Button disabled={!queue.length || busy} onClick={importAll} className="rounded-xl bg-[#d71920] hover:bg-[#b42318]">{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processando</> : <><UploadCloud className="mr-2 h-4 w-4"/>Confirmar importação</>}</Button>} />

      <Card className="rounded-3xl border-2 border-dashed border-[#e6c58e] bg-white"><CardContent className="p-7">
        <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl bg-[#fff8e8] text-center transition hover:bg-[#fff0d5]">
          <input type="file" accept=".xlsx,.xls,.csv" multiple className="sr-only" onChange={event => onFiles(event.target.files)} />
          <span><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm"><FileUp className="h-6 w-6 text-[#d06b15]" /></span><span className="mt-3 block text-sm font-bold text-[#3c2b1f]">Arraste arquivos ou clique para selecionar</span><span className="mt-1 block text-xs text-[#7d6c5b]">.xlsx, .xls ou .csv · até 15 MB por arquivo · seleção múltipla permitida</span></span>
        </label>
        <div className="mt-5 flex flex-wrap gap-2 text-xs"><Badge variant="outline" className="border-[#c8e5d1] bg-[#f2fbf5] text-[#16803c]"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Hash antirrepetição</Badge><Badge variant="outline" className="border-[#efd7b6] bg-white text-[#795b3e]"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Validação antes da gravação</Badge><Badge variant="outline" className="border-[#efd7b6] bg-white text-[#795b3e]"><FileSpreadsheet className="mr-1 h-3.5 w-3.5" />Arquivo original vinculado ao lote</Badge></div>
      </CardContent></Card>

      {queue.length ? <Card className="mt-5 rounded-3xl border-[#ecd8bd] bg-white"><CardContent className="p-6">
        <div className="flex items-center justify-between"><div><p className="font-bold text-[#30251d]">Prévia e mapeamento</p><p className="text-xs text-[#7d6c5b]">Associe as colunas do arquivo ao dicionário comercial e salve o modelo para reutilizá-lo.</p></div><Button variant="ghost" size="sm" onClick={() => setQueue([])}>Limpar fila</Button></div>
        <div className="mt-4 flex flex-wrap gap-2">{queue.map(item => <Badge key={item.file.name} className="bg-[#fff0d5] text-[#663e13] hover:bg-[#fff0d5]">{item.file.name} · {item.rows.length} linhas</Badge>)}</div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{mapFields.map(([key, label]) => <label key={key} className="rounded-xl border border-[#eee0cf] p-3 text-xs"><span className="block font-semibold text-[#5b4837]">{label}</span><select className="mt-2 w-full bg-transparent text-xs outline-none" value={mapping[key] ?? ""} onChange={event => setMapping(current => ({ ...current, [key]: event.target.value }))}><option value="">Detecção automática</option>{queue[0].headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-[#fff8e8] p-3 sm:flex-row"><Input className="bg-white" placeholder="Nome do modelo de mapeamento" value={mappingName} onChange={event => setMappingName(event.target.value)} /><select className="rounded-lg border border-[#e4d0b3] bg-white px-3 text-sm" defaultValue="" onChange={event => { const item = mappings.data?.find(model => model.id === event.target.value); if (item) setMapping(item.mapping as Record<string, string>); }}><option value="">Carregar modelo salvo</option>{mappings.data?.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select><Button variant="outline" className="rounded-lg" onClick={saveCurrentMapping}>Salvar modelo</Button></div>
        <div className="mt-5 overflow-auto rounded-xl border border-[#eee0cf]"><Table><TableHeader><TableRow>{queue[0].headers.slice(0, 6).map(header => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{preview.map((row, index) => <TableRow key={index}>{queue[0].headers.slice(0, 6).map(header => <TableCell key={header} className="max-w-40 truncate text-xs">{String(row[header] ?? "—")}</TableCell>)}</TableRow>)}</TableBody></Table></div>
      </CardContent></Card> : null}

      <section className="mt-6"><div className="mb-3"><p className="font-bold text-[#30251d]">Histórico de lotes</p><p className="text-xs text-[#7d6c5b]">A reversão desativa movimentos, mas nunca apaga o arquivo nem a trilha de auditoria.</p></div><Card className="rounded-3xl border-[#ecd8bd] bg-white"><CardContent className="p-0"><div className="overflow-auto"><Table><TableHeader><TableRow><TableHead>Arquivo</TableHead><TableHead>Status</TableHead><TableHead>Linhas válidas</TableHead><TableHead>Erros</TableHead><TableHead>Valor</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{batches.data?.length ? batches.data.map(batch => <TableRow key={batch.id}><TableCell className="font-medium">{batch.sourceName}</TableCell><TableCell><Badge variant="outline" className={batch.status === "Revertido" ? "border-[#efc4bf] text-[#b42318]" : "border-[#c8e5d1] text-[#16803c]"}>{batch.status}</Badge></TableCell><TableCell>{batch.validRows}/{batch.totalRows}</TableCell><TableCell>{batch.errorRows}</TableCell><TableCell>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(batch.totalValue))}</TableCell><TableCell className="space-x-1 text-right">{batch.errorRows ? <Button size="sm" variant="ghost" onClick={() => setSelectedBatch(batch.id)}>Erros</Button> : null}{batch.status !== "Revertido" ? <Button size="sm" variant="ghost" className="text-[#b42318]" onClick={() => reverseBatch(batch.id)}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reverter</Button> : "—"}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="h-28 text-center text-sm text-[#7d6c5b]"><AlertTriangle className="mx-auto mb-2 h-5 w-5 text-[#d06b15]" />Nenhum lote importado.</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card></section>

      {selectedBatch ? <Card className="mt-5 rounded-3xl border-[#efd1ca] bg-white"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="font-bold text-[#652b24]">Relatório de erros do lote</p><p className="text-xs text-[#815c54]">Linhas rejeitadas, motivo e reprocessamento com o mapeamento atual.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={reprocessErrors} disabled={!errors.data?.length || reprocess.isPending}>Reprocessar linhas</Button><Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)}>Fechar</Button></div></div><div className="mt-4 space-y-2">{errors.data?.length ? errors.data.map(row => <div key={row.id} className="flex flex-col gap-2 rounded-xl bg-[#fff4f2] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span><strong>Linha {row.rowNumber}:</strong> {Array.isArray(row.errors) ? row.errors.join(" · ") : "Erro de validação"}</span><Button size="sm" variant="outline" onClick={() => reprocessOne(row.id)} disabled={reprocess.isPending}>Reprocessar linha</Button></div>) : <p className="text-sm text-[#7d6c5b]">Nenhum erro encontrado neste lote.</p>}</div></CardContent></Card> : null}
    </div>
  );
}
