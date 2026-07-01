export class CreateNotaDto {
  empresa!: string;
  numero!: string;
  nota_api_id?: string;
  tomador?: string;
  codigo_servico?: string;
  valor?: number;
  data_emissao?: Date;
  status?: string;
  rps_id?: string;
  link_prefeitura?: string;
  json_original?: any;
}

