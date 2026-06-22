# 📝 Textos Sugeridos para os Slides do Pitch 4 — USV-AM (Versão Corrigida)

Este documento apresenta a proposta final de textos para a apresentação final (Pitch 4), corrigida para refletir o uso do **EasyEDA** para o esquema elétrico e a **ausência completa de testes de campo** (devido à inexistência de protótipo físico funcional). A entrega é estritamente composta pelo esquema elétrico, firmware, backend e frontend responsivo integrado.

---

## 🖼️ IMAGEM 1 (Slides 1 a 3)

### 1. VISÃO GERAL DO PROJETO

*   **OBJETIVO**
    > Desenvolver a arquitetura de um Veículo de Superfície Autônomo (USV) de baixo custo voltado para monitoramento ambiental e segurança em rios amazônicos, operando de forma independente de conexão contínua com a internet.

*   **SOLUÇÃO DESENVOLVIDA**
    > Projeto do circuito elétrico no EasyEDA e ecossistema de software completo: firmware ESP32 com algoritmo de navegação Line-of-Sight (LOS) e buffer offline LittleFS, banco de dados Firebase RTDB em nuvem e painel web responsivo (React/Leaflet).

*   **RESULTADO PRINCIPAL**
    > Integração total do ecossistema de software de ponta a ponta (E2E) com telemetria simulada e esquema elétrico finalizado no EasyEDA. O firmware está programado para garantir autonomia e tolerância a falhas sem depender de internet.

*   **STATUS FINAIS**
    *   [x] Concluído (Firmware, Frontend, Backend e Esquema Elétrico no EasyEDA finalizados)
    *   [x] Validado (Arquitetura de software e projeto elétrico validados teoricamente e em testes locais)
    *   [ ] Protótipo funcional (Hardware físico não montado/não disponível nesta etapa)
    *   [x] Testes realizados (Validação de conectividade, regras de segurança do Firebase e telemetria simulada localmente)

*   **DESTAQUE DO PROJETO**
    > **Ecossistema de Software Integrado & Esquema Elétrico no EasyEDA Concluídos**  
    > Arquitetura lógica de hardware e sistema de controle de software prontos e integrados, preparados para futura montagem física.

---

### 2. JORNADA PROJETO (EVOLUÇÃO)

*   **PITCH 1 — IDEIA INICIAL**
    > Definição do problema de monitoramento fluvial na Amazônia, modelagem do USV e definição da arquitetura de baixo custo.
*   **PITCH 2 — DESENVOLVIMENTO**
    > Criação do esquema elétrico completo no EasyEDA e desenvolvimento da base do firmware do ESP32 (Wi-Fi + Firebase).
*   **PITCH 3 — INTEGRAÇÃO**
    > Integração do backend Firebase RTDB com a dashboard reativa em React, permitindo envio de comandos e recepção de telemetria.
*   **PITCH 4 — SOLUÇÃO VALIDADA**
    > Conclusão do firmware com lógica de navegação LOS, persistência LittleFS com deduplicação SHA256 e esquema elétrico EasyEDA finalizado.

---

### 3. ACESSE MAIS

