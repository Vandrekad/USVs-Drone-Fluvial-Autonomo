# Firmware Development Plan

## Objetivo
Criar o firmware ESP32 do USV-AM conforme o PRD, em ciclos iterativos, construindo primeiro a infraestrutura de conexão e cloud, depois a telemetria e, por fim, a navegação autônoma com fail-safe.

## Situação Atual
- `firmware/src/main.cpp` contém um protótipo de Wi-Fi + Firebase com telemetria mock.
- `firmware/platformio.ini` está configurado para `esp32dev` e inclui as dependências Firebase e ArduinoJson.
- O projeto ainda não possui integração de sensores ou controle de motores.

## Visão de Implementação em Passos
A ideia é trabalhar em etapas curtas, cada etapa entregando algo testável e incremental.

### Passo 1: Base de Conectividade e Estrutura
Meta: ter o firmware inicial conectado ao Firebase e atualizado no RTDB.
Tarefas:
- Estruturar `main.cpp` com `setup()` e `loop()` claros.
- Implementar conexão Wi-Fi com retry/backoff.
- Inicializar o cliente Firebase e autenticar.
- Publicar um documento de `status` e um documento de `telemetry` básicos.
- Criar função de `onDisconnect()` para presença.

Resultado esperado:
- O ESP32 conecta no Wi-Fi e escreve `/drones/drone_01/status` e `/drones/drone_01/telemetry`.
- Logs seriais mostram conexão e publicações.

### Passo 2: Comando e Máquina de Estados Básica
Meta: o firmware deve ler comandos do RTDB e alterar seu estado interno.
Tarefas:
- Definir estados de navegação (`IDLE_HOLDING_POSITION`, `NAVIGATING_TO_GOAL`, `RETURNING_TO_HOME`, etc.).
- Ler `/drones/drone_01/command` e processar apenas novos `command_id`.
- Implementar comandos MVP: `set_destination` e `emergency_stop`.
- Atualizar `/status/nav_state` atomically a cada mudança.

Resultado esperado:
- Firmware reconhece comando novo e muda estado.
- RTDB reflete `nav_state` e `last_seen`.

### Passo 3: Telemetria Estruturada e Simulada
Meta: publicar telemetria no formato PRD com dados de sensores e atuadores.
Tarefas:
- Construir o JSON de telemetria com `position`, `sensors` e `actuators`.
- Atualizar em intervalos de 1-2 segundos.
- Incluir `mission_id`, `heading`, `battery_mv`, `obs_dist`, `thrust_l`, `thrust_r`.
- Verificar consistência do contrato de dados.

Resultado esperado:
- `/drones/drone_01/telemetry` recebe payloads conforme especificado.
- O frontend pode consumir os valores e exibir dados atualizados.

### Passo 4: Simulação de Navegação Local
Meta: o firmware simula navegação para validar os estados sem hardware real.
Tarefas:
- Criar um modo de simulação de destino e deslocamento.
- Fazer a lógica de avanço de leg baseado em distância fictícia.
- Ajustar `route_progress` e `active_leg` no status.
- Testar transições entre `NAVIGATING_TO_GOAL` e `RETURNING_TO_HOME`.

Resultado esperado:
- Navegação simulada ocorre localmente e atualiza status/telemetria.
- É possível testar missões e stop de emergência sem GPS.

### Passo 5: Integração de Sensores e Atuadores
Meta: conectar hardware real e substituir valores simulados.
Tarefas:
- Adicionar suporte a GPS NEO-6M (UART / NMEA parsing).
- Integrar HMC5883L via I2C para heading.
- Adicionar leitura HC-SR04 para distância de obstáculo.
- Controlar motores PWM.

Resultado esperado:
- Firmware lê valores reais de posição, heading e obstáculo.
- Comandos de motor geram PWM de saída.

### Passo 6: Navegação LOS e Controle Diferencial
Meta: executar rota autônoma com controle de heading e ajuste de motores.
Tarefas:
- Implementar algoritmo LOS para navegação por waypoint.
- Calcular curso desejado, erro transversal e comandos `thrust_l` / `thrust_r`.
- Incluir compensação de corrente e timeout de perna.
- Detectar obstáculos e ativar `OBSTACLE_AVOIDANCE`.

Resultado esperado:
- Firmware gera rota local e segue destino.
- O estado de navegação e progressão de rota são publicados.

### Passo 7: Persistência Offline e Buffer Local
Meta: garantir operação contínua sem conexão e recuperação de dados.
Tarefas:
- Adicionar LittleFS para armazenar telemetria e path.
- Implementar deduplicação SHA256 de pontos.
- Gravar buffer local quando estiver offline.
- Reenviar dados gravados ao reconectar.

Resultado esperado:
- Dados continuam sendo capturados em modo offline.
- Ao reconectar, o firmware faz flush do buffer e atualiza Firebase.

### Passo 8: Teste e Ajuste Final
Meta: validar comportamentos críticos e documentar resultados.
Tarefas:
- Testar reconexão Wi-Fi e Firebase.
- Verificar emergência e retorno ao lar.
- Confirmar publicações a cada 1-2 segundos.
- Revisar o contrato RTDB e logs básicos.

Resultado esperado:
- Firmware opera de forma robusta em modos online e offline.
- Comportamentos do PRD são atingidos de forma incremental.

## Critérios de Validação
- Conexão Wi-Fi estável e reconnect automático.
- `status` e `telemetry` atualizam a cada 1-2 segundos.
- Comando novo é proces sado uma única vez por `command_id`.
- `emergency_stop` dispara `RETURNING_TO_HOME`.
- Offline buffer salva dados e faz flush ao reconectar.
- O estado de navegação muda corretamente e é publicado.

## Organização de Desenvolvimento
- Trabalhar por passo, não por recurso isolado.
- Mantê-lo simples no começo e expandir a partir das funções básicas.
- Usar `firmware/src/main.cpp` como ponto de partida, mas mover lógica para módulos se necessário.
- Ao final da execucao de cada passo, faca a analise do planejamento e explique se for necessario a modificacao em algum passo seguinte, so altere o arquivo de planejamento se eu aprovar

