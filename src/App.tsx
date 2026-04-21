import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { listen }  from '@tauri-apps/api/event';
import { invoke }  from '@tauri-apps/api/core';
import { LoginScreen }      from './screens/LoginScreen';
import { IdeScreen }        from './screens/IdeScreen';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { StudentDashboard } from './screens/StudentDashboard';
import './App.css';

export type UserRole = 'guest' | 'student' | 'teacher' | 'visitor';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos do setup
// ─────────────────────────────────────────────────────────────────────────────
type SetupStep = 'starting' | 'cli' | 'core' | 'done' | 'error';

interface SetupState {
  step:    SetupStep;
  message: string;
  percent: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tela de setup — bloqueia o app até tudo estar pronto
// ─────────────────────────────────────────────────────────────────────────────
function SetupGate({ children }: { children: React.ReactNode }) {
  const [setup, setSetup] = useState<SetupState>({
    step:    'starting',
    message: 'Iniciando o Bloquin...',
    percent: 0,
  });

  useEffect(() => {
    // Escuta os eventos emitidos pelo Rust
    const unlistenPromise = listen<SetupState>('setup-progress', (event) => {
      setSetup(event.payload);
    });

    // Dispara o setup no backend
    invoke('run_setup').catch((err) => {
      setSetup({
        step:    'error',
        message: `Erro inesperado ao iniciar: ${err}`,
        percent: 0,
      });
    });

    return () => { unlistenPromise.then(fn => fn()); };
  }, []);

  // Setup concluído — mostra o app normalmente
  if (setup.step === 'done') return <>{children}</>;

  // ── Tela de loading / erro ──────────────────────────────────────────────
  const isError = setup.step === 'error';

  const handleRetry = () => {
    setSetup({ step: 'starting', message: 'Tentando novamente...', percent: 0 });
    invoke('run_setup').catch((err) => {
      setSetup({ step: 'error', message: `Erro: ${err}`, percent: 0 });
    });
  };

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100vh',
      width:          '100vw',
      background:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily:     "'Nunito', 'Segoe UI', sans-serif",
      color:          '#ffffff',
      padding:        '32px',
      boxSizing:      'border-box',
    }}>

      {/* Card central */}
      <div style={{
        background:     'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(12px)',
        borderRadius:   '24px',
        padding:        '48px 40px',
        maxWidth:       '420px',
        width:          '100%',
        textAlign:      'center',
        boxShadow:      '0 20px 60px rgba(0,0,0,0.3)',
        border:         '1px solid rgba(255,255,255,0.2)',
      }}>

        {/* Ícone */}
        <div style={{ fontSize: '56px', marginBottom: '16px', lineHeight: 1 }}>
          {isError ? '⚠️' : setup.percent >= 70 ? '⚙️' : '🔧'}
        </div>

        {/* Título */}
        <h2 style={{
          fontSize:      '1.6rem',
          fontWeight:    900,
          margin:        '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          {isError ? 'Algo deu errado...' : 'Preparando o Bloquin'}
        </h2>

        {/* Subtítulo informativo (só quando não é erro) */}
        {!isError && (
          <p style={{ fontSize: '0.9rem', opacity: 0.75, margin: '0 0 28px' }}>
            Isso só acontece na primeira vez. Pode demorar alguns minutos.
          </p>
        )}

        {/* Barra de progresso */}
        {!isError && (
          <div style={{
            background:   'rgba(255,255,255,0.2)',
            borderRadius: '100px',
            height:       '10px',
            overflow:     'hidden',
            margin:       '0 0 20px',
          }}>
            <div style={{
              height:     '100%',
              borderRadius: '100px',
              background:   'linear-gradient(90deg, #ffffff, #a8edea)',
              width:        `${setup.percent}%`,
              transition:   'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        )}

        {/* Mensagem atual */}
        <p style={{
          fontSize:   '0.95rem',
          fontWeight: isError ? 700 : 600,
          lineHeight: 1.6,
          opacity:    isError ? 1 : 0.9,
          margin:     '0',
          whiteSpace: 'pre-line',
          color:      isError ? '#ffd6d6' : '#ffffff',
        }}>
          {setup.message}
        </p>

        {/* Percentual */}
        {!isError && (
          <p style={{ fontSize: '0.8rem', opacity: 0.55, margin: '12px 0 0' }}>
            {setup.percent}% concluído
          </p>
        )}

        {/* Botão de retry em caso de erro */}
        {isError && (
          <button
            onClick={handleRetry}
            style={{
              marginTop:    '24px',
              padding:      '12px 28px',
              background:   'rgba(255,255,255,0.2)',
              border:       '2px solid rgba(255,255,255,0.5)',
              borderRadius: '12px',
              color:        '#ffffff',
              fontSize:     '0.95rem',
              fontWeight:   800,
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
          >
            ↺ Tentar novamente
          </button>
        )}
      </div>

      {/* Aviso de não fechar */}
      {!isError && (
        <p style={{ fontSize: '0.75rem', opacity: 0.45, marginTop: '24px' }}>
          Não feche o aplicativo durante este processo
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotas do app (sem mudanças na lógica original)
// ─────────────────────────────────────────────────────────────────────────────
function AppRoutes() {
  const [role, setRole] = useState<UserRole>('guest');
  const navigate = useNavigate();

  const handleLogin = (loggedRole: 'student' | 'teacher' | 'visitor') => {
    setRole(loggedRole);
    if (loggedRole === 'visitor') navigate('/ide');
    else navigate('/dashboard');
  };

  const handleLogout = () => {
    setRole('guest');
    navigate('/');
  };

  const handleBackToDashboard = () => {
    if (role === 'visitor') { setRole('guest'); navigate('/'); }
    else navigate('/dashboard');
  };

  const openIde = (projectId: string | undefined, viewOnly: boolean) => {
    const path = projectId ? `/ide/${projectId}` : '/ide';
    navigate(path, { state: { readOnly: viewOnly } });
  };

  return (
    <Routes>
      <Route path="/" element={
        role === 'guest'
          ? <LoginScreen onLogin={handleLogin} />
          : <Navigate to={role === 'visitor' ? '/ide' : '/dashboard'} replace />
      } />

      <Route path="/dashboard" element={
        role === 'teacher' ? (
          <TeacherDashboard
            onLogout={handleLogout}
            onOpenOwnProject={(id) => openIde(id, false)}
            onInspectStudentProject={(id) => openIde(id, true)}
          />
        ) : role === 'student' ? (
          <StudentDashboard
            onLogout={handleLogout}
            onOpenIde={(id) => openIde(id, false)}
          />
        ) : (
          <Navigate to="/" replace />
        )
      } />

      <Route path="/ide/:projectId?" element={
        role !== 'guest'
          ? <IdeScreenWrapper role={role} onBack={handleBackToDashboard} />
          : <Navigate to="/" replace />
      } />
    </Routes>
  );
}

function IdeScreenWrapper({ role, onBack }: { role: Exclude<UserRole, 'guest'>; onBack: () => void }) {
  const { projectId } = useParams();
  const location = useLocation();
  const readOnly = location.state?.readOnly || false;
  return <IdeScreen role={role} readOnly={readOnly} onBack={onBack} projectId={projectId} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Raiz — SetupGate envolve tudo
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SetupGate>
      <Router>
        <AppRoutes />
      </Router>
    </SetupGate>
  );
}