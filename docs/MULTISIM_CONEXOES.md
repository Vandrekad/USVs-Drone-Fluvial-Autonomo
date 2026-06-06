# 🔌 Guia de Conexões — Multisim USV-AM
## Passo a Passo Baseado no Esquemático Atualizado

## 🧰 Lista de Componentes Necessários

Abaixo está a lista completa de todos os componentes necessários para a montagem do circuito no NI Multisim, incluindo as quantidades recomendadas e referências no esquemático.

### 🧩 Componentes Principais (Módulos e Circuitos Integrados)

| Item | Quantidade | Componente / Modelo | Ref. no Esquemático | Função no Projeto |
| :---: | :---: | :--- | :---: | :--- |
| **1** | 1 | ESP32-DEVKITC-VE | `U1` | Microcontrolador principal (processamento e controle) |
| **2** | 1 | Módulo GPS NEO-6M | `U2` | Receptor de localização por satélite |
| **3** | 1 | Bússola Digital HMC5883L | `U3` | Sensor magnetômetro para orientação de rumo |
| **4** | 1 | Sensor Ultrassônico HC-SR04 | `U4` | Sensor de detecção de obstáculos por eco |
| **5** | 1 | Driver de Motor Ponte H L298N | `U5` | Controle de potência e direção dos motores |
| **6** | 2 | Bateria Li-Ion SVC14500 3.7V 800mAh | `U6`, `U7` | Células de energia conectadas em paralelo (total 3.7V, 1600mAh) |
| **7** | 1 | Conversor Boost MT3608 | `U8` | Elevador de tensão (3.7V para 5V ou 9V) |
| **8** | 1 | CI Carregador de Baterias TP4056 | `U9` | Módulo de controle de carga das baterias |
| **9** | 1 | Conector USB-3.1 Type-C | `USB1` | Interface de entrada para alimentação externa (5V) |
| **10** | 2 | Motor DC (MOTOR_3) | `M1`, `M2` | Motores propulsores (Direito e Esquerdo) |

### ⚡ Componentes Passivos e Acessórios

| Item | Quantidade | Componente | Especificação | Função no Projeto |
| :---: | :---: | :--- | :--- | :--- |
| **11** | 4 | Diodo Retificador | `1N4007` | Proteção contra corrente reversa (flyback) nos motores |
| **12** | 2 | Resistor de Pull-up | `4.7 kΩ` | Pull-up do barramento I2C (SDA/SCL) para 3.3V |
| **13** | 1 | Resistor (Divisor) | `1 kΩ` | Resistor R1 do divisor de tensão do pino ECHO (HC-SR04) |
| **14** | 1 | Resistor (Divisor) | `2 kΩ` | Resistor R2 do divisor de tensão do pino ECHO (HC-SR04) |
| **15** | 1 | Resistor (Carga) | `1.2 kΩ` | Programação da corrente de carga (PROG) no TP4056 |
| **16** | 1 | Resistor (Feedback) | `150 kΩ` | Resistor R_high de ajuste de feedback do MT3608 (para ~9V) |
| **17** | 1 | Resistor (Feedback) | `22 kΩ` | Resistor R_low de ajuste de feedback do MT3608 (para ~9V) |
| **18** | 1 | Indutor | `22 µH` | Bobina osciladora de chaveamento do boost MT3608 |
| **19** | 2 | LED Difuso (Opcional) | Vermelho / Verde | LEDs de status do carregador TP4056 (Carga/Completo) |
| **20** | 2 | Resistor (LEDs) | `1 kΩ` | Limitadores de corrente para os LEDs de status |

---

## 📋 Pinos do Firmware (main.cpp)

```cpp
#define GPS_RX_PIN            16   // ESP32 recebe dados do GPS
#define GPS_TX_PIN            17   // ESP32 envia dados para o GPS
#define I2C_SDA_PIN           21   // Bússola HMC5883L — dados
#define I2C_SCL_PIN           22   // Bússola HMC5883L — clock
#define ULTRASONIC_TRIG_PIN   26   // HC-SR04 — disparo
#define ULTRASONIC_ECHO_PIN   27   // HC-SR04 — retorno
#define MOTOR_LEFT_PIN        32   // PWM Motor Esquerdo (M2)
#define MOTOR_RIGHT_PIN       33   // PWM Motor Direito  (M1)
```

---

## 🗺️ Arquitetura de Energia (Baterias em Paralelo)

