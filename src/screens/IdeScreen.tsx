import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';
import { supabase } from '../lib/supabase';
import logoSimples from '../assets/LogoSimples.png';
import arduinoUno from '../assets/arduino_uno.jpg';
import arduinoNano from '../assets/arduino_nano.jpg';
import esp32DevkitV1 from '../assets/esp32_devkit_v1.jpg';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import LZString from 'lz-string';

// Imports estáticos apenas para os TIPOS e constantes cruciais para a UI inicial
import { BoardKey, BOARD_UNSET, BOARDS } from '../blockly/blocks';
import { BLOCK_NAMES, toolboxConfig } from '../blockly/toolbox';

interface SerialMessage {
  text: string;
  ts: number;
}

Blockly.setLocale(PtBr as any);

type FriendlyError = { emoji: string; title: string; message: string; tip: string; rawError: string };
function getFriendlyError(raw: string): FriendlyError {
  const e = raw.toLowerCase();
  const base = { rawError: raw };
  if (e.includes('falha ao baixar') || e.includes('curl') || e.includes('plano b')) return { ...base, emoji: '🌐', title: 'Problema na Internet!', message: 'Não consegui baixar as ferramentas necessárias.', tip: 'Dica: Verifique a conexão com a internet e tente novamente.' };
  if (e.includes('update-index') || e.includes('erro ao instalar core')) return { ...base, emoji: '📦', title: 'Faltam os pacotes da placa!', message: 'O computador precisa baixar informações da placa, mas a internet falhou.', tip: 'Dica: Verifique a conexão. Essa etapa só acontece uma vez!' };
  if (e.includes('esp32') || e.includes('espressif')) return { ...base, emoji: '🛠️', title: 'Erro ao configurar a placa ESP32!', message: 'Ocorreu um problema ao adicionar as configurações da placa ESP32.', tip: 'Dica: Chame o professor!' };
  if (e.includes('busy') || e.includes('acesso negado') || e.includes('permission denied')) return { ...base, emoji: '🚧', title: 'A porta USB está ocupada!', message: 'Outro programa está usando esta porta.', tip: 'Dica: Feche o Monitor clicando em "🛑 Parar" ou reconecte o cabo USB!' };
  if (e.includes('could not open port') || e.includes('não foi possível abrir') || e.includes('no such file')) return { ...base, emoji: '🔌', title: 'Cabo USB não encontrado!', message: 'O computador não conseguiu encontrar o Arduino.', tip: 'Dica: Verifique o cabo USB e clique em 🔄 para atualizar as portas!' };
  if (e.includes('erro no código') || e.includes('error:') || e.includes('syntax error')) return { ...base, emoji: '🧩', title: 'Hmm… algo está errado nas peças!', message: 'O código gerado pelos blocos tem um probleminha.', tip: 'Dica: Tente remover a última peça que você colocou e montar de novo.' };
  if (e.includes('avrdude') || e.includes('not in sync')) return { ...base, emoji: '😵', title: 'Não consegui falar com o Arduino!', message: 'A placa não respondeu.', tip: 'Dica: Verifique se você escolheu a placa certa!' };
  if (e.includes('timeout') || e.includes('timed out')) return { ...base, emoji: '⏰', title: 'Demorou demais…', message: 'O Arduino não respondeu a tempo.', tip: 'Dica: Desconecte e reconecte o cabo USB e tente novamente!' };
  return { ...base, emoji: '😕', title: 'Algo deu errado por aqui...', message: 'Ocorreu um erro inesperado.', tip: 'Dica: Tente de novo. Se continuar, chame o professor!' };
}

type UploadStage = 'validating' | 'compiling' | 'sending' | 'success';
const UPLOAD_STAGES: { id: UploadStage; label: string; emoji: string; tip: string }[] = [
  { id: 'validating', label: 'Verificando as peças…',  emoji: '🔍', tip: 'Checando se tudo está no lugar certo!' },
  { id: 'compiling',  label: 'Compilando o código…',   emoji: '⚙️', tip: 'Transformando os blocos em linguagem de robô!' },
  { id: 'sending',    label: 'Enviando para o robô…',  emoji: '📡', tip: 'O código está viajando pelo cabo USB agora!' },
  { id: 'success',    label: 'Robô pronto para agir!', emoji: '🤖', tip: 'Seu robô já está executando as instruções!' },
];

