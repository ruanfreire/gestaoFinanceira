# Módulo Health

## Endpoints
- `GET /api/health` — público, sem JWT

## Resposta
```json
{
  "ok": true,
  "status": "healthy",
  "mongo": "up",
  "uptime": 123,
  "timestamp": "2026-07-01T00:00:00.000Z"
}
```

Usado por deploy (`install-native.sh`, `maintenance.sh`) e monitoramento.
