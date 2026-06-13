import { useState, useRef, useEffect, ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

export default function TabView({ tabs, activeTab, onTabChange }: {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const idx = tabs.findIndex(t => t.key === activeTab);
    if (idx >= 0 && tabRefs.current[idx]) {
      const el = tabRefs.current[idx]!;
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab, tabs]);

  const active = tabs.find(t => t.key === activeTab);

  return (
    <div>
      <div style={{
        display: 'flex', position: 'relative',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        gap: 0,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            ref={el => { tabRefs.current[i] = el; }}
            onClick={() => onTabChange(tab.key)}
            style={{
              padding: '14px 24px',
              background: 'none',
              border: 'none',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font)',
              transition: 'color 0.25s',
              position: 'relative',
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.25s',
              transform: activeTab === tab.key ? 'scale(1.1)' : 'scale(1)',
            }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
        <div
          className="tab-indicator"
          style={{
            position: 'absolute', bottom: 0, height: 2,
            background: 'var(--accent)',
            borderRadius: 1,
            ...indicatorStyle,
          }}
        />
      </div>
      <div className="animate-fade-in" style={{ padding: '28px 0' }} key={activeTab}>
        {active?.content}
      </div>
    </div>
  );
}