```
┌─────────────────────────────────────────────────────────────────┐
│              CADEIA DE ALIMENTAÇÃO (PARALELO)                   │
│                                                                 │
│  [USB-C (USB1)]                                                 │
│      │  VBUS = 5V                                               │
│      ▼                                                          │
│  [TP4056 (U9)]  ← Carregador LiPo (Limita a carga em 4.2V)      │
│      │  BAT = 3.7V a 4.2V (tensão de carga ideal)               │
│      ▼                                                          │
│  [U6 SVC14500] ── paralelo ── [U7 SVC14500]                    │
│   3.7V 800mAh                 3.7V 800mAh                      │
│   Total em paralelo = 3.7V / 1600mAh                            │
│      │                                                          │
│      └──────────────────────────────→ [MT3608 (U8)]             │
│                                            │ (Boost para 9V)    │
│                                            ├─→ VS L298N (Motores)│
│                                            └─→ ESP32 VIN (5V)   │
│                                                                 │
│  ESP32 3V3 (saída interna) ──→ NEO-6M, HMC5883L                 │
│  ESP32 5V (pino 5V/VIN)      ──→ HC-SR04, L298N VSS             │
│  GND comum ─────────────────── todos os GNDs                   │
└─────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Nota Importante de Projeto:**
> - As baterias ligadas em paralelo somam suas capacidades (800mAh + 800mAh = 1600mAh), mantendo a tensão nominal de **3.7V** (máximo de 4.2V quando carregadas).
> - Isso é necessário porque o **TP4056 (U9)** gerencia apenas uma célula Li-Ion de 3.7V nominal. Colocá-las em série geraria 7.4V, o que queimaria o TP4056 e impediria a recarga.
> - Como a tensão de 3.7V é muito baixa para os motores e para a entrada regulada do ESP32, o **MT3608 (U8)** é usado para elevar essa tensão para **9V**.
> - O pino `5V` do ESP32 (pino 19 do lado esquerdo) serve como entrada regulada (VIN). O regulador interno do ESP32 baixa esses 9V para 3.3V estáveis para a lógica interna e sensores.
> - O sensor **HC-SR04** e a lógica da Ponte H (**L298N VSS**) funcionam em **5V**. Em simulação no Multisim, você pode obter a tensão de 5V ligando esses pinos ao pino `5V` do ESP32 (que atua como barramento de 5V comum) ou adicionando um regulador 5V dedicado (como o LM7805) a partir da saída de 9V do boost.

---

## 📌 PASSO 1 — Baterias em Paralelo (U6 + U7)

As duas baterias **SVC14500 3.7V 800mAh** devem ser ligadas em **paralelo** para manter a tensão em **3.7V** e somar suas capacidades (totalizando **1600mAh**).

```
[U6 SVC14500]                 [U7 SVC14500]
   (+) ───────────────────────── (+) ───────→ BAT+ (3.7V)
   (−) ───────────────────────── (−) ───────→ GND (0V)
