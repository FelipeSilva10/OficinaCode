import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';
import { supabase } from '../lib/supabase';
import logoSimples from '../assets/LogoSimples.png';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import LZString from 'lz-string';
import { CompactToolbox } from '../components/CompactToolbox';

Blockly.setLocale(PtBr as any);
const cppGenerator = new Blockly.Generator('CPP');

cppGenerator.scrub_ = function (block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = opt_thisOnly ? '' : cppGenerator.blockToCode(nextBlock);
  return code + nextCode;
};

const BOARDS = {
  uno: {
    name: 'Arduino Uno',
    pins: [
      ['D2', '2'], ['D3', '3'], ['D4', '4'], ['D5', '5'], ['D6', '6'],
      ['D7', '7'], ['D8', '8'], ['D9', '9'], ['D10', '10'], ['D11', '11'],
      ['D12', '12'], ['D13 (LED)', '13'],
    ],
  },
  nano: {
    name: 'Arduino Nano',
    pins: [
      ['D2', '2'], ['D3', '3'], ['D4', '4'], ['D5', '5'], ['D6', '6'],
      ['D7', '7'], ['D8', '8'], ['D9', '9'], ['D10', '10'], ['D11', '11'],
      ['D12', '12'], ['D13 (LED)', '13'],
    ],
  },
  esp32: {
    name: 'ESP32 DevKit',
    pins: [
      ['GPIO 2 (LED)', '2'], ['GPIO 4', '4'], ['GPIO 5', '5'], ['GPIO 12', '12'],
      ['GPIO 13', '13'], ['GPIO 14', '14'], ['GPIO 15', '15'], ['GPIO 18', '18'],
      ['GPIO 19', '19'], ['GPIO 21', '21'], ['GPIO 22', '22'], ['GPIO 23', '23'],
    ],
  },
};

let currentBoardPins = BOARDS.nano.pins;

