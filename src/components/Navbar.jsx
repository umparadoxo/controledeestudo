import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Timer, LayoutDashboard, Calendar, History as HistoryIcon, LogOut, Flame, Clock, User } from 'lucide-react';
import { isSameDay, subDays } from 'date-fns';

const Navbar = ({ activeTab, setActiveTab, userEmail }) => {
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [stats, setStats] = useState({ today: 0, streak: 0, totalTime: '0h0m' });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sessionData } = await supabase
      .from('pomodoro_sessions')
      .select('duration_minutes, completed_at')
      .order('completed_at', { ascending: true });

    if (!sessionData) return;

    // Today's count
    const todayStr = getLocalDateString();
    const todayCount = sessionData.filter(s => s.completed_at.startsWith(todayStr)).length;

    // Total time
    const totalMinutes = sessionData.reduce((acc, s) => acc + s.duration_minutes, 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    // Streak calculation
    let currentStreak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = getLocalDateString(checkDate);
      const hasSession = sessionData.some(s => s.completed_at.startsWith(dateStr));
      
      if (hasSession) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else {
        if (currentStreak === 0 && isSameDay(checkDate, new Date())) {
          checkDate = subDays(checkDate, 1);
          continue;
        }
        break;
      }
    }

    setStats({ 
      today: todayCount, 
      streak: currentStreak, 
      totalTime: `${h}h${m}m` 
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'timer', label: 'Pomodoro', icon: Timer },
    { id: 'planning', label: 'Cronograma', icon: Calendar },
    { id: 'history', label: 'Histórico', icon: HistoryIcon },
  ];

  return (
    <nav className="navbar glass-card">
      <div className="nav-left">
        <div className="status-pill status-red">
          <span className="status-icon">🍅</span>
          <span>{stats.today} hoje</span>
        </div>
        <div className="status-pill status-yellow">
          <Flame size={16} fill="currentColor" />
          <span>{stats.streak} dias</span>
        </div>
        <div className="status-pill status-green">
          <Clock size={16} />
          <span>{stats.totalTime} estudadas</span>
        </div>
        <div className="status-pill status-gray date-pill">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
        </div>
      </div>

      <div className="nav-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-right">
        <div className="user-info">
          <User size={16} />
          <span className="user-email">{userEmail}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Sair">
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>

      <style jsx>{`
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 16px 24px;
          padding: 8px 16px;
          border-radius: 100px;
          background: rgba(12, 13, 16, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .nav-left {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid transparent;
        }

        .status-red {
          background: rgba(255, 71, 87, 0.1);
          color: #ff4757;
          border-color: rgba(255, 71, 87, 0.2);
        }

        .status-yellow {
          background: rgba(255, 165, 2, 0.1);
          color: #ffa502;
          border-color: rgba(255, 165, 2, 0.2);
        }

        .status-green {
          background: rgba(46, 213, 115, 0.1);
          color: #2ed573;
          border-color: rgba(46, 213, 115, 0.2);
        }

        .status-gray {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }

        .nav-center {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.03);
          padding: 4px;
          border-radius: 100px;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .nav-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-btn.active {
          background: var(--accent-primary);
          color: white;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(30, 144, 255, 0.1);
          color: #1e90ff;
          padding: 6px 14px;
          border-radius: 100px;
          max-width: 180px;
          overflow: hidden;
          font-size: 0.85rem;
          border: 1px solid rgba(30, 144, 255, 0.2);
        }

        .user-email {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 100px;
          cursor: pointer;
          transition: var(--transition);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .logout-btn:hover {
          background: rgba(255, 71, 87, 0.1);
          color: #ff4757;
          border-color: #ff4757;
        }

        .date-pill {
          text-transform: capitalize;
        }

        @media (max-width: 1024px) {
          .nav-btn span { display: none; }
          .navbar { margin: 10px; padding: 6px; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
