import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { runWithTenant } from '../../common/tenant/tenant-storage';
import { asLeanOne, asLeanRecord } from '../../common/mongoose-lean.util';
import { hashJsonValue } from '../../common/content-hash.util';
import { extractNotaItemsFromJson } from '../importacoes/nf-json.mapper';
import { ImportacoesService } from '../importacoes/importacoes.service';
import { NotasService } from '../notas/notas.service';
import { PlanLimitsService } from '../billing/plan-limits.service';
import { UpdateHonestIntegrationDto } from './dto/update-honest-integration.dto';
import { HonestConnectDto } from './dto/honest-connect.dto';
import { mergeHonestPayloads } from './honest-fetch.util';
import {
  createDiscoveryToken,
  credentialsSecret,
  decryptSecret,
  encryptSecret,
  hashDiscoveryToken,
} from './honest-credentials.util';
import {
  buildHonestBrowsePaths,
  buildHonestEmpresaNfListaPath,
  buildHonestEmpresasRequest,
  buildHonestGraphqlNfRequest,
  buildHonestGraphqlReferer,
  buildHonestGraphqlUrl,
  buildProbePaths,
  countHonestGraphqlNfItems,
  extractHonestEmpresas,
  isHonestGraphqlNfResponse,
  matchHonestEmpresaByCnpj,
  mergeDiscoveredEndpoints,
  scoreHonestPayload,
  type HonestDiscoveredEndpoint,
  type HonestEmpresaOption,
} from './honest-discovery.util';
import {
  buildBrowseInjectionScript,
  honestAuthenticatedRequest,
  honestLogin,
  keycloakRefreshLogin,
  type HonestLoginOptions,
  type HonestSession,
} from './honest-api.client';
import {
  buildHonestEmitNfRequest,
  mapHonestEmitErrorMessage,
  parseHonestEmitResponse,
  type HonestEmitInput,
  type HonestEmitResult,
} from './honest-emissao.util';
import { ResourceJobQueueService } from '../../common/jobs/resource-job-queue.service';

export type HonestSyncTrigger = 'manual' | 'worker';

export type HonestIntegrationView = {
  provider: 'honest';
  name: string;
  description: string;
  enabled: boolean;
  emissao_nf_habilitada: boolean;
  auto_sync_enabled: boolean;
  api_login?: string;
  api_base_url?: string;
  has_credentials: boolean;
  is_connected: boolean;
  discovery_active: boolean;
  discovery_token?: string;
  browse_path?: string;
  empresa_id?: number;
  empresa_cnpj?: string;
  empresa_nome?: string;
  org_profile_ready?: boolean;
  honest_empresa_resolved?: boolean;
  honest_empresas_disponiveis?: HonestEmpresaOption[];
  graphql_url?: string;
  graphql_verified?: boolean;
  graphql_nota_count?: number;
  graphql_verified_at?: string;
  graphql_verify_error?: string;
  discovered_endpoints: HonestDiscoveredEndpoint[];
  selected_endpoint_id?: string;
  sync_interval_minutes: number;
  sync_ready?: boolean;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'failed' | 'running' | null;
  last_sync_error?: string;
  last_sync_trigger?: 'manual' | 'worker' | null;
  last_sync_stats?: {
    imported: number;
    ignored: number;
    total_faturas: number;
    vinculadas?: number;
    urls_ok: number;
    urls_failed: number;
    importacao_id?: string;
  };
};

@Injectable()
export class HonestIntegrationService {
  private readonly logger = new Logger(HonestIntegrationService.name);

  constructor(
    @InjectModel('HonestIntegration') private readonly honestModel: Model<any>,
    @InjectModel('Organization') private readonly organizationModel: Model<any>,
    private readonly importacoesService: ImportacoesService,
    private readonly notasService: NotasService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly config: ConfigService,
    private readonly jobQueue: ResourceJobQueueService,
  ) {}

  private runHonestHeavy<T>(
    tenantId: string,
    progressMessage: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.jobQueue.runExclusive('honest', fn, { tenantId, progressMessage });
  }

