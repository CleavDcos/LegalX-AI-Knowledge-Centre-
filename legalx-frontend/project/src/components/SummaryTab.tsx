import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { getSummary, generateAudio } from '../api/client';
import { TextSkeleton, Spinner } from './LoadingSkeleton';
import { useToast } from './Toast';

export default function SummaryTab({ topicId }: { topicId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSummary(topicId)
      .then(res => {
        if (!cancelled) {
          const data = res.data;
          setSummary(typeof data === 'string' ? data : data.summary || data.content || '');
        }
      })
      .catch(() => {
        if (!cancelled) showToast('Failed to load summary. Please check that the backend is running.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [topicId, showToast]);

  const handleListen = async () => {
    if (!summary) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    setAudioLoading(true);
    try {
      const res = await generateAudio(topicId, summary);
      const audioUrl = res.data.url || res.data.audio_url;
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlaying(false);
        audio.onerror = () => {
          showToast('Audio playback failed');
          setPlaying(false);
        };
        audio.play();
        setPlaying(true);
      } else {
        showToast('Audio URL not received from server');
      }
    } catch {
      showToast('Failed to generate audio');
    } finally {
      setAudioLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '8px 0' }}>
        <TextSkeleton lines={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="animate-fade-in-up" style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        padding: 32,
        border: '1px solid var(--border)',
        lineHeight: 1.85,
        fontSize: 15,
        color: 'var(--text-secondary)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative accent line */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 3, background: 'var(--accent)', borderRadius: 2,
        }} />
        {summary}
      </div>
      <button
        onClick={handleListen}
        disabled={audioLoading}
        className={playing ? 'glow-pulse' : ''}
        style={{
          marginTop: 24,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 26px',
          background: playing ? 'rgba(59,130,246,0.15)' : 'var(--accent)',
          color: playing ? 'var(--accent)' : '#fff',
          border: playing ? '1px solid rgba(59,130,246,0.3)' : 'none',
          borderRadius: 12,
          fontSize: 14, fontWeight: 600,
          cursor: audioLoading ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font)',
          transition: 'all 0.3s',
          opacity: audioLoading ? 0.7 : 1,
        }}
      >
        {audioLoading ? (
          <Spinner />
        ) : (
          <Volume2 size={18} />
        )}
        {audioLoading ? 'Generating Audio...' : playing ? 'Playing...' : 'Listen to Summary'}
      </button>
    </div>
  );
}
