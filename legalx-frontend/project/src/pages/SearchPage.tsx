import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { searchTopics } from '../api/client';
import { TextSkeleton } from '../components/LoadingSkeleton';
import SearchResults, { SearchResult } from '../components/SearchResults';
import { useToast } from '../components/Toast';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    setLoading(true);
    setResults([]);
    searchTopics(query)
      .then(res => {
        if (!cancelled) {
          const data = res.data;
          const list = Array.isArray(data) ? data : data.results || data.data || [];
          setResults(list);
        }
      })
      .catch(() => {
        if (!cancelled) showToast('Search failed. Please try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, showToast]);

  return (
    <div style={{ flex: 1, padding: '48px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div className="animate-fade-in-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search size={22} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Search Results
          </h1>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
          {loading ? 'Searching...' : (
            results.length > 0
              ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
              : query ? `No results for "${query}"` : 'Enter a search query'
          )}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: 'var(--bg-card)', borderRadius: 14,
              padding: 24, border: '1px solid var(--border)',
            }}>
              <TextSkeleton lines={3} />
            </div>
          ))}
        </div>
      ) : results.length === 0 && query ? (
        <div className="animate-fade-in" style={{
          textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)',
        }}>
          <Search size={56} strokeWidth={1.2} style={{ marginBottom: 20, opacity: 0.5 }} />
          <p style={{ fontSize: 18, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>
            No results found
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Try different keywords or explore topics from the homepage
          </p>
        </div>
      ) : (
        <SearchResults
          results={results}
          onResultClick={(topicId, topicName) =>
            navigate(`/topic/${topicId}`, { state: { name: topicName } })
          }
        />
      )}
      <div style={{ height: 60 }} />
    </div>
  );
}