```

### Como ligar em paralelo no Multisim:
| Conexão | Descrição |
|---|---|
| U6 pino (+) → U7 pino (+) | Interconecta os polos positivos (BAT+) |
| U6 pino (−) → U7 pino (−) | Interconecta os polos negativos (GND comum) |

> 💡 Resultado: entre BAT+ e GND = **3.7V** nominais com capacidade total de **1600mAh** (ideal para carregamento via TP4056).

---

## 📌 PASSO 2 — Conector USB-C (USB1) → Carregador TP4056 (U9)

O conector USB-C fornece **5V** do computador/carregador para o TP4056 carregar as baterias.

### Pinos do USB1 relevantes:
| Pino USB1 | Conectar em |
|---|---|
| **VBUS** (pino 2 e pino 11) | **VCC** do TP4056 (U9) |
| **GND** (pino 1 e pino 12) | **GND** do TP4056 (U9) |

> Os demais pinos do USB1 (CC1, CC2, DP, DN, SBU) não precisam ser conectados nesta simulação básica de carregamento.

### Pinos do TP4056 (U9):
| Pino TP4056 | Função | Conectar em |
|---|---|---|
| **VCC** | Alimentação (entrada 5V USB) | VBUS do USB1 |
| **GND** | Terra | GND comum |
| **BAT** | Saída para bateria | BAT+ (positivo comum de U6 e U7) |
| **PROG** | Define corrente de carga | Resistor para GND* |
| **CHRG** | LED indicador carregando | LED + resistor 1kΩ para GND (opcional) |
| **STBY** | LED indicador standby | LED + resistor 1kΩ para GND (opcional) |
| **TEMP** | Sensor de temperatura NTC | GND (desabilitar, sem NTC) |
| **EP** | Pad térmico exposto | GND |

> **Resistor PROG:** Define a corrente de carga. Para o banco em paralelo de 1600mAh, programamos a corrente máxima de 1A (ideal para o TP4056):
> `R_PROG = 1200 / I_carga(A) = 1200 / 1.0A = 1.2kΩ`

---

## 📌 PASSO 3 — Conversor Boost MT3608 (U8) → L298N (U5) e ESP32 (U1)

O MT3608 **eleva** a tensão de 3.7V das baterias para **9V** para alimentar os motores e a placa ESP32.

### Pinos do MT3608 (U8):
| Pino MT3608 | Função | Conectar em |
|---|---|---|
| **IN** | Tensão de entrada | BAT+ (3.7V das baterias em paralelo) |
| **GND** | Terra | GND comum |
| **SW** | Chave interna (nó indutor) | Indutor externo 22µH → saída |
| **FB** | Feedback (ajuste tensão saída) | Divisor resistivo* |
| **EN** | Enable (HIGH = ligado) | BAT+ (sempre ligado) |
| **NC** | Sem conexão | Deixar livre |
| **OUT** (nó SW após indutor) | Saída boosted | **VS do L298N** (pino 4) e **5V (VIN)** do ESP32 |

> **Divisor FB para tensão de saída:**
> Para saída de 9V: `R_high = 150kΩ`, `R_low = 22kΩ`
> `V_out = 0.6V × (1 + R_high/R_low) = 0.6 × (1 + 150/22) ≈ 9V`

### Conexão MT3608:
```
BAT+ (3.7V) → MT3608 IN
MT3608 OUT  → VS do L298N (pino 4) e pino 5V/VIN do ESP32 (pino 19 esquerdo)
GND         → MT3608 GND, L298N GND e ESP32 GND
```

---

## 📌 PASSO 4 — Alimentação Geral do Sistema

Com as baterias e conversores conectados, distribua a energia:

| Rail de Tensão | Fonte | Alimenta |
|---|---|---|
| **3.7V (BAT+)** | Baterias U6+U7 em paralelo | MT3608 IN, TP4056 BAT |
| **Saída MT3608 (~9V)** | MT3608 OUT | L298N VS (pino 4) e ESP32 VIN/5V (pino 19 esquerdo) |
| **5V** | Pino `5V` do ESP32 (em simulação) | HC-SR04 VCC, L298N VSS (pino 9) |
| **3.3V** | Pino `3V3` do ESP32 (regulador interno) | NEO-6M VCC, HMC5883L VDD/VDDIO |
| **GND** | BAT− (GND) | GND de TODOS os componentes |

### Conexões de alimentação por componente:

#### U4 — HC-SR04
| Pino HC-SR04 | Conectar em |
|---|---|
| **VCC** | **5V** do ESP32 (pino `5V`) |
| **GND** | GND comum |

#### U2 — NEO-6M (GPS)
| Pino NEO-6M | Conectar em |
|---|---|
| **VCC** | **3V3** do ESP32 (pino `3V3`) |
| **GND** | GND comum |

#### U3 — HMC5883L (Bússola)
| Pino HMC5883L | Conectar em |
|---|---|
| **VDD** (pino 2, lado esq.) | **3V3** do ESP32 |
| **VDDIO** (pino 13, lado dir.) | **3V3** do ESP32 |
| **GND** (pino 15 e 17) | GND comum |

> ⚠️ O HMC5883L opera em **3.3V**. Nunca conecte em 5V — o chip queima!

#### U5 — L298N (Driver de Motores)
| Pino L298N | Conectar em |
|---|---|
| **VS** (pino 4) | **Saída do MT3608** (~9V — alimenta os motores) |
| **VSS** (pino 9) | **5V** do ESP32 (alimentação da lógica) |
| **GND** (pino 8) | GND comum |
| **SENSINGA** (pino 1) | **GND** (curto = ganho máximo) |
| **SENSINGB** (pino 15) | **GND** (curto = ganho máximo) |

---

## 📌 PASSO 5 — GPS NEO-6M (U2) → ESP32 (U1)

Comunicação **UART** (serial assíncrona, cruzada: TX→RX / RX←TX).

| Pino NEO-6M (U2) | Direção | Pino ESP32 (U1) |
|---|---|---|
| **TxD1** (GPS transmite) | → | **IO16** (RX2 — ESP32 recebe) |
| **RxD1** (GPS recebe) | ← | **IO17** (TX2 — ESP32 envia) |

### Localização dos pinos:
```
NEO-6M — lado DIREITO (de cima para baixo):
  GND      → pino 24 (topo direito)
  VCC      → pino 23
  V_BCKP   → pino 22 (não conectar)
  RxD1     → pino 21  ← IO17 do ESP32
  TxD1     → pino 20  ← IO16 do ESP32
  SCL2     → pino 19 (não conectar)
  SDA2     → pino 18 (não conectar)
  GND      → pino inferior direito