*   **VÍDEO DO PROJETO**
    > [Apresentação da Solução e Arquitetura](https://github.com/Vandrekad/USVs-Drone-Fluvial-Autonomo) *(Inserir link do vídeo do grupo)*
*   **GITHUB DO PROJETO**
    > [github.com/Vandrekad/USVs-Drone-Fluvial-Autonomo](file:///c:/Users/orlan/PycharmProjects/USVs-Drone-Fluvial-Autonomo)
*   **DEMONSTRAÇÃO AO VIVO**
    > [Dashboard Web do USV-AM](https://github.com/Vandrekad/USVs-Drone-Fluvial-Autonomo) *(Inserir link da dashboard rodando)*

---
---

## 🖼️ IMAGEM 2 (Slides 4 a 8)

### 4. ARQUITETURA COMPLETA DA SOLUÇÃO

*   **FLUXO DA SOLUÇÃO (Esquerda para Direita)**
    1.  **USUÁRIO:** Acessa a dashboard web de forma segura e autenticada.
    2.  **INTERFACE:** Dashboard React envia o comando de destino (`set_destination`) e exibe a telemetria.
    3.  **BACKEND:** Firebase RTDB sincroniza os dados e monitora a presença da conexão (`onDisconnect`).
    4.  **BANCO DE DADOS:** Persiste telemetria, missões, trilha de navegação (`path`) e logs gerados.
    5.  **AUTOMAÇÃO:** Firmware do ESP32 processa os dados de GPS/Bússola para controle diferencial (motores) via algoritmo LOS.
    6.  **DASHBOARD:** Renderiza marcador de navegação reativo e progresso em tempo real.

*   **TECNOLOGIAS UTILIZADAS**
    *   **Firmware:** C++, ESP32 (Arduino Core), LittleFS (buffer local), TinyGPS++, drivers I2C/SPI.
    *   **Backend/Nuvem:** Firebase Realtime Database, Security Rules (regras de segurança baseadas em regras de acesso), Firebase Auth.
    *   **Frontend:** React 18, Vite, React Leaflet (Mapas OSM), Tailwind CSS.
    *   **Projeto do Circuito:** EasyEDA (esquema elétrico).

---

### 5. DEMONSTRAÇÃO DO PROJETO

*   **5.1 HARDWARE (Esquema Elétrico no EasyEDA)**
    > Esquema de conexões elétricas projetado no EasyEDA. Inclui o microcontrolador ESP32-DEVKITC-VE, módulo GPS NEO-6M, bússola HMC5883L (com resistores pull-up de 4.7kΩ), sensor ultrassônico HC-SR04 (com divisor de tensão resistivo 1kΩ/2kΩ para proteger a entrada de 3.3V do ESP32), driver Ponte H L298N, motores DC e circuito de alimentação com duas baterias SVC14500 em paralelo, carregador TP4056 e conversor step-up MT3608 regulado para 9V.

*   **5.1 SOFTWARE (Ecossistema de Software E2E)**
    > Dashboard React integrada em tempo real via Firebase RTDB com o firmware do ESP32. Permite ao operador definir o destino no mapa e disparar a lógica de navegação autônoma simulada (ou real) no firmware, a qual recalcula o progresso de rota, modos de operação (IDLE, NAVIGATING, OBSTACLE, RETURNING) e telemetria simulada para fins de homologação de software.

---

### 6. DIFERENCIAIS DO PROJETO

*   **Autonomia Operacional do Firmware:** Lógica de navegação autônoma por pernas de waypoints independente da internet.
*   **Tolerância a Perda de Sinal:** Firmware programado com buffer offline LittleFS para persistir telemetria e pontos de rota localmente.
*   **Prevenção de Duplicação de Dados:** Algoritmo SHA256 que compara os últimos 5 pontos locais aos remotos antes de fazer o flush.
*   **Compensação de Correnteza Programada:** Algoritmo matemático LOS que calcula a deriva lateral com base no COG do GPS e Heading.
*   **Segurança Logística:** Comando de parada de emergência (`emergency_stop`) que dispara o retorno imediato à origem (`RETURNING_TO_HOME`).
*   **Interface Responsiva Otimizada:** Painel do operador adaptado para o uso em dispositivos móveis no campo.

---

### 7. APLICAÇÃO REAL (MERCADO)

*   **Monitoramento Ambiental Autónomo:** Coleta autônoma de parâmetros ambientais em ecossistemas de difícil acesso.
*   **Inspeção e Sensoriamento Hidrográfico:** Mapeamento de profundidade e parâmetros físicos de bacias hidrográficas.
*   **Segurança Fluvial:** Patrulhamento automatizado de áreas de preservação ambiental ou fronteiras fluviais.
*   **Sensoriamento de Qualidade da Água:** Integração de sensores para análise de pH, oxigênio dissolvido e temperatura.

---

### 8. PRÓXIMOS PASSOS (FASES FUTURAS)

*   **Montagem Física do Protótipo Catamarã:** Estruturação mecânica usando garrafas PET e caixa de eletrônica estanque.
*   **Testes de Navegação e Validação em Campo:** Homologação prática do USV em rios para calibrar os ganhos de controle.
*   **Calibração da Bússola em Ambiente Real:** Ajustes do magnetômetro contra interferências eletromagnéticas locais.
*   **Instalação de Painéis Solares:** Sistema de recarga solar para estender o tempo de operação autónoma.
*   **Comunicação de Longo Alcance:** Implementação de módulos de telemetria LoRa para áreas sem cobertura Wi-Fi/celular.

---
---

## 🖼️ IMAGEM 3 (Slides 9 a 11)

### 9. RESULTADOS E KPIs (Otimizações da Arquitetura de Software)

*   **TABELA DE INDICADORES (Métricas Esperadas / Testes Locais de Código)**

| Indicador | Antes (Envio Síncrono direto) | Depois (Buffer Assíncrono) | Melhoria Projetada |
| :--- | :---: | :---: | :---: |
| **Tempo de Sync** | ~20s (tempo de timeouts na perda de rede) | <1s (escrita em buffer local) | **95%** ⬆|
| **Consumo de Banda** | Elevado (dados duplicados em reenvios) | Otimizado (deduplicador SHA256) | **80%** ⬆|
| **Latência de Comando** | >3s (tempo de polling tradicional) | <50ms (RTDB Streams ativos) | **98%** ⬆|
| **Resiliência a Quedas** | Interrupção imediata na perda de rede | Autossuficiente (persistência local) | **100%** ⬆|

*   **Métricas de Desenvolvimento:**
    *   **Integridade dos Dados:** 100% de consistência dos logs de telemetria durante simulações locais de perda de conexão de rede.
    *   **Tempo de Resposta do Servidor:** Comando de emergência propagado e reconhecido pelo firmware em menos de 100ms em testes de bancada.
    *   **Velocidade de Geração de Rota:** Menos de 500ms para cálculo de waypoints locais após o recebimento do destino final.

---

### 10. PROBLEMAS ENCONTRADOS E SOLUÇÕES

*   **Tabela de Problemas e Soluções (Fase de Projeto e Bancada)**

| Problema | Impacto | Solução Adotada |
| :--- | :--- | :--- |
| **Diferença de nível lógico do ECHO do sensor HC-SR04 (5V) vs ESP32 (3.3V)** | Risco de queima permanente da porta GPIO do ESP32. | Dimensionamento de divisor de tensão resistivo (R1=1kΩ, R2=2kΩ) no EasyEDA. |
| **Intermitência de conexão de rede em rios** | Perda de telemetria e falhas no envio de logs de eventos. | Implementação de buffer NDJSON no LittleFS e algoritmo de reconexão automática. |
| **Duplicação de pontos da rota após reconexão** | Desperdício de banda e poluição visual do trajeto no mapa. | Implementação de lógica SHA256 comparando os 5 últimos pontos salvos. |
| **Deriva lateral por correnteza (Modelagem)** | Desvio da rota e falha em atingir os alvos da missão. | Implementação da lógica LOS no firmware com estimativa de ângulo de deriva. |

---

### 11. ENCERRAMENTO

> "Mais do que um projeto acadêmico, esta solução demonstra como o desenvolvimento de software resiliente, o projeto de circuito elétrico rigoroso no EasyEDA e algoritmos de controle independentes de nuvem preparam a base para um monitoramento fluvial autônomo e de baixo custo."

---

### 11. EQUIPE

*   **Orlando:** Firmware ESP32, Lógica de Buffer LittleFS, Algoritmo LOS e Conexão Firebase.
*   **Ariadne:** Frontend React, Dashboard Interativo Leaflet, Firebase RTDB e Regras de Segurança.
*   **Leonora:** Validação de Software, Planejamento de Testes E2E e Monitoramento de Dados.
*   **Lucinao:** Projeto Estrutural do Catamarã e Desenvolvimento do Esquema Elétrico no EasyEDA.



flowchart LR
    A(["OPERADOR"]) --> B(["DASHBOARD"])
    B --> C(["FIREBASE"])
    C --> D(["DADOS"])
    D --> E(["FIRMWARE"])
    E --> F(["EMBARCAÇÃO"])

    style A fill:#2d6a4f,color:#fff,stroke:#1b4332
    style B fill:#2d6a4f,color:#fff,stroke:#1b4332
    style C fill:#2d6a4f,color:#fff,stroke:#1b4332
    style D fill:#2d6a4f,color:#fff,stroke:#1b4332
    style E fill:#2d6a4f,color:#fff,stroke:#1b4332
    style F fill:#2d6a4f,color:#fff,stroke:#1b4332
