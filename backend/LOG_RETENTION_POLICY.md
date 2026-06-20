# Politica de Retencao de Logs - USV-AM

## Objetivo
Definir por quanto tempo os logs permanecem no RTDB e como ocorre a limpeza automatica para evitar degradacao de leitura e aumento de custo.

## Escopo
- Caminho monitorado: `/logs/{log_id}`
- Fonte principal dos eventos: firmware
- Leitura: dashboard frontend e trilha de auditoria

## Regra de Retencao (MVP)
- Retencao padrao: 90 dias
- Criterio de expiracao principal: `timestamp` (epoch em segundos)
- Criterio opcional de expiracao explicita: `expires_at` (epoch em segundos)

## Campos Minimos por Log
```json
{
  "drone_id": "drone_01",
  "mission_id": "m_1710624000",
  "type": "obstacle_detected",
  "timestamp": 1710624050
}
```

## Execucao da Limpeza
Script implementado em `backend/scripts/cleanup-logs.mjs`.

### Variaveis de ambiente
- `FIREBASE_DATABASE_URL` (obrigatoria)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (opcional; usa credencial padrao se ausente)
- `LOG_RETENTION_DAYS` (opcional; default: 90)
- `LOG_MAX_DELETES_PER_RUN` (opcional; default: 2000)
- `LOG_DELETE_BATCH_SIZE` (opcional; default: 500)

### Comandos
```bash
cd backend
npm install
npm run cleanup:logs
```

## Frequencia Recomendada
- Rodar 1x por dia (janela de baixo uso), por exemplo 02:00.
- Em produção, usar agendamento (Cloud Scheduler, GitHub Actions cron ou CI equivalente).

## Governanca
- Alteracoes de prazo de retencao devem ser registradas neste documento.
- Logs de erro critico podem usar prazo maior via `expires_at`.

## Criterios de aceite
- Logs com `timestamp` anterior ao limite sao removidos automaticamente.
- Sistema nao remove logs recentes.
- Execucao gera resumo de quantidade removida por criterio.
