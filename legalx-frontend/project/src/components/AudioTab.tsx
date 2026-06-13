import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, FileText } from 'lucide-react';
import { generateAudio, downloadAudio, getSummary } from '../api/client';
import { Spinner } from './LoadingSkeleton';
import { useToast } from './Toast';

export default function AudioTab({ topicId }: { topicId: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { showToast } = useToast();

  // Fetch summary to use as transcript/TTS text
  useEffect(() => {
    let cancelled = false;
    setTranscriptLoading(true);
    getSummary(topicId)
      .then(res => {
        if (!cancelled) {
          const data = res.data;
          setTranscript(typeof data === 'string' ? data : data.summary || data.content || '');
        }
      })
      .catch(() => {
        if (!cancelled) showToast('Failed to load transcript');
      })
      .finally(() => {
        if (!cancelled) setTranscriptLoading(false);
      });
    return () => { cancelled = true; };
  }, [topicId]);

  const handlePlay = async () => {
    // If already playing, pause
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    // If audio already generated, just resume
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setPlaying(true);
      return;
    }

    if (!transcript) {
      showToast('No text available for audio generation');
      return;
    }

    setAudioLoading(true);
    try {
      // Call backend — response is raw MP3 binary (blob)
      const res = await generateAudio(topicId, transcript);

      // Convert response data to a playable blob URL
      const blob = new Blob([res.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
          setCurrentTime(audio.currentTime);
        }
      });

      audio.addEventListener('ended', () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });

      audio.onerror = () => {
        showToast('Audio playback failed');
        setPlaying(false);
      };

      await audio.play();
      setPlaying(true);
    } catch (err) {
      console.error('Audio generation error:', err);
      showToast('Failed to generate audio');
    } finally {
      setAudioLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await downloadAudio(topicId);
      const blob = new Blob([res.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legalx-${topicId}-audio.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Download started', 'success');
    } catch {
      showToast('Download failed');
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 0', gap: 28,
    }}>

      {/* Play / Pause Button */}
      <button
        onClick={handlePlay}
        disabled={audioLoading || transcriptLoading}
        className={playing ? 'glow-pulse' : ''}
        style={{
          width: 96, height: 96, borderRadius: '50%',
          background: (audioLoading || transcriptLoading) ? 'var(--bg-card)' : 'var(--accent)',
          border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: (audioLoading || transcriptLoading) ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          opacity: (audioLoading || transcriptLoading) ? 0.7 : 1,
          boxShadow: playing
            ? '0 0 40px var(--accent-glow), 0 0 80px rgba(59,130,246,0.1)'
            : '0 4px 20px rgba(59,130,246,0.2)',
        }}
        onMouseEnter={e => {
          if (!audioLoading) e.currentTarget.style.transform = 'scale(1.06)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {audioLoading ? (
          <Spinner />
        ) : playing ? (
          <Pause size={40} color="#fff" />
        ) : (
          <Play size={40} color="#fff" style={{ marginLeft: 6 }} />
        )}
      </button>

      {/* Status label */}
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
        {audioLoading
          ? 'Generating audio, please wait...'
          : transcriptLoading
          ? 'Loading transcript...'
          : playing
          ? 'Now playing...'
          : audioUrl
          ? 'Paused — click to resume'
          : 'Click to generate & play audio'}
      </p>

      {/* Animated waveform while playing */}
      {playing && (
        <div className="animate-fade-in" style={{
          display: 'flex', alignItems: 'center', gap: 5, height: 52,
        }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="wave-bar" style={{ height: 8 }} />
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div
          onClick={handleProgressClick}
          style={{
            width: '100%', height: 6, background: 'var(--bg-elevated)',
            borderRadius: 3, cursor: audioRef.current ? 'pointer' : 'default',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'var(--accent)', borderRadius: 3,
            transition: 'width 0.15s linear', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', right: -5, top: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent-glow)',
              opacity: playing ? 1 : 0,
              transition: 'opacity 0.2s',
            }} />
          </div>
        </div>
        {duration > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 8, fontSize: 12, color: 'var(--text-muted)',
          }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        )}
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 26px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12, color: 'var(--text-primary)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font)', transition: 'all 0.25s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <Download size={18} />
        Download Audio
      </button>

      {/* Transcript display */}
      {!transcriptLoading && transcript && (
        <div className="animate-fade-in-up" style={{
          width: '100%', maxWidth: 640,
          background: 'var(--bg-card)',
          borderRadius: 16, padding: 28,
          border: '1px solid var(--border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 16, color: 'var(--text-muted)', fontSize: 13,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <FileText size={16} /> Transcript
          </div>
          <p style={{
            fontSize: 14, color: 'var(--text-secondary)',
            lineHeight: 1.85, margin: 0,
          }}>
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}