ESP32 — lado DIREITO (de cima para baixo):
  IO17     → 10° pino (TX2 — ESP32 → GPS)
  IO16     → 11° pino (RX2 — GPS → ESP32)
```

---

## 📌 PASSO 6 — Bússola HMC5883L (U3) → ESP32 (U1)

Comunicação **I2C** (bidirecional, dois fios). Pull-ups **obrigatórios**!

| Pino HMC5883L (U3) | Direção | Pino ESP32 (U1) |
|---|---|---|
| **SCL** (pino 1, lado esq.) | ← | **IO22** (SCL do ESP32) |
| **SDA** (pino 10, lado dir.) | ←→ | **IO21** (SDA do ESP32) |

### Resistores Pull-up (OBRIGATÓRIOS no Multisim):
```
R_SDA = 4.7kΩ:  IO21 (SDA) ──── Resistor ──── 3V3
R_SCL = 4.7kΩ:  IO22 (SCL) ──── Resistor ──── 3V3
```
> ⚠️ Sem os pull-ups, o barramento I2C **não funciona**!

### Localização dos pinos no U3 (HMC5883L):
```
HMC5883L — lado ESQUERDO (de cima para baixo):
  Pino 1  → SCL   → IO22 ESP32
  Pino 2  → VDD   → 3V3
  Pino 3  → NC    (não conectar)
  Pino 4  → S1    (não conectar)
  Pino 5  → NC
  Pino 6  → NC
  Pino 7  → NC
  Pino 8  → SETP  (não conectar)

HMC5883L — lado DIREITO (de cima para baixo):
  Pino 10 → SDA   → IO21 ESP32
  Pino 11 → DRDY  (não conectar)
  Pino 12 → NC
  Pino 13 → VDDIO → 3V3
  Pino 14 → SETC  (não conectar)
  Pino 15 → GND   → GND
  Pino 16 → C1    (capacitor 100nF para GND, opcional)
  Pino 17 → GND   → GND
```

---

## 📌 PASSO 7 — HC-SR04 (U4) → ESP32 (U1)

### ⚠️ ATENÇÃO: Divisor de Tensão Obrigatório no ECHO!

O ECHO sai em **5V**, mas o ESP32 aceita no máximo **3.3V** nos GPIOs.

```
Divisor de tensão para o pino ECHO:

HC-SR04 ECHO (5V) ──── R1 (1kΩ) ──── Nó A ──── IO27 do ESP32
                                        │
                                       R2 (2kΩ)
                                        │
                                       GND

Tensão no Nó A = 5V × [2kΩ / (1kΩ + 2kΩ)] = 3.33V ✓
```

| Pino HC-SR04 (U4) | Conectar em | Pino ESP32 (U1) |
|---|---|---|
| **VCC** (pino 1) | 5V do ESP32 | — |
| **TRIG** (pino 2) | ← | **IO26** do ESP32 |
| **ECHO** (pino 3) | → via R1+R2 → | **IO27** do ESP32 |
| **GND** (pino 4) | GND comum | — |

### Localização dos pinos no U1 (ESP32 — lado ESQUERDO):
```
ESP32 — lado ESQUERDO (de cima para baixo):
  IO26  → 10° pino → TRIG do HC-SR04
  IO27  → 11° pino ← ECHO do HC-SR04 (com divisor de tensão!)
