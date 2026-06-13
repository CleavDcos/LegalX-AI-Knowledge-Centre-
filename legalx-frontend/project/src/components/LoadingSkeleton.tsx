export function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 16,
      padding: 28,
      border: '1px solid var(--border)',
    }}>
      <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 18 }} />
      <div className="skeleton" style={{ width: '55%', height: 22, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '85%', height: 14, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '70%', height: 14, marginBottom: 20 }} />
      <div className="skeleton" style={{ width: '40%', height: 40, borderRadius: 10 }} />
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            width: i === lines - 1 ? '55%' : '100%',
            height: i === 0 ? 20 : 14,
            marginBottom: i === 0 ? 14 : 10,
          }}
        />
      ))}
    </div>
  );
}

export function KeyInfoSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 16,
      padding: 24,
      border: '1px solid var(--border)',
    }}>
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '45%', height: 18, marginBottom: 16 }} />
      {[85, 70, 92, 55].map((w, i) => (
        <div key={i} className="skeleton" style={{ width: `${w}%`, height: 12, marginBottom: 8 }} />
      ))}
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{
      width: 32, height: 32,
      border: '3px solid var(--border)',
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}
