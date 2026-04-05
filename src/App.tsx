import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { LoginScreen } from './screens/LoginScreen';
import { IdeScreen } from './screens/IdeScreen';
import { TeacherDashboard } from "./screens/TeacherDashboard";
import { StudentDashboard } from "./screens/StudentDashboard";
import './App.css';

// Quem é o utilizador
export type UserRole = 'guest' | 'student' | 'teacher' | 'visitor';

// Separamos a lógica de rotas num componente filho para podermos usar os hooks do React Router (como o useNavigate)
function AppRoutes() {
  const [role, setRole] = useState<UserRole>('guest');
  const navigate = useNavigate();

  const handleLogin = (loggedRole: 'student' | 'teacher' | 'visitor') => {
    setRole(loggedRole);
    // Visitantes vão direto para a IDE, alunos e professores vão para o Dashboard
    if (loggedRole === 'visitor') {
      navigate('/ide');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    setRole('guest');
    navigate('/');
  };

  const handleBackToDashboard = () => {
    if (role === 'visitor') {
      setRole('guest');
      navigate('/');
    } else {
      navigate('/dashboard');
    }
  };

  const openIde = (projectId: string | undefined, viewOnly: boolean) => {
    // Passamos a flag "readOnly" através do state da rota
    const path = projectId ? `/ide/${projectId}` : '/ide';
    navigate(path, { state: { readOnly: viewOnly } });
  };

  return (
    <Routes>
      {/* Rota de Login */}
      <Route path="/" element={
        role === 'guest' ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <Navigate to={role === 'visitor' ? "/ide" : "/dashboard"} replace />
        )
      } />
      
      {/* Rota do Dashboard (Protegida) */}
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
          <Navigate to="/" replace /> /* Expulsa para o login se não for aluno nem professor */
        )
      } />

      {/* Rota da IDE (Aceita um projectId opcional no URL) */}
      <Route path="/ide/:projectId?" element={
        role !== 'guest' ? (
          <IdeScreenWrapper role={role} onBack={handleBackToDashboard} />
        ) : (
          <Navigate to="/" replace />
        )
      } />
    </Routes>
  );
}

// -------------------------------------------------------------------------
// Wrapper da IDE: Conecta o URL e o Estado da rota às propriedades (props) originais da IdeScreen
// Isto evita que tenhamos de refatorar a IdeScreen neste momento!
// -------------------------------------------------------------------------
function IdeScreenWrapper({ role, onBack }: { role: Exclude<UserRole, 'guest'>, onBack: () => void }) {
  const { projectId } = useParams(); // Apanha o ID do URL (ex: /ide/123 -> 123)
  const location = useLocation();
  const readOnly = location.state?.readOnly || false; // Apanha o state passado no navigate()

  return (
    <IdeScreen 
      role={role} 
      readOnly={readOnly} 
      onBack={onBack} 
      projectId={projectId} 
    />
  );
}

// O componente raiz apenas providencia o Contexto do Router
export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}