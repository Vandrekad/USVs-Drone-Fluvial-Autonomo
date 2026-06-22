# Conta Operador Firebase - USV-AM

## Identificacao
- UID: `do01A3JzdRb5z4ulrCoVcy1mA8A2`
- Email/identificador: `operador@usv-am.local`

## Uso esperado
- Conta destinada ao operador do dashboard.
- Acesso de leitura a telemetry, status, mission e logs conforme rules.
- Escrita de command e missions quando o perfil de operador estiver habilitado.

## Observacao
- Se as custom claims ainda nao estiverem configuradas, as rules do RTDB podem liberar esse UID explicitamente.
- Quando os claims existirem, o ideal e mover esse acesso para `auth.token.role === 'operator'`.
