import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api";
import type { IngestBatchResult } from "../types";
import { useToast } from "@/app/toast-provider";
import { documentosCopy } from "@/shared/copy/pt-BR";
import { classifyFilesForSummary } from "../lib/document-ui";

export function useDocumentIngest() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [lastBatch, setLastBatch] = useState<IngestBatchResult | null>(null);

  const ingestMutation = useMutation({
    mutationFn: (files: File[]) => documentsApi.ingest(files),
    onSuccess: (data) => {
      setLastBatch(data);
      setPendingFiles([]);
      setSummaryOpen(false);
      void qc.invalidateQueries({ queryKey: ["documents"] });
      void qc.invalidateQueries({ queryKey: ["frete-titulos"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
      toast(
        documentosCopy.processSuccess(
          data.summary.cte_ok + data.summary.cte_warning,
          data.summary.total,
        ),
        data.summary.failed ? "warning" : "success",
      );
    },
    onError: (err) => {
      toast(documentsApi.getError(err, "Falha ao importar documentos"), "error");
    },
  });

  const queueFiles = (files: File[]) => {
    if (!files.length) return;
    setPendingFiles(files);
    setSummaryOpen(true);
    setLastBatch(null);
  };

  const confirmIngest = () => {
    if (!pendingFiles.length) return;
    ingestMutation.mutate(pendingFiles);
  };

  const summaryCounts = {
    total: pendingFiles.length,
    ok: 0,
    warning: 0,
    failed: 0,
    byType: classifyFilesForSummary(pendingFiles),
  };

  return {
    pendingFiles,
    summaryOpen,
    setSummaryOpen,
    lastBatch,
    queueFiles,
    confirmIngest,
    summaryCounts,
    isPending: ingestMutation.isPending,
    clearPending: () => {
      setPendingFiles([]);
      setSummaryOpen(false);
    },
  };
}
