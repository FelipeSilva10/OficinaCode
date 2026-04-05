import * as Blockly from 'blockly/core';

export const cppGenerator = new Blockly.Generator('CPP');

export function initGenerators() {
  cppGenerator.scrub_ = function (block, code, opt_thisOnly) {
    const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
    const nextCode = opt_thisOnly ? '' : cppGenerator.blockToCode(nextBlock);
    return code + nextCode;
  };

  // Estrutura
  cppGenerator.forBlock['bloco_setup'] = (b: Blockly.Block) => `void setup() {\n  Serial.begin(115200);\n${cppGenerator.statementToCode(b, 'DO') || '  // Suas configurações entrarão aqui...\n'}}\n\n`;
  cppGenerator.forBlock['bloco_loop'] = (b: Blockly.Block) => `void loop() {\n${cppGenerator.statementToCode(b, 'DO') || '  // Suas ações principais entrarão aqui...\n'}}\n\n`;

  // Pinos
  cppGenerator.forBlock['configurar_pino'] = (b: Blockly.Block) => `  pinMode(${b.getFieldValue('PIN')}, ${b.getFieldValue('MODE')});\n`;
  cppGenerator.forBlock['escrever_pino'] = (b: Blockly.Block) => `  digitalWrite(${b.getFieldValue('PIN')}, ${b.getFieldValue('STATE')});\n`;
  cppGenerator.forBlock['ler_pino_digital'] = (b: Blockly.Block) => [`digitalRead(${b.getFieldValue('PIN')})`, 0];
  cppGenerator.forBlock['escrever_pino_pwm'] = (b: Blockly.Block) => `  analogWrite(${b.getFieldValue('PIN')}, ${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'});\n`;
  cppGenerator.forBlock['ler_pino_analogico'] = (b: Blockly.Block) => [`analogRead(${b.getFieldValue('PIN')})`, 0];

  // Controle básico
  cppGenerator.forBlock['esperar'] = (b: Blockly.Block) => `  delay(${b.getFieldValue('TIME')});\n`;
  cppGenerator.forBlock['repetir_vezes'] = (b: Blockly.Block) => `  for (int i = 0; i < ${b.getFieldValue('TIMES')}; i++) {\n${cppGenerator.statementToCode(b, 'DO') || ''}  }\n`;

  // Condições
  cppGenerator.forBlock['se_entao'] = (b: Blockly.Block) => `  if (${cppGenerator.valueToCode(b, 'CONDICAO', 0) || 'false'}) {\n${cppGenerator.statementToCode(b, 'ENTAO') || ''}  }\n`;
  cppGenerator.forBlock['se_entao_senao'] = (b: Blockly.Block) => `  if (${cppGenerator.valueToCode(b, 'CONDICAO', 0) || 'false'}) {\n${cppGenerator.statementToCode(b, 'ENTAO') || ''}  } else {\n${cppGenerator.statementToCode(b, 'SENAO') || ''}  }\n`;
  cppGenerator.forBlock['comparar_valores'] = (b: Blockly.Block) => [`(${cppGenerator.valueToCode(b, 'A', 0) || '0'} ${b.getFieldValue('OP')} ${cppGenerator.valueToCode(b, 'B', 0) || '0'})`, 0];
  cppGenerator.forBlock['numero_fixo'] = (b: Blockly.Block) => [b.getFieldValue('VALOR'), 0];
  cppGenerator.forBlock['e_ou_logico'] = (b: Blockly.Block) => [`(${cppGenerator.valueToCode(b, 'A', 0) || 'false'} ${b.getFieldValue('OP')} ${cppGenerator.valueToCode(b, 'B', 0) || 'false'})`, 0];
  cppGenerator.forBlock['nao_logico'] = (b: Blockly.Block) => [`!(${cppGenerator.valueToCode(b, 'VALOR', 0) || 'false'})`, 0];
  cppGenerator.forBlock['mapear_valor'] = (b: Blockly.Block) => [`map(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'}, ${b.getFieldValue('DE_MIN')}, ${b.getFieldValue('DE_MAX')}, ${b.getFieldValue('PARA_MIN')}, ${b.getFieldValue('PARA_MAX')})`, 0];

  // Ultrassônico
  cppGenerator.forBlock['configurar_ultrassonico'] = (b: Blockly.Block) => `  pinMode(${b.getFieldValue('TRIG')}, OUTPUT);\n  pinMode(${b.getFieldValue('ECHO')}, INPUT);\n`;
  cppGenerator.forBlock['ler_distancia_cm'] = (b: Blockly.Block) => [`_lerDistancia(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')})`, 0];
  cppGenerator.forBlock['mostrar_distancia'] = (b: Blockly.Block) => `  Serial.println(_lerDistancia(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')}));\n`;
  cppGenerator.forBlock['objeto_esta_perto'] = (b: Blockly.Block) => [`(_lerDistancia(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')}) < ${b.getFieldValue('CM')})`, 0];
  cppGenerator.forBlock['distancia_entre'] = (b: Blockly.Block) => [`_distanciaEntre(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')}, ${b.getFieldValue('MIN')}.0f, ${b.getFieldValue('MAX')}.0f)`, 0];

  // Comunicação
  cppGenerator.forBlock['escrever_serial'] = (b: Blockly.Block) => `  Serial.println("${b.getFieldValue('TEXT')}");\n`;
  cppGenerator.forBlock['escrever_serial_valor'] = (b: Blockly.Block) => `  Serial.println(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'});\n`;

  // Controle avançado
  cppGenerator.forBlock['enquanto_verdadeiro'] = (b: Blockly.Block) => `  while (${cppGenerator.valueToCode(b, 'CONDICAO', 0) || 'false'}) {\n${cppGenerator.statementToCode(b, 'DO') || ''}  }\n`;
  cppGenerator.forBlock['parar_repeticao'] = (_b: Blockly.Block) => `  break;\n`;

  // Matemática
  cppGenerator.forBlock['operacao_matematica'] = (b: Blockly.Block) => {
    const a = cppGenerator.valueToCode(b, 'A', 99) || '0';
    const op = b.getFieldValue('OP');
    const bv = cppGenerator.valueToCode(b, 'B', 99) || '0';
    return [`(${a} ${op} ${bv})`, 0];
  };
  cppGenerator.forBlock['valor_absoluto'] = (b: Blockly.Block) => [`abs(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'})`, 0];
  cppGenerator.forBlock['constrain_valor'] = (b: Blockly.Block) => [`constrain(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'}, ${b.getFieldValue('MIN')}, ${b.getFieldValue('MAX')})`, 0];
  cppGenerator.forBlock['random_valor'] = (b: Blockly.Block) => [`random(${b.getFieldValue('MIN')}, ${b.getFieldValue('MAX')})`, 0];
  cppGenerator.forBlock['millis_atual'] = (_b: Blockly.Block) => [`millis()`, 0];

  // Variáveis
  cppGenerator.forBlock['declarar_variavel_global'] = (b: Blockly.Block) => {
    const tipo = b.getFieldValue('TIPO');
    const nome = (b.getFieldValue('NOME') || 'minha_var').replace(/\s+/g, '_');
    const valor = cppGenerator.valueToCode(b, 'VALOR', 99) || '0';
    return `${tipo} ${nome} = ${valor};\n`;
  };
  cppGenerator.forBlock['atribuir_variavel'] = (b: Blockly.Block) => {
    const nome = (b.getFieldValue('NOME') || 'minha_var').replace(/\s+/g, '_');
    const valor = cppGenerator.valueToCode(b, 'VALOR', 99) || '0';
    return `  ${nome} = ${valor};\n`;
  };
  cppGenerator.forBlock['ler_variavel'] = (b: Blockly.Block) => [(b.getFieldValue('NOME') || 'minha_var').replace(/\s+/g, '_'), 0];
  cppGenerator.forBlock['incrementar_variavel'] = (b: Blockly.Block) => {
    const nome = (b.getFieldValue('NOME') || 'contador').replace(/\s+/g, '_');
    const valor = cppGenerator.valueToCode(b, 'VALOR', 99) || '1';
    return `  ${nome} += ${valor};\n`;
  };

  // Funções
  cppGenerator.forBlock['definir_funcao'] = (b: Blockly.Block) => {
    const nome = (b.getFieldValue('NOME') || 'minhaFuncao').replace(/\s+/g, '_');
    const corpo = cppGenerator.statementToCode(b, 'DO') || '';
    return `void ${nome}() {\n${corpo}}\n\n`;
  };
  cppGenerator.forBlock['chamar_funcao'] = (b: Blockly.Block) => {
    const nome = (b.getFieldValue('NOME') || 'minhaFuncao').replace(/\s+/g, '_');
    return `  ${nome}();\n`;
  };

  // Servo
  cppGenerator.forBlock['servo_configurar'] = (b: Blockly.Block) => `  _servoObj_${b.getFieldValue('PIN')}.attach(${b.getFieldValue('PIN')});\n`;
  cppGenerator.forBlock['servo_mover'] = (b: Blockly.Block) => `  _servoObj_${b.getFieldValue('PIN')}.write(${cppGenerator.valueToCode(b, 'ANGULO', 99) || '90'});\n`;
  cppGenerator.forBlock['servo_ler'] = (b: Blockly.Block) => [`_servoObj_${b.getFieldValue('PIN')}.read()`, 0];

  // Buzzer
  cppGenerator.forBlock['buzzer_tocar'] = (b: Blockly.Block) => `  tone(${b.getFieldValue('PIN')}, ${b.getFieldValue('FREQ')});\n`;
  cppGenerator.forBlock['buzzer_tocar_tempo'] = (b: Blockly.Block) => `  tone(${b.getFieldValue('PIN')}, ${b.getFieldValue('FREQ')}, ${b.getFieldValue('DUR')});\n`;
  cppGenerator.forBlock['buzzer_parar'] = (b: Blockly.Block) => `  noTone(${b.getFieldValue('PIN')});\n`;

  // ESP-NOW / MPU / Ponte H e Outros Omidos aqui por brevidade (Mantenha igual ao original, apenas referenciando `cppGenerator`)
  // ── ESP-NOW COMUM ──────────────────────────────────────────────────────────
  cppGenerator.forBlock['espnow_iniciar_wifi'] = (_b: Blockly.Block) => `  WiFi.mode(WIFI_STA);\n  WiFi.disconnect();\n  delay(100);\n`;
  cppGenerator.forBlock['espnow_mac_serial'] = (_b: Blockly.Block) => `  Serial.print("[INFO] MAC: ");\n  Serial.println(WiFi.macAddress());\n`;

  cppGenerator.forBlock['espnow_transmissor_init'] = (_b: Blockly.Block) => `  if (esp_now_init() != ESP_OK) {\n    Serial.println("[ERRO] ESP-NOW falhou");\n    while(true) delay(1000);\n  }\n`;

  cppGenerator.forBlock['espnow_adicionar_receptor'] = (b: Blockly.Block) => {
    const mac = (b.getFieldValue('MAC') || 'AA:BB:CC:DD:EE:FF');
    const parts = mac.split(':').map((p: string) => `0x${p.toUpperCase()}`);
    return (
      `  memcpy(_espnow_peer_mac, (uint8_t[]){${parts.join(', ')}}, 6);\n` +
      `  {\n    esp_now_peer_info_t _pi = {};\n` +
      `    memcpy(_pi.peer_addr, _espnow_peer_mac, 6);\n` +
      `    _pi.channel = 0;\n    _pi.encrypt = false;\n` +
      `    esp_now_add_peer(&_pi);\n  }\n`
    );
  };

  cppGenerator.forBlock['espnow_enviar_pacote'] = (b: Blockly.Block) => {
    const pitch = cppGenerator.valueToCode(b, 'PITCH', 99) || '0.0f';
    const roll  = cppGenerator.valueToCode(b, 'ROLL',  99) || '0.0f';
    const parar = cppGenerator.valueToCode(b, 'PARAR', 0)  || 'false';
    return (
      `  {\n    _PacoteDados _pkt;\n` +
      `    _pkt.pitch = (float)(${pitch});\n` +
      `    _pkt.roll  = (float)(${roll});\n` +
      `    _pkt.parar = ${parar};\n` +
      `    esp_now_send(_espnow_peer_mac, (uint8_t*)&_pkt, sizeof(_pkt));\n  }\n`
    );
  };

  cppGenerator.forBlock['espnow_receptor_init'] = (_b: Blockly.Block) => `  if (esp_now_init() != ESP_OK) {\n    Serial.println("[ERRO] ESP-NOW falhou");\n    while(true) delay(1000);\n  }\n  esp_now_register_recv_cb(_bloquin_OnDataRecv);\n`;
  cppGenerator.forBlock['espnow_tem_dados_novos'] = (_b: Blockly.Block) => [`_espnow_dadosNovos`, 0];
  cppGenerator.forBlock['espnow_ler_pitch'] = (_b: Blockly.Block) => [`_espnow_pacote.pitch`, 0];
  cppGenerator.forBlock['espnow_ler_roll'] = (_b: Blockly.Block) => [`_espnow_pacote.roll`, 0];
  cppGenerator.forBlock['espnow_ler_flag_parar'] = (_b: Blockly.Block) => [`_espnow_pacote.parar`, 0];
  cppGenerator.forBlock['espnow_timeout_ms'] = (b: Blockly.Block) => [`(_espnow_primeiroRx && (millis() - _espnow_ultimoRx > ${b.getFieldValue('MS')}UL))`, 0];

  cppGenerator.forBlock['mpu_iniciar'] = (b: Blockly.Block) => {
    const sda = b.getFieldValue('SDA');
    const scl = b.getFieldValue('SCL');
    return (
      `  Wire.begin(${sda}, ${scl});\n` +
      `  _mpu.initialize();\n` +
      `  if (!_mpu.testConnection()) {\n` +
      `    Serial.println("[ERRO] MPU-6050 nao encontrado!");\n` +
      `  } else {\n    Serial.println("[OK] MPU-6050 pronto.");\n  }\n`
    );
  };
  cppGenerator.forBlock['mpu_ler_pitch'] = (_b: Blockly.Block) => [`_bloquin_lerPitch()`, 0];
  cppGenerator.forBlock['mpu_ler_roll'] = (_b: Blockly.Block) => [`_bloquin_lerRoll()`, 0];

  cppGenerator.forBlock['l298n_configurar'] = (b: Blockly.Block) => {
    const ena = b.getFieldValue('ENA'), in1 = b.getFieldValue('IN1'), in2 = b.getFieldValue('IN2');
    const in3 = b.getFieldValue('IN3'), in4 = b.getFieldValue('IN4'), enb = b.getFieldValue('ENB');
    return (
      `  _l298n_ENA=${ena}; _l298n_IN1=${in1}; _l298n_IN2=${in2};\n` +
      `  _l298n_IN3=${in3}; _l298n_IN4=${in4}; _l298n_ENB=${enb};\n` +
      `  pinMode(${ena},OUTPUT); digitalWrite(${ena},LOW);\n` +
      `  pinMode(${enb},OUTPUT); digitalWrite(${enb},LOW);\n` +
      `  pinMode(${in1},OUTPUT); digitalWrite(${in1},LOW);\n` +
      `  pinMode(${in2},OUTPUT); digitalWrite(${in2},LOW);\n` +
      `  pinMode(${in3},OUTPUT); digitalWrite(${in3},LOW);\n` +
      `  pinMode(${in4},OUTPUT); digitalWrite(${in4},LOW);\n`
    );
  };

  cppGenerator.forBlock['l298n_pwm_configurar'] = (b: Blockly.Block) => `  ledcAttach(${b.getFieldValue('ENA')}, 1000, 8);\n  ledcAttach(${b.getFieldValue('ENB')}, 1000, 8);\n  ledcWrite(${b.getFieldValue('ENA')}, 0);\n  ledcWrite(${b.getFieldValue('ENB')}, 0);\n`;
  cppGenerator.forBlock['l298n_motor_esquerdo'] = (b: Blockly.Block) => `  _bloquin_motorE(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'});\n`;
  cppGenerator.forBlock['l298n_motor_direito'] = (b: Blockly.Block) => `  _bloquin_motorD(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'});\n`;
  cppGenerator.forBlock['l298n_parar_motores'] = (_b: Blockly.Block) => `  _bloquin_motorE(0);\n  _bloquin_motorD(0);\n`;
  cppGenerator.forBlock['l298n_velocidade_por_pitch_roll'] = (b: Blockly.Block) => `  _bloquin_aplicarControle((float)(${cppGenerator.valueToCode(b, 'PITCH', 99) || '0.0f'}), (float)(${cppGenerator.valueToCode(b, 'ROLL', 99) || '0.0f'}), ${b.getFieldValue('ZONA_P')}.0f, ${b.getFieldValue('ZONA_R')}.0f);\n`;

  cppGenerator.forBlock['util_map_float'] = (b: Blockly.Block) => [`_bloquin_mapFloat((float)(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'}), ${b.getFieldValue('DE_MIN')}.0f, ${b.getFieldValue('DE_MAX')}.0f, ${b.getFieldValue('PARA_MIN')}.0f, ${b.getFieldValue('PARA_MAX')}.0f)`, 0];
  cppGenerator.forBlock['util_fabsf'] = (b: Blockly.Block) => [`fabsf((float)(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'}))`, 0];
  cppGenerator.forBlock['valor_booleano_fixo'] = (b: Blockly.Block) => [b.getFieldValue('VALOR'), 0];
}

