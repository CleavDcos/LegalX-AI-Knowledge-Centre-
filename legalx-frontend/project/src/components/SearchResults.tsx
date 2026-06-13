import { ArrowRight } from 'lucide-react';

export interface SearchResult {
  topic_id: string;
  topic_name: string;
  relevant_excerpt: string;
  relevance_score: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  onResultClick: (topicId: string, topicName: string) => void;
}

export default function SearchResults({ results, onResultClick }: SearchResultsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {results.map((result, i) => (
        <div
          key={`${result.topic_id}-${i}`}
          className="animate-fade-in-up card-stagger"
          onClick={() => onResultClick(result.topic_id, result.topic_name)}
          style={{
            background: 'var(--bg-card)',
            borderRadius: 14,
            padding: 24,
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'border-color 0.25s, transform 0.25s, box-shadow 0.25s',
            animationDelay: `${i * 60}ms`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.transform = 'translateX(6px)';
            e.currentTarget.style.boxShadow = '-4px 0 20px var(--accent-glow)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
                flexWrap: 'wrap',
              }}>
                <h3 style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}>
                  {result.topic_name}
                </h3>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'var(--accent-soft)',
                  padding: '3px 8px',
                  borderRadius: 999,
                  letterSpacing: '0.02em',
                }}>
                  Score {result.relevance_score.toFixed(2)}
                </span>
              </div>
              <p style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                margin: 0,
              }}>
                {result.relevant_excerpt}
              </p>
            </div>
            <div style={{
              flexShrink: 0,
              marginTop: 2,
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
            }}>
              <ArrowRight size={16} color="var(--accent)" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
