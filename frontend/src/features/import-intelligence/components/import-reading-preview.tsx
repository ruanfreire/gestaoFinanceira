import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Callout } from "@/design-system/molecules";
import { Label, Typography } from "@/design-system/atoms";
import type { ImportAnalysisResult, ImportProfileMapping, StatementFileMetadata } from "../types";
import { formatDate, formatMoney } from "@/lib/format";

const READING_FIELDS: Array<{
  key: keyof ImportProfileMapping["columns"];
  label: string;
  importLabel: string;
  required?: boolean;
}> = [
  { key: "data", label: "Data do pagamento", importLabel: "Data", required: true },
  { key: "valor", label: "Valor em reais", importLabel: "Valor", required: true },
  { key: "descricao", label: "Descrição do lançamento", importLabel: "O que foi" },
  { key: "tipo_transacao", label: "Tipo da operação", importLabel: "Tipo" },
  { key: "pagador_nome", label: "Nome de quem pagou", importLabel: "Quem pagou" },
  { key: "saldo", label: "Saldo após lançamento", importLabel: "Saldo" },
  { key: "documento", label: "Documento / comprovante", importLabel: "Documento" },
  { key: "transacao_id", label: "ID ou referência única", importLabel: "ID" },
];

type SampleRow = ImportAnalysisResult["sample_normalized"][number];

function formatRowDate(value?: string) {
  if (!value) return "—";
  return formatDate(value);
}

function ReadingStatus({
  analysis,
  mapping,
}: {
  analysis: ImportAnalysisResult;
  mapping: ImportProfileMapping;
}) {
  const hasRequired = Boolean(mapping.columns.data && mapping.columns.valor);
  const hasRows = (analysis.total_rows_parsed ?? 0) > 0;

  if (hasRequired && hasRows) {
    return (
      <Callout variant="success" title="Leitura automática concluída">
        <Typography variant="body">
          Encontramos <strong>{analysis.total_rows_parsed}</strong> lançamento
          {analysis.total_rows_parsed === 1 ? "" : "s"} no seu arquivo. Confira abaixo se está tudo certo antes de
          importar.
        </Typography>
      </Callout>
    );
  }

  return (
    <Callout variant="warning" title="Precisamos da sua ajuda">
      <Typography variant="body">
        Não conseguimos identificar automaticamente a data ou o valor. Use &quot;Ajustar leitura&quot; abaixo para
        indicar qual coluna é qual.
      </Typography>
    </Callout>
  );
}

function pagadorExtractedInPreview(analysis: ImportAnalysisResult): boolean {
  return (analysis.sample_normalized ?? []).some(
    (row) => row.tipo_movimento !== "saida" && Boolean(row.pagador_nome?.trim()),
  );
}

function pagadorFieldStatus(
  mapping: ImportProfileMapping,
  analysis: ImportAnalysisResult,
): "column" | "sanitized" | "optional-missing" {
  const column = mapping.columns.pagador_nome;
  const hasDedicatedColumn = Boolean(column && column !== mapping.columns.descricao);
  if (hasDedicatedColumn) return "column";
  if (pagadorExtractedInPreview(analysis) || mapping.columns.descricao) return "sanitized";
  return "optional-missing";
}

