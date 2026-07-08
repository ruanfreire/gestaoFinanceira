# Emissão NFS-e — APIs oficiais das prefeituras

**Status:** arquitetura definida · primeira integração (São Paulo) em implementação  
**Última revisão:** 2026-07-03

---

## Decisão de produto

| Canal | Papel |
|-------|--------|
| **API NFS-e da prefeitura** | **Emitir** notas fiscais (transmissão oficial) |
| **Honest** | **Importar** notas já emitidas (sync `NfsEmitidas`) |
| **Modo local** | Registrar nota `PENDENTE_EMISSAO` quando emissão automática está desligada |

A Honest **não** é o canal de emissão. O código legado `honest-emissao.util.ts` (`NfEmitir`) está **deprecado**.

---

## Fluxo no sistema

```
Pagamento sem nota → rascunho → confirmar
    ├─ emissao_nf_habilitada = false → nota local (PENDENTE_EMISSAO) + applyPayment
    └─ emissao_nf_habilitada = true  → PrefeituraEmissaoService → API prefeitura → nota + applyPayment
```

Configuração: **Configurações → Emissão NFS-e** (`GET/PATCH /org/emissao`).

Campos na organização (`Organization`):

| Campo | Descrição |
|-------|-----------|
| `emissao_nf_habilitada` | Opt-in por tenant (default `false`) |
| `prefeitura_codigo` | Provedor: `sp` = Prefeitura de São Paulo |

---

## Arquitetura backend

```
backend/src/modules/emissao/
  prefeitura-emissao.service.ts      # orquestrador
  providers/
    prefeitura-emissao.provider.ts   # interface
    sp-nfse-emissao.provider.ts      # São Paulo (em implementação)
  types/prefeitura-emissao.types.ts
```

Cada prefeitura implementa `PrefeituraEmissaoProvider`:

```ts
interface PrefeituraEmissaoProvider {
  readonly codigo: PrefeituraCodigo;
  emit(input, context): Promise<PrefeituraEmitResult>;
}
```

Novos municípios: adicionar provider + registrar em `PrefeituraEmissaoService`.

---

## Prefeitura de São Paulo (NFS-e)

**Código interno:** `sp`  
**Evidência no domínio:** links `link_prefeitura` em `inicial.json` (CCM `67687385`)

### Pré-requisitos previstos (Fase EP-6)

| Item | Onde configurar |
|------|-----------------|
| CNPJ da empresa | Perfil da organização |
| Inscrição municipal (CCM) | Credenciais fiscais (a implementar) |
| Certificado digital A1 | Armazenamento seguro por tenant (a implementar) |
| Código de serviço LC 116 | Tomador / rascunho |

### API

Integração direta com o **Web Service NFS-e** da Prefeitura de São Paulo (RPS / lote / consulta).  
Detalhes técnicos do WSDL e operações serão documentados na implementação do `SpNfseEmissaoProvider`.

---

## Fases pós EP-5

| Fase | Escopo | Status |
|------|--------|--------|
| **EP-6** | Provider SP + credenciais fiscais (CCM, cert A1) | Planejado |
| **EP-7** | Homologação SP + testes com prefeitura | Planejado |
| **EP-8** | Novos municípios (plug-in providers) | Futuro |

---

## Referências

| Documento | Conteúdo |
|-----------|----------|
| `docs/FLUXO-EMISSAO-PAGAMENTO.md` | Fluxo pagamento → nota |
| `docs/OPERACIONAL-EMISSAO.md` | Guia do operador |
| `docs/HONEST-EMISSAO-API.md` | **Deprecado** — mutation Honest |
| `docs/BDRE.md` | Domínio e links prefeitura SP |
