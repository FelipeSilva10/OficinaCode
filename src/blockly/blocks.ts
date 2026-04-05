import * as Blockly from 'blockly/core';

// ─────────────────────────────────────────────────────────────────────────────
// Definição das placas
// ─────────────────────────────────────────────────────────────────────────────
export const BOARDS = {
  uno: {
    name: 'Arduino Uno',
    pins: [
      ['D2', '2'], ['D3 (PWM)', '3'], ['D4', '4'], ['D5 (PWM)', '5'],
      ['D6 (PWM)', '6'], ['D7', '7'], ['D8', '8'], ['D9 (PWM)', '9'],
      ['D10 (PWM)', '10'], ['D11 (PWM)', '11'], ['D12', '12'], ['D13 (LED Interno)', '13'],
      ['A0', 'A0'], ['A1', 'A1'], ['A2', 'A2'], ['A3', 'A3'], ['A4', 'A4'], ['A5', 'A5'],
    ],
  },
  nano: {
    name: 'Arduino Nano',
    pins: [
      ['D2', '2'], ['D3 (PWM)', '3'], ['D4', '4'], ['D5 (PWM)', '5'],
      ['D6 (PWM)', '6'], ['D7', '7'], ['D8', '8'], ['D9 (PWM)', '9'],
      ['D10 (PWM)', '10'], ['D11 (PWM)', '11'], ['D12', '12'], ['D13 (LED Interno)', '13'],
      ['A0', 'A0'], ['A1', 'A1'], ['A2', 'A2'], ['A3', 'A3'], ['A4', 'A4'], ['A5', 'A5'],
    ],
  },
  esp32: {
    name: 'ESP32 DevKit V1',
    pins: [
      ['GPIO 0  ⚠️ boot', '0'],    ['GPIO 2  (LED)', '2'],
      ['GPIO 4',          '4'],    ['GPIO 5  ⚠️ boot', '5'],
      ['GPIO 12 ⚠️ boot', '12'],   ['GPIO 13', '13'],
      ['GPIO 14',         '14'],   ['GPIO 15 ⚠️ boot', '15'],
      ['GPIO 16',         '16'],   ['GPIO 17', '17'],
      ['GPIO 18',         '18'],   ['GPIO 19', '19'],
      ['GPIO 21',         '21'],   ['GPIO 22', '22'],
      ['GPIO 23',         '23'],   ['GPIO 25', '25'],
      ['GPIO 26',         '26'],   ['GPIO 27', '27'],
      ['GPIO 32',         '32'],   ['GPIO 33', '33'],
      ['GPIO 34 (leitura)', '34'], ['GPIO 35 (leitura)', '35'],
      ['GPIO 36 (leitura)', '36'], ['GPIO 39 (leitura)', '39'],
    ],
  },
} as const;

export type BoardKey = keyof typeof BOARDS;
export const BOARD_UNSET = 'unset';

let currentBoardPins: [string, string][] = [...BOARDS.uno.pins] as [string, string][];

export function syncBoardPins(boardKey: BoardKey) {
  currentBoardPins = [...BOARDS[boardKey].pins] as [string, string][];
}