function FieldMatches({
  mapping,
  analysis,
}: {
  mapping: ImportProfileMapping;
  analysis: ImportAnalysisResult;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {READING_FIELDS.map(({ key, label, required }) => {
        const column = mapping.columns[key];
        const pagadorStatus = key === "pagador_nome" ? pagadorFieldStatus(mapping, analysis) : null;
        const ok =
          key === "pagador_nome"
            ? pagadorStatus === "column" || pagadorStatus === "sanitized"
            : Boolean(column);
        const Icon = ok ? CheckCircle2 : required ? AlertTriangle : CheckCircle2;

        let caption: ReactNode;
        if (key === "pagador_nome") {
          if (pagadorStatus === "column") {
            caption = (
              <>
                Coluna <strong className="text-foreground">&quot;{column}&quot;</strong> no arquivo
              </>
            );
          } else if (pagadorStatus === "sanitized") {
            caption = pagadorExtractedInPreview(analysis) ? (
              <>
                <strong className="text-foreground">Sanitizado pelo sistema</strong> — extraído da descrição
              </>
            ) : (
              <>
                <strong className="text-foreground">Sanitizado pelo sistema</strong> na importação (via descrição)
              </>
            );
          } else {
            caption = "Opcional — não encontrada";
          }
        } else if (ok) {
          caption = (
            <>
              Coluna <strong className="text-foreground">&quot;{column}&quot;</strong> no arquivo
            </>
          );
        } else if (required) {
          caption = "Não identificada — ajuste manualmente";
        } else {
          caption = "Opcional — não encontrada";
        }

        return (
          <div
            key={key}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              ok ? "border-success/30 bg-success-subtle/40" : required ? "border-warning/30 bg-warning-subtle/40" : "border-border bg-surface-sunken"
            }`}
          >
            <Icon
              className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? "text-success" : required ? "text-warning" : "text-muted-foreground"}`}
              aria-hidden
            />
            <div className="min-w-0">
              <Typography variant="caption" className="block font-medium">
                {label}
              </Typography>
              <Typography variant="caption" tone="muted">
                {caption}
              </Typography>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportedPreviewTable({ rows }: { rows: SampleRow[] }) {
  if (rows.length === 0) return null;

  const showTipo = rows.some((row) => row.tipo_transacao?.trim());
  const showSaldo = rows.some((row) => row.saldo_pos != null);
  const showDoc = rows.some((row) => row.documento_ref?.trim());
  const showFatura = rows.some((row) => row.fatura_numero?.trim());

  return (
    <div className="stack-gap-sm">
      <Typography variant="subtitle">Assim vamos importar no Fecho</Typography>
      <Typography variant="caption" tone="muted">
        Prévia dos primeiros lançamentos já organizados pelo sistema. Todas as colunas do arquivo ficam guardadas no
        lançamento.
      </Typography>
      <div className="overflow-x-auto rounded-xl border border-primary/20">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-muted-foreground">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              {showTipo ? <th className="px-3 py-2 font-medium">Tipo</th> : null}
              <th className="px-3 py-2 font-medium">O que foi</th>
              <th className="px-3 py-2 font-medium">Quem pagou</th>
              {showSaldo ? <th className="px-3 py-2 font-medium">Saldo</th> : null}
              {showDoc ? <th className="px-3 py-2 font-medium">Documento</th> : null}
              {showFatura ? <th className="px-3 py-2 font-medium">Fatura</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row) => (
              <tr key={row.transacao_id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap">{formatRowDate(row.data)}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">{formatMoney(row.valor)}</td>
                {showTipo ? <td className="px-3 py-2 whitespace-nowrap">{row.tipo_transacao || "—"}</td> : null}
                <td className="px-3 py-2">{row.descricao || "—"}</td>
                <td className="px-3 py-2">{row.pagador_nome || "—"}</td>
                {showSaldo ? (
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.saldo_pos != null ? formatMoney(row.saldo_pos) : "—"}
                  </td>
                ) : null}
                {showDoc ? <td className="px-3 py-2 whitespace-nowrap">{row.documento_ref || "—"}</td> : null}
                {showFatura ? <td className="px-3 py-2 whitespace-nowrap">{row.fatura_numero || "—"}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FileMetadataSummary({ metadata }: { metadata: StatementFileMetadata }) {
  const items: Array<{ label: string; value: string }> = [];
  if (metadata.saldo_inicial != null) {
    items.push({ label: "Saldo inicial", value: formatMoney(metadata.saldo_inicial) });
  }
  if (metadata.empresa_nome?.trim()) items.push({ label: "Empresa", value: metadata.empresa_nome.trim() });
  if (metadata.empresa_cnpj?.trim()) items.push({ label: "CNPJ", value: metadata.empresa_cnpj.trim() });
  if (metadata.conta_corrente?.trim()) items.push({ label: "Conta", value: metadata.conta_corrente.trim() });
  if (metadata.periodo?.trim()) items.push({ label: "Período", value: metadata.periodo.trim() });
  if (metadata.extra_columns?.length) {
    items.push({
      label: "Colunas extras preservadas",
      value: metadata.extra_columns.join(", "),
    });
  }

  if (items.length === 0) return null;

  return (
    <Callout variant="info" title="Dados encontrados no cabeçalho do arquivo">
      <ul className="mt-1 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <strong>{item.label}:</strong> {item.value}
          </li>
        ))}
      </ul>
    </Callout>
  );
}

function RawFilePreview({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  if (!headers.length || !rows.length) return null;

  return (
    <div className="stack-gap-sm">
      <Typography variant="subtitle">Como está no seu arquivo</Typography>
      <Typography variant="caption" tone="muted">
        Primeiras linhas do extrato que você enviou (sem alteração).
      </Typography>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-muted-foreground">
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border/60 last:border-0">
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {row[cellIndex] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AiEnhancementStatus({ analysis }: { analysis: ImportAnalysisResult }) {
  if (!analysis.ai_attempted) {
    return (
      <Callout variant="info" title="IA desativada">
        <Typography variant="body">
          Esta análise usou apenas heurística. Ative <code className="text-small">IMPORT_AI_ENABLED</code> com Groq ou
          Gemini no servidor para refinamento automático.
        </Typography>
      </Callout>
    );
  }

  if (analysis.ai_applied) {
    return (
      <Callout variant="success" title="IA aplicada na leitura">
        <Typography variant="body">
          O extrato foi refinado com IA ({analysis.ai_provider ?? "provedor configurado"}) — mapeamento de colunas e/ou
          nomes de pagadores extraídos das descrições.
        </Typography>
      </Callout>
    );
  }

  return (
    <Callout variant="info" title="IA consultada">
      <Typography variant="body">
        A IA analisou o arquivo ({analysis.ai_provider ?? "provedor configurado"}) e manteve a leitura heurística —
        já estava consistente. Métricas em Configurações → Importação inteligente.
      </Typography>
    </Callout>
  );
}

export function ImportReadingPreview({
  analysis,
  mapping,
  headers,
  onMappingChange,
}: {
  analysis: ImportAnalysisResult;
  mapping: ImportProfileMapping;
  headers: string[];
  onMappingChange: (field: keyof ImportProfileMapping["columns"], value: string) => void;
}) {
  const [showAdjust, setShowAdjust] = useState(false);

  return (
    <div className="stack-gap">
      <ReadingStatus analysis={analysis} mapping={mapping} />
      <AiEnhancementStatus analysis={analysis} />

      {analysis.banco_label_suggested && (
        <Typography variant="body">
          Banco identificado: <strong>{analysis.banco_label_suggested}</strong>
        </Typography>
      )}

      {analysis.file_metadata ? <FileMetadataSummary metadata={analysis.file_metadata} /> : null}

      <ImportedPreviewTable rows={analysis.sample_normalized} />

      <RawFilePreview headers={headers} rows={analysis.sample_raw_rows ?? []} />

      <FieldMatches mapping={mapping} analysis={analysis} />

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm transition-default hover:bg-surface-sunken"
        onClick={() => setShowAdjust((open) => !open)}
      >
        <span>
          <Typography variant="subtitle" className="block">
            Algo não bateu? Ajustar leitura
          </Typography>
          <Typography variant="caption" tone="muted">
            Só use se a prévia acima estiver errada
          </Typography>
        </span>
        {showAdjust ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showAdjust && (
        <div className="stack-gap-sm rounded-lg border border-border bg-surface-sunken p-4">
          <Typography variant="caption" tone="muted">
            Escolha qual coluna do seu arquivo corresponde a cada informação.
          </Typography>
          {READING_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label htmlFor={`col-${key}`}>{label}</Label>
              <select
                id={`col-${key}`}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={mapping.columns[key] || ""}
                onChange={(e) => onMappingChange(key, e.target.value)}
              >
                <option value="">— não usar —</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
