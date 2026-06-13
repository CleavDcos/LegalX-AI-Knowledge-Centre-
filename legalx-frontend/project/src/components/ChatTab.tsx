import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Bot, User as UserIcon } from 'lucide-react';
import { sendChat, transcribe } from '../api/client';
import { useToast } from './Toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export default function ChatTab({ topicId }: { topicId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { showToast } = useToast();

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg: Message = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setTyping(true);

    try {
      const res = await sendChat(
        topicId,
        text,
        newHistory.map(m => ({ role: m.role, content: m.content }))
      );
      const data = res.data;
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || data.message || data.content || data.answer || '',
        sources: data.sources || data.citations || [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      showToast('Failed to get response. Please try again.');
    } finally {
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  const startRecording = async () => {
    if (recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        try {
          const res = await transcribe(formData);
          const transcribed = res.data.text || res.data.transcription || '';
          if (transcribed) {
            setInput(transcribed);
            inputRef.current?.focus();
          }
        } catch {
          showToast('Transcription failed');
        }
        setRecording(false);
      };

      mediaRecorder.start();
      setRecording(true);

      // Auto-stop after 6 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 6000);
    } catch {
      showToast('Microphone access denied. Please allow microphone permissions.');
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 500 }}>
      {/* Messages */}
      <div className="chat-messages" style={{
        flex: 1, overflowY: 'auto', padding: '12px 4px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {messages.length === 0 && !typing && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', gap: 16, padding: 32,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={36} color="var(--accent)" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ask anything about this legal topic
            </p>
            <p style={{ fontSize: 14, maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
              Your AI legal assistant can help you understand rights, provisions, and procedures
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              display: 'flex', gap: 12,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 2px 8px var(--accent-glow)',
              }}>
                <Bot size={18} color="#fff" />
              </div>
            )}
            <div style={{ maxWidth: '72%' }}>
              <div style={{
                padding: '14px 18px', borderRadius: 16,
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                color: '#fff', fontSize: 14, lineHeight: 1.65,
                ...(msg.role === 'user'
                  ? { borderBottomRightRadius: 4 }
                  : { borderBottomLeftRadius: 4 }),
              }}>
                {msg.content}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{
                  marginTop: 8, paddingLeft: 4,
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: 8, border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sources
                  </span>
                  {msg.sources.map((src, j) => (
                    <div key={j} style={{
                      fontSize: 12, color: 'var(--accent)',
                      lineHeight: 1.5, marginTop: 2,
                    }}>
                      {src}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--bg-elevated)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--border)', flexShrink: 0,
              }}>
                <UserIcon size={18} color="var(--text-secondary)" />
              </div>
            )}
          </div>
        ))}

        {typing && (
          <div className="animate-fade-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 8px var(--accent-glow)',
            }}>
              <Bot size={18} color="#fff" />
            </div>
            <div style={{
              padding: '14px 22px', borderRadius: 16,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderBottomLeftRadius: 4,
              display: 'flex', gap: 6, alignItems: 'center', height: 48,
            }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        display: 'flex', gap: 10, paddingTop: 18,
        borderTop: '1px solid var(--border)',
        alignItems: 'center',
      }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          className={recording ? 'mic-recording' : ''}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--bg-card)',
            border: recording ? '2px solid var(--error)' : '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, transition: 'all 0.3s',
          }}
        >
          {recording ? <MicOff size={18} color="#fff" /> : <Mic size={18} color="var(--text-secondary)" />}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a legal question..."
          style={{
            flex: 1, padding: '12px 18px',
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 12, color: 'var(--text-primary)',
            fontSize: 14, fontFamily: 'var(--font)', outline: 'none',
            transition: 'border-color 0.25s, box-shadow 0.25s',
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
        <button
          onClick={handleSend}
          disabled={!input.trim() || typing}
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: input.trim() && !typing ? 'var(--accent)' : 'var(--bg-card)',
            border: input.trim() && !typing ? 'none' : '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
            flexShrink: 0, transition: 'all 0.25s',
            transform: input.trim() && !typing ? 'none' : 'none',
          }}
          onMouseEnter={e => {
            if (input.trim() && !typing) {
              e.currentTarget.style.background = 'var(--accent-hover)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={e => {
            if (input.trim() && !typing) {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          <Send size={18} color={input.trim() && !typing ? '#fff' : 'var(--text-muted)'} />
        </button>
      </div>
    </div>
  );
}
