import { ArrowRight } from "lucide-react";
import { Typography } from "@/design-system/atoms";

const EXAMPLE_RAW = [
  ["Data", "Valor", "Histórico", "Cliente"],
  ["01/06/2026", "500,00", "Pix recebido", "Maria Silva"],
  ["02/06/2026", "-19,90", "Tarifa boleto", "João Souza"],
];

const EXAMPLE_IMPORTED = [
  { data: "01/06/2026", valor: "R$ 500,00", descricao: "Pix recebido", quem: "Maria Silva" },
  { data: "02/06/2026", valor: "R$ 19,90", descricao: "Tarifa boleto", quem: "João Souza" },
];

function MiniTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="min-w-0 flex-1">
      <Typography variant="caption" tone="muted" className="mb-2 block font-medium">
        {title}
      </Typography>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface-sunken">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              {headers.map((header) => (
                <th key={header} className="px-2 py-1.5 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border/60 last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2 py-1.5 whitespace-nowrap">
                    {cell}
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

export function ImportFormatExample() {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <Typography variant="subtitle" className="mb-1">
        Como funciona
      </Typography>
      <Typography variant="caption" tone="muted" className="mb-4 block">
        Você envia o arquivo do banco. Nós lemos e organizamos os lançamentos automaticamente.
      </Typography>

      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        <MiniTable title="No arquivo do banco (exemplo)" headers={EXAMPLE_RAW[0]} rows={EXAMPLE_RAW.slice(1)} />
        <ArrowRight className="mx-auto h-5 w-5 shrink-0 text-primary lg:mx-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <Typography variant="caption" tone="muted" className="mb-2 block font-medium">
            No Fecho (como vamos importar)
          </Typography>
          <div className="overflow-x-auto rounded-lg border border-primary/20 bg-primary/5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-primary/20 text-muted-foreground">
                  <th className="px-2 py-1.5 font-medium">Data</th>
                  <th className="px-2 py-1.5 font-medium">Valor</th>
                  <th className="px-2 py-1.5 font-medium">O que foi</th>
                  <th className="px-2 py-1.5 font-medium">Quem pagou</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_IMPORTED.map((row) => (
                  <tr key={row.data + row.valor} className="border-b border-primary/10 last:border-0">
                    <td className="px-2 py-1.5 whitespace-nowrap">{row.data}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap font-medium">{row.valor}</td>
                    <td className="px-2 py-1.5">{row.descricao}</td>
                    <td className="px-2 py-1.5">{row.quem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