```

---

## 📌 PASSO 8 — L298N (U5) → ESP32 (U1)

O L298N controla 2 motores com PWM (velocidade) e direção.

### Conexões de Controle (ESP32 → L298N):

| Pino L298N (U5) | Pino | Função | Conectar em |
|---|---|---|---|
| **ENABLEA** | 6 | PWM Motor Esq. (velocidade) | **IO32** do ESP32 |
| **INPUT1** | 5 | Direção Motor Esq. (bit A) | **IO25** do ESP32 |
| **INPUT2** | 7 | Direção Motor Esq. (bit B) | **GND** (LOW fixo = sempre frente) |
| **ENABLEB** | 11 | PWM Motor Dir. (velocidade) | **IO33** do ESP32 |
| **INPUT3** | 10 | Direção Motor Dir. (bit A) | **IO25** do ESP32 (mesmo sinal) |
| **INPUT4** | 12 | Direção Motor Dir. (bit B) | **GND** (LOW fixo = sempre frente) |

> 💡 **Tabela de direção:**
> | ENABLE | IN1 | IN2 | Resultado |
> |--------|-----|-----|-----------|
> | HIGH | HIGH | LOW | Motor frente ✅ |
> | HIGH | LOW | HIGH | Motor ré ↩️ |
> | HIGH | HIGH | HIGH | Freio 🛑 |
> | LOW | X | X | Parado 🔴 |

### Localização completa dos pinos L298N (U5):
```
L298N — de cima para baixo:
  Pino 1  → SENSINGA  → GND
  Pino 2  → OUTPUT1   → Motor M2 (+) [Esquerdo]
  Pino 3  → OUTPUT2   → Motor M2 (−) [Esquerdo]
  Pino 4  → VS        → Saída do MT3608 (~9V)
  Pino 5  → INPUT1    → IO25 do ESP32
  Pino 6  → ENABLEA   → IO32 do ESP32 (PWM)
  Pino 7  → INPUT2    → GND
  Pino 8  → GND       → GND comum
  Pino 9  → VSS       → 5V do ESP32
  Pino 10 → INPUT3    → IO25 do ESP32
  Pino 11 → ENABLEB   → IO33 do ESP32 (PWM)
  Pino 12 → INPUT4    → GND
  Pino 13 → OUTPUT3   → Motor M1 (+) [Direito]
  Pino 14 → OUTPUT4   → Motor M1 (−) [Direito]
  Pino 15 → SENSINGB  → GND
```

---

## 📌 PASSO 9 — Motores M1 e M2 → L298N (U5)

Os motores **M1** (Direito) e **M2** (Esquerdo) são do tipo MOTOR_3 com 2 terminais.

### M2 — Motor Esquerdo:
| Terminal Motor M2 | Conectar em | Pino L298N |
|---|---|---|
| **+** (terminal positivo) | OUTPUT1 | Pino 2 do L298N |
| **−** (terminal negativo) | OUTPUT2 | Pino 3 do L298N |

### M1 — Motor Direito:
| Terminal Motor M1 | Conectar em | Pino L298N |
|---|---|---|
| **+** (terminal positivo) | OUTPUT3 | Pino 13 do L298N |
| **−** (terminal negativo) | OUTPUT4 | Pino 14 do L298N |

### ⚠️ Diodos de Proteção Flyback (OBRIGATÓRIOS):

Adicione **4 diodos 1N4007** (um em cada terminal de motor):

```
VS (~9V saída MT3608)
   │
   ├──[1N4007]──── OUTPUT1 ──── M2(+)
   │   catodo→VS                  │
   │                            [M2]
   │                              │
   ├──[1N4007]──── OUTPUT2 ──── M2(−)
   │   catodo→VS
   │
   ├──[1N4007]──── OUTPUT3 ──── M1(+)
   │   catodo→VS                  │
   │                            [M1]
   │                              │
   └──[1N4007]──── OUTPUT4 ──── M1(−)
       catodo→VS
