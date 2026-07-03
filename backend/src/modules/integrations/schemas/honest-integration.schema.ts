import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

const DiscoveredEndpointSchema = new Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    method: { type: String, default: 'GET' },
    label: { type: String, default: '' },
    nota_count: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    captured_at: { type: Date, default: Date.now },
    source: { type: String, enum: ['scan', 'browse', 'manual'], default: 'scan' },
    confirmed: { type: Boolean, default: false },
  },
  { _id: false },
);

export const HonestIntegrationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    enabled: { type: Boolean, default: false },
    emissao_nf_habilitada: { type: Boolean, default: false },
    emissao_verified_at: { type: Date },
    emissao_verify_error: { type: String },
    auto_sync_enabled: { type: Boolean, default: false },
    api_login: { type: String },
    api_password_enc: { type: String },
    api_base_url: { type: String },
    session_token_enc: { type: String },
    session_refresh_token_enc: { type: String },
    session_cookie_enc: { type: String },
    session_headers_json_enc: { type: String },
    session_login_path: { type: String },
    session_expires_at: { type: Date },
    discovered_endpoints: { type: [DiscoveredEndpointSchema], default: [] },
    selected_endpoint_id: { type: String },
    discovery_active: { type: Boolean, default: false },
    discovery_started_at: { type: Date },
    discovery_token_hash: { type: String },
    sync_urls: { type: [String], default: [] },
    empresa_id: { type: Number },
    empresa_cnpj: { type: String },
    empresa_nome: { type: String },
    graphql_verified_at: { type: Date },
    graphql_nota_count: { type: Number },
    graphql_verify_error: { type: String },
    sync_interval_minutes: { type: Number, default: 60, min: 5, max: 24 * 60 },
    last_sync_at: { type: Date },
    last_sync_status: {
      type: String,
      enum: ['success', 'failed', 'running', null],
      default: null,
    },
    last_sync_error: { type: String },
    last_sync_trigger: { type: String, enum: ['manual', 'worker', null], default: null },
    last_sync_stats: {
      imported: { type: Number, default: 0 },
      ignored: { type: Number, default: 0 },
      total_faturas: { type: Number, default: 0 },
      urls_ok: { type: Number, default: 0 },
      urls_failed: { type: Number, default: 0 },
      importacao_id: { type: String },
      vinculadas: { type: Number, default: 0 },
    },
    last_sync_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

HonestIntegrationSchema.index({ tenantId: 1 }, { unique: true });
HonestIntegrationSchema.plugin(tenantPlugin);
