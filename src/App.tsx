import { useState } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { IdeScreen } from './screens/IdeScreen';
import { TeacherDashboard } from "./screens/TeacherDashboard";
import { StudentDashboard } from "./screens/StudentDashboard";
import './App.css';

type UserRole = 'guest' | 'student' | 'teacher' | 'teacher-dashboard' | 'student-dashboard' | 'visitor';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  // Controla se a IDE está em modo somente-leitura (professor inspecionando projeto de aluno)
  // vs. modo completo (professor ou aluno editando projeto próprio)
  const [isViewOnly, setIsViewOnly] = useState(false);

  const handleLogin = (role: 'student' | 'teacher' | 'visitor') => {
    if (role === 'teacher') setCurrentRole('teacher-dashboard');
    else if (role === 'student') setCurrentRole('student-dashboard');
    else setCurrentRole('visitor');
  };

  const handleLogout = () => {
    setCurrentRole('guest');
    setActiveProjectId(undefined);
    setIsViewOnly(false);
  };

  const handleBackToDashboard = () => {
    setActiveProjectId(undefined);
    setIsViewOnly(false);
    if (currentRole === 'teacher') setCurrentRole('teacher-dashboard');
    else if (currentRole === 'student') setCurrentRole('student-dashboard');
    else handleLogout();
  };

  if (currentRole === 'guest') return <LoginScreen onLogin={handleLogin} />;

  if (currentRole === 'teacher-dashboard') {
    return (
      <TeacherDashboard
        onLogout={handleLogout}
        // Projeto próprio do professor: IDE completa, pode salvar
        onOpenOwnProject={(projectId) => {
          setActiveProjectId(projectId);
          setIsViewOnly(false);
          setCurrentRole('teacher');
        }}
        // Projeto de aluno: IDE somente-leitura
        onInspectStudentProject={(projectId) => {
          setActiveProjectId(projectId);
          setIsViewOnly(true);
          setCurrentRole('teacher');
        }}
      />
    );
  }

  if (currentRole === 'student-dashboard') {
    return (
      <StudentDashboard
        onLogout={handleLogout}
        onOpenIde={(projectId) => {
          setActiveProjectId(projectId);
          setIsViewOnly(false);
          setCurrentRole('student');
        }}
      />
    );
  }

  return (
    <IdeScreen
      role={currentRole}
      readOnly={isViewOnly}
      onBack={handleBackToDashboard}
      projectId={activeProjectId}
    />
  );
}

export default App;