import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        alert('Confirme seu e-mail para prosseguir!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="glass-card login-card">
        <div className="card-header">
          <div className="logo-icon">🚀</div>
          <h2>{isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}</h2>
          <p>{isLogin ? 'Acesse seu painel de estudos' : 'Comece a organizar seus estudos hoje'}</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="input-group">
              <label><User size={16} /> Nome Completo</label>
              <input 
                type="text" 
                placeholder="Seu nome" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="input-group">
            <label><Mail size={16} /> E-mail</label>
            <input 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label><Lock size={16} /> Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
          </button>
        </form>

        <div className="card-footer">
          <span>{isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}</span>
          <button className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Cadastre-se' : 'Entrar'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        @media (max-width: 480px) {
          .login-card { padding: 24px; }
          .logo-icon { font-size: 2.5rem; }
          .card-header h2 { font-size: 1.5rem; }
        }


        .card-header { text-align: center; }
        .logo-icon { font-size: 3rem; margin-bottom: 16px; display: block; }
        .card-header h2 { font-size: 1.75rem; color: var(--text-primary); margin-bottom: 8px; }
        .card-header p { font-size: 0.95rem; color: var(--text-muted); }

        form { display: flex; flex-direction: column; gap: 20px; }

        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label {
          display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);
        }

        .login-btn { width: 100%; height: 48px; margin-top: 12px; }

        .error-message {
          background: rgba(255, 71, 87, 0.1);
          color: #ff4757;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 71, 87, 0.2);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
        }

        .card-footer {
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .toggle-btn {
          background: transparent;
          border: none;
          color: var(--accent-primary);
          font-weight: 700;
          cursor: pointer;
          font-size: 0.95rem;
          transition: var(--transition);
        }

        .toggle-btn:hover { text-decoration: underline; opacity: 0.8; }
      `}</style>
    </div>
  );
};

export default Login;