  async getConfig(tenantId: string): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    return this.toView(doc, await this.loadOrgProfile(tenantId));
  }

  async discoverHonestEmpresa(tenantId: string): Promise<HonestIntegrationView> {
    return this.runHonestHeavy(tenantId, 'Vinculando empresa Honest', () =>
      this.discoverHonestEmpresaImpl(tenantId),
    );
  }

  private async discoverHonestEmpresaImpl(tenantId: string): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    const org = await this.loadOrgProfile(tenantId);
    if (!org.cnpj?.trim()) {
      throw new BadRequestException(
        'Configure o CNPJ da organização em Configurações → Perfil antes de vincular a empresa na Honest.',
      );
    }

    const session = await this.ensureSession(tenantId, doc);
    const empresas = await this.fetchHonestEmpresas(session);
    const matched = matchHonestEmpresaByCnpj(empresas, org.cnpj);

    const updated = asLeanRecord(
      await this.honestModel
      .findByIdAndUpdate(
        doc._id,
        {
          $set: {
            empresa_cnpj: org.cnpj,
            empresa_nome: org.name,
            ...(matched ? { empresa_id: matched.id } : {}),
          },
        },
        { new: true },
      )
      .lean(),
    );

    const scanned = matched ? await this.scanEndpoints(tenantId, updated ?? doc) : updated ?? doc;
    const view = this.toView(scanned, org);
    return {
      ...view,
      honest_empresas_disponiveis: empresas,
      honest_empresa_resolved: Boolean(matched),
      browse_path: this.defaultBrowsePath(scanned ?? updated ?? undefined),
    };
  }

  async selectHonestEmpresa(tenantId: string, empresaId: number): Promise<HonestIntegrationView> {
    return this.runHonestHeavy(tenantId, 'Selecionando empresa Honest', () =>
      this.selectHonestEmpresaImpl(tenantId, empresaId),
    );
  }

  private async selectHonestEmpresaImpl(tenantId: string, empresaId: number): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    const org = await this.loadOrgProfile(tenantId);
    const session = await this.ensureSession(tenantId, doc);
    const empresas = await this.fetchHonestEmpresas(session);
    const selected = empresas.find((item) => item.id === empresaId);
    if (!selected) {
      throw new NotFoundException('Empresa não encontrada na conta Honest conectada.');
    }

    const updated = asLeanRecord(
      await this.honestModel
      .findByIdAndUpdate(
        doc._id,
        {
          $set: {
            empresa_id: selected.id,
            empresa_nome: selected.nome || org.name,
            empresa_cnpj: selected.cpfcnpj || org.cnpj,
          },
        },
        { new: true },
      )
      .lean(),
    );
    const scanned = await this.scanEndpoints(tenantId, updated ?? doc);
    return {
      ...this.toView(scanned, org),
      browse_path: this.defaultBrowsePath(scanned ?? updated ?? undefined),
    };
  }

  async connect(tenantId: string, dto: HonestConnectDto): Promise<HonestIntegrationView> {
    return this.runHonestHeavy(tenantId, 'Conectando na Honest', () => this.connectImpl(tenantId, dto));
  }

  private async connectImpl(tenantId: string, dto: HonestConnectDto): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    const appBaseUrl = this.resolveAppBaseUrl(dto.api_base_url, doc.api_base_url);
    const timeoutMs = this.timeoutMs();
    const secret = credentialsSecret(this.config);
    const loginOptions = this.honestLoginOptions(appBaseUrl);

    let loginResult: Awaited<ReturnType<typeof honestLogin>> | null = null;

    for (const candidate of this.loginBaseUrlCandidates(appBaseUrl)) {
      const attempt = await honestLogin(
        candidate,
        dto.api_login.trim(),
        dto.api_password,
        timeoutMs,
        undefined,
        loginOptions,
      );
      if (attempt.ok && attempt.session) {
        loginResult = attempt;
        break;
      }
      loginResult = attempt;
    }

    const empresa = await this.loadOrgProfile(tenantId);
    const partialUpdate = {
      api_login: dto.api_login.trim(),
      api_password_enc: encryptSecret(dto.api_password, secret),
      api_base_url: appBaseUrl,
      empresa_cnpj: empresa.cnpj,
      empresa_nome: empresa.name,
    };

    if (!loginResult?.ok || !loginResult.session) {
      await this.honestModel.findByIdAndUpdate(doc._id, { $set: partialUpdate });
      const detail = loginResult?.error ?? 'Falha ao autenticar na Honest';
      throw new BadRequestException(
        `Não foi possível autenticar na Honest (${appBaseUrl}). ${detail} ` +
          'Use https://honest.com.br como URL base e as mesmas credenciais do portal de clientes.',
      );
    }

    const sessionExpiresAt = loginResult.session.expiresAt
      ? new Date(loginResult.session.expiresAt)
      : new Date(Date.now() + 12 * 60 * 60 * 1000);

    const update = {
      ...partialUpdate,
      session_token_enc: loginResult.session.token ? encryptSecret(loginResult.session.token, secret) : undefined,
      session_refresh_token_enc: loginResult.session.refreshToken
        ? encryptSecret(loginResult.session.refreshToken, secret)
        : undefined,
      session_cookie_enc: loginResult.session.cookie ? encryptSecret(loginResult.session.cookie, secret) : undefined,
      session_headers_json_enc: loginResult.session.headers
        ? encryptSecret(JSON.stringify(loginResult.session.headers), secret)
        : undefined,
      session_login_path: loginResult.loginPath,
      session_expires_at: sessionExpiresAt,
    };

    const updated = asLeanRecord(
      await this.honestModel.findByIdAndUpdate(doc._id, { $set: update }, { new: true }).lean(),
    );
    const finalized = await this.finalizeConnectionSetup(tenantId, updated ?? doc);
    const org = await this.loadOrgProfile(tenantId);
    return this.toView(finalized, org);
  }

  /** Após login: vincula empresa, valida GraphQL e ativa sync automático — sem passos manuais. */
  private async finalizeConnectionSetup(
    tenantId: string,
    doc: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let current = doc;
    const org = await this.loadOrgProfile(tenantId);

    if (org.cnpj?.trim()) {
      try {
        await this.discoverHonestEmpresa(tenantId);
        current = (await this.findOrCreateConfig(tenantId)) ?? current;
      } catch (error) {
        this.logger.warn(
          `Honest conectada, empresa não vinculada: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (this.readEmpresaId(current) && !this.resolveSelectedEndpoint(current)) {
      try {
        current = await this.scanEndpoints(tenantId, current);
      } catch (error) {
        this.logger.warn(
          `Honest conectada, GraphQL não validado: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return (
      asLeanRecord(
        await this.honestModel
          .findByIdAndUpdate(
            current._id ?? doc._id,
            {
              $set: {
                enabled: true,
                auto_sync_enabled: true,
                discovery_active: false,
              },
            },
            { new: true },
          )
          .lean(),
      ) ?? current
    );
  }

  private async ensureReadyForSync(tenantId: string): Promise<Record<string, unknown>> {
    let doc = await this.findOrCreateConfig(tenantId);
    if (!doc.api_login || !doc.api_password_enc) {
      throw new BadRequestException('Salve o login e a senha da Honest antes de sincronizar.');
    }

    const org = await this.loadOrgProfile(tenantId);
    if (!org.cnpj?.trim()) {
      throw new BadRequestException(
        'Configure o CNPJ da organização em Configurações → Perfil antes de sincronizar.',
      );
    }

    await this.ensureSession(tenantId, doc);
    doc = await this.findOrCreateConfig(tenantId);

    if (!this.readEmpresaId(doc)) {
      await this.discoverHonestEmpresa(tenantId);
      doc = await this.findOrCreateConfig(tenantId);
    }

    if (!this.resolveSelectedEndpoint(doc)) {
      doc = await this.scanEndpoints(tenantId, doc);
    }

    if (!this.resolveSelectedEndpoint(doc)) {
      throw new BadRequestException(
        'Não foi possível acessar as notas na Honest. Clique em Conectar e tente novamente.',
      );
    }

    return doc;
  }

  async startDiscovery(tenantId: string): Promise<HonestIntegrationView & { discovery_token?: string; browse_path?: string }> {
    return this.runHonestHeavy(tenantId, 'Iniciando exploração Honest', () =>
      this.startDiscoveryImpl(tenantId),
    );
  }

  private async startDiscoveryImpl(
    tenantId: string,
  ): Promise<HonestIntegrationView & { discovery_token?: string; browse_path?: string }> {
    const doc = await this.findOrCreateConfig(tenantId);
    if (!doc.api_login || !doc.api_password_enc) {
      throw new BadRequestException('Configure login e senha antes de explorar a Honest.');
    }

    await this.ensureSession(tenantId, doc);
    const discoveryToken = createDiscoveryToken();
    const updated = asLeanRecord(
      await this.honestModel
      .findByIdAndUpdate(
        doc._id,
        {
          $set: {
            discovery_active: true,
            discovery_started_at: new Date(),
            discovery_token_hash: hashDiscoveryToken(discoveryToken),
          },
        },
        { new: true },
      )
      .lean(),
    );
    const view = this.toView(updated ?? doc);
    return { ...view, discovery_token: discoveryToken, browse_path: this.defaultBrowsePath(updated ?? doc) };
  }

  async stopDiscovery(tenantId: string): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    const updated = asLeanRecord(
      await this.honestModel
      .findByIdAndUpdate(doc._id, { $set: { discovery_active: false } }, { new: true })
      .lean(),
    );
    return this.toView(updated);
  }

  async captureEndpoint(
    tenantId: string,
    payload: { url: string; method?: string; status?: number; body?: unknown },
    discoveryToken?: string,
  ): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    if (!doc.discovery_active) {
      throw new BadRequestException('A exploração não está ativa.');
    }
    if (!discoveryToken || hashDiscoveryToken(discoveryToken) !== doc.discovery_token_hash) {
      throw new BadRequestException('Token de exploração inválido.');
    }

    const scored = scoreHonestPayload(payload.body);
    if (scored.score < 20) {
      return this.toView(doc);
    }

    const endpoints = mergeDiscoveredEndpoints(this.readEndpoints(doc), {
      url: payload.url,
      method: (payload.method ?? 'GET').toUpperCase(),
      label: this.labelFromUrl(payload.url),
      nota_count: scored.notaCount,
      score: scored.score,
      captured_at: new Date().toISOString(),
      source: 'browse',
    });

    const updated = asLeanRecord(
      await this.honestModel
      .findByIdAndUpdate(doc._id, { $set: { discovered_endpoints: endpoints } }, { new: true })
      .lean(),
    );
    return this.toView(updated);
  }

  async scanEndpoints(tenantId: string, docInput?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.runHonestHeavy(tenantId, 'Escaneando endpoints Honest', () =>
      this.scanEndpointsImpl(tenantId, docInput),
    );
  }

  private async scanEndpointsImpl(
    tenantId: string,
    docInput?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const doc = docInput ?? (await this.findOrCreateConfig(tenantId));
    const session = await this.ensureSession(tenantId, doc);
    const timeoutMs = this.timeoutMs();
    let endpoints = this.readEndpoints(doc);
    const empresaId = this.readEmpresaId(doc);

    for (const url of buildProbePaths(session.baseUrl)) {
      const result = await honestAuthenticatedRequest(session, url, 'GET', timeoutMs);
      if (!result.ok || result.json == null) continue;
      endpoints = mergeDiscoveredEndpoints(endpoints, {
        url: result.url,
        method: 'GET',
        label: this.labelFromUrl(result.url),
        nota_count: result.notaCount ?? 0,
        score: result.score ?? 0,
        captured_at: new Date().toISOString(),
        source: 'scan',
      });
    }

    if (empresaId) {
      const verified = await this.verifyGraphqlNfEndpoint(session, empresaId);
      const graphqlUpdate: Record<string, unknown> = {
        graphql_verified_at: verified.ok ? new Date() : undefined,
        graphql_nota_count: verified.notaCount,
        graphql_verify_error: verified.ok ? null : verified.error ?? 'Falha na verificação GraphQL',
      };

      if (verified.ok && verified.json) {
        const scored = scoreHonestPayload(verified.json);
        endpoints = mergeDiscoveredEndpoints(endpoints, {
          url: verified.graphqlUrl,
          method: 'POST',
          label: `NfsEmitidas (empresa ${empresaId})`,
          nota_count: verified.notaCount,
          score: Math.max(scored.score, 80),
          captured_at: new Date().toISOString(),
          source: 'scan',
          confirmed: true,
        });
        const graphqlEndpoint = endpoints.find(
          (item) => item.url === verified.graphqlUrl && item.method === 'POST',
        );
        if (graphqlEndpoint) {
          graphqlUpdate.selected_endpoint_id = graphqlEndpoint.id;
          graphqlUpdate.sync_urls = [graphqlEndpoint.url];
          graphqlUpdate.discovered_endpoints = endpoints.map((item) => ({
            ...item,
            confirmed: item.id === graphqlEndpoint.id,
          }));
        }
      }

      return (
        asLeanRecord(
          await this.honestModel
            .findByIdAndUpdate(
              doc._id,
              {
                $set: {
                  discovered_endpoints: graphqlUpdate.discovered_endpoints ?? endpoints,
                  ...graphqlUpdate,
                },
              },
              { new: true },
            )
            .lean(),
        ) ?? doc
      );
    }

    return (
      asLeanRecord(
        await this.honestModel
          .findByIdAndUpdate(doc._id, { $set: { discovered_endpoints: endpoints } }, { new: true })
          .lean(),
      ) ?? doc
    );
  }

  async verifyGraphql(tenantId: string): Promise<HonestIntegrationView> {
    return this.runHonestHeavy(tenantId, 'Verificando GraphQL Honest', () =>
      this.verifyGraphqlImpl(tenantId),
    );
  }

  private async verifyGraphqlImpl(tenantId: string): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    const empresaId = this.readEmpresaId(doc);
    if (!empresaId) {
      throw new BadRequestException('Vincule a empresa Honest antes de verificar o GraphQL.');
    }

    const session = await this.ensureSession(tenantId, doc);
    const verified = await this.verifyGraphqlNfEndpoint(session, empresaId);
    if (!verified.ok) {
      await this.honestModel.findByIdAndUpdate(doc._id, {
        $set: {
          graphql_verify_error: verified.error ?? 'Falha na verificação GraphQL',
          graphql_nota_count: verified.notaCount,
        },
        $unset: { graphql_verified_at: '' },
      });
      throw new BadRequestException(
        verified.error ??
          'POST /api/v1/graphql não retornou nf_lista.items. Confirme que a sessão está ativa e a empresa correta.',
      );
    }

    const scanned = await this.scanEndpoints(tenantId);
    return this.toView(scanned, await this.loadOrgProfile(tenantId));
  }

  async confirmEndpoint(tenantId: string, endpointId: string): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    const endpoints = this.readEndpoints(doc);
    const selected = endpoints.find((item) => item.id === endpointId);
    if (!selected) {
      throw new NotFoundException('Endpoint não encontrado na exploração');
    }

    const next = endpoints.map((item) => ({ ...item, confirmed: item.id === endpointId }));
    const updated = asLeanRecord(
      await this.honestModel
      .findByIdAndUpdate(
        doc._id,
        {
          $set: {
            discovered_endpoints: next,
            selected_endpoint_id: endpointId,
            sync_urls: [selected.url],
            discovery_active: false,
          },
        },
        { new: true },
      )
      .lean(),
    );
    return this.toView(updated);
  }

  getBrowseTargetUrl(doc: Record<string, unknown>): string {
    const appBase = this.config.get<string>('HONEST_APP_BASE_URL')?.trim();
    const apiBase = doc.api_base_url ? String(doc.api_base_url).replace(/\/$/, '') : this.defaultBaseUrl();
    if (!apiBase && !appBase) {
      throw new BadRequestException('Configure a URL base da Honest antes de explorar.');
    }
    return appBase || apiBase!;
  }

  async proxyBrowse(tenantId: string, path: string, discoveryToken?: string): Promise<{ contentType: string; body: string }> {
    return this.runHonestHeavy(tenantId, 'Navegando na Honest', () =>
      this.proxyBrowseImpl(tenantId, path, discoveryToken),
    );
  }

  private async proxyBrowseImpl(
    tenantId: string,
    path: string,
    discoveryToken?: string,
  ): Promise<{ contentType: string; body: string }> {
    const doc = await this.findOrCreateConfig(tenantId);
    if (!doc.discovery_active) {
      throw new BadRequestException('Ative a exploração antes de navegar na Honest.');
    }
    if (!discoveryToken || hashDiscoveryToken(discoveryToken) !== doc.discovery_token_hash) {
      throw new BadRequestException('Token de exploração inválido.');
    }

    const targetBase = this.getBrowseTargetUrl(doc).replace(/\/$/, '');
    const targetPath = path.startsWith('/') ? path : `/${path}`;
    const targetUrl = `${targetBase}${targetPath}`;
    const session = await this.ensureSession(tenantId, doc);
    const timeoutMs = this.timeoutMs();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        Accept: 'text/html,application/json,*/*',
        'User-Agent': 'GestaoFinanceira-HonestSync/1.0',
        ...(session.headers ?? {}),
      };
      if (session.cookie) headers.Cookie = session.cookie;

      const response = await fetch(targetUrl, { method: 'GET', signal: controller.signal, headers });
      const contentType = response.headers.get('content-type') ?? 'text/html';
      const raw = await response.text();

      if (contentType.includes('json')) {
        try {
          const json = JSON.parse(raw) as unknown;
          await this.captureEndpoint(tenantId, { url: targetUrl, method: 'GET', status: response.status, body: json });
        } catch {
          // ignore invalid json
        }
        return { contentType, body: raw };
      }

      const apiBase = this.config.get<string>('API_PUBLIC_URL')?.trim() || 'http://localhost:4000/api';
      const captureUrl = `${apiBase}/integrations/honest/discover/capture?tenantId=${tenantId}&token=${encodeURIComponent(discoveryToken)}`;
      const injection = buildBrowseInjectionScript(captureUrl);
      const rewritten = raw
        .replace(/<head>/i, `<head><base href="${targetBase}/">`)
        .replace(/<\/head>/i, `${injection}</head>`);
      return { contentType: 'text/html; charset=utf-8', body: rewritten };
    } finally {
      clearTimeout(timeout);
    }
  }

  async updateConfig(tenantId: string, dto: UpdateHonestIntegrationDto): Promise<HonestIntegrationView> {
    const doc = await this.findOrCreateConfig(tenantId);
    const update: Record<string, unknown> = {};

    if (dto.enabled !== undefined) update.enabled = dto.enabled;
    if (dto.emissao_nf_habilitada !== undefined) update.emissao_nf_habilitada = dto.emissao_nf_habilitada;
    if (dto.auto_sync_enabled !== undefined) update.auto_sync_enabled = dto.auto_sync_enabled;
    if (dto.sync_interval_minutes !== undefined) update.sync_interval_minutes = dto.sync_interval_minutes;
    if (dto.api_base_url !== undefined) update.api_base_url = dto.api_base_url.trim();

    if (dto.api_login !== undefined) update.api_login = dto.api_login.trim();
    if (dto.api_password !== undefined) {
      update.api_password_enc = encryptSecret(dto.api_password, credentialsSecret(this.config));
    }

    if (dto.enabled === true || dto.auto_sync_enabled === true) {
      const hasEndpoint = Boolean(doc.selected_endpoint_id) || this.readEndpoints(doc).some((e) => e.confirmed);
      const hasCredentials = Boolean((dto.api_login ?? doc.api_login) && (dto.api_password || doc.api_password_enc));
      if (!hasCredentials) {
        throw new BadRequestException('Configure login e senha da Honest.');
      }
      if (!hasEndpoint) {
        throw new BadRequestException('Confirme um endpoint de notas antes de ativar a integração.');
      }
    }

    const updated = asLeanRecord(
      await this.honestModel.findByIdAndUpdate(doc._id, { $set: update }, { new: true }).lean(),
    );
    return this.toView(updated);
  }

  async emitirNf(tenantId: string, input: HonestEmitInput): Promise<HonestEmitResult> {
    const doc = await this.findOrCreateConfig(tenantId);
    const empresaId = this.readEmpresaId(doc);
    if (!empresaId) {
      return { ok: false, error: 'Empresa Honest não vinculada. Conecte a integração primeiro.' };
    }

    const session = await this.ensureSession(tenantId, doc);
    const graphqlUrl = buildHonestGraphqlUrl(session.baseUrl);
    const result = await honestAuthenticatedRequest(
      session,
      graphqlUrl,
      'POST',
      this.timeoutMs(),
      buildHonestEmitNfRequest(empresaId, input),
      this.buildGraphqlRequestHeaders(empresaId),
    );

    if (!result.ok || result.json == null) {
      return {
        ok: false,
        error: mapHonestEmitErrorMessage(result.error ?? 'Falha ao chamar API Honest'),
      };
    }

    return parseHonestEmitResponse(result.json);
  }

  async sync(
    tenantId: string,
    userId: string | undefined,
    trigger: HonestSyncTrigger,
  ): Promise<HonestIntegrationView & { ok: boolean }> {
    return this.runHonestHeavy(tenantId, 'Sincronizando notas Honest', () =>
      this.syncImpl(tenantId, userId, trigger),
    );
  }

  private async syncImpl(
    tenantId: string,
    userId: string | undefined,
    trigger: HonestSyncTrigger,
  ): Promise<HonestIntegrationView & { ok: boolean }> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    return runWithTenant(tenantObjectId, async () => {
      const doc = await this.ensureReadyForSync(tenantId);

      if (trigger === 'worker' && !doc.enabled) {
        throw new BadRequestException('Integração Honest desativada.');
      }

      const endpoint = this.resolveSelectedEndpoint(doc);
      if (!endpoint) {
        throw new BadRequestException('Não foi possível acessar as notas na Honest. Clique em Conectar.');
      }

      if (doc.last_sync_status === 'running') {
        const startedAt = doc.updatedAt ? new Date(String(doc.updatedAt)).getTime() : 0;
        if (Date.now() - startedAt < 30 * 60 * 1000) {
          throw new ConflictException('Já existe uma sincronização Honest em andamento.');
        }
      }

      await this.honestModel.findByIdAndUpdate(doc._id, {
        $set: {
          last_sync_status: 'running',
          last_sync_error: null,
          last_sync_trigger: trigger,
          last_sync_by: userId ? new Types.ObjectId(userId) : undefined,
        },
      });

      try {
        await this.planLimitsService.assertCanImport();
        const session = await this.ensureSession(tenantId, doc);
        const timeoutMs = this.timeoutMs();
        const empresaId = this.readEmpresaId(doc);
        const requestBody =
          endpoint.method === 'POST' && endpoint.url.includes('/graphql') && empresaId
            ? buildHonestGraphqlNfRequest(empresaId)
            : undefined;
        const extraHeaders =
          endpoint.method === 'POST' && endpoint.url.includes('/graphql') && empresaId
            ? this.buildGraphqlRequestHeaders(empresaId)
            : undefined;
        const result = await honestAuthenticatedRequest(
          session,
          endpoint.url,
          endpoint.method,
          timeoutMs,
          requestBody,
          extraHeaders,
        );

        if (!result.ok || result.json == null) {
          throw new BadRequestException(result.error ?? 'Falha ao buscar notas na Honest');
        }

        const mergedJson = mergeHonestPayloads([result.json]);
        const importJson =
          extractNotaItemsFromJson(mergedJson).length > 0 ? mergedJson : result.json;
        const itemsToImport = extractNotaItemsFromJson(importJson);
        const importLabel =
          trigger === 'worker'
            ? `Honest automático ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
            : `Honest manual ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

        if (itemsToImport.length === 0) {
          const finished = asLeanRecord(
            await this.honestModel
            .findByIdAndUpdate(
              doc._id,
              {
                $set: {
                  last_sync_at: new Date(),
                  last_sync_status: 'success',
                  last_sync_error: null,
                  last_sync_trigger: trigger,
                  last_sync_stats: {
                    imported: 0,
                    ignored: 0,
                    total_faturas: 0,
                    urls_ok: 1,
                    urls_failed: 0,
                  },
                },
              },
              { new: true },
            )
            .lean(),
          );
          return { ...this.toView(finished), ok: true };
        }

        const contentHash = `${hashJsonValue(importJson)}:${Date.now()}`;
        const saved = await this.importacoesService.createRecord({
          filename: 'honest-sync.json',
          originalName: importLabel,
          label: importLabel,
          descricao: `Importação via integração Honest (${trigger})`,
          uploadedBy: userId,
          status: 'processing',
          contentHash,
          source: trigger === 'worker' ? 'honest_worker' : 'honest_manual',
        });

        const stats = await this.importacoesService.processJson(
          String(saved._id),
          importJson,
          userId,
          this.notasService,
        );

        const finished = asLeanRecord(
          await this.honestModel
          .findByIdAndUpdate(
            doc._id,
            {
              $set: {
                last_sync_at: new Date(),
                last_sync_status: 'success',
                last_sync_error: null,
                last_sync_trigger: trigger,
                last_sync_stats: {
                  imported: stats.imported,
                  ignored: stats.ignored,
                  total_faturas: stats.total_faturas,
                  vinculadas: stats.vinculadas ?? 0,
                  urls_ok: 1,
                  urls_failed: 0,
                  importacao_id: String(saved._id),
                },
              },
            },
            { new: true },
          )
          .lean(),
        );

        return { ...this.toView(finished), ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha na sincronização Honest';
        this.logger.warn(`Honest sync failed for tenant ${tenantId}: ${message}`);
        const failed = asLeanRecord(
          await this.honestModel
          .findByIdAndUpdate(
            doc._id,
            {
              $set: {
                last_sync_at: new Date(),
                last_sync_status: 'failed',
                last_sync_error: message,
                last_sync_trigger: trigger,
              },
            },
            { new: true },
          )
          .lean(),
        );
        if (error instanceof BadRequestException || error instanceof ConflictException) {
          throw error;
        }
        throw new BadRequestException(message);
      }
    });
  }

  async listDueForWorker(): Promise<Array<{ tenantId: Types.ObjectId; configId: Types.ObjectId }>> {
    const configs = await this.honestModel
      .find({
        enabled: true,
        auto_sync_enabled: true,
        selected_endpoint_id: { $exists: true, $ne: null },
      })
      .select('_id tenantId last_sync_at sync_interval_minutes last_sync_status updatedAt')
      .lean();

    const due: Array<{ tenantId: Types.ObjectId; configId: Types.ObjectId }> = [];
    const now = Date.now();

    for (const config of configs) {
      if (config.last_sync_status === 'running') {
        const startedAt = config.updatedAt ? new Date(config.updatedAt).getTime() : 0;
        if (now - startedAt < 30 * 60 * 1000) continue;
      }

      const intervalMinutes = Math.max(5, Number(config.sync_interval_minutes ?? 60));
      const lastSync = config.last_sync_at ? new Date(config.last_sync_at).getTime() : 0;
      if (!lastSync || now - lastSync >= intervalMinutes * 60_000) {
        due.push({
          tenantId: config.tenantId as Types.ObjectId,
          configId: config._id as Types.ObjectId,
        });
      }
    }

    return due;
  }

  private resolveAppBaseUrl(dtoUrl?: string, storedUrl?: unknown): string {
    const fromDto = dtoUrl?.trim();
    const fromDoc = storedUrl ? String(storedUrl).trim() : '';
    const fromEnv = this.defaultBaseUrl() ?? '';
    const resolved = fromDto || fromDoc || fromEnv;
    if (!resolved) {
      throw new BadRequestException(
        'Informe a URL base da Honest (ex.: https://honest.com.br). Use o endereço do portal de clientes, não o link de login Keycloak.',
      );
    }
    return this.normalizeHonestBaseUrl(resolved);
  }

  private normalizeHonestBaseUrl(url: string): string {
    const trimmed = url.trim().replace(/\/$/, '');
    try {
      const parsed = new URL(trimmed);
      if (
        parsed.hostname === 'auth.honest.com.br' ||
        parsed.pathname.includes('openid-connect') ||
        parsed.pathname.includes('/realms/')
      ) {
        return (
          this.config.get<string>('HONEST_APP_BASE_URL')?.trim()?.replace(/\/$/, '') || 'https://honest.com.br'
        );
      }
    } catch {
      // mantém URL informada
    }
    return trimmed;
  }

  private honestOidcConfig() {
    const authBaseUrl = this.config.get<string>('HONEST_AUTH_BASE_URL')?.trim();
    const realm = this.config.get<string>('HONEST_KEYCLOAK_REALM')?.trim();
    const clientId = this.config.get<string>('HONEST_KEYCLOAK_CLIENT_ID')?.trim();
    if (!authBaseUrl || !realm || !clientId) return undefined;
    const clientSecret = this.config.get<string>('HONEST_KEYCLOAK_CLIENT_SECRET')?.trim();
    return { authBaseUrl, realm, clientId, clientSecret: clientSecret || undefined };
  }

  private honestLoginOptions(appBaseUrl: string): HonestLoginOptions {
    const redirectUri =
      this.config.get<string>('HONEST_OAUTH_REDIRECT_URI')?.trim() || 'https://honest.com.br/oauth2/callback';
    const clientEntryPath = this.config.get<string>('HONEST_CLIENT_ENTRY_PATH')?.trim() || '/u/acesso';
    return { oidc: this.honestOidcConfig(), appBaseUrl, redirectUri, clientEntryPath };
  }

  private async loadOrgProfile(tenantId: string): Promise<{ name: string; cnpj: string; phone: string }> {
    const org = asLeanOne<{ name?: string; cnpj?: string; phone?: string }>(
      await this.organizationModel.findById(tenantId).select('name cnpj phone').lean(),
    );
    if (!org) {
      return { name: '', cnpj: '', phone: '' };
    }
    return {
      name: org.name ? String(org.name) : '',
      cnpj: org.cnpj ? String(org.cnpj) : '',
      phone: org.phone ? String(org.phone) : '',
    };
  }

  private async fetchHonestEmpresas(session: HonestSession): Promise<HonestEmpresaOption[]> {
    const graphqlUrl = buildHonestGraphqlUrl(session.baseUrl);
    const result = await honestAuthenticatedRequest(
      session,
      graphqlUrl,
      'POST',
      this.timeoutMs(),
      buildHonestEmpresasRequest(),
      { Origin: 'https://honest.com.br' },
    );
    if (!result.ok || !result.json) {
      throw new BadRequestException(result.error ?? 'Não foi possível listar empresas na Honest');
    }
    return extractHonestEmpresas(result.json);
  }

  private buildGraphqlRequestHeaders(empresaId: number): Record<string, string> {
    return {
      Referer: buildHonestGraphqlReferer(empresaId),
      Origin: 'https://honest.com.br',
    };
  }

  private async verifyGraphqlNfEndpoint(
    session: HonestSession,
    empresaId: number,
  ): Promise<{
    ok: boolean;
    notaCount: number;
    graphqlUrl: string;
    json?: unknown;
    error?: string;
  }> {
    const graphqlUrl = buildHonestGraphqlUrl(session.baseUrl);
    const result = await honestAuthenticatedRequest(
      session,
      graphqlUrl,
      'POST',
      this.timeoutMs(),
      buildHonestGraphqlNfRequest(empresaId),
      this.buildGraphqlRequestHeaders(empresaId),
    );

    if (!result.ok || result.json == null) {
      return {
        ok: false,
        notaCount: 0,
        graphqlUrl,
        error: result.error ?? `POST ${graphqlUrl} falhou`,
      };
    }

    if (!isHonestGraphqlNfResponse(result.json)) {
      return {
        ok: false,
        notaCount: 0,
        graphqlUrl,
        json: result.json,
        error: 'GraphQL respondeu, mas sem data.empresa.nf_lista.items',
      };
    }

    return {
      ok: true,
      notaCount: countHonestGraphqlNfItems(result.json),
      graphqlUrl,
      json: result.json,
    };
  }

  private readEmpresaId(doc?: Record<string, unknown>): number | undefined {
    if (doc?.empresa_id == null) return undefined;
    const value = Number(doc.empresa_id);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  private defaultBrowsePath(doc?: Record<string, unknown>): string {
    const entry = this.config.get<string>('HONEST_CLIENT_ENTRY_PATH')?.trim() || '/u/acesso';
    const empresaId = this.readEmpresaId(doc);
    if (empresaId) return buildHonestEmpresaNfListaPath(empresaId);
    return entry;
  }

  private honestBrowsePaths(doc?: Record<string, unknown>): string[] {
    const entry = this.config.get<string>('HONEST_CLIENT_ENTRY_PATH')?.trim() || '/u/acesso';
    const empresaId = doc ? this.readEmpresaId(doc) : undefined;
    return buildHonestBrowsePaths(empresaId, entry);
  }

  private loginBaseUrlCandidates(primary: string): string[] {
    const candidates = [primary.replace(/\/$/, '')];
    const appBase = this.config.get<string>('HONEST_APP_BASE_URL')?.trim()?.replace(/\/$/, '');
    if (appBase && !candidates.includes(appBase)) candidates.push(appBase);
    return candidates;
  }

  private defaultBaseUrl(): string | undefined {
    const app = this.config.get<string>('HONEST_APP_BASE_URL')?.trim();
    const api = this.config.get<string>('HONEST_API_BASE_URL')?.trim();
    return app || api || undefined;
  }

  private timeoutMs(): number {
    return Number(this.config.get('HONEST_REQUEST_TIMEOUT_MS') ?? 30_000);
  }

  private labelFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname.split('/').filter(Boolean).slice(-2).join('/') || parsed.pathname;
    } catch {
      return url;
    }
  }

  private readEndpoints(doc: Record<string, unknown>): HonestDiscoveredEndpoint[] {
    if (!Array.isArray(doc.discovered_endpoints)) return [];
    return doc.discovered_endpoints as HonestDiscoveredEndpoint[];
  }

  private resolveSelectedEndpoint(doc: Record<string, unknown>): HonestDiscoveredEndpoint | null {
    const endpoints = this.readEndpoints(doc);
    const selectedId = doc.selected_endpoint_id ? String(doc.selected_endpoint_id) : '';
    return endpoints.find((item) => item.id === selectedId) ?? endpoints.find((item) => item.confirmed) ?? null;
  }

  private async ensureSession(tenantId: string, doc: Record<string, unknown>): Promise<HonestSession> {
    const secret = credentialsSecret(this.config);
    const expiresAt = doc.session_expires_at ? new Date(doc.session_expires_at as string).getTime() : 0;
    const hasSession = Boolean(doc.session_token_enc || doc.session_cookie_enc);
    const baseUrl = doc.api_base_url ? String(doc.api_base_url).replace(/\/$/, '') : this.defaultBaseUrl();
    if (!baseUrl) throw new BadRequestException('URL base da Honest não configurada.');

    if (hasSession && expiresAt > Date.now()) {
      return {
        baseUrl,
        token: doc.session_token_enc ? decryptSecret(String(doc.session_token_enc), secret) : undefined,
        cookie: doc.session_cookie_enc ? decryptSecret(String(doc.session_cookie_enc), secret) : undefined,
        headers: doc.session_headers_json_enc
          ? (JSON.parse(decryptSecret(String(doc.session_headers_json_enc), secret)) as Record<string, string>)
          : undefined,
        loginPath: doc.session_login_path ? String(doc.session_login_path) : undefined,
      };
    }

    const loginPath = doc.session_login_path ? String(doc.session_login_path) : '';
    const oidc = this.honestOidcConfig();
    if (hasSession && doc.session_refresh_token_enc && oidc && loginPath.includes('openid-connect')) {
      const refreshToken = decryptSecret(String(doc.session_refresh_token_enc), secret);
      const refreshResult = await keycloakRefreshLogin(oidc, refreshToken, this.timeoutMs(), baseUrl);
      if (refreshResult.ok && refreshResult.session) {
        await this.persistSession(tenantId, refreshResult.session, secret);
        return refreshResult.session;
      }
    }

    if (!doc.api_login || !doc.api_password_enc) {
      throw new BadRequestException('Credenciais Honest não configuradas.');
    }

    const password = decryptSecret(String(doc.api_password_enc), secret);
    const isKeycloakPath = loginPath.includes('openid-connect');
    const isHonestCallback = loginPath.includes('/oauth2/callback');
    const isBrowserLogin = loginPath.includes('/browser-login');
    const loginResult = await honestLogin(
      baseUrl,
      String(doc.api_login),
      password,
      this.timeoutMs(),
      isKeycloakPath || isHonestCallback || isBrowserLogin ? undefined : loginPath || undefined,
      this.honestLoginOptions(baseUrl),
    );

    if (!loginResult.ok || !loginResult.session) {
      throw new BadRequestException(loginResult.error ?? 'Sessão Honest expirada. Conecte novamente.');
    }

    await this.persistSession(tenantId, loginResult.session, secret);
    return loginResult.session;
  }

  private async persistSession(tenantId: string, session: HonestSession, secret: string) {
    const sessionExpiresAt = session.expiresAt
      ? new Date(session.expiresAt)
      : new Date(Date.now() + 12 * 60 * 60 * 1000);

    await this.honestModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId) },
      {
        $set: {
          session_token_enc: session.token ? encryptSecret(session.token, secret) : undefined,
          session_refresh_token_enc: session.refreshToken
            ? encryptSecret(session.refreshToken, secret)
            : undefined,
          session_cookie_enc: session.cookie ? encryptSecret(session.cookie, secret) : undefined,
          session_headers_json_enc: session.headers
            ? encryptSecret(JSON.stringify(session.headers), secret)
            : undefined,
          session_login_path: session.loginPath,
          session_expires_at: sessionExpiresAt,
        },
      },
    );
  }

  private async findOrCreateConfig(tenantId: string): Promise<Record<string, unknown>> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    let doc = asLeanRecord(await this.honestModel.findOne({ tenantId: tenantObjectId }).lean());
    if (!doc) {
      const created = await this.honestModel.create({
        tenantId: tenantObjectId,
        enabled: false,
        auto_sync_enabled: false,
        discovered_endpoints: [],
        sync_interval_minutes: 60,
      });
      doc = created.toObject() as Record<string, unknown>;
    }
    return doc;
  }

  private async leanHonestUpdate(
    id: unknown,
    update: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    return asLeanRecord(
      await this.honestModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean(),
    );
  }

  private toView(
    doc: Record<string, unknown> | null,
    org?: { name: string; cnpj: string },
  ): HonestIntegrationView {
    if (!doc) throw new NotFoundException('Integração Honest não encontrada');
    const stats = doc.last_sync_stats as Record<string, unknown> | undefined;
    const endpoints = this.readEndpoints(doc);
    const hasCredentials = Boolean(doc.api_login && doc.api_password_enc);
    const isConnected = Boolean(
      doc.session_token_enc || doc.session_cookie_enc || (hasCredentials && endpoints.length > 0),
    );
    const empresaId = this.readEmpresaId(doc);
    const empresaCnpj = org?.cnpj?.trim() || (doc.empresa_cnpj ? String(doc.empresa_cnpj) : undefined);
    const empresaNome = org?.name?.trim() || (doc.empresa_nome ? String(doc.empresa_nome) : undefined);

    return {
      provider: 'honest',
      name: 'Honest',
      description: 'Importação de notas fiscais via API Honest com login e descoberta de endpoints',
      enabled: Boolean(doc.enabled),
      emissao_nf_habilitada: Boolean(doc.emissao_nf_habilitada),
      auto_sync_enabled: Boolean(doc.auto_sync_enabled),
      api_login: doc.api_login ? String(doc.api_login) : undefined,
      api_base_url: doc.api_base_url ? String(doc.api_base_url) : this.defaultBaseUrl(),
      empresa_id: empresaId,
      empresa_cnpj: empresaCnpj,
      empresa_nome: empresaNome,
      org_profile_ready: Boolean(empresaCnpj),
      honest_empresa_resolved: Boolean(empresaId),
      graphql_url: empresaId ? buildHonestGraphqlUrl(String(doc.api_base_url ?? this.defaultBaseUrl() ?? 'https://honest.com.br')) : undefined,
      graphql_verified: Boolean(doc.graphql_verified_at) && !doc.graphql_verify_error,
      graphql_nota_count:
        doc.graphql_nota_count != null ? Number(doc.graphql_nota_count) : undefined,
      graphql_verified_at: doc.graphql_verified_at
        ? new Date(doc.graphql_verified_at as string).toISOString()
        : undefined,
      graphql_verify_error: doc.graphql_verify_error ? String(doc.graphql_verify_error) : undefined,
      sync_ready: Boolean(isConnected && empresaId && endpoints.some((e) => e.confirmed || e.id === doc.selected_endpoint_id)),
      has_credentials: hasCredentials,
      is_connected: isConnected,
      discovery_active: Boolean(doc.discovery_active),
      discovered_endpoints: endpoints,
      selected_endpoint_id: doc.selected_endpoint_id ? String(doc.selected_endpoint_id) : undefined,
      sync_interval_minutes: Number(doc.sync_interval_minutes ?? 60),
      last_sync_at: doc.last_sync_at ? new Date(doc.last_sync_at as string).toISOString() : undefined,
      last_sync_status: (doc.last_sync_status as HonestIntegrationView['last_sync_status']) ?? null,
      last_sync_error: doc.last_sync_error ? String(doc.last_sync_error) : undefined,
      last_sync_trigger: (doc.last_sync_trigger as HonestIntegrationView['last_sync_trigger']) ?? null,
      last_sync_stats: stats
        ? {
            imported: Number(stats.imported ?? 0),
            ignored: Number(stats.ignored ?? 0),
            total_faturas: Number(stats.total_faturas ?? 0),
            vinculadas: Number(stats.vinculadas ?? 0),
            urls_ok: Number(stats.urls_ok ?? 0),
            urls_failed: Number(stats.urls_failed ?? 0),
            importacao_id: stats.importacao_id ? String(stats.importacao_id) : undefined,
          }
        : undefined,
    };
  }
}