```

---

## 📌 PASSO 10 — Localização dos Pinos ESP32 (U1) — Referência Completa

### Lado ESQUERDO do ESP32 (de cima para baixo):
```
Posição  Pino     Uso neste projeto
  1    → 3V3    → VCC NEO-6M, VDD HMC5883L, VDDIO HMC5883L
  2    → EN     → (não conectar)
  3    → VP     → (não usar)
  4    → VN     → (não usar)
  5    → IO34   → (livre)
  6    → IO35   → (livre)
  7    → IO32   → MOTOR_LEFT_PIN  → ENABLEA L298N  (PWM M2)
  8    → IO33   → MOTOR_RIGHT_PIN → ENABLEB L298N  (PWM M1)
  9    → IO25   → Direção motores → INPUT1 e INPUT3 L298N
 10    → IO26   → ULTRASONIC_TRIG → TRIG HC-SR04
 11    → IO27   → ULTRASONIC_ECHO ← ECHO HC-SR04 (via divisor)
 12    → IO14   → (livre)
 13    → IO12   → (livre)
 14    → GND    → GND comum
 15    → IO13   → (livre)
 16    → D2     → (livre)
 17    → D0     → (livre)
 18    → CMD    → (livre)
 19    → 5V     → VCC HC-SR04, VSS L298N
```

### Lado DIREITO do ESP32 (de cima para baixo):
```
Posição  Pino     Uso neste projeto
  1    → GND    → GND comum
  2    → IO23   → (livre)
  3    → IO22   → I2C_SCL → SCL HMC5883L  (+ pull-up 4.7kΩ→3V3)
  4    → TX     → Serial USB (não usar aqui)
  5    → RX     → Serial USB (não usar aqui)
  6    → IO21   → I2C_SDA → SDA HMC5883L  (+ pull-up 4.7kΩ→3V3)
  7    → IO19   → (livre)
  8    → IO18   → (livre)
  9    → IO5    → (livre)
 10    → IO17   → GPS_TX  → RxD1 NEO-6M   (ESP32 envia para GPS)
 11    → IO16   → GPS_RX  ← TxD1 NEO-6M   (ESP32 recebe do GPS)
 12    → IO4    → (livre)
 13    → IO0    → BOOT (não conectar!)
 14    → IO2    → LED interno (não conectar!)
 15    → IO15   → (livre)
 16    → D1     → (livre)
 17    → D3     → (livre)
 18    → CLK    → (livre)
```

---

## ✅ Checklist de Conexões — Confira Antes de Simular

### 🔋 Baterias e Energia
- [ ] U6 (+) → U7 (+) (ligação em paralelo para BAT+)
- [ ] U6 (−) → U7 (−) (ligação em paralelo para GND comum)
- [ ] BAT+ → MT3608 IN (pino IN)
- [ ] BAT+ → TP4056 BAT (pino BAT do carregador)
- [ ] GND → MT3608 GND, ESP32 GND, TP4056 GND, todos os componentes

### 🔌 Carregamento USB (TP4056)
- [ ] USB1 VBUS → TP4056 VCC
- [ ] USB1 GND → TP4056 GND
- [ ] TP4056 BAT → BAT+ (polo positivo comum das baterias)
- [ ] TP4056 GND → GND
- [ ] TP4056 TEMP → GND (desabilitar NTC)
- [ ] TP4056 PROG → Resistor 1.2kΩ → GND
- [ ] TP4056 EP → GND

### ⚡ Conversor Boost MT3608
- [ ] MT3608 IN → BAT+ (3.7V)
- [ ] MT3608 GND → GND
- [ ] MT3608 EN → BAT+ (sempre ligado)
- [ ] MT3608 OUT → VS do L298N (pino 4) e pino 5V/VIN do ESP32 (pino 19 esquerdo)
- [ ] Divisor FB: R_high=150kΩ entre OUT e FB; R_low=22kΩ entre FB e GND

### 📡 GPS (UART)
- [ ] NEO-6M VCC → 3V3 do ESP32
- [ ] NEO-6M GND → GND
- [ ] NEO-6M TxD1 → IO16 do ESP32
- [ ] NEO-6M RxD1 → IO17 do ESP32

### 🧭 Bússola (I2C)
- [ ] HMC5883L VDD → 3V3 do ESP32
- [ ] HMC5883L VDDIO → 3V3 do ESP32
- [ ] HMC5883L GND (pinos 15 e 17) → GND
- [ ] HMC5883L SCL → IO22 do ESP32
- [ ] HMC5883L SDA → IO21 do ESP32
- [ ] Pull-up 4.7kΩ entre IO22 e 3V3 ← SCL
- [ ] Pull-up 4.7kΩ entre IO21 e 3V3 ← SDA

### 🔊 Ultrassônico
- [ ] HC-SR04 VCC → 5V do ESP32
- [ ] HC-SR04 GND → GND
- [ ] HC-SR04 TRIG → IO26 do ESP32
- [ ] HC-SR04 ECHO → R1(1kΩ) → Nó → IO27 do ESP32
- [ ] Nó → R2(2kΩ) → GND ← divisor obrigatório!

### ⚙️ L298N — Motor Esquerdo (M2)
- [ ] L298N VS (pino 4) → saída MT3608
- [ ] L298N VSS (pino 9) → 5V do ESP32
- [ ] L298N GND (pino 8) → GND
- [ ] L298N SENSINGA (pino 1) → GND
- [ ] L298N ENABLEA (pino 6) → IO32 do ESP32 (PWM)
- [ ] L298N INPUT1 (pino 5) → IO25 do ESP32
- [ ] L298N INPUT2 (pino 7) → GND
- [ ] L298N OUTPUT1 (pino 2) → M2 terminal (+)
- [ ] L298N OUTPUT2 (pino 3) → M2 terminal (−)
- [ ] Diodo 1N4007 em OUTPUT1 (catodo → VS)
- [ ] Diodo 1N4007 em OUTPUT2 (catodo → VS)

### ⚙️ L298N — Motor Direito (M1)
- [ ] L298N SENSINGB (pino 15) → GND
- [ ] L298N ENABLEB (pino 11) → IO33 do ESP32 (PWM)
- [ ] L298N INPUT3 (pino 10) → IO25 do ESP32
- [ ] L298N INPUT4 (pino 12) → GND
- [ ] L298N OUTPUT3 (pino 13) → M1 terminal (+)
- [ ] L298N OUTPUT4 (pino 14) → M1 terminal (−)
- [ ] Diodo 1N4007 em OUTPUT3 (catodo → VS)
- [ ] Diodo 1N4007 em OUTPUT4 (catodo → VS)

---

## ⚡ Resumo Visual Final

```
[USB-C USB1]
   VBUS (5V) ──────────────────────────────── VCC TP4056 (U9)
   GND       ──────────────────────────────── GND TP4056

