import { useNavigate } from 'react-router-dom';

interface Topic {
  id: string | number;
  name: string;
  icon: string;
  description: string;
}

export default function TopicCard({ topic, index = 0 }: { topic: Topic; index?: number }) {
  const navigate = useNavigate();

  return (
    <div
      className="card-glow card-stagger animate-fade-in-up"
      onClick={() => navigate(`/topic/${topic.id}`, { state: { name: topic.name } })}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        padding: 28,
        border: '1px solid var(--border)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = '';
      }}
    >
      {/* Decorative gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 120, height: 120,
        background: 'radial-gradient(circle at top right, var(--accent-soft), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        fontSize: 52, marginBottom: 18, lineHeight: 1,
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
      }}>
        {topic.icon}
      </div>
      <h3 style={{
        fontSize: 20, fontWeight: 700, marginBottom: 10,
        color: 'var(--text-primary)', letterSpacing: '-0.3px',
      }}>
        {topic.name}
      </h3>
      <p style={{
        fontSize: 14, color: 'var(--text-secondary)',
        lineHeight: 1.65, marginBottom: 22, flex: 1,
      }}>
        {topic.description}
      </p>
      <button
        style={{
          padding: '10px 22px',
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font)',
          transition: 'all 0.25s',
          alignSelf: 'flex-start',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--accent)';
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.transform = 'translateX(2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--accent-soft)';
          e.currentTarget.style.color = 'var(--accent)';
          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        Explore Topic &rarr;
      </button>
    </div>
  );
}
