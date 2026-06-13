import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FileText, Info, MessageCircle, Headphones, ArrowLeft } from 'lucide-react';
import TabView from '../components/TabView';
import SummaryTab from '../components/SummaryTab';
import KeyInfoTab from '../components/KeyInfoTab';
import ChatTab from '../components/ChatTab';
import AudioTab from '../components/AudioTab';

const TAB_KEY = 'legalx_active_tab';

export default function TopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const location = useLocation();
  const topicName = (location.state as { name?: string })?.name || 'Legal Topic';

  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(`${TAB_KEY}_${topicId}`) || 'summary';
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    sessionStorage.setItem(`${TAB_KEY}_${topicId}`, key);
  };

  const tabs = [
    {
      key: 'summary',
      label: 'Summary',
      icon: <FileText size={16} />,
      content: <SummaryTab topicId={topicId!} />,
    },
    {
      key: 'keyinfo',
      label: 'Key Info',
      icon: <Info size={16} />,
      content: <KeyInfoTab topicId={topicId!} />,
    },
    {
      key: 'chat',
      label: 'Ask AI',
      icon: <MessageCircle size={16} />,
      content: <ChatTab topicId={topicId!} />,
    },
    {
      key: 'audio',
      label: 'Audio',
      icon: <Headphones size={16} />,
      content: <AudioTab topicId={topicId!} />,
    },
  ];

  return (
    <div style={{ flex: 1, padding: '0 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div className="animate-fade-in-up" style={{ paddingTop: 36 }}>
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 14, cursor: 'pointer', marginBottom: 24,
            fontFamily: 'var(--font)', padding: '6px 0',
            transition: 'color 0.2s, gap 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.gap = '10px';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.gap = '6px';
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800,
          marginBottom: 10, letterSpacing: '-0.8px',
        }}>
          {topicName}
        </h1>
        <p style={{
          color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32,
          lineHeight: 1.6, maxWidth: 600,
        }}>
          Explore AI-generated insights, key information, and ask questions about this legal topic
        </p>

        <TabView tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
      <div style={{ height: 60 }} />
    </div>
  );
}
