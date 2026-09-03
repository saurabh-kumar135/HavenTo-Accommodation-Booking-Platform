import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3009';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: `Hi! I'm your HavenTo assistant.\n\nI can help you:\n- **Find stays** (by location, budget, or rating)\n- **Show property details**\n- **Auto-book** a home for your dates\n- **View your bookings & saved homes**\n\nHow can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { isLoggedIn } = useAuth();

  const suggestions = [
    'Show all homes',
    'Homes in Taharpur',
    'What are my bookings?',
    'Show my saved homes',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  };

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const updatedHistory = [...chatHistory, { role: 'user', content: userMessage }];

    try {
      const token = localStorage.getItem('havento_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          chatHistory: updatedHistory.slice(-10),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [...prev, { role: 'bot', content: data.reply }]);
        setChatHistory([
          ...updatedHistory,
          { role: 'assistant', content: data.reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: data.message || 'Something went wrong. Please try again.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Could not connect right now. Please try again later.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isLoggedIn) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95"
        style={{ background: '#A67C52' }}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2h-5.17L12 20.83 9.17 18H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 bg-white rounded-2xl overflow-hidden flex flex-col border border-gray-200"
          style={{
            width: '370px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '500px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            animation: 'chatOpen 0.25s ease',
          }}
        >
          <style>{`
            @keyframes chatOpen {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100" style={{ background: '#A67C52' }}>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-[14px]">HavenTo Assistant</h3>
              <p className="text-white/60 text-[11px]">Ask me anything about stays</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#fafafa' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-[1.6] ${
                  msg.role === 'user'
                    ? 'ml-auto rounded-2xl rounded-br-sm text-white'
                    : 'mr-auto rounded-2xl rounded-bl-sm text-gray-700 bg-white border border-gray-100'
                }`}
                style={msg.role === 'user' ? { background: '#A67C52' } : {}}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            ))}

            {isLoading && (
              <div className="mr-auto bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 pt-1 flex flex-wrap gap-1.5" style={{ background: '#fafafa' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-[11px] px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-500 hover:border-[#A67C52] hover:text-[#A67C52] transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#A67C52] transition"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition disabled:opacity-30"
              style={{ background: '#A67C52' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