export const generateCode = (ws: Blockly.WorkspaceSvg): string => {
  const topBlocks = ws.getTopBlocks(true);

  const globalVarLines: string[] = [];
  const funcDefLines: string[] = [];
  let setupCode = '';
  let loopCode = '';

  for (const block of topBlocks) {
    if (block.type === 'bloco_setup') {
      setupCode = cppGenerator.blockToCode(block) as string;
    } else if (block.type === 'bloco_loop') {
      loopCode = cppGenerator.blockToCode(block) as string;
    } else if (block.type === 'declarar_variavel_global') {
      globalVarLines.push(cppGenerator.blockToCode(block) as string);
    } else if (block.type === 'definir_funcao') {
      funcDefLines.push(cppGenerator.blockToCode(block) as string);
    }
  }

  const mainCode = [
    ...globalVarLines,
    globalVarLines.length > 0 ? '\n' : '',
    ...funcDefLines,
    setupCode || 'void setup() {\n  Serial.begin(115200);\n  // Suas configurações entrarão aqui...\n}\n\n',
    loopCode || 'void loop() {\n  // Suas ações principais entrarão aqui...\n}\n\n',
  ].filter(Boolean).join('');

  // ── Servo ─────────────────────────────────────────────────────────────────
  const needsServo = mainCode.includes('_servoObj_');
  let servoHeader = '';
  if (needsServo) {
    const pins = new Set<string>();
    const re = /_servoObj_(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(mainCode)) !== null) pins.add(m[1]);
    servoHeader =
      '#include <Servo.h>\n' +
      [...pins].map(p => `Servo _servoObj_${p};`).join('\n') +
      '\n\n';
  }

  // ── Ultrassônico ──────────────────────────────────────────────────────────
  const needsEntre   = mainCode.includes('_distanciaEntre(');
  const needsUltrass = mainCode.includes('_lerDistancia(') || needsEntre;
  let helperLer   = '';
  let helperEntre = '';
  if (needsUltrass) {
    helperLer =
      'float _lerDistancia(int trig, int echo) {\n' +
      '  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n' +
      '  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n' +
      '  digitalWrite(trig, LOW);\n' +
      '  long dur = pulseIn(echo, HIGH, 38000);\n' +
      '  return dur > 0 ? dur * 0.034f / 2.0f : 0.0f;\n}\n';
    if (needsEntre) {
      helperEntre =
        '\nbool _distanciaEntre(int trig, int echo, float minCm, float maxCm) {\n' +
        '  float d = _lerDistancia(trig, echo);\n' +
        '  return d > 0.0f && d >= minCm && d < maxCm;\n}\n';
    }
  }

  // ── ESP-NOW ───────────────────────────────────────────────────────────────
  const needsEspNowRx = mainCode.includes('_bloquin_OnDataRecv') || mainCode.includes('_espnow_dadosNovos') || mainCode.includes('_espnow_pacote');
  const needsEspNowTx = mainCode.includes('esp_now_send(');
  const needsEspNow   = needsEspNowTx || needsEspNowRx || mainCode.includes('esp_now_init()') || mainCode.includes('WiFi.mode(');

  let espNowHeader = '';
  if (needsEspNow) {
    espNowHeader =
      '#include <esp_now.h>\n' +
      '#include <WiFi.h>\n\n' +
      'typedef struct { float pitch; float roll; bool parar; } _PacoteDados;\n' +
      '_PacoteDados _espnow_pacote;\n' +
      'volatile bool _espnow_dadosNovos = false;\n' +
      'unsigned long _espnow_ultimoRx = 0;\n' +
      'bool _espnow_primeiroRx = false;\n';

    if (needsEspNowTx) {
      espNowHeader += 'uint8_t _espnow_peer_mac[6] = {0xFF,0xFF,0xFF,0xFF,0xFF,0xFF};\n';
    }

    if (needsEspNowRx) {
      espNowHeader +=
        '\nvoid _bloquin_OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {\n' +
        '  if (len != sizeof(_PacoteDados)) return;\n' +
        '  memcpy(&_espnow_pacote, data, sizeof(_PacoteDados));\n' +
        '  _espnow_dadosNovos = true;\n' +
        '  _espnow_ultimoRx = millis();\n' +
        '  _espnow_primeiroRx = true;\n' +
        '}\n';
    }
    espNowHeader += '\n';
  }

  // ── MPU-6050 ─────────────────────────────────────────────────────────────
  const needsMPU = mainCode.includes('_mpu') || mainCode.includes('_bloquin_lerPitch') || mainCode.includes('_bloquin_lerRoll');
  let mpuHeader = '';
  if (needsMPU) {
    mpuHeader =
      '#include <Wire.h>\n' +
      '#include <MPU6050.h>\n\n' +
      'MPU6050 _mpu;\n\n' +
      'float _bloquin_lerPitch() {\n' +
      '  int16_t ax, ay, az, gx, gy, gz;\n' +
      '  _mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);\n' +
      '  return atan2f((float)ay, (float)az) * 180.0f / PI;\n' +
      '}\n' +
      'float _bloquin_lerRoll() {\n' +
      '  int16_t ax, ay, az, gx, gy, gz;\n' +
      '  _mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);\n' +
      '  return atan2f((float)ax, (float)az) * 180.0f / PI;\n' +
      '}\n\n';
  }

  // ── Ponte H L298N ─────────────────────────────────────────────────────────
  const needsL298N = mainCode.includes('_bloquin_motorE') || mainCode.includes('_bloquin_motorD') || mainCode.includes('_l298n_');
  const needsAplicarControle = mainCode.includes('_bloquin_aplicarControle');
  const needsMapFloat = mainCode.includes('_bloquin_mapFloat');

  let l298nHeader = '';
  if (needsL298N) {
    l298nHeader =
      '// Pinos da Ponte H (configurados pelo bloco "Configurar Ponte H")\n' +
      'int _l298n_ENA=25, _l298n_IN1=26, _l298n_IN2=27;\n' +
      'int _l298n_IN3=14, _l298n_IN4=33, _l298n_ENB=32;\n\n';

    if (needsMapFloat || needsAplicarControle) {
      l298nHeader +=
        'float _bloquin_mapFloat(float x, float iMin, float iMax, float oMin, float oMax) {\n' +
        '  return (x - iMin) * (oMax - oMin) / (iMax - iMin) + oMin;\n' +
        '}\n\n';
    }

    l298nHeader +=
      'void _bloquin_motorE(int v) {\n' +
      '  v = constrain(v, -255, 255);\n' +
      '  digitalWrite(_l298n_IN1, v > 0 ? HIGH : LOW);\n' +
      '  digitalWrite(_l298n_IN2, v < 0 ? HIGH : LOW);\n' +
      '  ledcWrite(_l298n_ENA, abs(v));\n' +
      '}\n' +
      'void _bloquin_motorD(int v) {\n' +
      '  v = constrain(v, -255, 255);\n' +
      '  digitalWrite(_l298n_IN3, v > 0 ? HIGH : LOW);\n' +
      '  digitalWrite(_l298n_IN4, v < 0 ? HIGH : LOW);\n' +
      '  ledcWrite(_l298n_ENB, abs(v));\n' +
      '}\n\n';

    if (needsAplicarControle) {
      l298nHeader +=
        'void _bloquin_aplicarControle(float pitch, float roll, float zonaP, float zonaR) {\n' +
        '  float ap = fabsf(pitch), ar = fabsf(roll);\n' +
        '  int vb = 0;\n' +
        '  if (ap > zonaP) vb = (int)_bloquin_mapFloat(constrain(ap, zonaP, 45.0f), zonaP, 45.0f, 150, 255);\n' +
        '  int dlt = 0;\n' +
        '  if (ar > zonaR && vb > 0) dlt = (int)_bloquin_mapFloat(constrain(ar, zonaR, 35.0f), zonaR, 35.0f, 0, vb * 0.8f);\n' +
        '  int sn = (pitch >= 0) ? 1 : -1;\n' +
        '  int ve = sn * constrain((roll > zonaR ? vb + dlt : roll < -zonaR ? vb - dlt : vb), 0, 255);\n' +
        '  int vd = sn * constrain((roll > zonaR ? vb - dlt : roll < -zonaR ? vb + dlt : vb), 0, 255);\n' +
        '  _bloquin_motorE(ve);\n' +
        '  _bloquin_motorD(vd);\n' +
        '}\n\n';
    }
  } else if (needsMapFloat) {
    l298nHeader =
      'float _bloquin_mapFloat(float x, float iMin, float iMax, float oMin, float oMax) {\n' +
      '  return (x - iMin) * (oMax - oMin) / (iMax - iMin) + oMin;\n' +
      '}\n\n';
  }

  const prefix = espNowHeader + mpuHeader + l298nHeader +
                 servoHeader + helperLer + helperEntre + (needsUltrass ? '\n' : '');
  return prefix + mainCode;
};