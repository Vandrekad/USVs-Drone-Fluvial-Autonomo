# Checklist de Configuracao Firebase - USV-AM

## Antes de conectar o frontend
- Criar projeto no Firebase Console.
- Habilitar Realtime Database.
- Habilitar Authentication.
- Criar usuario/fluxo de login para o operador.
- Definir as variaveis em `Projeto_PEX/.env.local`.

## Realtime Database
- Publicar as rules de `backend/firebase-rtdb.rules.json`.
- Confirmar que o schema segue `/drones`, `/missions` e `/logs`.
- Garantir que `telemetry` e `status` recebam atualizacoes do firmware.
- Confirmar que `command` e `missions` estao acessiveis ao frontend autenticado.

## Firebase Auth
- Criar o usuario operador com email `operador@usv-am.local`.
- Registrar o UID `do01A3JzdRb5z4ulrCoVcy1mA8A2` como conta autorizada para o operador.
- Ativar Anonymous Sign-in ou Email/Password, conforme a operacao desejada.
- Garantir que o frontend execute `signInAnonymously` ou outro login escolhido.
- Se usar roles, adicionar custom claims para `operator`, `firmware` e `admin`.
- Se ainda nao houver custom claims, as rules do RTDB ja aceitam esse UID como operador.

## Operacao e validacao
- Inserir dados reais no RTDB e abrir o dashboard.
- Verificar se o mapa mostra telemetry, path e mission.
- Verificar se os logs carregam por `timestamp`.
- Validar leitura/gravação com o usuario autenticado.
- Trocar o payload do firmware para o schema real antes de produção.
