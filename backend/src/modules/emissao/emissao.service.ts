import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanOne } from '../../common/mongoose-lean.util';
import { getCurrentTenantId } from '../../common/tenant/tenant-storage';
import { mesCompetenciaFromDate } from '../notas/competencia.util';
import { NotasService } from '../notas/notas.service';
import { TomadoresService } from '../tomadores/tomadores.service';
import { EmissaoNfConfigService } from '../integrations/emissao-nf-config.service';
import { PrefeituraEmissaoService } from './prefeitura-emissao.service';
import { SpNfseEmissaoProvider } from './providers/sp-nfse-emissao.provider';
import { AuditService } from '../audit_logs/audit.service';
import { NotificationsService } from '../platform/notifications.service';
import { AtualizarEmissaoRascunhoDto, CriarEmissaoRascunhoDto } from './dto/emissao.dto';
import { isValidDocumento } from '../tomadores/tomador-match.util';

type BankLancamentoLean = {
  _id: unknown;
  importacao_id?: unknown;
  transacao_id?: string;
  data?: Date;
  descricao?: string;
  valor?: number;
  pagador_nome?: string;
  status_conciliacao?: string;
  nota_id?: unknown;
};

type EmissaoRascunhoLean = {
  _id: unknown;
  lancamento_id: unknown;
  tomador_id?: unknown;
  payload?: {
    valor?: number;
    codigo_servico?: string;
    discriminacao?: string;
    aliquota_iss?: number;
    data_competencia?: Date | string;
  };
  status?: string;
  nota_id?: unknown;
  erro_mensagem?: string;
  createdBy?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class EmissaoService {
  constructor(
    @InjectModel('EmissaoRascunho') private readonly rascunhoModel: Model<unknown>,
    @InjectModel('BankLancamento') private readonly lancamentoModel: Model<unknown>,
    @InjectModel('BankImportacao') private readonly bankImportModel: Model<unknown>,
    @InjectModel('Organization') private readonly organizationModel: Model<unknown>,
    private readonly tomadoresService: TomadoresService,
    private readonly notasService: NotasService,
    private readonly emissaoNfConfig: EmissaoNfConfigService,
    private readonly prefeituraEmissao: PrefeituraEmissaoService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private toView(doc: EmissaoRascunhoLean, tomador?: Record<string, unknown>) {
    return {
      _id: String(doc._id),
      lancamento_id: String(doc.lancamento_id),
      tomador_id: doc.tomador_id ? String(doc.tomador_id) : undefined,
      tomador,
      payload: {
        valor: doc.payload?.valor,
        codigo_servico: doc.payload?.codigo_servico,
        discriminacao: doc.payload?.discriminacao,
        aliquota_iss: doc.payload?.aliquota_iss,
        data_competencia: doc.payload?.data_competencia
          ? new Date(doc.payload.data_competencia).toISOString().slice(0, 10)
          : undefined,
      },
      status: doc.status,
      nota_id: doc.nota_id ? String(doc.nota_id) : undefined,
      erro_mensagem: doc.erro_mensagem,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private async loadLancamentoForEmissao(lancamentoId: string) {
    const lancamento = asLeanOne<BankLancamentoLean>(
      await this.lancamentoModel.findById(lancamentoId).lean(),
    );
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');
    if (!['pendente_vinculo', 'sem_match'].includes(lancamento.status_conciliacao ?? '')) {
      throw new BadRequestException('Este pagamento já foi conciliado ou não está disponível para emissão');
    }
    if (lancamento.nota_id) {
      throw new BadRequestException('Este pagamento já possui nota vinculada');
    }
    return lancamento;
  }

  private async resolveTomadorId(
    lancamento: BankLancamentoLean,
    tomadorId?: string,
  ): Promise<string> {
    if (tomadorId) return tomadorId;

    const pagador = lancamento.pagador_nome?.trim();
    if (!pagador) {
      throw new BadRequestException('Informe o tomador ou o nome do pagador no lançamento');
    }

    const suggestion = await this.tomadoresService.suggestTomador(pagador);
    if (!suggestion) {
      throw new BadRequestException('Nenhum tomador identificado para este pagamento');
    }
    return suggestion.id;
  }

  private buildDefaultPayload(
    lancamento: BankLancamentoLean,
    tomador: Awaited<ReturnType<TomadoresService['findById']>>,
  ) {
    const paymentDate = new Date(lancamento.data ?? Date.now());
    return {
      valor: Number(lancamento.valor ?? 0),
      codigo_servico: tomador.codigo_servico_padrao ?? '',
      discriminacao: tomador.discriminacao_padrao ?? `Serviços prestados para ${tomador.nome}`,
      aliquota_iss: tomador.aliquota_iss_padrao,
      data_competencia: paymentDate,
    };
  }

  async getCounts() {
    const aguardando_emissao = await this.lancamentoModel.countDocuments({
      status_conciliacao: 'sem_match',
      tipo_movimento: 'entrada',
    });
    return { aguardando_emissao };
  }

  async criarRascunho(dto: CriarEmissaoRascunhoDto, userId?: string) {
    const lancamento = await this.loadLancamentoForEmissao(dto.lancamento_id);

    const existing = asLeanOne<EmissaoRascunhoLean>(
      await this.rascunhoModel
        .findOne({ lancamento_id: dto.lancamento_id, status: { $in: ['rascunho', 'erro'] } })
        .lean(),
    );
    if (existing) {
      const tomador = existing.tomador_id
        ? await this.tomadoresService.findById(String(existing.tomador_id))
        : undefined;
      return this.toView(existing, tomador);
    }

    const tomadorId = await this.resolveTomadorId(lancamento, dto.tomador_id);
    const tomador = await this.tomadoresService.findById(tomadorId);
    const payload = this.buildDefaultPayload(lancamento, tomador);

    const created = await this.rascunhoModel.create({
      lancamento_id: dto.lancamento_id,
      tomador_id: tomadorId,
      payload,
      status: 'rascunho',
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    await this.auditService.record({
      action: 'emissao_nf_criada',
      entity: 'emissao_rascunho',
      entityId: String(created._id),
      metadata: { lancamento_id: dto.lancamento_id, tomador_id: tomadorId },
    });

    const doc = (await this.rascunhoModel.findById(created._id).lean()) as EmissaoRascunhoLean;
    return this.toView(doc, tomador);
  }

  async findById(id: string) {
    const doc = asLeanOne<EmissaoRascunhoLean>(await this.rascunhoModel.findById(id).lean());
    if (!doc) throw new NotFoundException('Rascunho não encontrado');
    const tomador = doc.tomador_id
      ? await this.tomadoresService.findById(String(doc.tomador_id))
      : undefined;
    return this.toView(doc, tomador);
  }

  async atualizarRascunho(id: string, dto: AtualizarEmissaoRascunhoDto) {
    const doc = asLeanOne<EmissaoRascunhoLean>(await this.rascunhoModel.findById(id).lean());
    if (!doc || !['rascunho', 'erro'].includes(doc.status ?? '')) {
      throw new BadRequestException('Rascunho não está disponível para edição');
    }

    const update: Record<string, unknown> = {};
    if (dto.tomador_id) update.tomador_id = dto.tomador_id;
    if (dto.valor != null) update['payload.valor'] = dto.valor;
    if (dto.codigo_servico != null) update['payload.codigo_servico'] = dto.codigo_servico.trim();
    if (dto.discriminacao != null) update['payload.discriminacao'] = dto.discriminacao.trim();
    if (dto.aliquota_iss != null) update['payload.aliquota_iss'] = dto.aliquota_iss;
    if (dto.data_competencia) update['payload.data_competencia'] = new Date(dto.data_competencia);

    const updated = asLeanOne<EmissaoRascunhoLean>(
      await this.rascunhoModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean(),
    );
    if (!updated) throw new NotFoundException('Rascunho não encontrado');

    const tomador = updated.tomador_id
      ? await this.tomadoresService.findById(String(updated.tomador_id))
      : undefined;
    return this.toView(updated, tomador);
  }

  private async resolveEmpresaEmissora(tenantId: Types.ObjectId) {
    const org = asLeanOne<{ name?: string; cnpj?: string }>(
      await this.organizationModel.findById(tenantId).select('name cnpj').lean(),
    );
    return {
      empresa: org?.name?.trim() || 'Empresa',
      empresa_cnpj: org?.cnpj?.trim(),
      empresa_nome: org?.name?.trim(),
    };
  }

  async confirmarRascunho(id: string, userId?: string) {
    const doc = asLeanOne<EmissaoRascunhoLean>(await this.rascunhoModel.findById(id).lean());
    if (!doc || !['rascunho', 'erro'].includes(doc.status ?? '')) {
      throw new BadRequestException('Rascunho não está disponível para confirmação');
    }

    const lancamento = await this.loadLancamentoForEmissao(String(doc.lancamento_id));
    const tomador = await this.tomadoresService.findById(String(doc.tomador_id));
    if (!tomador.documento || !isValidDocumento(tomador.documento)) {
      throw new BadRequestException('Tomador precisa de CPF ou CNPJ válido para emitir a nota');
    }

    const payload = doc.payload ?? {};
    const valor = Number(payload.valor ?? lancamento.valor ?? 0);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new BadRequestException('Valor da nota inválido');
    }
    if (!payload.codigo_servico?.trim()) {
      throw new BadRequestException('Informe o código de serviço');
    }
    if (!payload.discriminacao?.trim()) {
      throw new BadRequestException('Informe a discriminação do serviço');
    }

    const tenantId = getCurrentTenantId();
    const emissaoHabilitada = tenantId
      ? await this.emissaoNfConfig.isEmissaoNfEnabled(tenantId)
      : false;

    await this.rascunhoModel.findByIdAndUpdate(id, {
      $set: { status: emissaoHabilitada ? 'emitindo' : 'confirmado', erro_mensagem: null },
    });

    const paymentDate = new Date(lancamento.data ?? Date.now());
    const dataCompetencia = payload.data_competencia
      ? new Date(payload.data_competencia)
      : paymentDate;
    const empresaInfo = tenantId
      ? await this.resolveEmpresaEmissora(tenantId)
      : { empresa: 'Empresa', empresa_cnpj: undefined, empresa_nome: undefined };

    let emitResult:
      | {
          numero: string;
          nota_api_id?: string;
          link_prefeitura?: string;
          status_emissao: string;
        }
      | undefined;

    if (emissaoHabilitada && tenantId) {
      const prefeituraResult = await this.prefeituraEmissao.emit(String(tenantId), {
        tomador_nome: tomador.nome,
        tomador_documento: tomador.documento,
        tomador_email: tomador.email,
        valor,
        codigo_servico: payload.codigo_servico.trim(),
        discriminacao: payload.discriminacao.trim(),
        aliquota_iss: payload.aliquota_iss,
        data_competencia: dataCompetencia.toISOString().slice(0, 10),
      });

      if (!prefeituraResult.ok) {
        const message = prefeituraResult.error ?? 'Falha na emissão na prefeitura';
        await this.rascunhoModel.findByIdAndUpdate(id, {
          $set: { status: 'erro', erro_mensagem: message },
        });
        await this.auditService.record({
          action: 'emissao_nf_erro',
          entity: 'emissao_rascunho',
          entityId: id,
          metadata: { error: message, canal: 'prefeitura' },
        });
        throw new BadRequestException(message);
      }

      emitResult = {
        numero: prefeituraResult.numero!,
        nota_api_id: prefeituraResult.nota_api_id,
        link_prefeitura: prefeituraResult.link_prefeitura,
        status_emissao: prefeituraResult.status_emissao ?? 'NORMAL',
      };
    } else {
      emitResult = {
        numero: `PEND-${Date.now()}`,
        status_emissao: 'PENDENTE_EMISSAO',
      };
    }

    const nota = await this.notasService.create({
      empresa: empresaInfo.empresa,
      empresa_nome: empresaInfo.empresa_nome,
      empresa_cnpj: empresaInfo.empresa_cnpj,
      numero: emitResult.numero,
      nota_api_id: emitResult.nota_api_id,
      tomador: tomador.nome,
      tomador_documento: tomador.documento,
      tomador_email: tomador.email,
      codigo_servico: payload.codigo_servico.trim(),
      discriminacao: payload.discriminacao.trim(),
      valor,
      aliquota_iss: payload.aliquota_iss,
      data_emissao: paymentDate,
      data_competencia: dataCompetencia,
      mes_competencia: mesCompetenciaFromDate(dataCompetencia),
      status_emissao: emitResult.status_emissao,
      status: emitResult.status_emissao,
      link_prefeitura: emitResult.link_prefeitura,
      origem: 'emissao_pagamento',
      tomador_id: tomador._id,
      status_pagamento: 'em_aberto',
      valor_pago: 0,
    });

    const notaId = String((nota as { _id?: unknown })._id);

    await this.notasService.applyPayment(
      notaId,
      String(lancamento._id),
      valor,
      paymentDate,
      'bank',
      {
        transacao_id: lancamento.transacao_id,
        descricao: lancamento.descricao,
        pagador_nome: lancamento.pagador_nome,
      },
    );

    const previousStatus = lancamento.status_conciliacao;
    await this.lancamentoModel.findByIdAndUpdate(lancamento._id, {
      $set: { status_conciliacao: 'conciliado_manual', nota_id: notaId },
    });

    if (lancamento.importacao_id) {
      const statsInc: Record<string, number> = { 'stats.conciliado_manual': 1 };
      if (previousStatus === 'pendente_vinculo') statsInc['stats.pendente_vinculo'] = -1;
      else if (previousStatus === 'sem_match') statsInc['stats.sem_match'] = -1;
      await this.bankImportModel.findByIdAndUpdate(lancamento.importacao_id, { $inc: statsInc });
    }

    await this.rascunhoModel.findByIdAndUpdate(id, {
      $set: { status: 'emitida', nota_id: notaId, erro_mensagem: null },
    });

    await this.auditService.record({
      action: 'emissao_nf_confirmada',
      entity: 'emissao_rascunho',
      entityId: id,
      metadata: { nota_id: notaId, lancamento_id: String(lancamento._id), userId },
    });

    if (tenantId && userId) {
      const path = await this.notificationsService.tenantPath(
        tenantId,
        '/recebimentos/sem-correspondencia',
      );
      await this.notificationsService.notifyUser(userId, {
        type: 'emissao_nf_confirmada',
        title: 'Nota registrada',
        message: `NF para ${tomador.nome} — R$ ${valor.toFixed(2)} vinculada ao pagamento.`,
        url: path,
      });
    }

    return {
      ok: true,
      rascunho_id: id,
      nota_id: notaId,
      numero: emitResult.numero,
      status_emissao: emitResult.status_emissao,
      emissao_prefeitura: emissaoHabilitada,
    };
  }
}
