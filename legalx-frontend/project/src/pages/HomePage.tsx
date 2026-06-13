import { useState, useEffect } from 'react';
import { Sparkles, Scale, BookOpen } from 'lucide-react';
import { getTopics } from '../api/client';
import TopicCard from '../components/TopicCard';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/Toast';

interface Topic {
  id: string | number;
  name: string;
  icon: string;
  description: string;
}

export default function HomePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    getTopics()
      .then(res => {
        if (!cancelled) {
          const data = res.data;
          const list = Array.isArray(data) ? data : data.topics || data.data || [];
          setTopics(list);
        }
      })
      .catch(() => {
        if (!cancelled) showToast('Failed to load topics. Make sure the backend is running at localhost:8000.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showToast]);

  return (
    <div style={{ flex: 1 }}>
      {/* Hero Section */}
      <section style={{
        padding: '100px 24px 72px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, transparent 60%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorative elements */}
        <div style={{
          position: 'absolute', top: -200, right: -100,
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -150, left: -100,
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="animate-fade-in-up" style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 18px', borderRadius: 24,
            background: 'var(--accent-soft)', border: '1px solid rgba(59,130,246,0.2)',
            marginBottom: 28, fontSize: 13, color: 'var(--accent)', fontWeight: 600,
            letterSpacing: '0.3px',
          }}>
            <Sparkles size={14} /> AI-Powered Legal Knowledge
          </div>
          <h1 className="hero-heading" style={{
            fontSize: 'clamp(36px, 7vw, 56px)', fontWeight: 800,
            lineHeight: 1.12, marginBottom: 22,
            letterSpacing: '-1.5px',
          }}>
            Your AI-Powered{' '}
            <span style={{
              color: 'var(--accent)',
              background: 'linear-gradient(135deg, var(--accent) 0%, #818CF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Legal Knowledge
            </span>{' '}
            Centre
          </h1>
          <p className="hero-subtitle" style={{
            fontSize: 18, color: 'var(--text-secondary)',
            lineHeight: 1.7, maxWidth: 580, margin: '0 auto',
          }}>
            Empowering Indian citizens with accessible, AI-driven legal information.
            Explore topics, ask questions, and understand your rights.
          </p>
        </div>
      </section>

      {/* Topics Grid */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={20} color="var(--accent)" />
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px',
          }}>
            Explore Legal Topics
          </h2>
        </div>

        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {[1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : topics.length === 0 ? (
          <div className="animate-fade-in" style={{
            textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)',
          }}>
            <Scale size={56} strokeWidth={1.2} style={{ marginBottom: 20, opacity: 0.5 }} />
            <p style={{ fontSize: 18, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>
              No topics available
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              Make sure the backend API is running at localhost:8000
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {topics.map((topic, i) => (
              <TopicCard key={topic.id} topic={topic} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 24px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        background: 'rgba(15,23,42,0.6)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 8,
        }}>
          <Scale size={16} color="var(--accent)" />
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Powered by <span style={{ color: 'var(--accent)', fontWeight: 700 }}>LegalX AI</span>
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6 }}>
          For informational purposes only. Not legal advice.
        </p>
      </footer>
    </div>
  );
}
