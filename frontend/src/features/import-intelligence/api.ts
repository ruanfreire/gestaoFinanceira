import api, { getApiErrorMessage } from "@/lib/api-client";
import type {
  ImportAnalysisResult,
  ImportPreset,
  ImportPresetKey,
  ImportProfile,
  ImportProfileMapping,
  ImportResult,
  ImportValidationReport,
} from "./types";

export type ImportMetrics = {
  imports_total: number;
  preview_vs_import_match_rate: number;
  suggestion_accepted_rate: number;
  profiles_active: number;
  profiles_system: number;
};

export type GeminiOpsStats = {
  period_days: number;
  total_calls: number;
  success_calls: number;
  failed_calls: number;
  estimated_tokens_30d: number;
  avg_latency_ms: number;
  today_calls: number;
  daily_limit: number;
  remaining_today: number;
};

export type ImportAnalysisSessionSummary = {
  _id: string;
  file_name: string;
  file_kind: string;
  outcome: string;
  createdAt: string;
};

export type ImportOpsDashboard = {
  metrics: ImportMetrics;
  gemini: GeminiOpsStats;
  sessions: { items: ImportAnalysisSessionSummary[]; total: number };
};

export const importIntelligenceApi = {
  async listPresets() {
    const res = await api.get<{ items: ImportPreset[] }>("/import-intelligence/presets");
    return res.data.items ?? [];
  },

  async analyze(file: File, presetKey?: ImportPresetKey) {
    const form = new FormData();
    form.append("file", file);
    if (presetKey) form.append("preset_key", presetKey);
    const res = await api.post<ImportAnalysisResult>("/import-intelligence/analyze", form);
    return res.data;
  },

  async preview(file: File, mapping: ImportProfileMapping) {
    const form = new FormData();
    form.append("file", file);
    form.append("mapping", JSON.stringify(mapping));
    const res = await api.post<ImportValidationReport>("/import-intelligence/preview", form);
    return res.data;
  },

  async saveProfile(payload: {
    name: string;
    banco_label: string;
    empresa_nome?: string;
    empresa_cnpj?: string;
    conta_corrente?: string;
    mapping: ImportProfileMapping;
    confidence_score?: number;
    file_kind?: "csv" | "json" | "xlsx";
    system_key?: string;
  }) {
    const res = await api.post<ImportProfile>("/import-intelligence/profiles", payload);
    return res.data;
  },

  async updateProfile(
    id: string,
    payload: {
      name?: string;
      banco_label?: string;
      empresa_nome?: string;
      empresa_cnpj?: string;
      conta_corrente?: string;
      mapping?: ImportProfileMapping;
    },
  ) {
    const res = await api.patch<ImportProfile>(`/import-intelligence/profiles/${id}`, payload);
    return res.data;
  },

  async deleteProfile(id: string) {
    const res = await api.delete<{ ok: boolean; id: string }>(`/import-intelligence/profiles/${id}`);
    return res.data;
  },

  async listProfiles() {
    const res = await api.get<{ items: ImportProfile[] }>("/import-intelligence/profiles");
    return res.data.items ?? [];
  },

  async import(
    file: File,
    profileId: string,
    options?: {
      label?: string;
      mapping?: ImportProfileMapping;
      mappingBefore?: ImportProfileMapping;
      suggestionAcceptedWithoutEdit?: boolean;
    },
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("profile_id", profileId);
    if (options?.mapping) {
      form.append("mapping", JSON.stringify(options.mapping));
    }
    if (options?.label?.trim()) form.append("label", options.label.trim());
    if (options?.mappingBefore) {
      form.append("mapping_before", JSON.stringify(options.mappingBefore));
    }
    if (options?.suggestionAcceptedWithoutEdit) {
      form.append("suggestion_accepted_without_edit", "true");
    }
    const res = await api.post<ImportResult>("/import-intelligence/import", form);
    return res.data;
  },

  async submitFeedback(payload: {
    profile_id: string;
    before_mapping: ImportProfileMapping;
    after_mapping: ImportProfileMapping;
    accepted: boolean;
  }) {
    const res = await api.post<{ ok: boolean }>("/import-intelligence/feedback", payload);
    return res.data;
  },

  async getMetrics() {
    const res = await api.get<ImportMetrics>("/import-intelligence/metrics");
    return res.data;
  },

  async getOps() {
    const res = await api.get<ImportOpsDashboard>("/import-intelligence/ops");
    return res.data;
  },

  async listSessions(limit = 20) {
    const res = await api.get<{ items: ImportAnalysisSessionSummary[]; total: number }>(
      `/import-intelligence/sessions?limit=${limit}`,
    );
    return res.data;
  },

  getError(error: unknown, fallback: string) {
    return getApiErrorMessage(error, fallback);
  },
};