interface BoardSelectionModalProps { onSelect: (board: BoardKey) => void; }
function BoardSelectionModal({ onSelect }: BoardSelectionModalProps) {
  const [hovered, setHovered] = useState<BoardKey | null>(null);
  const boards: { key: BoardKey; title: string; color: string; img: string }[] = [
    { key: 'uno',   title: 'Arduino Uno',  color: '#0984e3', img: arduinoUno },
    { key: 'nano',  title: 'Arduino Nano', color: '#ff00d0', img: arduinoNano },
    { key: 'esp32', title: 'ESP32 DevKit', color: '#e17055', img: esp32DevkitV1 },
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 999999 }}>
      <div style={{ background: '#fff', borderRadius: 32, padding: '44px 40px 36px', maxWidth: 680, width: '95%', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', borderTop: '6px solid #00a8ff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, textAlign: 'center' }}>
        <div>
          <h2 style={{ color: '#2f3542', fontSize: '1.7rem', fontWeight: 900, marginBottom: 8 }}>Qual placa vamos usar?</h2>
          <p style={{ color: '#7f8c8d', fontSize: '1rem', fontWeight: 700, lineHeight: 1.5 }}>
            Escolha antes de começar. Os pinos disponíveis vão mudar dependendo da placa.
            <br /><strong style={{ color: '#e17055' }}>Essa escolha não pode ser alterada depois de salvar.</strong>
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 16, width: '100%', justifyContent: 'center' }}>
          {boards.map(({ key, title, color, img }) => (
            <button key={key} onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)} onClick={() => onSelect(key)}
              style={{ background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '18px 16px 14px', borderRadius: 20, cursor: 'pointer', boxShadow: hovered === key ? `0 8px 24px ${color}44` : '0 2px 8px rgba(0,0,0,0.06)', transform: hovered === key ? 'translateY(-4px) scale(1.03)' : 'none', transition: 'all 0.18s ease', flex: 1, minWidth: 0, outline: 'none' }}>
              <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.25s ease', transform: hovered === key ? 'scale(1.06)' : 'scale(1)' }} />
              </div>
              <span style={{ color: hovered === key ? color : '#2f3542', fontWeight: 900, fontSize: '1rem', transition: 'color 0.18s ease', lineHeight: 1.2 }}>{title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BoardBadge({ boardKey }: { boardKey: BoardKey }) {
  const colorMap: Record<BoardKey, string> = { uno: '#0984e3', nano: '#ff00d0', esp32: '#e17055' };
  const color = colorMap[boardKey];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${color}15`, border: `2px solid ${color}55`, borderRadius: 100, padding: '4px 14px 4px 10px', fontWeight: 900, fontSize: '0.9rem', color, userSelect: 'none' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      {BOARDS[boardKey].name}
    </div>
  );
}

interface IdeScreenProps { role: 'student' | 'teacher' | 'visitor'; readOnly?: boolean; onBack: () => void; projectId?: string; }
type BoardLoadState = 'resolving' | 'selecting' | 'ready' | 'error';
const TOP_LEVEL_BLOCK_TYPES = new Set(['bloco_setup', 'bloco_loop', 'declarar_variavel_global', 'definir_funcao']);

export function IdeScreen({ role, readOnly = false, onBack, projectId }: IdeScreenProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspace  = useRef<Blockly.WorkspaceSvg | null>(null);
  const codeGeneratorRef = useRef<any>(null); // Guardará a função generateCode lazy-loaded

  const [board, setBoard]                   = useState<BoardKey | null>(null);
  const [boardLoadState, setBoardLoadState] = useState<BoardLoadState>(projectId ? 'resolving' : 'selecting');
  const pendingWorkspaceData = useRef<unknown>(null);
  const [port, setPort]                     = useState('');
  const [availablePorts, setAvailablePorts]     = useState<string[]>([]);
  const [generatedCode, setGeneratedCode]       = useState('// O código C++ aparecerá aqui...');
  const [isSaving, setIsSaving]                 = useState(false);
  const [projectName, setProjectName]           = useState('Projeto');
  const [saveStatus, setSaveStatus]             = useState<'success' | 'error' | null>(null);
  const [isSerialOpen, setIsSerialOpen]         = useState(false);
  const [serialMessages, setSerialMessages]     = useState<SerialMessage[]>([]);
  const [isDirty, setIsDirty]                   = useState(false);
  const [showExitConfirm, setShowExitConfirm]   = useState(false);
  const trackChanges                            = useRef(false); 
  const messagesEndRef                          = useRef<HTMLDivElement>(null);
  const [isCodeVisible, setIsCodeVisible]       = useState(false);
  const [isFullscreenCode, setIsFullscreenCode] = useState(false);
  const [uploadStage, setUploadStage]           = useState<UploadStage | null>(null);
  const [friendlyError, setFriendlyError]       = useState<FriendlyError | null>(null);
  const [showTechDetails, setShowTechDetails]   = useState(false);
  const [orphanWarning, setOrphanWarning]       = useState<string[]>([]);
  const isUploadingRef                          = useRef(false);

  const bloquinTheme = Blockly.Theme.defineTheme('bloquinTheme', {
    name: 'bloquinTheme', base: Blockly.Themes.Classic,
    blockStyles: { colour_blocks: { colourPrimary: '#ef9f4b', colourSecondary: '#d4891f', colourTertiary: '#b87219' }, list_blocks: { colourPrimary: '#4cd137', colourSecondary: '#3bac29', colourTertiary: '#2e8a1f' }, logic_blocks: { colourPrimary: '#6c5ce7', colourSecondary: '#5a4ed4', colourTertiary: '#473dbf' }, loop_blocks: { colourPrimary: '#00b894', colourSecondary: '#00a381', colourTertiary: '#008068' }, math_blocks: { colourPrimary: '#0984e3', colourSecondary: '#0773c9', colourTertiary: '#0562af' }, procedure_blocks: { colourPrimary: '#fd79a8', colourSecondary: '#e46d96', colourTertiary: '#cc6284' }, text_blocks: { colourPrimary: '#fdcb6e', colourSecondary: '#e4b55b', colourTertiary: '#cb9e48' }, variable_blocks: { colourPrimary: '#e17055', colourSecondary: '#c85f42', colourTertiary: '#b04e30' }, variable_dynamic_blocks: { colourPrimary: '#e17055', colourSecondary: '#c85f42', colourTertiary: '#b04e30' }, hat_blocks: { colourPrimary: '#a29bfe', colourSecondary: '#9085e3', colourTertiary: '#7e71c8' } },
    componentStyles: { workspaceBackgroundColour: '#eef2f7', toolboxBackgroundColour: '#1a2035', toolboxForegroundColour: '#ffffff', flyoutBackgroundColour: '#242c42', flyoutForegroundColour: '#ffffff', flyoutOpacity: 0.98, scrollbarColour: '#00a8ff', scrollbarOpacity: 0.5, insertionMarkerColour: '#00a8ff', insertionMarkerOpacity: 0.6, markerColour: '#ffffff', cursorColour: '#d0d0d0' },
  });

  const fetchPorts = async () => {
    try {
      const ports = await invoke<string[]>('get_available_ports');
      setAvailablePorts(ports);
      if (ports.length > 0 && !ports.includes(port)) setPort(ports[0]);
    } catch (err) { console.error('Erro ao buscar portas:', err); }
  };

  const getOrphanedBlocks = (): string[] => {
    if (!workspace.current) return [];
    return workspace.current.getTopBlocks(false)
      .filter(b => !TOP_LEVEL_BLOCK_TYPES.has(b.type))
      .map(b => BLOCK_NAMES[b.type] ?? b.type);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Função auxiliar para inicializar as dependências lazily importadas
  const initializeBlocklyModules = async () => {
    const { initBlocks } = await import('../blockly/blocks');
    const { initGenerators, generateCode } = await import('../blockly/generators');
    initBlocks();
    initGenerators();
    codeGeneratorRef.current = generateCode;
  };

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.from('projetos').select('nome, target_board, workspace_data').eq('id', projectId).single();
      if (cancelled) return;
      if (error || !data) { setBoardLoadState('selecting'); return; }

      setProjectName(data.nome);
      pendingWorkspaceData.current = data.workspace_data ?? null;

      const raw = data.target_board as string | null | undefined;
      if (!raw || raw === BOARD_UNSET) { setBoardLoadState('selecting'); return; }

      if (raw in BOARDS) {
        const key = raw as BoardKey;
        const { syncBoardPins } = await import('../blockly/blocks'); // Importa e aplica os pinos
        syncBoardPins(key);
        setBoard(key);
        await initializeBlocklyModules(); // Garante que tudo esteja pronto antes de ir para 'ready'
        setBoardLoadState('ready');
      } else {
        setBoardLoadState('error');
        setFriendlyError({
          emoji: '⚠️', title: 'Placa desconhecida no projeto!', message: `O projeto foi salvo com a placa "${raw}", que não é reconhecida.`, tip: 'Contate o suporte ou o professor. O projeto não foi carregado.', rawError: `target_board="${raw}" não existe em BOARDS.`,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  const handleBoardSelected = async (selected: BoardKey) => {
    const { syncBoardPins } = await import('../blockly/blocks');
    syncBoardPins(selected);
    setBoard(selected);

    if (projectId) {
      await supabase.from('projetos').update({ target_board: selected }).eq('id', projectId);
    }
    
    await initializeBlocklyModules();
    setBoardLoadState('ready');
  };

  useEffect(() => { fetchPorts(); }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await listen<string>('upload-result', (event) => {
        if (event.payload === 'ok') { setUploadStage('success'); }
        else if (event.payload.startsWith('err:')) { setUploadStage(null); setFriendlyError(getFriendlyError(event.payload.slice(4))); }
        isUploadingRef.current = false;
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    if (boardLoadState !== 'ready' || !blocklyDiv.current || workspace.current) return;

    workspace.current = Blockly.inject(blocklyDiv.current, {
      toolbox: toolboxConfig,
      grid: { spacing: 24, length: 4, colour: '#d8e0ec', snap: true },
      readOnly,
      move: { scrollbars: true, drag: true, wheel: true },
      theme: bloquinTheme,
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      trashcan: true,
      sounds: false,
    });

    workspace.current.addChangeListener((event) => {
      if (event.isUiEvent) return;
      if (trackChanges.current) { setIsDirty(true); }
      try { 
        if(codeGeneratorRef.current) {
          setGeneratedCode(codeGeneratorRef.current(workspace.current!) || '// Arraste blocos para dentro de PREPARAR e AGIR!'); 
        }
      } catch (e) { console.error('Erro ao gerar código:', e); }
    });

    const ensureRootBlocks = () => {
      if (!workspace.current) return;
      let s = workspace.current.getTopBlocks(false).find(b => b.type === 'bloco_setup');
      if (!s) { s = workspace.current.newBlock('bloco_setup'); s.moveBy(50, 50); s.initSvg(); s.render(); }
      s.setDeletable(false);
      let l = workspace.current.getTopBlocks(false).find(b => b.type === 'bloco_loop');
      if (!l) { l = workspace.current.newBlock('bloco_loop'); l.moveBy(450, 50); l.initSvg(); l.render(); }
      l.setDeletable(false);
    };

    const savedData = pendingWorkspaceData.current;
    if (savedData) {
      try {
        const raw = typeof savedData === 'string' ? JSON.parse(LZString.decompressFromBase64(savedData) || '{}') : savedData;
        if (raw && Object.keys(raw).length > 0) Blockly.serialization.workspaces.load(raw, workspace.current);
      } catch (_) { /* workspace corrompido — começa vazio */ }
    }

    ensureRootBlocks();
    const trackTimer = setTimeout(() => { trackChanges.current = true; }, 300);
    
    return () => {
      clearTimeout(trackTimer);
      trackChanges.current = false;
      if (workspace.current) { workspace.current.dispose(); workspace.current = null; }
    };
  }, [boardLoadState]); // Corrigido a dependência para não reinstanciar à toa

  useEffect(() => { if (workspace.current) Blockly.svgResize(workspace.current); }, [role, isCodeVisible, isFullscreenCode, boardLoadState]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [serialMessages, isSerialOpen]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await listen<string>('serial-message', (e) => {
        const msg: SerialMessage = { text: e.payload, ts: Date.now() };
        setSerialMessages(prev => {
          const next = [...prev, msg];
          return next.length > 50 ? next.slice(next.length - 50) : next;
        });
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleToggleSerial = async () => {
    try {
      if (isSerialOpen) { await invoke('stop_serial'); setIsSerialOpen(false); }
      else { setSerialMessages([]); await invoke('start_serial', { porta: port }); setIsSerialOpen(true); }
    } catch (error) { setFriendlyError(getFriendlyError(String(error))); }
  };

  const handleSaveProject = async () => {
    if (!projectId || !workspace.current || !board) return;
    setIsSaving(true);
    const { error } = await supabase.from('projetos').update({
      workspace_data: LZString.compressToBase64(JSON.stringify(Blockly.serialization.workspaces.save(workspace.current))),
      target_board: board,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId);
    setIsSaving(false);
    if (!error) { setSaveStatus('success'); setIsDirty(false); }
    else { setFriendlyError({ emoji: '☁️', title: 'Não consegui salvar!', message: error.message, tip: 'Verifique sua conexão com a internet e tente de novo.', rawError: error.message }); }
  };

  const handleUploadCode = async (ignoreOrphans = false) => {
    if (isUploadingRef.current || !board) return;
    if (!ignoreOrphans) { const orphans = getOrphanedBlocks(); if (orphans.length > 0) { setOrphanWarning(orphans); return; } }
    if (!generatedCode.includes('void setup()') || !generatedCode.includes('void loop()')) {
      setFriendlyError({ emoji: '🧩', title: 'Faltam peças importantes!', message: 'Os blocos PREPARAR e AGIR são obrigatórios para o robô funcionar.', tip: 'Dica: Mexa em uma peça e tente de novo para atualizar o código!', rawError: 'Missing setup() or loop().' }); return;
    }
    if (isSerialOpen) { await invoke('stop_serial').catch(() => {}); setIsSerialOpen(false); }
    isUploadingRef.current = true;
    setUploadStage('validating');
    await delay(700);
    if (!isUploadingRef.current) return;
    setUploadStage('compiling');
    invoke('upload_code', { codigo: generatedCode, placa: board, porta: port })
      .catch((e) => { setUploadStage(null); setFriendlyError(getFriendlyError(String(e))); isUploadingRef.current = false; });
    await delay(2500);
    if (!isUploadingRef.current) return;
    setUploadStage('sending');
  };

  const handleAttemptBack = () => {
    if (readOnly || !projectId) { onBack(); return; }
    if (isDirty) { setShowExitConfirm(true); } else { onBack(); }
  };

  const handleCloseError = () => { setFriendlyError(null); setShowTechDetails(false); };

  const projectTitle = projectId ? readOnly ? `Inspecionando: ${projectName}` : `Meu Projeto: ${projectName}` : '';
  const stageIndex = uploadStage ? UPLOAD_STAGES.findIndex(s => s.id === uploadStage) : -1;
  const currentStageData = uploadStage ? UPLOAD_STAGES.find(s => s.id === uploadStage) : null;

  return (
    <div className="app-container">

      {boardLoadState === 'selecting' && <BoardSelectionModal onSelect={handleBoardSelected} />}

      {boardLoadState === 'resolving' && (
        <div className="modal-overlay" style={{ zIndex: 999998 }}>
          <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, opacity: 0.85 }}>Carregando projeto…</div>
        </div>
      )}

      {readOnly && (
        <div className="readonly-banner">
          <span>Modo Visualização</span>
          <span>Você está vendo o projeto de um aluno. Edição desativada.</span>
        </div>
      )}

      {/* TOPBAR */}
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 'fit-content' }}>
          <img src={logoSimples} alt="bloquin" style={{ height: '34px' }} />
          {projectTitle && (
            <div className="project-title-badge">
              {readOnly && <span className="read-only-dot" />}
              <span>{projectTitle}</span>
            </div>
          )}
        </div>

        <div className="hardware-controls" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {boardLoadState === 'ready' && board && <BoardBadge boardKey={board} />}
          <div className="control-divider" />
          <div className="control-group">
            <select value={port} onChange={(e) => setPort(e.target.value)}>
              {availablePorts.length === 0 ? <option value="">Selecione uma placa</option> : availablePorts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={fetchPorts} className="btn-icon" title="Atualizar porta"> ↻ </button>
          </div>
          <div className="control-divider" />
          {!readOnly && (
            <>
              <button onClick={() => handleUploadCode()} className="btn-action btn-send" disabled={isUploadingRef.current || boardLoadState !== 'ready'}>Enviar</button>
              <button className={`btn-action ${isSerialOpen ? 'btn-chat-active' : 'btn-chat'}`} onClick={handleToggleSerial}>{isSerialOpen ? '🛑 Parar' : 'Chat'}</button>
            </>
          )}
          {readOnly && (
            <button className={`btn-action ${isSerialOpen ? 'btn-chat-active' : 'btn-chat'}`} onClick={handleToggleSerial}>{isSerialOpen ? '🛑 Parar' : '💬 Monitorar'}</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {role !== 'student' && <button className="btn-secondary topbar-btn" onClick={() => setIsCodeVisible(!isCodeVisible)}>{isCodeVisible ? '🙈 Ocultar Código' : 'Ver Código'}</button>}
          {(role === 'student' || (role === 'teacher' && !readOnly)) && projectId && <button className="btn-primary topbar-btn" onClick={handleSaveProject} disabled={isSaving}>{isSaving ? '⏳ Salvando…' : '💾 Salvar'}</button>}
            <button
              className={`${isDirty && !readOnly && projectId ? 'btn-danger' : 'btn-secondary'} topbar-btn`}
              onClick={handleAttemptBack}
            >
              {isDirty && !readOnly && projectId ? '⚠ Sair' : 'Sair'}
            </button>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="workspace-area">
        <div ref={blocklyDiv} id="blocklyDiv" />
        {isCodeVisible && (
          <div className={`code-panel ${isFullscreenCode ? 'fullscreen' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--secondary)' }}>Código C++</h3>
              <button onClick={() => setIsFullscreenCode(!isFullscreenCode)} style={{ background: 'transparent', border: '1px solid #485460', color: '#a4b0be', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', margin: 0, boxShadow: 'none' }}>{isFullscreenCode ? '↙️ Reduzir' : '⛶ Tela Cheia'}</button>
            </div>
            <pre>{generatedCode}</pre>
          </div>
        )}
      </div>

      {/* MODAL: UPLOAD */}
      {uploadStage && (
        <div className="modal-overlay"><div className="upload-modal">
          {uploadStage === 'success' ? (
            <div className="upload-success-content">
              <div className="success-robot">🤖</div>
              <h2>Robô pronto!</h2>
              <p>O seu robô já está executando as novas instruções. Ele aprendeu tudo que você ensinou!</p>
              <button className="btn-primary upload-close-btn" onClick={() => setUploadStage(null)}>🎉 Continuar programando!</button>
            </div>
          ) : (
            <>
              <div className="upload-rocket-wrap"><span>{currentStageData?.emoji}</span></div>
              <h2 className="upload-stage-label">{currentStageData?.label}</h2>
              <p className="upload-stage-tip">{currentStageData?.tip}</p>
              <div className="upload-progress-bar-track"><div className="upload-progress-bar-fill" style={{ width: `${((stageIndex + 1) / (UPLOAD_STAGES.length - 1)) * 100}%` }} /></div>
              <div className="upload-steps">
                {UPLOAD_STAGES.filter(s => s.id !== 'success').map((s, i) => (
                  <div key={s.id} className={`upload-step ${i <= stageIndex ? 'active' : ''} ${i === stageIndex ? 'current' : ''}`}>
                    <div className="upload-step-dot" />
                    <span className="upload-step-label">{s.label.replace('…', '').replace(' o código', '').replace(' as peças', '').replace(' para o robô', '')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div></div>
      )}

      {/* MODAL: BLOCOS ÓRFÃOS */}
      {orphanWarning.length > 0 && (
        <div className="modal-overlay"><div className="orphan-modal">
          <div className="orphan-icon">🧩</div>
          <h2>Tem peças soltas!</h2>
          <p>As peças abaixo estão flutuando no espaço. Para o robô executar, <strong>todas as peças precisam estar dentro de PREPARAR ou AGIR</strong> (ou dentro de uma Função).</p>
          <div className="orphan-blocks-list">{[...new Set(orphanWarning)].map((name, i) => <div key={i} className="orphan-block-chip"><span>🔷</span> {name}</div>)}</div>
          <div className="orphan-diagram">
            <div className="orphan-diagram-bad"><span>❌</span><div className="mini-block floating">Peça Solta</div></div>
            <div className="orphan-diagram-arrow">→</div>
            <div className="orphan-diagram-good"><span>✅</span><div className="mini-block-container"><div className="mini-block header">PREPARAR / AGIR</div><div className="mini-block child">Peça encaixada</div></div></div>
          </div>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={() => setOrphanWarning([])}>Vou corrigir</button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setOrphanWarning([]); handleUploadCode(true); }}>Enviar assim mesmo</button>
          </div>
        </div></div>
      )}

      {/* MODAL: ERRO */}
      {friendlyError && (
        <div className="modal-overlay"><div className="friendly-error-modal">
          <div className="friendly-error-icon">{friendlyError.emoji}</div>
          <h2>{friendlyError.title}</h2>
          <p className="friendly-error-message">{friendlyError.message}</p>
          <div className="friendly-error-tip"><span>💡</span><span>{friendlyError.tip}</span></div>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleCloseError}>Entendi, vou tentar!</button>
          </div>
          <div style={{ width: '100%', marginTop: '15px' }}>
            <button style={{ fontSize: '0.8rem', padding: '5px 10px', border: 'none', background: 'transparent', textDecoration: 'underline', color: '#636e72', cursor: 'pointer', margin: '0 auto', display: 'block', boxShadow: 'none' }} onClick={() => setShowTechDetails(!showTechDetails)}>{showTechDetails ? 'Ocultar detalhes técnicos' : '🛠️ Ver detalhes técnicos (Professor)'}</button>
            {showTechDetails && <pre style={{ textAlign: 'left', backgroundColor: '#2d3436', color: '#ff7675', padding: '10px', borderRadius: '5px', fontSize: '0.75rem', marginTop: '10px', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>{friendlyError.rawError}</pre>}
          </div>
        </div></div>
      )}

      {/* MODAL: SALVO */}
      {saveStatus === 'success' && (
        <div className="modal-overlay"><div className="save-success-modal">
          <div className="save-success-icon">☁️</div>
          <h2>Projeto Salvo!</h2>
          <p>Suas peças e progressos foram guardados com segurança na nuvem. Continue programando!</p>
          <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }} onClick={() => setSaveStatus(null)}>Continuar</button>
        </div></div>
      )}

      {/* MONITOR SERIAL */}
      {isSerialOpen && (
        <div className="serial-monitor">
          <div className="serial-monitor-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div className="serial-status-dot" /><span>Robô conectado</span></div>
            <button className="serial-close-btn" onClick={handleToggleSerial}>✕</button>
          </div>
          <div className="serial-monitor-body">
            {serialMessages.length === 0 ? (
              <div className="serial-empty"><span>📡</span><p>Aguardando o robô falar…</p><small>As mensagens do robô aparecerão aqui!</small></div>
            ) : (
              serialMessages.map((msg, idx) => (
                <div key={idx} className="serial-message">
                  <span className="serial-timestamp">
                    {new Date(msg.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="serial-text">{msg.text}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="serial-monitor-footer">
            <button className="serial-clear-btn" onClick={() => setSerialMessages([])}>Limpar</button>
            <span>{serialMessages.length} mensagens</span>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="modal-overlay">
          <div className="friendly-error-modal" style={{ borderTopColor: 'var(--warning)' }}>
            <div className="friendly-error-icon">⚠️</div>
            <h2>Mudanças não salvas!</h2>
            <p className="friendly-error-message">
              Você tem alterações que ainda não foram salvas. Se sair agora, seu progresso será perdido.
            </p>
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowExitConfirm(false)}>Continuar editando</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={async () => { setShowExitConfirm(false); await handleSaveProject(); onBack(); }}>💾 Salvar e Sair</button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={() => { setShowExitConfirm(false); onBack(); }}>Sair sem salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}