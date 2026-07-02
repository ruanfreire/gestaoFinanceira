# Módulo Conciliação (contagens)

## Endpoints
- `GET /api/conciliacao/counts` — requer JWT

## Resposta
```json
{
  "pendentes": 5,
  "sem_match": 2,
  "asaas": { "pendentes": 3, "sem_match": 1 },
  "nubank": { "pendentes": 2, "sem_match": 1 }
}
```

Usa `countDocuments` por `status_conciliacao` — não altera regras de match nem carrega candidatas.
