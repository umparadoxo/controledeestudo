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

  const [stats, setStats] = useState({ today: 0, streak: 0, totalTime: '0h0m', totalPomodoros: 0 });

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
      totalTime: `${h}h${m}m`,
      totalPomodoros: sessionData.length
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
    <>
      {/* Mobile Top Header (Stats only) */}
      <header className="mobile-header desktop-hide">
        <div className="status-scroll">
          <div className="status-pill status-red">
            <span className="status-icon">🍅</span>
            <span>{stats.today} hoje</span>
          </div>
          <div className="status-pill status-yellow">
            <Flame size={14} fill="currentColor" />
            <span>{stats.streak} dias</span>
          </div>
          <div className="status-pill status-blue">
            <Timer size={14} />
            <span>{stats.totalPomodoros} total</span>
          </div>
          <div className="status-pill status-green">
            <Clock size={14} />
            <span>{stats.totalTime}</span>
          </div>
        </div>
      </header>

      {/* Desktop Top Navbar */}
      <nav className="navbar glass-card mobile-hide">
        <div className="nav-left">
          <div className="status-pill status-red">
            <span className="status-icon">🍅</span>
            <span>{stats.today} hoje</span>
          </div>
          <div className="status-pill status-yellow">
            <Flame size={16} fill="currentColor" />
            <span>{stats.streak} dias</span>
          </div>
          <div className="status-pill status-blue">
            <Timer size={14} />
            <span>{stats.totalPomodoros} pomodoros</span>
          </div>
          <div className="status-pill status-green">
            <Clock size={16} />
            <span>{stats.totalTime} estudadas</span>
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
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav glass-card desktop-hide">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
          >
            <item.icon size={26} color={activeTab === item.id ? '#ff4757' : '#747d8c'} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          </button>
        ))}
        <button className="mobile-nav-btn" onClick={handleLogout}>
          <LogOut size={26} color="#747d8c" />
        </button>
      </nav>

      <style jsx>{`
        .navbar {
          display: flex; align-items: center; justify-content: space-between;
          margin: 16px 24px; padding: 8px 16px; border-radius: 100px;
          background: rgba(12, 13, 16, 0.8); border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mobile-header {
          padding: 12px 16px; position: sticky; top: 0; z-index: 100;
          background: rgba(12, 13, 16, 0.9); backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-color);
        }

        .status-scroll { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .status-scroll::-webkit-scrollbar { display: none; }

        .status-pill {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          border-radius: 100px; font-size: 0.75rem; font-weight: 700;
          white-space: nowrap; border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .status-red { background: rgba(255, 71, 87, 0.1); color: #ff4757; }
        .status-yellow { background: rgba(255, 165, 2, 0.1); color: #ffa502; }
        .status-green { background: rgba(46, 213, 115, 0.1); color: #2ed573; }
        .status-blue { background: rgba(30, 144, 255, 0.1); color: #1e90ff; }


        .nav-left { display: flex; gap: 8px; align-items: center; }
        .nav-center { display: flex; gap: 4px; background: rgba(255, 255, 255, 0.03); padding: 4px; border-radius: 100px; }
        
        .nav-btn {
          display: flex; align-items: center; gap: 8px; padding: 8px 16px;
          border-radius: 100px; border: none; background: transparent;
          color: var(--text-secondary); cursor: pointer; transition: var(--transition);
          font-size: 0.9rem; font-weight: 500;
        }
        .nav-btn.active { background: var(--accent-primary); color: white; }

        .nav-right { display: flex; align-items: center; gap: 12px; }
        .user-info { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 6px 14px; border-radius: 100px; font-size: 0.85rem; }
        
        .logout-btn {
          display: flex; align-items: center; gap: 6px; background: transparent;
          border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);
          padding: 6px 12px; border-radius: 100px; cursor: pointer; font-size: 0.85rem;
        }

        .mobile-bottom-nav {
          position: fixed; bottom: 16px; left: 16px; right: 16px;
          height: 64px; background: rgba(18, 19, 23, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px;
          display: flex; justify-content: space-around; align-items: center;
          z-index: 1000; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
        }

        .mobile-nav-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: transparent; border: none; color: var(--text-muted);
          cursor: pointer; width: 20%;
        }

        .mobile-nav-btn span { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
        .mobile-nav-btn.active { color: white; }

        @media (max-width: 767px) {
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
