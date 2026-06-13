import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Search, User, LogOut, Menu, X, Scale } from 'lucide-react';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('legalx_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('legalx_user');
    setUser(null);
    setShowUserMenu(false);
  };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', alignItems: 'center',
        height: 68, gap: 20,
      }}>
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="mobile-menu-btn"
          style={{
            display: 'none', background: 'none', border: 'none',
            color: 'var(--text-primary)', cursor: 'pointer', padding: 6,
            borderRadius: 8,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link to="/" style={{
          fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
          textDecoration: 'none', letterSpacing: '-0.5px', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'opacity 0.2s',
        }}>
          <Scale size={26} color="var(--accent)" strokeWidth={2.5} />
          <span style={{ color: 'var(--accent)' }}>Legal</span>
          <span>X</span>
        </Link>

        <form onSubmit={handleSearch} style={{
          flex: 1, maxWidth: 480, position: 'relative',
        }} className="nav-search-desktop">
          <Search size={16} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search legal topics, acts, rights..."
            style={{
              width: '100%', padding: '10px 16px 10px 40px',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--text-primary)',
              fontSize: 14, fontFamily: 'var(--font)',
              outline: 'none', transition: 'border-color 0.25s, box-shadow 0.25s',
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
        </form>

        <div style={{ flex: 1 }} />

        {user ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                background: 'var(--accent)', border: 'none', borderRadius: '50%',
                width: 38, height: 38, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = '0 0 16px var(--accent-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <User size={18} color="#fff" />
            </button>
            {showUserMenu && (
              <div className="animate-scale-in" style={{
                position: 'absolute', right: 0, top: 50,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 16, minWidth: 220,
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}>
                <div style={{
                  fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14,
                  paddingBottom: 12, borderBottom: '1px solid var(--border)',
                  wordBreak: 'break-all',
                }}>
                  {user.email}
                </div>
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', color: 'var(--error)',
                  cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)',
                  padding: '4px 0',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" style={{
            padding: '9px 22px', background: 'var(--accent)',
            borderRadius: 10, color: '#fff', fontSize: 14,
            fontWeight: 600, textDecoration: 'none',
            transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
            whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <User size={16} />
            Sign In
          </Link>
        )}
      </div>

      {/* Mobile search dropdown */}
      {mobileOpen && (
        <div className="mobile-search-panel animate-fade-in" style={{ paddingBottom: 16 }}>
          <form onSubmit={handleSearch} style={{ position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search legal topics..."
              style={{
                width: '100%', padding: '10px 16px 10px 40px',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 12, color: 'var(--text-primary)',
                fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
              }}
            />
          </form>
        </div>
      )}
    </nav>
  );
}