const customBlocks = [
  { type: 'bloco_setup',  message0: 'PREPARAR (Roda 1 vez) %1',    args0: [{ type: 'input_statement', name: 'DO' }], colour: 290 },
  { type: 'bloco_loop',   message0: 'AGIR (Roda para sempre) %1',  args0: [{ type: 'input_statement', name: 'DO' }], colour: 260 },
  {
    type: 'configurar_pino', message0: 'Configurar pino %1 como %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN',  options: () => currentBoardPins },
      { type: 'field_dropdown', name: 'MODE', options: [['Saída (Enviar sinal)', 'OUTPUT'], ['Entrada (Ler sensor)', 'INPUT']] },
    ],
    previousStatement: null, nextStatement: null, colour: 230,
  },
  {
    type: 'escrever_pino', message0: 'Colocar pino %1 em estado %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN',   options: () => currentBoardPins },
      { type: 'field_dropdown', name: 'STATE', options: [['Ligado (HIGH)', 'HIGH'], ['Desligado (LOW)', 'LOW']] },
    ],
    previousStatement: null, nextStatement: null, colour: 230,
  },
  {
    type: 'esperar', message0: 'Esperar %1 milissegundos',
    args0: [{ type: 'field_number', name: 'TIME', value: 1000, min: 0 }],
    previousStatement: null, nextStatement: null, colour: 120,
  },
  {
    type: 'repetir_vezes', message0: 'Repetir %1 vezes %2 %3',
    args0: [
      { type: 'field_number', name: 'TIMES', value: 5, min: 1 },
      { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' },
    ],
    previousStatement: null, nextStatement: null, colour: 120,
  },
  {
    type: 'escrever_serial', message0: 'O robô diz o texto: %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Olá, mundo!' }],
    previousStatement: null, nextStatement: null, colour: 160,
  },
  {
    type: 'ler_pino_digital', message0: 'Ler pino %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: () => currentBoardPins }],
    output: null, colour: 230,
  },
  {
    type: 'escrever_serial_valor', message0: 'O robô diz a leitura de: %1',
    args0: [{ type: 'input_value', name: 'VALOR' }],
    previousStatement: null, nextStatement: null, colour: 160,
  },
  {
    type: 'se_entao', message0: 'SE %1 ENTÃO %2 %3',
    args0: [
      { type: 'input_value', name: 'CONDICAO', check: 'Boolean' },
      { type: 'input_dummy' }, { type: 'input_statement', name: 'ENTAO' },
    ],
    previousStatement: null, nextStatement: null, colour: 210,
  },
  {
    type: 'se_entao_senao', message0: 'SE %1 ENTÃO %2 %3 SENÃO %4 %5',
    args0: [
      { type: 'input_value', name: 'CONDICAO', check: 'Boolean' },
      { type: 'input_dummy' }, { type: 'input_statement', name: 'ENTAO' },
      { type: 'input_dummy' }, { type: 'input_statement', name: 'SENAO' },
    ],
    previousStatement: null, nextStatement: null, colour: 210,
  },
  {
    type: 'comparar_valores', message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A' },
      { type: 'field_dropdown', name: 'OP', options: [['é maior que', '>'], ['é menor que', '<'], ['é igual a', '=='], ['é maior ou igual a', '>='], ['é menor ou igual a', '<='], ['é diferente de', '!=']] },
      { type: 'input_value', name: 'B' },
    ],
    inputsInline: true, output: 'Boolean', colour: 210,
  },
  { type: 'numero_fixo', message0: '%1', args0: [{ type: 'field_number', name: 'VALOR', value: 10 }], output: null, colour: 210 },
  {
    type: 'e_ou_logico', message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'Boolean' },
      { type: 'field_dropdown', name: 'OP', options: [['E (as duas condições)', '&&'], ['OU (qualquer uma)', '||']] },
      { type: 'input_value', name: 'B', check: 'Boolean' },
    ],
    inputsInline: true, output: 'Boolean', colour: 210,
  },
  {
    type: 'configurar_ultrassonico', message0: 'Configurar sensor de distância: Gatilho %1 Eco %2',
    args0: [
      { type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins },
      { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins },
    ],
    previousStatement: null, nextStatement: null, colour: 40,
  },
  {
    type: 'ler_distancia_cm', message0: 'Distância em cm (Gatilho %1 Eco %2)',
    args0: [
      { type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins },
      { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins },
    ],
    output: null, colour: 40,
  },
  {
    type: 'mostrar_distancia', message0: 'O robô diz a distância em cm (Gatilho %1 Eco %2)',
    args0: [
      { type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins },
      { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins },
    ],
    previousStatement: null, nextStatement: null, colour: 40,
  },
  {
    type: 'objeto_esta_perto', message0: 'Tem objeto a menos de %1 cm? (Gatilho %2 Eco %3)',
    args0: [
      { type: 'field_number', name: 'CM', value: 20, min: 1 },
      { type: 'field_dropdown', name: 'TRIG', options: () => currentBoardPins },
      { type: 'field_dropdown', name: 'ECHO', options: () => currentBoardPins },
    ],
    output: 'Boolean', colour: 40,
  },
];

Blockly.defineBlocksWithJsonArray(customBlocks);

// ── Geradores C++ ──────────────────────────────────────────────────────────────

