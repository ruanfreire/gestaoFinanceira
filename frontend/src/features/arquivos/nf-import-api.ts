import api, { getApiErrorMessage } from "@/lib/api-client";
import type {
  NfImportAnalysisResult,
  NfImportProfile,
  NfImportProfileMapping,
  NfImportResult,
  NfImportValidationReport,
} from "./nf-import-types";

export const nfImportApi = {
  async listProfiles() {
    const res = await api.get<{ items: NfImportProfile[] }>("/import-intelligence/notas/profiles");
    return res.data.items ?? [];
  },

  async analyze(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<NfImportAnalysisResult>("/import-intelligence/notas/analyze", form);
    return res.data;
  },

  async preview(file: File, mapping: NfImportProfileMapping) {
    const form = new FormData();
    form.append("file", file);
    form.append("mapping", JSON.stringify(mapping));
    const res = await api.post<NfImportValidationReport>("/import-intelligence/notas/preview", form);
    return res.data;
  },

  async saveProfile(payload: {
    name: string;
    description?: string;
    mapping: NfImportProfileMapping;
    confidence_score?: number;
  }) {
    const res = await api.post<NfImportProfile>("/import-intelligence/notas/profiles", payload);
    return res.data;
  },

  async import(
    file: File,
    profileId: string,
    options?: {
      mapping?: NfImportProfileMapping;
      profileName?: string;
      saveProfile?: boolean;
    },
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("profile_id", profileId);
    if (options?.mapping) form.append("mapping", JSON.stringify(options.mapping));
    if (options?.profileName?.trim()) form.append("profile_name", options.profileName.trim());
    if (options?.saveProfile) form.append("save_profile", "true");
    const res = await api.post<NfImportResult>("/import-intelligence/notas/import", form);
    return res.data;
  },

  getError(error: unknown, fallback: string) {
    return getApiErrorMessage(error, fallback);
  },
};