[TP4056 U9]
   BAT ────────────────────────────────────── BAT+ (U6+ / U7+)
   GND ────────────────────────────────────── GND

[U6 SVC14500]──paralelo──[U7 SVC14500]
   U6(+) conectado a U7(+) = BAT+ (3.7V)
   U6(−) conectado a U7(−) = GND

BAT+ (3.7V)
   ├──── MT3608 IN (U8)
   │        MT3608 OUT (~9V) ─────────────── VS L298N (pino 4)
   │                                         └─→ ESP32 VIN (pino 19 esquerdo)
   └──── TP4056 BAT (U9)

ESP32 (U1)
   ESP32 3V3 (saída) ──────────────────────── VCC NEO-6M
   │                                          VDD HMC5883L
   │                                          VDDIO HMC5883L
   ESP32 5V (saída em simulação) ───────────── VCC HC-SR04
   │                                          VSS L298N (pino 9)
   GND ────────────────────────────────────── GND de TODOS

ESP32 IO16 ←──────────────────────────────── TxD1 NEO-6M
ESP32 IO17 ────────────────────────────────→ RxD1 NEO-6M
ESP32 IO21 ←──[4.7kΩ→3V3]─────────────────→ SDA HMC5883L
ESP32 IO22 ──[4.7kΩ→3V3]──────────────────→ SCL HMC5883L
ESP32 IO26 ────────────────────────────────→ TRIG HC-SR04
ESP32 IO27 ←──[R1:1kΩ ÷ R2:2kΩ→GND]──── ECHO HC-SR04
ESP32 IO32 ────────────────────────────────→ ENABLEA L298N (PWM M2)
ESP32 IO33 ────────────────────────────────→ ENABLEB L298N (PWM M1)
ESP32 IO25 ────────────────────────────────→ INPUT1 + INPUT3 L298N
GND        ────────────────────────────────→ INPUT2 + INPUT4 L298N

L298N OUTPUT1 ─────────────────────────────→ M2 Motor Esq. (+)
L298N OUTPUT2 ─────────────────────────────→ M2 Motor Esq. (−)
L298N OUTPUT3 ─────────────────────────────→ M1 Motor Dir. (+)
L298N OUTPUT4 ─────────────────────────────→ M1 Motor Dir. (−)
```

---

*Guia gerado para o projeto USV-AM — Drone Fluvial Autônomo Amazônico*
*Pinos extraídos de `firmware/src/main.cpp` | Esquemático: versão com TP4056 + MT3608 + SVC14500*
