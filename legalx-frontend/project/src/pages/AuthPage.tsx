import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserPlus, Scale, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../components/Toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('legalx_user', JSON.stringify({ email }));
      showToast('Signed in successfully', 'success');
      navigate('/');
    }, 500);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, minHeight: 'calc(100vh - 68px)',
    }}>
      <div className="animate-fade-in-up" style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card)', borderRadius: 20,
        padding: 44, border: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: 'linear-gradient(90deg, var(--accent), #818CF8)',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <Scale size={30} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.5px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Sign in to your LegalX account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '12px 16px 12px 42px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%', padding: '12px 44px 12px 42px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px', background: 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.25s', opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--accent-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-glow)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <LogIn size={18} /> Sign In
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-muted)',
        }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirm) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (password !== confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('legalx_user', JSON.stringify({ email }));
      showToast('Account created successfully', 'success');
      navigate('/');
    }, 500);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, minHeight: 'calc(100vh - 68px)',
    }}>
      <div className="animate-fade-in-up" style={{
        width: '100%', maxWidth: 440,
        background: 'var(--bg-card)', borderRadius: 20,
        padding: 44, border: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: 'linear-gradient(90deg, #818CF8, var(--accent))',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <UserPlus size={30} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.5px' }}>
            Create Account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Join LegalX to explore Indian legal knowledge
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '12px 16px 12px 42px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Create a password (6+ characters)"
                style={{
                  width: '100%', padding: '12px 44px 12px 42px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm your password"
                style={{
                  width: '100%', padding: '12px 16px 12px 42px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 12, color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
                  transition: 'border-color 0.25s, box-shadow 0.25s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px', background: 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.25s', opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--accent-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-glow)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <UserPlus size={18} /> Create Account
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-muted)',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
