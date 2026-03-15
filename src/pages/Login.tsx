import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { KeyRound, Mail, User as UserIcon, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      if (isRegister) {
        const username = formData.get('username') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        await register({ username, email, password });
        
        // After registration, log in
        const loginData = new FormData();
        loginData.append('username', username);
        loginData.append('password', password);
        await login(loginData);
      } else {
        await login(formData);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface-2)', color: 'var(--ink)'
    }}>
      <div className="card" style={{ width: 400, boxShadow: '0 12px 40px rgba(0,0,0,0.08)', border: '1px solid var(--rule)' }}>
        <div className="card-header" style={{ flexDirection: 'column', gap: 12, padding: '32px 24px 24px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--ink)',
            color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={24} strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ 
              fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', 
              marginBottom: 4, letterSpacing: '-0.01em' 
            }}>
              {isRegister ? 'Join Aurora' : 'CyberControl Access'}
            </h1>
            <p style={{ 
              fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', 
              textTransform: 'uppercase', letterSpacing: '0.1em' 
            }}>
              Security Platform Gateway
            </p>
          </div>
        </div>

        <div className="card-body" style={{ padding: '24px 32px 32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--red-light)', 
                border: '1px solid var(--red)', color: 'var(--red)', fontSize: 12, 
                display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)'
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ 
                fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', 
                color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 
              }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                <input
                  name="username"
                  type="text"
                  required
                  placeholder="operator_id"
                  style={{
                    width: '100%', padding: '12px 14px 12px 40px', borderRadius: 'var(--radius)', 
                    border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', 
                    fontSize: 13, fontFamily: 'var(--font-mono)', transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>

            {isRegister && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ 
                  fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', 
                  color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 
                }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="email@aurora.internal"
                    style={{
                      width: '100%', padding: '12px 14px 12px 40px', borderRadius: 'var(--radius)', 
                      border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', 
                      fontSize: 13, fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ 
                fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', 
                color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 500 
              }}>
                Access Key
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  style={{
                    width: '100%', padding: '12px 14px 12px 40px', borderRadius: 'var(--radius)', 
                    border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', 
                    fontSize: 13, fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="refresh-btn"
              style={{
                marginTop: 8, padding: '12px', justifyContent: 'center',
                background: 'var(--ink)', color: 'white', fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                fontSize: 13, border: 'none', width: '100%', letterSpacing: '0.02em'
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <div className="spinner-small" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                   Authenticating...
                </div>
              ) : (isRegister ? 'Initialize Account' : 'Request Access')}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
            {isRegister ? 'Already verified?' : "New operator?"}{' '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              style={{
                background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 600,
                cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'var(--font-mono)'
              }}
            >
              {isRegister ? 'SIGN_IN' : 'REGISTER_ID'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { outline: none; border-color: var(--teal) !important; box-shadow: 0 0 0 2px var(--teal-light); }
      `}</style>
    </div>
  );
}
