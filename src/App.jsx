import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './lib/supabase';
import Dashboard from './components/Dashboard';
import PomodoroTimer from './components/PomodoroTimer';
import Planning from './components/Planning';
import History from './components/History';
import Login from './components/Login';
import Navbar from './components/Navbar';
import './index.css';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [initialTask, setInitialTask] = useState(null);

  const startTask = (task) => {
    setInitialTask(task);
    setActiveTab('timer');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
      Carregando...
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className={`app-container ${isFocusMode ? 'focus-mode' : ''}`}>
      {!isFocusMode && (
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          userEmail={user.email} 
        />
      )}
      
      <main className="content">
        <div key={activeTab}>
          {activeTab === 'dashboard' && <Dashboard onStartPomodoro={startTask} />}
          {activeTab === 'timer' && (
            <PomodoroTimer 
              isFocusMode={isFocusMode} 
              setIsFocusMode={setIsFocusMode}
              initialTask={initialTask}
              onClearTask={() => setInitialTask(null)}
            />
          )}
          {activeTab === 'planning' && <Planning />}
          {activeTab === 'history' && <History />}
        </div>
      </main>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