cppGenerator.forBlock['bloco_setup']      = (b: Blockly.Block) => `void setup() {\n  Serial.begin(9600);\n${cppGenerator.statementToCode(b, 'DO') || '  // Suas configurações aqui...\n'}}\n\n`;
cppGenerator.forBlock['bloco_loop']       = (b: Blockly.Block) => `void loop() {\n${cppGenerator.statementToCode(b, 'DO') || '  // Suas ações aqui...\n'}}\n\n`;
cppGenerator.forBlock['configurar_pino']  = (b: Blockly.Block) => `  pinMode(${b.getFieldValue('PIN')}, ${b.getFieldValue('MODE')});\n`;
cppGenerator.forBlock['escrever_pino']    = (b: Blockly.Block) => `  digitalWrite(${b.getFieldValue('PIN')}, ${b.getFieldValue('STATE')});\n`;
cppGenerator.forBlock['esperar']          = (b: Blockly.Block) => `  delay(${b.getFieldValue('TIME')});\n`;
cppGenerator.forBlock['repetir_vezes']    = (b: Blockly.Block) => `  for (int i = 0; i < ${b.getFieldValue('TIMES')}; i++) {\n${cppGenerator.statementToCode(b, 'DO') || ''}  }\n`;
cppGenerator.forBlock['escrever_serial']  = (b: Blockly.Block) => `  Serial.println("${b.getFieldValue('TEXT')}");\n`;
cppGenerator.forBlock['ler_pino_digital'] = (b: Blockly.Block) => [`digitalRead(${b.getFieldValue('PIN')})`, 0];
cppGenerator.forBlock['escrever_serial_valor'] = (b: Blockly.Block) => `  Serial.println(${cppGenerator.valueToCode(b, 'VALOR', 99) || '0'});\n`;
cppGenerator.forBlock['se_entao']         = (b: Blockly.Block) => `  if (${cppGenerator.valueToCode(b, 'CONDICAO', 0) || 'false'}) {\n${cppGenerator.statementToCode(b, 'ENTAO') || ''}  }\n`;
cppGenerator.forBlock['se_entao_senao']   = (b: Blockly.Block) => `  if (${cppGenerator.valueToCode(b, 'CONDICAO', 0) || 'false'}) {\n${cppGenerator.statementToCode(b, 'ENTAO') || ''}  } else {\n${cppGenerator.statementToCode(b, 'SENAO') || ''}  }\n`;
cppGenerator.forBlock['comparar_valores'] = (b: Blockly.Block) => [`(${cppGenerator.valueToCode(b, 'A', 0) || '0'} ${b.getFieldValue('OP')} ${cppGenerator.valueToCode(b, 'B', 0) || '0'})`, 0];
cppGenerator.forBlock['numero_fixo']      = (b: Blockly.Block) => [b.getFieldValue('VALOR'), 0];
cppGenerator.forBlock['e_ou_logico']      = (b: Blockly.Block) => [`(${cppGenerator.valueToCode(b, 'A', 0) || 'false'} ${b.getFieldValue('OP')} ${cppGenerator.valueToCode(b, 'B', 0) || 'false'})`, 0];
cppGenerator.forBlock['configurar_ultrassonico'] = (b: Blockly.Block) => `  pinMode(${b.getFieldValue('TRIG')}, OUTPUT);\n  pinMode(${b.getFieldValue('ECHO')}, INPUT);\n`;
cppGenerator.forBlock['ler_distancia_cm'] = (b: Blockly.Block) => {
  const t = b.getFieldValue('TRIG'), e = b.getFieldValue('ECHO');
  return [`({ digitalWrite(${t},LOW); delayMicroseconds(2); digitalWrite(${t},HIGH); delayMicroseconds(10); digitalWrite(${t},LOW); (float)pulseIn(${e},HIGH,38000)*0.034/2; })`, 0];
};
cppGenerator.forBlock['mostrar_distancia'] = (b: Blockly.Block) => {
  const t = b.getFieldValue('TRIG'), e = b.getFieldValue('ECHO');
  return `  digitalWrite(${t},LOW);\n  delayMicroseconds(2);\n  digitalWrite(${t},HIGH);\n  delayMicroseconds(10);\n  digitalWrite(${t},LOW);\n  Serial.println((float)pulseIn(${e},HIGH,38000)*0.034/2);\n`;
};
cppGenerator.forBlock['objeto_esta_perto'] = (b: Blockly.Block) => {
  const cm = b.getFieldValue('CM'), t = b.getFieldValue('TRIG'), e = b.getFieldValue('ECHO');
  const m = `({ digitalWrite(${t},LOW); delayMicroseconds(2); digitalWrite(${t},HIGH); delayMicroseconds(10); digitalWrite(${t},LOW); (float)pulseIn(${e},HIGH,38000)*0.034/2; })`;
  return [`(${m} < ${cm} && ${m} > 0)`, 0];
};

// ── Toolbox ────────────────────────────────────────────────────────────────────

