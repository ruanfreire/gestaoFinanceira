import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizeName } from '../../common/name-match.util';
import { CreateTomadorDto, ResolverTomadorDto, UpdateTomadorDto } from './dto/tomador.dto';
import {
  isValidDocumento,
  normalizeDocumento,
  rankTomadorMatches,
  tomadorGroupKey,
  uniqueAliases,
} from './tomador-match.util';

type TomadorLean = {
  _id: unknown;
  nome: string;
  documento?: string;
  email?: string;
  endereco?: Record<string, string>;
  codigo_servico_padrao?: string;
  discriminacao_padrao?: string;
  aliquota_iss_padrao?: number;
  aliases_pagamento?: string[];
  origem?: string;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type NotaTomadorSource = {
  tomador?: string;
  tomador_documento?: string;
  tomador_email?: string;
  codigo_servico?: string;
  discriminacao?: string;
  aliquota_iss?: number;
};

@Injectable()
export class TomadoresService {
  constructor(
    @InjectModel('Tomador') private readonly tomadorModel: Model<unknown>,
    @InjectModel('Nota') private readonly notaModel: Model<unknown>,
  ) {}

  private sanitizeDto(dto: CreateTomadorDto | UpdateTomadorDto) {
    const payload: Record<string, unknown> = {};

    if (dto.nome !== undefined) payload.nome = dto.nome.trim();
    if (dto.documento !== undefined) {
      const documento = normalizeDocumento(dto.documento);
      if (documento && !isValidDocumento(documento)) {
        throw new BadRequestException('Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos');
      }
      payload.documento = documento || undefined;
    }
    if (dto.email !== undefined) payload.email = dto.email.trim() || undefined;
    if (dto.endereco !== undefined) {
      const endereco = Object.fromEntries(
        Object.entries(dto.endereco).filter(([, value]) => Boolean(String(value ?? '').trim())),
      );
      payload.endereco = Object.keys(endereco).length ? endereco : undefined;
    }
    if (dto.codigo_servico_padrao !== undefined) {
      payload.codigo_servico_padrao = dto.codigo_servico_padrao.trim() || undefined;
    }
    if (dto.discriminacao_padrao !== undefined) {
      payload.discriminacao_padrao = dto.discriminacao_padrao.trim() || undefined;
    }
    if (dto.aliquota_iss_padrao !== undefined) payload.aliquota_iss_padrao = dto.aliquota_iss_padrao;
    if (dto.aliases_pagamento !== undefined) {
      payload.aliases_pagamento = uniqueAliases(dto.aliases_pagamento);
    }
    if ('origem' in dto && dto.origem !== undefined) payload.origem = dto.origem;

    return payload;
  }

  private toView(doc: TomadorLean) {
    return {
      _id: String(doc._id),
      nome: doc.nome,
      documento: doc.documento,
      email: doc.email,
      endereco: doc.endereco,
      codigo_servico_padrao: doc.codigo_servico_padrao,
      discriminacao_padrao: doc.discriminacao_padrao,
      aliquota_iss_padrao: doc.aliquota_iss_padrao,
      aliases_pagamento: doc.aliases_pagamento ?? [],
      origem: doc.origem ?? 'manual',
      ativo: doc.ativo !== false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async list(options: { page?: number; limit?: number; q?: string; includeInactive?: boolean }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (!options.includeInactive) filter.ativo = true;

    const term = options.q?.trim();
    if (term) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const docDigits = normalizeDocumento(term);
      filter.$or = [
        { nome: regex },
        { email: regex },
        { aliases_pagamento: regex },
        ...(docDigits ? [{ documento: docDigits }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      this.tomadorModel.find(filter).sort({ nome: 1 }).skip(skip).limit(limit).lean(),
      this.tomadorModel.countDocuments(filter),
    ]);

    return {
      items: (items as TomadorLean[]).map((item) => this.toView(item)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const doc = (await this.tomadorModel.findById(id).lean()) as TomadorLean | null;
    if (!doc || doc.ativo === false) {
      throw new NotFoundException('Tomador não encontrado');
    }
    return this.toView(doc);
  }

  async create(dto: CreateTomadorDto) {
    const payload = this.sanitizeDto(dto);
    if (!payload.nome) {
      throw new BadRequestException('Nome é obrigatório');
    }

    const documento = payload.documento as string | undefined;
    if (documento) {
      const exists = await this.tomadorModel.findOne({ documento, ativo: true }).lean();
      if (exists) {
        throw new BadRequestException('Já existe um tomador ativo com este documento');
      }
    }

    const created = await this.tomadorModel.create({
      ...payload,
      origem: payload.origem ?? 'manual',
      ativo: true,
    });

    const doc = (await this.tomadorModel.findById(created._id).lean()) as TomadorLean | null;
    if (!doc) {
      throw new BadRequestException('Não foi possível criar o tomador');
    }
    return this.toView(doc);
  }

  async update(id: string, dto: UpdateTomadorDto) {
    const existing = (await this.tomadorModel.findById(id).lean()) as TomadorLean | null;
    if (!existing || existing.ativo === false) {
      throw new NotFoundException('Tomador não encontrado');
    }

    const payload = this.sanitizeDto(dto);
    const documento = payload.documento as string | undefined;
    if (documento) {
      const duplicate = await this.tomadorModel
        .findOne({ documento, ativo: true, _id: { $ne: id } })
        .lean();
      if (duplicate) {
        throw new BadRequestException('Já existe um tomador ativo com este documento');
      }
    }

    const updated = (await this.tomadorModel
      .findByIdAndUpdate(id, { $set: payload }, { new: true })
      .lean()) as TomadorLean | null;
    if (!updated) {
      throw new NotFoundException('Tomador não encontrado');
    }
    return this.toView(updated);
  }

  async softDelete(id: string) {
    const updated = (await this.tomadorModel
      .findByIdAndUpdate(id, { $set: { ativo: false } }, { new: true })
      .lean()) as TomadorLean | null;
    if (!updated) {
      throw new NotFoundException('Tomador não encontrado');
    }
    return { ok: true, id };
  }

  async suggestTomador(pagadorNome: string) {
    const result = await this.resolver({ pagador_nome: pagadorNome });
    const best = result.matches[0];
    if (!best || best.score < 0.7) return null;
    return { id: best._id, nome: best.nome, documento: best.documento, email: best.email, score: best.score };
  }

  async resolver(dto: ResolverTomadorDto) {
    const pagadorNome = dto.pagador_nome.trim();
    if (!pagadorNome) {
      throw new BadRequestException('pagador_nome é obrigatório');
    }

    const tomadores = (await this.tomadorModel.find({ ativo: true }).lean()) as TomadorLean[];
    const ranked = rankTomadorMatches(tomadores, pagadorNome);

    return {
      pagador_nome: pagadorNome,
      matches: ranked.map((item) => ({
        _id: String(item.tomador._id),
        nome: item.tomador.nome,
        documento: item.tomador.documento,
        email: item.tomador.email,
        score: Number(item.score.toFixed(4)),
      })),
    };
  }

  async importarDeNotas() {
    const notas = (await this.notaModel
      .find({
        tomador: { $exists: true, $ne: '' },
      })
      .select('tomador tomador_documento tomador_email codigo_servico discriminacao aliquota_iss')
      .lean()) as NotaTomadorSource[];

    const existingTomadores = (await this.tomadorModel.find({ ativo: true }).lean()) as TomadorLean[];
    const existingKeys = new Set(
      existingTomadores.map((item) =>
        tomadorGroupKey(item.nome, item.documento),
      ),
    );

    const groups = new Map<
      string,
      {
        nome: string;
        documento?: string;
        email?: string;
        codigo_servico?: string;
        discriminacao?: string;
        aliquota_iss?: number;
        aliases: string[];
      }
    >();

    for (const nota of notas) {
      const nome = nota.tomador?.trim();
      if (!nome) continue;

      const documento = normalizeDocumento(nota.tomador_documento);
      const key = tomadorGroupKey(nome, documento);
      if (!key || existingKeys.has(key)) continue;

      const current = groups.get(key) ?? {
        nome,
        documento: documento || undefined,
        email: nota.tomador_email?.trim() || undefined,
        codigo_servico: nota.codigo_servico?.trim() || undefined,
        discriminacao: nota.discriminacao?.trim() || undefined,
        aliquota_iss: nota.aliquota_iss,
        aliases: [],
      };

      if (!current.email && nota.tomador_email?.trim()) current.email = nota.tomador_email.trim();
      if (!current.codigo_servico && nota.codigo_servico?.trim()) {
        current.codigo_servico = nota.codigo_servico.trim();
      }
      if (!current.discriminacao && nota.discriminacao?.trim()) {
        current.discriminacao = nota.discriminacao.trim();
      }
      if (current.aliquota_iss == null && nota.aliquota_iss != null) {
        current.aliquota_iss = nota.aliquota_iss;
      }

      const normalizedNome = normalizeName(nome);
      if (normalizedNome && normalizeName(current.nome) !== normalizedNome) {
        current.aliases.push(nome);
      }

      groups.set(key, current);
    }

    let created = 0;
    let skipped = 0;

    for (const group of groups.values()) {
      const key = tomadorGroupKey(group.nome, group.documento);
      if (!key || existingKeys.has(key)) {
        skipped += 1;
        continue;
      }

      await this.tomadorModel.create({
        nome: group.nome,
        documento: group.documento,
        email: group.email,
        codigo_servico_padrao: group.codigo_servico,
        discriminacao_padrao: group.discriminacao,
        aliquota_iss_padrao: group.aliquota_iss,
        aliases_pagamento: uniqueAliases(group.aliases),
        origem: 'importacao_nf',
        ativo: true,
      });

      existingKeys.add(key);
      created += 1;
    }

    return {
      ok: true,
      created,
      skipped,
      total_notas_analisadas: notas.length,
      grupos_encontrados: groups.size,
    };
  }
}