// ─────────────────────────────────────────────────────────────────────────────
// Inicialização dos Blocos
// ─────────────────────────────────────────────────────────────────────────────
export function initBlocks() {
  const customBlocks = [
    // ── ESTRUTURA ──────────────────────────────────────────────────────────────
    { type: 'bloco_setup', colour: 290, helpUrl: '', message0: 'PREPARAR (Roda 1 vez) %1', args0: [{ type: 'input_statement', name: 'DO' }], tooltip: 'Código que roda apenas uma vez, na inicialização.' },
    { type: 'bloco_loop', colour: 260, helpUrl: '', message0: 'AGIR (Roda para sempre) %1', args0: [{ type: 'input_statement', name: 'DO' }], tooltip: 'Código que fica se repetindo enquanto o robô estiver ligado.' },

    // ── PINOS ──────────────────────────────────────────────────────────────────
    { type: 'configurar_pino', colour: 230, message0: 'Configurar pino %1 como %2', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'MODE', options: [['Saída (Enviar sinal)', 'OUTPUT'], ['Entrada (Ler sensor)', 'INPUT'], ['Entrada com resistor', 'INPUT_PULLUP']] }], previousStatement: null, nextStatement: null, tooltip: 'Define se o pino vai enviar ou receber sinal.' },
    { type: 'escrever_pino', colour: 230, message0: 'Colocar pino %1 em estado %2', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'STATE', options: [['Ligado (HIGH)', 'HIGH'], ['Desligado (LOW)', 'LOW']] }], previousStatement: null, nextStatement: null, tooltip: 'Liga ou desliga um pino digital.' },
    { type: 'ler_pino_digital', colour: 230, message0: 'Ler pino digital %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }], output: null, tooltip: 'Lê o estado (HIGH ou LOW) de um pino digital.' },
    { type: 'escrever_pino_pwm', colour: 230, message0: 'Intensidade do pino %1 → %2 (0 a 255)', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }, { type: 'input_value', name: 'VALOR' }], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: 'Controla a intensidade via PWM.' },
    { type: 'ler_pino_analogico', colour: 230, message0: 'Ler sensor analógico no pino %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }], output: null, tooltip: 'Lê um sensor analógico. Retorna valor de 0 a 1023.' },

    // ── CONTROLE BÁSICO ────────────────────────────────────────────────────────
    { type: 'esperar', colour: 120, message0: 'Esperar %1 milissegundos', args0: [{ type: 'field_number', name: 'TIME', value: 1000, min: 0 }], previousStatement: null, nextStatement: null, tooltip: '1000 ms = 1 segundo.' },
    { type: 'repetir_vezes', colour: 120, message0: 'Repetir %1 vezes %2 %3', args0: [{ type: 'field_number', name: 'TIMES', value: 5, min: 1 }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null },

    // ── CONDIÇÕES ──────────────────────────────────────────────────────────────
    { type: 'se_entao', colour: 210, message0: 'SE %1 ENTÃO %2 %3', args0: [{ type: 'input_value', name: 'CONDICAO', check: 'Boolean' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'ENTAO' }], previousStatement: null, nextStatement: null },
    { type: 'se_entao_senao', colour: 210, message0: 'SE %1 ENTÃO %2 %3 SENÃO %4 %5', args0: [{ type: 'input_value', name: 'CONDICAO', check: 'Boolean' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'ENTAO' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'SENAO' }], previousStatement: null, nextStatement: null },
    { type: 'comparar_valores', colour: 210, message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A' }, { type: 'field_dropdown', name: 'OP', options: [['é maior que', '>'], ['é menor que', '<'], ['é igual a', '=='], ['é maior ou igual a', '>='], ['é menor ou igual a', '<='], ['é diferente de', '!=']] }, { type: 'input_value', name: 'B' }], inputsInline: true, output: 'Boolean' },
    { type: 'numero_fixo', colour: 210, message0: '%1', args0: [{ type: 'field_number', name: 'VALOR', value: 10 }], output: null },
    { type: 'e_ou_logico', colour: 210, message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'field_dropdown', name: 'OP', options: [['E', '&&'], ['OU', '||']] }, { type: 'input_value', name: 'B', check: 'Boolean' }], inputsInline: true, output: 'Boolean' },
    { type: 'nao_logico', colour: 210, message0: 'NÃO %1', args0: [{ type: 'input_value', name: 'VALOR', check: 'Boolean' }], inputsInline: true, output: 'Boolean', tooltip: 'Inverte a condição.' },
    { type: 'mapear_valor', colour: 210, message0: 'Converter %1 de %2-%3 para %4-%5', args0: [{ type: 'input_value', name: 'VALOR' }, { type: 'field_number', name: 'DE_MIN', value: 0 }, { type: 'field_number', name: 'DE_MAX', value: 1023 }, { type: 'field_number', name: 'PARA_MIN', value: 0 }, { type: 'field_number', name: 'PARA_MAX', value: 255 }], inputsInline: true, output: null, tooltip: 'Converte um valor de uma escala para outra.' },

    // ── ULTRASSÔNICO ───────────────────────────────────────────────────────────
    { type: 'configurar_ultrassonico', colour: 40, message0: 'Configurar sensor de distância: Trigger %1 Echo %2', args0: [{ type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins }], previousStatement: null, nextStatement: null, tooltip: 'Coloque dentro de PREPARAR.' },
    { type: 'ler_distancia_cm', colour: 40, message0: 'Distância em cm (Trigger %1 Echo %2)', args0: [{ type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins }], output: null, tooltip: 'Retorna a distância em centímetros.' },
    { type: 'mostrar_distancia', colour: 40, message0: 'O robô diz a distância em cm (Trigger %1 Echo %2)', args0: [{ type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins }], previousStatement: null, nextStatement: null },
    { type: 'objeto_esta_perto', colour: 40, message0: 'Tem objeto a menos de %1 cm? (Trigger %2 Echo %3)', args0: [{ type: 'field_number', name: 'CM', value: 20, min: 1 }, { type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins }], output: 'Boolean', tooltip: 'Verdadeiro se objeto mais próximo que a distância.' },
    { type: 'distancia_entre', colour: 40, message0: 'Distância entre %1 e %2 cm? (Trigger %3 Echo %4)', args0: [{ type: 'field_number', name: 'MIN', value: 10, min: 0 }, { type: 'field_number', name: 'MAX', value: 20, min: 0 }, { type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins }], output: 'Boolean', tooltip: 'Verifica se a distância está em uma faixa.' },

    // ── COMUNICAÇÃO ────────────────────────────────────────────────────────────
    { type: 'escrever_serial', colour: 160, message0: 'O robô diz o texto: %1', args0: [{ type: 'field_input', name: 'TEXT', text: 'Olá, mundo!' }], previousStatement: null, nextStatement: null },
    { type: 'escrever_serial_valor', colour: 160, message0: 'O robô diz a leitura de: %1', args0: [{ type: 'input_value', name: 'VALOR' }], previousStatement: null, nextStatement: null },

    // ── CONTROLE AVANÇADO ──────────────────────────────────────────────────────
    { type: 'enquanto_verdadeiro', colour: 120, message0: 'Enquanto %1 fizer %2 %3', args0: [{ type: 'input_value', name: 'CONDICAO', check: 'Boolean' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, tooltip: 'Repete o bloco enquanto a condição for verdadeira.' },
    { type: 'parar_repeticao', colour: 120, message0: '⛔ Parar de repetir (break)', args0: [], previousStatement: null, nextStatement: null, tooltip: 'Sai imediatamente do loop atual.' },

    // ── MATEMÁTICA ─────────────────────────────────────────────────────────────
    { type: 'operacao_matematica', colour: 200, message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A' }, { type: 'field_dropdown', name: 'OP', options: [['+ soma', '+'], ['− subtração', '-'], ['× multiplicação', '*'], ['÷ divisão', '/'], ['% resto', '%']] }, { type: 'input_value', name: 'B' }], inputsInline: true, output: null, tooltip: 'Operação matemática entre dois valores.' },
    { type: 'valor_absoluto', colour: 200, message0: '|%1| valor absoluto', args0: [{ type: 'input_value', name: 'VALOR' }], output: null, tooltip: 'Retorna o valor sem sinal negativo. Ex: abs(-5) = 5.' },
    { type: 'constrain_valor', colour: 200, message0: 'Limitar %1 entre %2 e %3', args0: [{ type: 'input_value', name: 'VALOR' }, { type: 'field_number', name: 'MIN', value: 0 }, { type: 'field_number', name: 'MAX', value: 255 }], inputsInline: true, output: null, tooltip: 'Garante que o valor fique dentro do intervalo dado.' },
    { type: 'random_valor', colour: 200, message0: 'Número aleatório de %1 a %2', args0: [{ type: 'field_number', name: 'MIN', value: 0 }, { type: 'field_number', name: 'MAX', value: 100 }], output: null, tooltip: 'Gera um número inteiro aleatório no intervalo.' },
    { type: 'millis_atual', colour: 200, message0: 'Tempo ligado (ms)', args0: [], output: null, tooltip: 'Retorna milissegundos desde o início. Útil para temporização sem travar com delay.' },

    // ── VARIÁVEIS GLOBAIS ──────────────────────────────────────────────────────
    { type: 'declarar_variavel_global', colour: 330, message0: '📦 Variável %1 %2 = %3', args0: [{ type: 'field_dropdown', name: 'TIPO', options: [['inteiro (int)', 'int'], ['decimal (float)', 'float'], ['bool (true/false)', 'bool']] }, { type: 'field_input', name: 'NOME', text: 'minha_var' }, { type: 'input_value', name: 'VALOR' }], tooltip: 'Declara uma variável global. Deixe solto no workspace, fora de qualquer bloco.' },
    { type: 'atribuir_variavel', colour: 330, message0: 'Guardar em %1 o valor %2', args0: [{ type: 'field_input', name: 'NOME', text: 'minha_var' }, { type: 'input_value', name: 'VALOR' }], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: 'Atribui um novo valor à variável.' },
    { type: 'ler_variavel', colour: 330, message0: 'variável %1', args0: [{ type: 'field_input', name: 'NOME', text: 'minha_var' }], output: null, tooltip: 'Lê o valor atual de uma variável.' },
    { type: 'incrementar_variavel', colour: 330, message0: 'Aumentar %1 em %2', args0: [{ type: 'field_input', name: 'NOME', text: 'contador' }, { type: 'input_value', name: 'VALOR' }], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: 'Soma um valor à variável.' },

    // ── FUNÇÕES ────────────────────────────────────────────────────────────────
    { type: 'definir_funcao', colour: 270, message0: '⚡ Função %1 %2 %3', args0: [{ type: 'field_input', name: 'NOME', text: 'minhaFuncao' }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], tooltip: 'Cria uma função reutilizável.' },
    { type: 'chamar_funcao', colour: 270, message0: 'Executar função %1', args0: [{ type: 'field_input', name: 'NOME', text: 'minhaFuncao' }], previousStatement: null, nextStatement: null, tooltip: 'Chama e executa uma função definida no workspace.' },

    // ── SERVO MOTOR ────────────────────────────────────────────────────────────
    { type: 'servo_configurar', colour: 170, message0: 'Conectar servo no pino %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }], previousStatement: null, nextStatement: null, tooltip: 'Inicializa o servo motor. Coloque dentro de PREPARAR.' },
    { type: 'servo_mover', colour: 170, message0: 'Mover servo (pino %1) para %2 °', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }, { type: 'input_value', name: 'ANGULO' }], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: 'Move o servo para um ângulo de 0 a 180 graus.' },
    { type: 'servo_ler', colour: 170, message0: 'Posição atual do servo (pino %1)', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }], output: null, tooltip: 'Retorna o ângulo atual do servo (0 a 180).' },

    // ── BUZZER / SOM ───────────────────────────────────────────────────────────
    { type: 'buzzer_tocar', colour: 50, message0: '🔊 Tocar som: pino %1 frequência %2 Hz', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }, { type: 'field_number', name: 'FREQ', value: 440, min: 31, max: 65535 }], previousStatement: null, nextStatement: null, tooltip: 'Toca um som contínuo no buzzer/piezo.' },
    { type: 'buzzer_tocar_tempo', colour: 50, message0: '🔊 Tocar som: pino %1 frequência %2 Hz por %3 ms', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }, { type: 'field_number', name: 'FREQ', value: 440, min: 31 }, { type: 'field_number', name: 'DUR', value: 500, min: 1 }], previousStatement: null, nextStatement: null, tooltip: 'Toca um som por um tempo determinado.' },
    { type: 'buzzer_parar', colour: 50, message0: '🔇 Parar som no pino %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }], previousStatement: null, nextStatement: null, tooltip: 'Para o som do buzzer/piezo.' },

    // ── ESP-NOW COMUM ──────────────────────────────────────────────────────────
    { type: 'espnow_iniciar_wifi', colour: 70, message0: '📶 Iniciar Wi-Fi em modo estação (ESP-NOW)', previousStatement: null, nextStatement: null, tooltip: 'Liga o Wi-Fi em modo STA. Obrigatório antes de usar ESP-NOW.' },
    { type: 'espnow_mac_serial', colour: 70, message0: '📋 Mostrar MAC address no Serial', previousStatement: null, nextStatement: null, tooltip: 'Imprime no Serial o MAC deste ESP32. Use para descobrir o endereço do receptor.' },

    // ── ESP-NOW TRANSMISSOR (LUVA) ─────────────────────────────────────────────
    { type: 'espnow_transmissor_init', colour: 70, message0: '📡 Iniciar ESP-NOW como TRANSMISSOR', previousStatement: null, nextStatement: null, tooltip: 'Inicializa o ESP-NOW para enviar dados. Coloque no PREPARAR após iniciar Wi-Fi.' },
    { type: 'espnow_adicionar_receptor', colour: 70, message0: '🔗 Adicionar receptor com MAC %1', args0: [{ type: 'field_input', name: 'MAC', text: 'AA:BB:CC:DD:EE:FF' }], previousStatement: null, nextStatement: null, tooltip: 'Registra o MAC do receptor (carrinho). Descubra o MAC rodando "Mostrar MAC no Serial" no carrinho.' },
    { type: 'espnow_enviar_pacote', colour: 70, message0: 'Enviar pacote: pitch %1 roll %2 parar %3', args0: [{ type: 'input_value', name: 'PITCH' }, { type: 'input_value', name: 'ROLL' }, { type: 'input_value', name: 'PARAR', check: 'Boolean' }], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: 'Envia pitch, roll e flag de parada via ESP-NOW para o receptor.' },

    // ── ESP-NOW RECEPTOR (CARRINHO) ────────────────────────────────────────────
    { type: 'espnow_receptor_init', colour: 70, message0: '📡 Iniciar ESP-NOW como RECEPTOR', previousStatement: null, nextStatement: null, tooltip: 'Inicializa o ESP-NOW para receber dados. Coloque no PREPARAR após iniciar Wi-Fi.' },
    { type: 'espnow_tem_dados_novos', colour: 70, message0: 'Chegou novo pacote ESP-NOW?', output: 'Boolean', tooltip: 'Verdadeiro se um novo pacote ESP-NOW foi recebido e ainda não foi processado.' },
    { type: 'espnow_ler_pitch', colour: 70, message0: 'Pitch recebido (graus)', output: null, tooltip: 'Retorna o ângulo de inclinação frente/trás do último pacote recebido.' },
    { type: 'espnow_ler_roll', colour: 70, message0: 'Roll recebido (graus)', output: null, tooltip: 'Retorna o ângulo de inclinação esquerda/direita do último pacote recebido.' },
    { type: 'espnow_ler_flag_parar', colour: 70, message0: 'Flag "parar" recebido?', output: 'Boolean', tooltip: 'Verdadeiro se o transmissor enviou o comando de parada.' },
    { type: 'espnow_timeout_ms', colour: 70, message0: 'Sem pacote por mais de %1 ms?', args0: [{ type: 'field_number', name: 'MS', value: 600, min: 100 }], output: 'Boolean', tooltip: 'Verdadeiro se nenhum pacote foi recebido dentro do tempo limite. Use para parar o carrinho em caso de perda de sinal.' },

    // ── MPU-6050 ───────────────────────────────────────────────────────────────
    { type: 'mpu_iniciar', colour: 310, message0: '🧭 Iniciar MPU-6050 (SDA %1 SCL %2)', args0: [{ type: 'field_dropdown', name: 'SDA', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'SCL', options: () => currentBoardPins }], previousStatement: null, nextStatement: null, tooltip: 'Inicializa o acelerômetro/giroscópio MPU-6050 via I2C. Coloque no PREPARAR.' },
    { type: 'mpu_ler_pitch', colour: 310, message0: '🧭 Ler Pitch do MPU-6050 (graus)', output: null, tooltip: 'Retorna o ângulo de inclinação frente/trás (pitch) em graus.' },
    { type: 'mpu_ler_roll', colour: 310, message0: '🧭 Ler Roll do MPU-6050 (graus)', output: null, tooltip: 'Retorna o ângulo de inclinação esquerda/direita (roll) em graus.' },

    // ── PONTE H L298N ──────────────────────────────────────────────────────────
    { type: 'l298n_configurar', colour: 0, message0: '🚗 Configurar Ponte H: ENA %1 IN1 %2 IN2 %3 IN3 %4 IN4 %5 ENB %6', args0: [{ type: 'field_dropdown', name: 'ENA', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'IN1', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'IN2', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'IN3', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'IN4', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'ENB', options: () => currentBoardPins }], previousStatement: null, nextStatement: null, tooltip: 'Configura todos os pinos da Ponte H L298N como saída e trava os motores na inicialização.' },
    { type: 'l298n_pwm_configurar', colour: 0, message0: '⚡ Configurar PWM LEDC: ENA %1 ENB %2', args0: [{ type: 'field_dropdown', name: 'ENA', options: () => currentBoardPins }, { type: 'field_dropdown', name: 'ENB', options: () => currentBoardPins }], previousStatement: null, nextStatement: null, tooltip: 'Configura o PWM (LEDC) do ESP32 para controlar a velocidade dos motores. Coloque após "Configurar Ponte H".' },
    { type: 'l298n_motor_esquerdo', colour: 0, message0: '🚗 Motor esquerdo: %1 (-255 a 255)', args0: [{ type: 'input_value', name: 'VALOR' }], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: 'Positivo = frente, negativo = ré, 0 = parado.' },
    { type: 'l298n_motor_direito', colour: 0, message0: '🚗 Motor direito: %1 (-255 a 255)', args0: [{ type: 'input_value', name: 'VALOR' }], inputsInline: true, previousStatement: null, nextStatement: null, tooltip: 'Positivo = frente, negativo = ré, 0 = parado.' },
    { type: 'l298n_parar_motores', colour: 0, message0: '⛔ Parar ambos os motores', previousStatement: null, nextStatement: null, tooltip: 'Para os dois motores imediatamente.' },
    { type: 'l298n_velocidade_por_pitch_roll', colour: 0, message0: '🚗 Controlar motores por pitch %1 roll %2 zona_pitch %3 zona_roll %4', args0: [{ type: 'input_value', name: 'PITCH' }, { type: 'input_value', name: 'ROLL' }, { type: 'field_number', name: 'ZONA_P', value: 10, min: 0 }, { type: 'field_number', name: 'ZONA_R', value: 8, min: 0 }], previousStatement: null, nextStatement: null, tooltip: 'Converte pitch e roll em velocidade diferencial para os dois motores, com zona morta configurável.' },

    // ── EXTRAS / UTILITÁRIOS ───────────────────────────────────────────────────
    { type: 'util_map_float', colour: 200, message0: 'Converter (float) %1 de %2-%3 para %4-%5', args0: [{ type: 'input_value', name: 'VALOR' }, { type: 'field_number', name: 'DE_MIN', value: 0 }, { type: 'field_number', name: 'DE_MAX', value: 45 }, { type: 'field_number', name: 'PARA_MIN', value: 150 }, { type: 'field_number', name: 'PARA_MAX', value: 255 }], inputsInline: true, output: null, tooltip: 'Versão decimal (float) da função map. Necessária para converter ângulos em velocidade.' },
    { type: 'util_fabsf', colour: 200, message0: '|%1| valor absoluto (float)', args0: [{ type: 'input_value', name: 'VALOR' }], output: null, tooltip: 'Retorna o valor absoluto de um decimal. Ex: fabsf(-12.5) = 12.5' },
    { type: 'valor_booleano_fixo', colour: 210, message0: '%1', args0: [{ type: 'field_dropdown', name: 'VALOR', options: [['verdadeiro (true)', 'true'], ['falso (false)', 'false']] }], output: 'Boolean', tooltip: 'Um valor fixo verdadeiro ou falso.' },
  ];

  Blockly.defineBlocksWithJsonArray(customBlocks);
}