const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category', name: 'Entrada e Saída Digital', colour: '230',
      contents: [
        { kind: 'block', type: 'configurar_pino' },
        { kind: 'block', type: 'escrever_pino' },
        { kind: 'block', type: 'ler_pino_digital' },
      ],
    },
    {
      kind: 'category', name: 'Controle', colour: '120',
      contents: [{ kind: 'block', type: 'esperar' }, { kind: 'block', type: 'repetir_vezes' }],
    },
    {
      kind: 'category', name: 'Condições', colour: '210',
      contents: [
        { kind: 'block', type: 'se_entao' },
        { kind: 'block', type: 'se_entao_senao' },
        { kind: 'block', type: 'comparar_valores', inputs: { A: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } }, B: { block: { type: 'numero_fixo', fields: { VALOR: 10 } } } } },
        { kind: 'block', type: 'numero_fixo' },
        { kind: 'block', type: 'e_ou_logico' },
      ],
    },
    {
      kind: 'category', name: 'Sensor de Distância', colour: '40',
      contents: [
        { kind: 'block', type: 'configurar_ultrassonico' },
        { kind: 'block', type: 'ler_distancia_cm' },
        { kind: 'block', type: 'mostrar_distancia' },
        { kind: 'block', type: 'objeto_esta_perto' },
      ],
    },
    {
      kind: 'category', name: 'Comunicação', colour: '160',
      contents: [
        { kind: 'block', type: 'escrever_serial' },
        { kind: 'block', type: 'escrever_serial_valor' },
      ],
    },
  ],
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface IdeScreenProps {
  role: 'student' | 'teacher' | 'visitor';
  readOnly?: boolean;
  onBack: () => void;
  projectId?: string;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function IdeScreen({ role, readOnly = false, onBack, projectId }: IdeScreenProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspace  = useRef<Blockly.WorkspaceSvg | null>(null);

  const [board, setBoard]                       = useState<'nano' | 'esp32' | 'uno'>('uno');
  const [port, setPort]                         = useState('');
  const [availablePorts, setAvailablePorts]     = useState<string[]>([]);
  const [generatedCode, setGeneratedCode]       = useState('// O código C++ aparecerá aqui...');
  const [isSaving, setIsSaving]                 = useState(false);
  const [projectName, setProjectName]           = useState('Projeto');
  const [saveStatus, setSaveStatus]             = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage]         = useState('');
  const [isSerialOpen, setIsSerialOpen]         = useState(false);
  const [serialMessages, setSerialMessages]     = useState<string[]>([]);
  const messagesEndRef                          = useRef<HTMLDivElement>(null);
  const [isCodeVisible, setIsCodeVisible]       = useState(false);
  const [isFullscreenCode, setIsFullscreenCode] = useState(false);
  const [isUploading, setIsUploading]           = useState(false);
  const isUploadingRef                          = useRef(false);
  const [uploadSuccess, setUploadSuccess]       = useState(false);

  // Tema Blockly
  const oficinaTheme = Blockly.Theme.defineTheme('oficinaTheme', {
    name: 'oficinaTheme',
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: '#f4f7f6',
      toolboxBackgroundColour:   '#2f3542',
      toolboxForegroundColour:   '#ffffff',
      flyoutBackgroundColour:    '#3b4252',
      flyoutForegroundColour:    '#ffffff',
      flyoutOpacity:             1,
      scrollbarColour:           '#a4b0be',
      insertionMarkerColour:     '#ffffff',
      insertionMarkerOpacity:    0.3,
    },
  });

  // ── Portas seriais ───────────────────────────────────────────────────────────

  const fetchPorts = async () => {
    try {
      const ports = await invoke<string[]>('get_available_ports');
      setAvailablePorts(ports);
      if (ports.length > 0 && !ports.includes(port)) setPort(ports[0]);
    } catch (err) {
      console.error('Erro ao buscar portas:', err);
    }
  };

  useEffect(() => { currentBoardPins = BOARDS[board].pins; }, [board]);
  useEffect(() => { fetchPorts(); }, []);

  // ── Inicialização do Blockly ─────────────────────────────────────────────────

