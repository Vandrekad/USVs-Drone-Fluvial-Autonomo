# 🔌 Guia de Simulação no Multisim — USV-AM
## Sistema Autônomo de Drone Fluvial (Catamarã)

> **Objetivo:** Simular e validar o circuito eletrônico do USV-AM no NI Multisim antes da montagem física. Isso permite verificar a integridade das conexões, tensões, correntes e comportamento dos componentes com segurança.

---

## 📋 Índice

1. [Pré-requisitos e Download do Multisim](#1-pré-requisitos-e-download-do-multisim)
2. [Visão Geral do Circuito a Simular](#2-visão-geral-do-circuito-a-simular)
3. [Componentes Necessários no Multisim](#3-componentes-necessários-no-multisim)
4. [Instalação de Bibliotecas Extras](#4-instalação-de-bibliotecas-extras)
5. [Passo a Passo: Montagem no Multisim](#5-passo-a-passo-montagem-no-multisim)
   - [5.1 Bloco de Alimentação](#51-bloco-de-alimentação)
   - [5.2 Microcontrolador ESP32 (simulado)](#52-microcontrolador-esp32-simulado)
   - [5.3 Módulo GPS NEO-6M (UART)](#53-módulo-gps-neo-6m-uart)
   - [5.4 Bússola HMC5883L (I2C)](#54-bússola-hmc5883l-i2c)
   - [5.5 Sensor Ultrassônico HC-SR04](#55-sensor-ultrassônico-hc-sr04)
   - [5.6 Driver de Motores L298N (Ponte H)](#56-driver-de-motores-l298n-ponte-h)
   - [5.7 Motores DC](#57-motores-dc)
6. [Diagrama Completo de Conexões](#6-diagrama-completo-de-conexões)
7. [Configurando as Simulações](#7-configurando-as-simulações)
8. [Testes e Medições](#8-testes-e-medições)
9. [Links para Bibliotecas e Recursos](#9-links-para-bibliotecas-e-recursos)
10. [Troubleshooting Comum](#10-troubleshooting-comum)

---

## 1. Pré-requisitos e Download do Multisim

### 1.1 Download do NI Multisim

O NI Multisim é o software de simulação de circuitos mais utilizado na academia. Versões disponíveis:

| Versão | Indicada Para | Link |
|--------|--------------|------|
| **Multisim 14.3 (mais estável)** | Projetos acadêmicos | [ni.com/multisim](https://www.ni.com/pt-br/shop/electronic-test-instrumentation/application-software-for-electronic-test-and-instrumentation-category/what-is-multisim.html) |
| **Multisim Live (online, gratuito)** | Testes rápidos sem instalação | [multisim.com/create](https://www.multisim.com/create/) |
| **Multisim Student Edition** | Alunos com desconto | Via instituição de ensino |

> ⚠️ **Recomendação:** Use o **Multisim 14.x (instalável)** para este projeto, pois o Multisim Live tem biblioteca limitada de componentes. Estudantes da maioria das universidades brasileiras têm acesso gratuito via portal da NI.

### 1.2 Requisitos do Sistema

```
Sistema Operacional : Windows 10/11 (64-bit)
RAM Mínima          : 4 GB (recomendado 8 GB)
Espaço em Disco     : 3 GB livres
Processador         : Intel/AMD dual-core 1.8 GHz+
```

### 1.3 Instalação

1. Acesse o site da NI e faça login (crie conta gratuita se necessário).
2. Baixe o instalador do **Multisim 14.x**.
3. Execute o instalador como administrador.
4. Selecione **"NI Multisim"** e **"NI Ultiboard"** (opcional, para PCB).
5. Ative com a licença acadêmica ou use o trial de 30 dias.

---

## 2. Visão Geral do Circuito a Simular

O circuito do USV-AM é composto pelos seguintes blocos funcionais:

```
┌─────────────────────────────────────────────────────────────┐
│              CIRCUITO USV-AM (PARALELO)                     │
│                                                             │
│  [USB 5V] ──→ [TP4056] ──→ [Baterias 3.7V]                  │
│                                │                            │
│                                ▼                            │
│                            [MT3608] ──→ [ESP32 VIN] (9V)    │
│                                │                            │
│                                ├────────→ [L298N VS] (9V)   │
│                                │                            │
│                                ▼ (Linha de 5V do ESP32/LDO) │
│               [GPS NEO-6M] ◄───┼───► [Bússola HMC5883L]     │
│               (3.3V UART)      │     (3.3V I2C)             │
│                                │                            │
│              [HC-SR04] ◄───────┴───► [L298N VSS]            │
│              (5V Trig/Echo)          (5V Lógica)            │
└─────────────────────────────────────────────────────────────┘
```

### Pinagem do ESP32 usada no projeto

| Pino ESP32 | Função | Componente |
|------------|--------|------------|
| GPIO 16 (RX2) | Recebe dados GPS | GPS NEO-6M TX |
| GPIO 17 (TX2) | Envia para GPS | GPS NEO-6M RX |
| GPIO 21 (SDA) | Dados I2C | HMC5883L SDA |
| GPIO 22 (SCL) | Clock I2C | HMC5883L SCL |
| GPIO 14 | Trigger ultrassom | HC-SR04 TRIG |
| GPIO 35 | Echo ultrassom | HC-SR04 ECHO |
| GPIO 12 | PWM Motor Esq. | L298N IN1/ENA |
| GPIO 13 | PWM Motor Dir. | L298N IN3/ENB |
| GPIO 25 | Direção Motor E | L298N IN2 |
| GPIO 26 | Direção Motor D | L298N IN4 |
| 3.3V / 5V | Alimentação sensores | VCC de todos |
| GND | Terra comum | GND de todos |

---

## 3. Componentes Necessários no Multisim

Abaixo a lista de componentes que você vai buscar na biblioteca do Multisim:

### 3.1 Componentes da Biblioteca Padrão

| Componente | Categoria no Multisim | Subcategoria |
|-----------|----------------------|--------------|
| Baterias SVC14500 (3.7V) | Sources → Power Sources | DC_POWER |
| Resistores de Pull-up (4.7kΩ) | Basic → Resistor | RESISTOR |
| Resistor Divisor (1kΩ, 2kΩ) | Basic → Resistor | RESISTOR |
| Resistor TP4056 PROG (1.2kΩ) | Basic → Resistor | RESISTOR |
| Resistores Boost (150kΩ, 22kΩ) | Basic → Resistor | RESISTOR |
| Indutor Boost (22µH) | Basic → Inductor | INDUCTOR |
| LED (indicador de carga) | Diodes → LED | LED_green / LED_red |
| Motor DC (MOTOR_3) | Electro-Mechanical → Motor | DC_MOTOR |
| Diodo Flyback (1N4007) | Diodes → Rectifier | 1N4007 |

### 3.2 Componentes a Adicionar via Biblioteca Extra

| Componente | Observação |
|-----------|------------|
| ESP32 | Não está na lib padrão — usar substituto (veja Seção 4) |
| L298N | Disponível em libs de terceiros (veja Seção 4) |
| HC-SR04 | Montar com lógica de temporização |
| HMC5883L | Simular via blocos I2C |
| GPS NEO-6M | Simular via gerador de sinal UART |

---

## 4. Instalação de Bibliotecas Extras

### 4.1 Biblioteca NI Multisim Component Evaluator

A NI oferece bibliotecas adicionais para download direto:

- **NI Multisim Component Evaluator (SPICE models):**
  - 🔗 [ni.com/community/multisim-components](https://www.ni.com/en-us/support/downloads/software-products/download.multisim.html)

### 4.2 Bibliotecas SPICE de Terceiros (Fabricantes)

Você pode importar modelos SPICE (`.lib` ou `.ckt`) diretamente no Multisim:

| Componente | Fonte do Modelo SPICE | Link |
|-----------|----------------------|------|
| **L298N (STMicroelectronics)** | ST oficial | [st.com/resource/en/spice_model](https://www.st.com/en/motor-drivers/l298.html) |
| **Família ESP32 (genérico MCU)** | SnapEDA | [snapeda.com/search/?q=esp32](https://www.snapeda.com/search/?q=esp32) |
| **HC-SR04 (modelo comportamental)** | Circuits4you | [circuits4you.com/hcsr04-multisim](https://circuits4you.com/) |
| **HMC5883L (Honeywell)** | Ultra Librarian | [ultralibrarian.com](https://www.ultralibrarian.com/) |
| **Modelos Arduino/ESP genérico** | Component Search Engine | [componentsearchengine.com](https://componentsearchengine.com/) |

### 4.3 Como Importar um Modelo SPICE no Multisim

1. Baixe o arquivo `.lib` ou `.ckt` do componente desejado.
2. No Multisim, vá em **Tools → Component Wizard**.
3. Clique em **"Next"** e selecione a categoria.
4. Em **"SPICE Simulation"**, clique em **"Copy from file"**.
5. Selecione o arquivo `.lib` baixado.
6. Nomeie o componente e finalize com **"Finish"**.
7. O componente aparecerá na sua **biblioteca do usuário**.

---

## 5. Passo a Passo: Montagem no Multisim

> 💡 **Dica:** Trabalhe em blocos. Monte e teste cada bloco separadamente antes de integrar tudo.

---

### 5.1 Bloco de Alimentação (TP4056 + MT3608 + Baterias em Paralelo)

Este bloco representa a fonte de energia e o sistema de recarga do USV-AM.

**Objetivo:** Recarregar o banco de baterias em paralelo (3.7V) via USB-C (5V) com o TP4056, e elevar a tensão de 3.7V para 9V com o boost MT3608 para alimentar motores e ESP32.

#### Componentes:
- 2x Baterias 3.7V em paralelo (SVC14500)
- 1x CI TP4056 (Carregador de Baterias Li-Ion)
- 1x CI MT3608 (Conversor Step-up Boost)
- 1x Resistor 1.2kΩ (PROG do TP4056 para corrente de carga de 1A)
- 1x Indutor 22µH + Resistor 150kΩ + Resistor 22kΩ (Filtro e realimentação FB do MT3608 para saída de 9V)
- 2x LEDs + Resistores 1kΩ (Indicadores de carga do TP4056)
- 1x Conector USB-C (USB1) para entrada de energia 5V

#### Passos:

**Passo 1 — Configurar as Baterias em Paralelo**
```
Insira duas fontes DC_POWER (3.7V).
Interconecte o terminal (+) de U6 com o (+) de U7 para criar a linha BAT+.
Interconecte o terminal (-) de U6 com o (-) de U7 para criar a linha GND.
```

**Passo 2 — Conectar o Carregador TP4056 (U9)**
```
1. Conecte VBUS do USB-C (USB1) ao pino VCC do TP4056.
2. Conecte GND do USB-C ao pino GND do TP4056.
3. Conecte o pino BAT do TP4056 à linha BAT+ das baterias.
4. Conecte o pino PROG ao GND através de um resistor de 1.2kΩ.
5. Conecte TEMP ao GND para desabilitar a proteção de temperatura na simulação.
```

**Passo 3 — Conectar o Boost MT3608 (U8)**
```
1. Conecte o pino IN do MT3608 à linha BAT+ (3.7V).
2. Conecte o pino GND do MT3608 ao GND.
3. Conecte o pino EN ao pino IN (BAT+) para mantê-lo ativo.
4. Monte o divisor de feedback no pino FB:
   - Resistor R_high (150kΩ) entre OUT e FB.
   - Resistor R_low (22kΩ) entre FB e GND.
   - Isso elevará a tensão de saída para aproximadamente 9V.
```

**Passo 4 — Verificação de Tensão**
```
Coloque uma sonda de tensão (Probe) no pino OUT do MT3608.
Execute a simulação (F5).
Confirme se a tensão de saída é ~9V e se a tensão nas baterias é estável a 3.7V.
```

✅ **Resultado esperado:** Tensão de ~9V estável no pino OUT do conversor boost.

---

### 5.2 Microcontrolador ESP32 (simulado)

O ESP32 não possui modelo SPICE oficial. No Multisim, simulamos seu comportamento usando **fontes de sinal e blocos funcionais**.

#### Estratégia de simulação:
- **Saídas PWM** → Substituir por Fontes de Pulso (`PULSE_VOLTAGE`)
- **Saídas Digitais GPIO** → Fontes DC chaveadas
- **Entradas analógicas** → Medidas com sonda

#### Passos:

**Passo 1 — Representar o ESP32 como bloco**
```
Pressione "P"
→ Grupo: Basic
→ Família: RPACK (Resistor Pack) ou use um retângulo anotado
→ Use Text/Label para identificar os pinos do ESP32
```

**Passo 2 — Simular saída PWM (controle dos motores)**
```
Pressione "P"
→ Grupo: Sources
→ Família: SIGNAL_VOLTAGE_SOURCES
→ Componente: PULSE_VOLTAGE

Configure os parâmetros:
  - Amplitude: 3.3V (nível lógico do ESP32)
  - Período: 1ms (PWM 1kHz, típico)
  - Duty Cycle: ajuste entre 20% e 80%
  - Rise/Fall Time: 10ns
```

> 💡 Para simular diferentes velocidades de motor:
> - 20% duty = motor lento
> - 50% duty = motor médio  
> - 80% duty = motor rápido

**Passo 3 — Simular saída digital (TRIG do ultrassom)**
```
Grupo: Sources → SIGNAL_VOLTAGE_SOURCES → PULSE_VOLTAGE
  - Amplitude: 3.3V
  - Período: 100ms
  - Largura de pulso: 10µs (conforme datasheet HC-SR04)
```

---

### 5.3 Módulo GPS NEO-6M (UART)

Como o GPS é um módulo de comunicação serial, no Multisim simulamos a **saída UART** como um gerador de sinal.

#### Passos:

**Passo 1 — Representar a interface UART**
```
Coloque dois labels no esquemático:
  - "ESP32_RX2 (GPIO16)" — para receber dados do GPS
  - "ESP32_TX2 (GPIO17)" — para enviar para o GPS
```

**Passo 2 — Simular sinal UART do GPS**
```
Pressione "P"
→ Sources → SIGNAL_VOLTAGE_SOURCES → PULSE_VOLTAGE

Configure:
  - Amplitude: 3.3V
  - Período: 1/9600 ≈ 104µs (baudrate 9600bps)
  - Representa: dados NMEA em nível 3.3V TTL
```

**Passo 3 — Resistor pull-up (opcional)**
```
Adicione resistor 10kΩ entre VCC (3.3V) e o pino RX
(proteção e estabilização da linha UART)
```

**Passo 4 — Divisor de tensão (se usar 5V)**
```
Se o sistema for 5V, proteja o RX do ESP32:
  R1 = 1kΩ (em série com a linha)
  R2 = 2kΩ (do nó para GND)
  Saída do divisor: 5V × (2k / (1k+2k)) ≈ 3.3V ✓
```

✅ **Resultado esperado:** Sinal UART visível no osciloscópio entre 0V e 3.3V.

---

### 5.4 Bússola HMC5883L (I2C)

O protocolo I2C usa dois fios: **SDA (dados)** e **SCL (clock)**.

#### Passos:

**Passo 1 — Adicionar resistores pull-up**
```
Pressione "P" → Basic → Resistor
  - R_SDA: 4.7kΩ entre SDA e VCC (3.3V)
  - R_SCL: 4.7kΩ entre SCL e VCC (3.3V)

⚠️ Os pull-ups são OBRIGATÓRIOS para o I2C funcionar!
```

**Passo 2 — Simular o clock SCL**
```
Sources → SIGNAL_VOLTAGE_SOURCES → PULSE_VOLTAGE
Configure:
  - Amplitude: 3.3V
  - Frequência: 100kHz (I2C padrão)
  - Duty Cycle: 50%
```

**Passo 3 — Simular SDA (dados)**
```
Adicione outro PULSE_VOLTAGE para SDA
  - Frequência: 100kHz
  - Duty Cycle variável (representa os bits de dados)
```

**Passo 4 — Alimentação do HMC5883L**
```
VCC do HMC5883L → 3.3V (saída do regulador)
GND → GND comum
```

> ⚠️ **Importante:** O HMC5883L opera em **3.3V**. Nunca conecte em 5V — o chip queima!

✅ **Resultado esperado:** Formas de onda SCL e SDA visíveis no osciloscópio com sinais sincrônicos.

---

### 5.5 Sensor Ultrassônico HC-SR04

O HC-SR04 mede distância enviando pulsos ultrassônicos e medindo o tempo de retorno (echo).

#### Lógica de funcionamento:
```
1. ESP32 envia pulso de 10µs em TRIG
2. HC-SR04 emite 8 pulsos a 40kHz
3. HC-SR04 retorna sinal em ECHO (HIGH durante o tempo do eco)
4. Distância = (Tempo do ECHO × velocidade do som) / 2
   Distância (cm) = Tempo (µs) / 58
```

#### Passos:

**Passo 1 — Simular o pino TRIG**
```
Sources → PULSE_VOLTAGE
  - Amplitude: 3.3V
  - Largura do pulso: 10µs
  - Período: 60ms (mínimo entre leituras)
```

**Passo 2 — Simular o retorno ECHO**
```
Adicione outro PULSE_VOLTAGE para o ECHO:
  - Amplitude: 5V (o HC-SR04 usa 5V!)
  - Largura do pulso: Tempo de eco
    Exemplo: distância 30cm → 30cm × 58 = 1740µs
```

**Passo 3 — Divisor de tensão para proteger o ESP32**
```
⚠️ O ECHO do HC-SR04 é 5V mas o ESP32 aceita apenas 3.3V!

Circuito divisor obrigatório:
  R1 = 1kΩ (entre ECHO e pino ESP32)
  R2 = 2kΩ (do pino ESP32 para GND)
  
Tensão no pino ESP32 = 5V × (2k/(1k+2k)) = 3.33V ✓
```

**Passo 4 — Alimentação HC-SR04**
```
VCC do HC-SR04 → 5V (saída do 7805)
GND → GND comum
```

> ⚠️ **Atenção:** O HC-SR04 **precisa de 5V** para funcionar. Não funciona com 3.3V!

✅ **Resultado esperado:** Pulso ECHO proporcional à distância simulada. Meça com osciloscópio.

---

### 5.6 Driver de Motores L298N (Ponte H)

O L298N é um CI de dupla ponte H que controla 2 motores DC com direção e velocidade.

#### Pinagem do L298N:

| Pino L298N | Função | Conecta em |
|-----------|--------|-----------|
| VCC (Vs) | Alimentação motores (até 46V) | Saída Boost MT3608 (~9V) |
| Vss | Alimentação lógica (5V) | Linha 5V do ESP32 (simulado) |
| GND | Terra | GND comum |
| IN1 | Direção Motor A bit 1 | GPIO 25 (ESP32) |
| IN2 | Direção Motor A bit 2 | GPIO (fixo em LOW) |
| IN3 | Direção Motor B bit 1 | GPIO 26 (ESP32) |
| IN4 | Direção Motor B bit 2 | GPIO (fixo em LOW) |
| ENA | Enable/PWM Motor A | GPIO 12 (PWM) |
| ENB | Enable/PWM Motor B | GPIO 13 (PWM) |
| OUT1/OUT2 | Saída Motor A | Motor Esquerdo |
| OUT3/OUT4 | Saída Motor B | Motor Direito |

#### Passos:

**Passo 1 — Encontrar o L298N na biblioteca**
```
Pressione "P"
→ Pesquise: "L298"
→ Se não encontrar, use o componente "H_BRIDGE" como alternativa
→ Ou importe o modelo SPICE da ST (veja Seção 4.2)
```

**Passo 2 — Conectar a alimentação**
```
Vs (pino 9) → Saída OUT do MT3608 (~9V)
Vss (pino 4) → Linha 5V (saída 5V do ESP32 ou regulador dedicado)
GND (pinos 8, 12) → GND comum
```

**Passo 3 — Conectar os pinos de controle**
```
ENA (pino 6) → Fonte PULSE (simula PWM do ESP32, GPIO 12)
IN1 (pino 5) → Fonte DC 3.3V (HIGH = frente) ou 0V (LOW)
IN2 (pino 7) → GND ou outra fonte (controla direção)

ENB (pino 11) → Fonte PULSE (simula PWM do ESP32, GPIO 13)
IN3 (pino 10) → Fonte DC 3.3V
IN4 (pino 12) → GND
```

**Passo 4 — Diodos de proteção**
```
⚠️ Adicione diodos flyback (1N4007) nos terminais de cada motor!
  - Anodo → pino de saída do L298N
  - Catodo → pino Vs

São 4 diodos no total (2 por motor), um em cada direção.
Eles protegem o CI das correntes de retorno dos motores.
```

> 💡 **Tabela de controle de direção:**
> | ENA | IN1 | IN2 | Motor A |
> |-----|-----|-----|---------|
> | HIGH | HIGH | LOW | Para frente ✅ |
> | HIGH | LOW | HIGH | Para trás ↩️ |
> | HIGH | HIGH | HIGH | Freio 🛑 |
> | LOW | X | X | Parado 🔴 |

---

### 5.7 Motores DC

**Passo 1 — Inserir os motores**
```
Pressione "P"
→ Grupo: Electro-Mechanical
→ Família: MOTORS
→ Componente: DC_MOTOR
→ Insira 2 vezes (Motor Esquerdo e Motor Direito)
```

**Passo 2 — Configurar os parâmetros**
```
Dê duplo clique no motor para editar:
  - Tensão nominal: 6V a 12V (conforme motor real)
  - Corrente: 0.5A a 2A (conforme especificação)
  - Resistência de armadura: ~5 Ω (estimativa)
```

**Passo 3 — Conectar ao L298N**
```
Motor Esquerdo: OUT1 → Motor(+), OUT2 → Motor(-)
Motor Direito:  OUT3 → Motor(+), OUT4 → Motor(-)
```

**Passo 4 — Adicionar amperímetros**
```
Insira um amperímetro em série com cada motor
→ Place → Indicator → AMMETER
Isso permitirá monitorar a corrente consumida durante a simulação.
```

✅ **Resultado esperado:** Motores respondendo ao sinal PWM, com corrente visível nos amperímetros.

---

## 6. Diagrama Completo de Conexões

```
                         CIRCUITO COMPLETO USV-AM (PARALELO)
                         ────────────────────────────────────

    BATERIAS 3.7V em paralelo (U6 + U7) 
    (+)──────────────────────┬─────────────────────── MT3608 IN (3.7V)
                             │
                         [TP4056] (Carregador) ◄───── USB 5V (Carga)
                             │
                         [MT3608] (Conversor Boost)
                             │
                          9V Rail ─────────────────── Vs do L298N (Motores)
                             │ ────────────────────── ESP32 VIN (Pino 19 esquerdo)
                             │
                          ESP32 5V LDO output (ou regulador dedicado)
                             │
                          5V Rail ─────────────────── Vss do L298N (Lógica)
                             │ ────────────────────── VCC do HC-SR04 (5V)
                             │
                          ESP32 3.3V Rail (interno)
                             │ ────────────────────── VCC GPS NEO-6M (3.3V)
                             │ ────────────────────── VCC HMC5883L (3.3V)

    GND ─────────────────────────────────────────────── GND de TODOS

    ─── Sinais do ESP32 (simulados por Fontes de Pulso) ───

    GPIO 12 (PWM) → [PULSE 0-3.3V, 1kHz] → ENA (L298N)
    GPIO 13 (PWM) → [PULSE 0-3.3V, 1kHz] → ENB (L298N)
    GPIO 25       → [DC 3.3V]             → IN1 (L298N)
    GPIO 26       → [DC 3.3V]             → IN3 (L298N)

    GPIO 14 (TRIG) → [PULSE 3.3V, 10µs] → TRIG HC-SR04
    GPIO 35 (ECHO) ← [divisor R] ←────── ECHO HC-SR04 (5V→3.3V)

    GPIO 21 (SDA) ←→ [4.7kΩ pull-up] ←→ SDA HMC5883L
    GPIO 22 (SCL) ←→ [4.7kΩ pull-up] ←→ SCL HMC5883L

    GPIO 16 (RX2) ← [sinal UART 3.3V] ← TX GPS NEO-6M
    GPIO 17 (TX2) → [sinal UART 3.3V] → RX GPS NEO-6M

    L298N OUT1/OUT2 → [1N4007] → Motor Esquerdo DC
    L298N OUT3/OUT4 → [1N4007] → Motor Direito DC
```

---

## 7. Configurando as Simulações

### 7.1 Adicionar Instrumentos de Medição

No Multisim, adicione os seguintes instrumentos (menu **Simulate → Instruments**):

| Instrumento | Para medir | Onde colocar |
|------------|-----------|-------------|
| **Multímetro (Voltímetro)** | Tensão de 9V do boost | Saída OUT do MT3608 |
| **Osciloscópio** | Forma de onda PWM | Saída do ENA/ENB |
| **Osciloscópio** | Sinal ECHO do HC-SR04 | Pino ECHO |
| **Amperímetro** | Corrente dos motores | Em série com cada motor |
| **Analisador de Onda** | Sinal UART do GPS | Linha RX/TX |

### 7.2 Configurar o Osciloscópio

```
Duplo clique no osciloscópio:
  - Time/div: 1ms (para ver PWM)
  - Volts/div: 2V (para sinal de 3.3V)
  - Channel A: conectar ao ENA do L298N
  - Channel B: conectar ao ECHO do HC-SR04
  - Trigger: Auto
```

### 7.3 Executar a Simulação

1. Verifique se não há **erros de conexão** (linhas vermelhas).
2. Vá em **Simulate → Run (F5)** ou clique no botão ▶️.
3. Observe as formas de onda no osciloscópio.
4. Para pausar: **Simulate → Pause (F6)**.
5. Para parar: **Simulate → Stop (Ctrl+F5)**.

### 7.4 Análise Transiente (Gráficos)

Para gerar gráficos de tensão/corrente ao longo do tempo:

```
Simulate → Analyses and Simulation → Transient Analysis
  - Start Time: 0
  - End Time: 100ms
  - Output: adicione os nós de interesse (V(out_boost), I(motor_esq))
  - Clique em "Run"
```

---

## 8. Testes e Medições

### 8.1 Checklist de Validação por Bloco

#### ✅ Bloco de Alimentação
- [ ] Tensão das baterias em paralelo: 3.7V ± 0.3V
- [ ] Tensão de entrada USB: 5.0V ± 0.2V
- [ ] Tensão de saída do Boost MT3608: 9.0V ± 0.2V
- [ ] Corrente de carga no TP4056: ~1.0A max (confirmar com amperímetro no pino BAT)
- [ ] Ondulação (ripple) na saída do boost: < 100mV

#### ✅ Bloco HC-SR04
- [ ] VCC: 5.0V ± 0.2V (puxados do pino 5V do ESP32 ou regulador)
- [ ] Pulso TRIG: 10µs a 3.3V
- [ ] Sinal ECHO: nível alto proporcional à distância (5V)
- [ ] Divisor de tensão: saída ≤ 3.3V para o ESP32 no pino ECHO

#### ✅ Bloco I2C (HMC5883L)
- [ ] VCC: 3.3V ± 0.1V (regulador interno do ESP32)
- [ ] Pull-ups de 4.7kΩ presentes em SDA e SCL (conectados ao 3.3V)
- [ ] Clock SCL: 100kHz (modo standard)
- [ ] Forma de onda limpa sem glitches

#### ✅ Bloco L298N + Motores
- [ ] Vs: 9.0V ± 0.2V (alimentação vinda do boost MT3608)
- [ ] Vss: 5V (lógica vinda da linha de 5V)
- [ ] Sinal PWM em ENA/ENB: 0–3.3V
- [ ] Tensão nos terminais do motor: 0 a 9V (proporcional ao duty cycle)
- [ ] Corrente motor: dentro do esperado (< 2A por motor)
- [ ] Diodos flyback presentes

### 8.2 Teste de PWM e Velocidade do Motor

Para testar diferentes velocidades, altere o **duty cycle** da fonte PULSE do ENA:

| Duty Cycle | Tensão Média no Motor | Velocidade |
|-----------|----------------------|-----------|
| 20% | 1.8V | Muito lenta |
| 40% | 3.6V | Lenta |
| 60% | 5.4V | Média |
| 80% | 7.2V | Rápida |
| 100% | 9.0V | Máxima |

---

## 9. Links para Bibliotecas e Recursos

### 9.1 Downloads Oficiais

| Recurso | Link |
|---------|------|
| 🔧 **NI Multisim 14 (download)** | [ni.com/en/support/downloads/software-products/download.multisim.html](https://www.ni.com/en/support/downloads/software-products/download.multisim.html) |
| 🌐 **Multisim Live (online grátis)** | [multisim.com/create](https://www.multisim.com/create/) |
| 📦 **NI Component Evaluator** | [ni.com/community/multisim](https://www.ni.com/community/multisim) |

### 9.2 Modelos SPICE dos Componentes

| Componente | Fonte | Link Direto |
|-----------|-------|------------|
| **L298N SPICE** | STMicroelectronics | [st.com/en/motor-drivers/l298.html](https://www.st.com/en/motor-drivers/l298.html) → Resources → SPICE model |
| **1N4007 SPICE** | Vishay / Diodes Inc | [vishay.com/diodes/1n4007](https://www.vishay.com/) |
| **MT3608 SPICE** | Aerosemi / Terceiros | [snapeda.com/parts/MT3608](https://www.snapeda.com/parts/MT3608/) |
| **2N2222 SPICE** | Fairchild/ON Semi | [onsemi.com](https://www.onsemi.com/) |

### 9.3 Bibliotecas de Componentes (SPICE/Footprints)

| Biblioteca | Descrição | Link |
|-----------|-----------|------|
| **SnapEDA** | Modelos SPICE + footprints grátis | [snapeda.com](https://www.snapeda.com/) |
| **Ultra Librarian** | Base de dados enorme de componentes | [ultralibrarian.com](https://www.ultralibrarian.com/) |
| **Component Search Engine** | SPICE + símbolos + footprints | [componentsearchengine.com](https://componentsearchengine.com/) |
| **EasyEDA** | Alternativa online com ESP32 pronto | [easyeda.com](https://easyeda.com/) |
| **LCSC** | Biblioteca integrada com EasyEDA | [lcsc.com](https://www.lcsc.com/) |

### 9.4 Datasheets dos Componentes do Projeto

| Componente | Link do Datasheet |
|-----------|------------------|
| **ESP32** | [espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf) |
| **GPS NEO-6M** | [u-blox.com/sites/default/files/products/documents/NEO-6_DataSheet_(GPS.G6-HW-09005).pdf](https://www.u-blox.com/sites/default/files/products/documents/NEO-6_DataSheet_(GPS.G6-HW-09005).pdf) |
| **HMC5883L** | [cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf](https://cdn-shop.adafruit.com/datasheets/HMC5883L_3-Axis_Digital_Compass_IC.pdf) |
| **HC-SR04** | [cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf](https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf) |
| **L298N** | [st.com/resource/en/datasheet/l298.pdf](https://www.st.com/resource/en/datasheet/l298.pdf) |
| **TP4056** | [datasheetspdf.com/pdf/1310570/NanjingMicroOneElectronics/TP4056/1](https://datasheetspdf.com/pdf-file/1310570/NanjingMicroOneElectronics/TP4056/1) |
| **MT3608** | [epitaxial.com.br/wp-content/uploads/2020/08/MT3608.pdf](https://epitaxial.com.br/wp-content/uploads/2020/08/MT3608.pdf) |

### 9.5 Tutoriais de Multisim

| Tutorial | Link |
|---------|------|
| 📺 **Introdução ao Multisim (YouTube NI)** | [youtube.com/@NIGlobal](https://www.youtube.com/@NIGlobal) |
| 📚 **Manual oficial Multisim 14** | [zone.ni.com/reference/en-XX/help/375482B-01/](https://zone.ni.com/reference/en-XX/help/375482B-01/) |
| 🎓 **Importar SPICE Models** | [ni.com/tutorial/11894/en/](https://www.ni.com/tutorial/11894/en/) |
| 🔌 **Simulação de Pontes H** | Pesquisar: "L298N Multisim simulation" no YouTube |

---

## 10. Troubleshooting Comum

### ❌ Problema: "Componente não encontrado na biblioteca"

**Solução:**
1. Tente nomes alternativos: "7805", "L7805", "LM7805"
2. Importe o modelo SPICE do fabricante (Seção 4.2)
3. Use o **Component Wizard** para criar o componente

---

### ❌ Problema: "Tensão de saída do boost MT3608 incorreta (abaixo de 9V)"

**Solução:**
1. Verifique o valor dos resistores do divisor de feedback (FB): R_high deve ser 150kΩ e R_low deve ser 22kΩ.
2. Certifique-se de que a tensão na bateria (IN) está acima de 3.0V (tensão de corte).
3. Verifique se o pino EN (Enable) está conectado ao positivo da bateria (IN).
4. Verifique a indutância do indutor do boost (deve ser 22µH).

---

### ❌ Problema: "Motor não gira na simulação"

**Solução:**
1. Verifique se `ENA` está recebendo sinal HIGH (ou PWM)
2. Confirme que `IN1` e `IN2` não estão ambos em HIGH (freio) nem ambos em LOW (parado)
3. Verifique a tensão em Vs do L298N (deve ser a tensão da bateria)

---

### ❌ Problema: "Sinal ECHO do HC-SR04 acima de 3.3V no pino do ESP32"

**Solução:**
1. Adicione o divisor de tensão obrigatório:
   ```
   ECHO → R1(1kΩ) → Nó → R2(2kΩ) → GND
                     ↑
              Pino do ESP32 (máx 3.3V)
   ```

---

### ❌ Problema: "Simulação mostrando erro de nó flutuante"

**Solução:**
1. Certifique-se que todos os pinos dos componentes estão conectados
2. Adicione resistores de pull-down (10kΩ para GND) em pinos de entrada não conectados
3. Verifique se há GND definido no circuito

---

### ❌ Problema: "A simulação é muito lenta"

**Solução:**
1. Reduza o tempo de simulação (End Time para 10ms)
2. Aumente o Maximum Time Step (TMAX)
3. Divida o circuito em blocos e simule separadamente

---

## 📁 Estrutura dos Arquivos de Simulação

Salve seus arquivos de simulação nesta estrutura no repositório:

```
USVs-Drone-Fluvial-Autonomo/
└── docs/
    └── simulacao-multisim/
        ├── USV_AM_Alimentacao.ms14        # Bloco de alimentação
        ├── USV_AM_Motores_L298N.ms14     # Bloco de controle de motores
        ├── USV_AM_Sensores.ms14          # Bloco de sensores
        ├── USV_AM_Completo.ms14          # Circuito completo integrado
        └── libs/                          # Modelos SPICE importados
            ├── L298N.lib
            └── HMC5883L.lib
```

---

## ✅ Critérios de Aceitação da Simulação

Antes de partir para a montagem física, confirme:

- [ ] Tensão de 3.7V no banco de baterias em paralelo
- [ ] Tensão de 9.0V estável na saída do boost MT3608
- [ ] Tensão de 3.3V nos módulos sensores vinda do ESP32
- [ ] Sinal PWM correto nos pinos ENA e ENB do L298N
- [ ] Motores respondendo à variação de duty cycle
- [ ] Sinal TRIG de 10µs sendo gerado corretamente
- [ ] Sinal ECHO proporcional à distância configurada
- [ ] Resistores pull-up de 4.7kΩ no barramento I2C
- [ ] Divisor de tensão entre HC-SR04 ECHO e ESP32 GPIO 35
- [ ] Diodos flyback nos terminais dos motores
- [ ] Corrente total dentro dos limites da bateria e regulador

---

> 📌 **Próximo passo após a simulação:** Consultar `docs/Firmware-Development-Plan.md` para o guia de desenvolvimento e upload do firmware no ESP32 real.

---

*Documentação criada para o projeto USV-AM — Sistema Autônomo de Drone Fluvial Amazônico*  
*Versão: 1.0 | Última atualização: Junho 2026*
