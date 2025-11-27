'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedEmail = localStorage.getItem('userEmail');
    if (!storedUserId) {
      router.push('/');
      return;
    }
    setUserId(storedUserId);
    setUserEmail(storedEmail || '');
    loadSessions(storedUserId);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async (uid: string) => {
    try {
      const response = await fetch(`/api/sessions?userId=${uid}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/messages?sessionId=${sessionId}`);
      const data = await response.json();
      setMessages(data.messages || []);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message to UI immediately
    const tempUserMsg = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId,
          sessionId: currentSessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Add assistant message
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: data.message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update session ID if new
      if (data.sessionId && !currentSessionId) {
        setCurrentSessionId(data.sessionId);
        loadSessions(userId);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
      // Remove the temporary user message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this chat?')) return;

    try {
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId }),
      });

      if (currentSessionId === sessionId) {
        startNewChat();
      }
      loadSessions(userId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 bg-gray-900 text-white flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={startNewChat}
              className="w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg transition"
            >
              + New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 mb-1 rounded cursor-pointer hover:bg-gray-800 transition flex justify-between items-center ${
                  currentSessionId === session.id ? 'bg-gray-800' : ''
                }`}
              >
                <div
                  onClick={() => loadSessionMessages(session.id)}
                  className="flex-1 truncate"
                >
                  {session.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 py-2 px-4 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-gray-600 hover:text-gray-800"
          >
            ☰
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            LLM Chat
          </h1>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition font-semibold"
            >
              {userEmail.charAt(0).toUpperCase()}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-xl mb-2">Start a conversation</p>
              <p className="text-sm">Ask me anything!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 shadow'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow p-4 rounded-lg">
                <p className="animate-pulse">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