useEffect(() => {
    if (!blocklyDiv.current || workspace.current) return;

    workspace.current = Blockly.inject(blocklyDiv.current, {
      toolbox: toolboxConfig,
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      readOnly,
      move: { scrollbars: true, drag: true, wheel: true },
      theme: oficinaTheme,
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
    });

    workspace.current.addChangeListener((event) => {
      if (event.isUiEvent) return;
      try {
        setGeneratedCode(
          cppGenerator.workspaceToCode(workspace.current!) ||
          '// Arraste blocos para dentro de PREPARAR e AGIR!',
        );
      } catch (e) {
        console.error(e);
      }
    });

    const ensureRootBlocks = () => {
      if (!workspace.current) return;
      let s = workspace.current.getTopBlocks(false).find((b) => b.type === 'bloco_setup');
      if (!s) { s = workspace.current.newBlock('bloco_setup'); s.moveBy(50, 50); s.initSvg(); s.render(); }
      s.setDeletable(false);
      let l = workspace.current.getTopBlocks(false).find((b) => b.type === 'bloco_loop');
      if (!l) { l = workspace.current.newBlock('bloco_loop'); l.moveBy(450, 50); l.initSvg(); l.render(); }
      l.setDeletable(false);
    };

    if (projectId) {
      (async () => {
        const { data, error } = await supabase
          .from('projetos')
          .select('*')
          .eq('id', projectId)
          .single();

        if (data && !error) {
          setProjectName(data.nome);
          if (data.target_board) setBoard(data.target_board as 'nano' | 'esp32' | 'uno');
          try {
            if (data.workspace_data) {
              const raw =
                typeof data.workspace_data === 'string'
                  ? JSON.parse(LZString.decompress(data.workspace_data) || '{}')
                  : data.workspace_data;
              if (raw && Object.keys(raw).length > 0)
                Blockly.serialization.workspaces.load(raw, workspace.current!);
            }
          } catch (_) { /* workspace vazio, tudo bem */ }
          ensureRootBlocks();
        }
      })();
    } else {
      ensureRootBlocks();
    }

    return () => {
      if (workspace.current) {
        workspace.current.dispose();
        workspace.current = null;
      }
    };
  }, [projectId, readOnly]);

  // Redimensiona o Blockly quando o painel de código aparece/some
  useEffect(() => {
    if (workspace.current) Blockly.svgResize(workspace.current);
  }, [role, isCodeVisible, isFullscreenCode]);

  // Scroll automático no monitor serial
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serialMessages, isSerialOpen]);

  // Listener de mensagens seriais
  useEffect(() => {
    let unlisten: () => void;
    (async () => {
      unlisten = await listen<string>('serial-message', (e) => {
        setSerialMessages((prev) => {
          const next = [...prev, e.payload];
          return next.length > 20 ? next.slice(next.length - 20) : next;
        });
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  // ── Ações ────────────────────────────────────────────────────────────────────

  const handleToggleSerial = async () => {
    try {
      if (isSerialOpen) {
        await invoke('stop_serial');
        setIsSerialOpen(false);
      } else {
        setSerialMessages([]);
        await invoke('start_serial', { porta: port });
        setIsSerialOpen(true);
      }
    } catch (error) {
      alert('Erro no Monitor Serial: ' + error);
    }
  };

  const handleSaveProject = async () => {
    if (!projectId || !workspace.current) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('projetos')
      .update({
        workspace_data: LZString.compress(
          JSON.stringify(Blockly.serialization.workspaces.save(workspace.current)),
        ),
        target_board: board,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    setIsSaving(false);
    if (!error) setSaveStatus('success');
    else { setErrorMessage(error.message); setSaveStatus('error'); }
  };

  const handleUploadCode = async () => {
    if (isUploadingRef.current) return;

    if (!generatedCode.includes('void setup()') || !generatedCode.includes('void loop()')) {
      setErrorMessage(
        'As peças principais (PREPARAR e AGIR) não foram detectadas. ' +
        'Mexa em uma peça para atualizar antes de enviar!',
      );
      setSaveStatus('error');
      return;
    }

    try {
      isUploadingRef.current = true;
      setIsUploading(true);
      setSaveStatus(null);
      if (isSerialOpen) { await invoke('stop_serial'); setIsSerialOpen(false); }
      await invoke('upload_code', { codigo: generatedCode, placa: board, porta: port });
      setUploadSuccess(true);
    } catch (error) {
      setErrorMessage(String(error));
      setSaveStatus('error');
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  };

  // ── Título do projeto ────────────────────────────────────────────────────────

  const projectTitle = projectId
    ? role === 'student'
      ? `Mesa: ${projectName}`
      : readOnly
        ? `👁️ ${projectName}`
        : `📁 ${projectName}`
    : '';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">

      {/* ── TOPBAR ── */}
      <header className="topbar">

        {/* Esquerda: logo + título do projeto */}
        <div className="topbar-left">
          <img src={logoSimples} alt="Oficina Code" />
          {projectTitle && (
            <span className="topbar-title" title={projectTitle}>{projectTitle}</span>
          )}
        </div>

        {/* Centro: controles de hardware */}
        <div className="topbar-center">
          <div className="hardware-controls">

            {/* Seletor de placa */}
            <div className="control-group">
              <span className="control-icon">🖥️</span>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value as 'nano' | 'esp32' | 'uno')}
                disabled={readOnly}
                aria-label="Selecionar placa"
              >
                <option value="uno">Uno</option>
                <option value="nano">Nano</option>
                <option value="esp32">ESP32</option>
              </select>
            </div>

            <div className="control-divider" />

            {/* Seletor de porta serial */}
            <div className="control-group control-port-group">
              <span className="control-icon">🔌</span>
              <select
                value={port}
                onChange={(e) => setPort(e.target.value)}
                aria-label="Selecionar porta"
              >
                {availablePorts.length === 0
                  ? <option value="">Conecte o cabo…</option>
                  : availablePorts.map((p) => <option key={p} value={p}>{p}</option>)
                }
              </select>
              <button
                className="btn-icon"
                onClick={fetchPorts}
                title="Atualizar portas"
                aria-label="Atualizar lista de portas"
              >
                🔄
              </button>
            </div>

            <div className="control-divider port-divider" />

            {/* Botão Enviar */}
            <button
              className="btn-action btn-send"
              onClick={handleUploadCode}
              disabled={isUploading}
              style={{ opacity: isUploading ? 0.7 : 1, cursor: isUploading ? 'wait' : 'pointer' }}
              title={isUploading ? 'Compilando e enviando…' : 'Compilar e enviar para o Arduino'}
            >
              {isUploading ? '⏳' : '🚀'}
              <span className="btn-action-label"> {isUploading ? 'Compilando…' : 'Enviar'}</span>
            </button>

            {/* Botão Monitor Serial */}
            <button
              className={`btn-action ${isSerialOpen ? 'btn-chat-active' : 'btn-chat'}`}
              onClick={handleToggleSerial}
              title={isSerialOpen ? 'Fechar monitor serial' : 'Abrir monitor serial'}
            >
              {isSerialOpen ? '🛑' : '💬'}
              <span className="btn-action-label"> {isSerialOpen ? 'Parar' : 'Chat'}</span>
            </button>
          </div>
        </div>

        {/* Direita: ações contextuais */}
        <div className="topbar-right">
          {/* Ver código: professor e visitante */}
          {role !== 'student' && (
            <button
              className="btn-secondary"
              onClick={() => setIsCodeVisible(!isCodeVisible)}
              style={{ margin: 0, backgroundColor: '#34495e', boxShadow: '0 4px 0px #2c3e50' }}
              title={isCodeVisible ? 'Ocultar código C++' : 'Ver código C++ gerado'}
            >
              {isCodeVisible ? '🙈' : '💻'}
              <span className="btn-code-label"> {isCodeVisible ? 'Ocultar' : 'Código'}</span>
            </button>
          )}

          {/* Salvar: aluno ou professor no projeto próprio */}
          {(role === 'student' || (role === 'teacher' && !readOnly)) && projectId && (
            <button
              className="btn-primary"
              onClick={handleSaveProject}
              disabled={isSaving}
              style={{ margin: 0 }}
              title="Salvar projeto na nuvem"
            >
              {isSaving ? '⏳' : '💾'}
              <span className="btn-code-label"> {isSaving ? 'Salvando…' : 'Salvar'}</span>
            </button>
          )}

          <button
            className="btn-danger"
            onClick={onBack}
            style={{ margin: 0 }}
            title="Sair da IDE"
          >
            ← Sair
          </button>
        </div>
      </header>

{/* ── WORKSPACE ── */}
      <div className="workspace-area">
        
        {/* CSS para forçar a barra nativa do Blockly a sumir sem quebrar o canvas */}
        <style>{`
          .blocklyToolboxDiv {
            display: none !important;
          }
        `}</style>

        {/* Barra lateral compacta de categorias */}
        <CompactToolbox workspace={workspace.current} readOnly={readOnly} />

        {/* Canvas do Blockly */}
        <div ref={blocklyDiv} id="blocklyDiv" />

        {/* Painel de código C++ */}
        {isCodeVisible && (
          <div className={`code-panel ${isFullscreenCode ? 'fullscreen' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Código (C++)</h3>
              <button
                onClick={() => setIsFullscreenCode(!isFullscreenCode)}
                style={{
                  background: 'transparent',
                  border: '1px solid #a4b0be',
                  color: '#a4b0be',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  margin: 0,
                  boxShadow: 'none',
                }}
              >
                {isFullscreenCode ? '↙️ Reduzir' : '⛶ Tela Cheia'}
              </button>
            </div>
            <pre>{generatedCode}</pre>
          </div>
        )}
      </div>

      {/* ── MODAIS DE FEEDBACK ── */}

      {saveStatus === 'success' && (
        <Modal onClose={() => setSaveStatus(null)}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>✅</div>
          <h2 style={{ color: 'var(--dark)', marginBottom: '12px' }}>Projeto Salvo!</h2>
          <p style={{ color: '#7f8c8d', marginBottom: '24px', fontSize: '1.1rem' }}>
            As suas peças e progressos foram guardados na nuvem.
          </p>
          <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }} onClick={() => setSaveStatus(null)}>
            Continuar
          </button>
        </Modal>
      )}

      {saveStatus === 'error' && (
        <Modal onClose={() => setSaveStatus(null)}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>❌</div>
          <h2 style={{ color: 'var(--dark)', marginBottom: '12px' }}>Ocorreu um Erro</h2>
          <p style={{ color: '#7f8c8d', marginBottom: '24px', fontSize: '1rem' }}>{errorMessage}</p>
          <button className="btn-danger" style={{ width: '100%', padding: '14px' }} onClick={() => setSaveStatus(null)}>
            Tentar Novamente
          </button>
        </Modal>
      )}

      {uploadSuccess && (
        <Modal onClose={() => setUploadSuccess(false)}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🚀</div>
          <h2 style={{ color: 'var(--dark)', marginBottom: '12px' }}>Código Enviado!</h2>
          <p style={{ color: '#7f8c8d', marginBottom: '24px', fontSize: '1.1rem' }}>
            O seu robô já está a executar as novas instruções.
          </p>
          <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }} onClick={() => setUploadSuccess(false)}>
            Continuar
          </button>
        </Modal>
      )}

      {/* ── MONITOR SERIAL ── */}
      {isSerialOpen && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px',
          width: '340px', height: '380px',
          backgroundColor: '#fff', borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          zIndex: 9000, overflow: 'hidden',
          border: '2px solid #e0e6ed',
        }}>
          <div style={{
            backgroundColor: '#2c3e50', color: 'white',
            padding: '12px 15px', fontWeight: 'bold',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.95rem',
          }}>
            <span>🤖 O Robô diz…</span>
            <span
              style={{ cursor: 'pointer', opacity: 0.7, fontSize: '1.1rem' }}
              onClick={handleToggleSerial}
              role="button"
              aria-label="Fechar monitor serial"
            >
              ✕
            </span>
          </div>
          <div style={{
            flex: 1, padding: '12px', overflowY: 'auto',
            backgroundColor: '#f8fafd', display: 'flex',
            flexDirection: 'column', gap: '8px',
          }}>
            {serialMessages.length === 0
              ? (
                <p style={{ color: '#a4b0be', textAlign: 'center', marginTop: '40px', fontStyle: 'italic', fontSize: '0.95rem' }}>
                  Aguardando o robô falar…
                </p>
              )
              : serialMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#dfe6e9', padding: '8px 12px',
                    borderRadius: '14px', borderBottomLeftRadius: '2px',
                    alignSelf: 'flex-start', color: '#2d3436',
                    maxWidth: '85%', wordBreak: 'break-word',
                    fontFamily: 'monospace', fontSize: '0.9rem',
                  }}
                >
                  {msg}
                </div>
              ))
            }
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente auxiliar Modal ─────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 99999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: 'white', padding: '40px',
        borderRadius: '24px', width: '90%', maxWidth: '400px',
        textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
      }}>
        {children}
      </div>
    </div>
  );
}