import { useState, useEffect } from 'react';
import { Shield, FileText, AlertTriangle, Users } from 'lucide-react';
import { getKeyInfo } from '../api/client';
import { KeyInfoSkeleton } from './LoadingSkeleton';
import { useToast } from './Toast';

interface KeyInfoData {
  key_rights?: string[];
  important_provisions?: string[];
  penalties?: string[];
  who_can_benefit?: string[];
}

const cards = [
  { key: 'key_rights', label: 'Key Rights', color: '#3B82F6', softBg: 'var(--blue-soft)', Icon: Shield },
  { key: 'important_provisions', label: 'Important Provisions', color: '#22C55E', softBg: 'var(--green-soft)', Icon: FileText },
  { key: 'penalties', label: 'Penalties', color: '#EF4444', softBg: 'var(--red-soft)', Icon: AlertTriangle },
  { key: 'who_can_benefit', label: 'Who Can Benefit', color: '#A855F7', softBg: 'var(--purple-soft)', Icon: Users },
] as const;

export default function KeyInfoTab({ topicId }: { topicId: string }) {
  const [data, setData] = useState<KeyInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getKeyInfo(topicId)
      .then(res => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) showToast('Failed to load key info');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [topicId, showToast]);

  if (loading) {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {[1, 2, 3, 4].map(i => <KeyInfoSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
    }}>
      {cards.map(({ key, label, color, softBg, Icon }, idx) => {
        const items = data?.[key] as string[] | undefined;
        return (
          <div
            key={key}
            className="animate-fade-in-up card-stagger"
            style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid var(--border)',
              transition: 'border-color 0.3s, box-shadow 0.3s',
              animationDelay: `${idx * 80}ms`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.boxShadow = `0 0 20px ${color}20`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: softBg, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
            }}>
              <Icon size={24} color={color} />
            </div>
            <h4 style={{
              fontSize: 17, fontWeight: 700,
              color: 'var(--text-primary)', marginBottom: 14,
              letterSpacing: '-0.2px',
            }}>
              {label}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {items?.map((item, i) => (
                <li key={i} style={{
                  fontSize: 14, color: 'var(--text-secondary)',
                  padding: '5px 0', lineHeight: 1.6,
                  display: 'flex', gap: 10,
                }}>
                  <span style={{
                    color, marginTop: 2, fontSize: 8,
                    lineHeight: '18px',
                  }}>&#9679;</span>
                  {item}
                </li>
              ))}
              {(!items || items.length === 0) && (
                <li style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No data available
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
