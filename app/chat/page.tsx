'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProjectModal from '@/components/ProjectModal';
import DocumentsPanel from '@/components/DocumentsPanel';
import { Project } from '@/lib/db';

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showDocumentsPanel, setShowDocumentsPanel] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    loadProjects(storedUserId);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const loadSessions = async (uid: string) => {
    try {
      const response = await fetch(`/api/sessions?userId=${uid}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadProjects = async (uid: string) => {
    try {
      const response = await fetch(`/api/projects?userId=${uid}`);
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadDocumentCount = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents?userId=${userId}`);
      const data = await response.json();
      setDocumentCount(data.documents?.length || 0);
    } catch (error) {
      console.error('Failed to load document count:', error);
      setDocumentCount(0);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      loadDocumentCount(selectedProject.id);
    }
  }, [selectedProject, userId]);

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
    if ((!input.trim() && selectedFiles.length === 0) || loading) return;

    const userMessage = input.trim();
    setInput('');
    setSelectedFiles([]);
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
          webSearchEnabled,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  };

  const copyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setSelectedFiles([]);
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

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      const url = editingProject
        ? `/api/projects`
        : `/api/projects`;

      const body = editingProject
        ? { ...projectData, projectId: editingProject.id, userId }
        : { ...projectData, userId };

      const response = await fetch(url, {
        method: editingProject ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save project');
      }

      setShowProjectModal(false);
      loadProjects(userId);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project and all its documents?')) return;

    try {
      const response = await fetch(`/api/projects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      loadProjects(userId);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  // Group sessions by date
  const groupSessionsByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { [key: string]: Session[] } = {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      Older: [],
    };

    sessions.forEach((session) => {
      const sessionDate = new Date(session.updated_at);
      const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

      if (sessionDay.getTime() === today.getTime()) {
        groups.Today.push(session);
      } else if (sessionDay.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(session);
      } else if (sessionDay >= lastWeek) {
        groups['Last 7 Days'].push(session);
      } else {
        groups.Older.push(session);
      }
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate();

  return (
    <div className="flex h-screen bg-brownish-gray-900">
      {/* Sidebar with smooth transition */}
      <div
        className={`bg-brownish-gray-950 text-white flex flex-col transition-all duration-300 ease-in-out ${
          showSidebar ? 'w-64' : 'w-0'
        } overflow-hidden border-r border-brownish-gray-800`}
      >
        {/* New Chat Button */}
        <div className="p-3 border-b border-brownish-gray-800">
          <button
            onClick={startNewChat}
            className="w-full bg-transparent border border-brownish-gray-700 hover:bg-brownish-gray-800 py-2.5 px-4 rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 hover:border-brownish-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Projects Section */}
        <div className="border-b border-brownish-gray-800 p-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-xs font-semibold text-brownish-gray-400 uppercase tracking-wider">
              Projects
            </h3>
            <button
              onClick={handleCreateProject}
              className="text-brownish-gray-400 hover:text-brownish-gray-200 transition-colors"
              title="Create new project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group relative px-3 py-2 rounded-lg hover:bg-brownish-gray-800 transition-colors duration-150 ${
                  selectedProject?.id === project.id ? 'bg-brownish-gray-800 border border-brownish-gray-700' : ''
                }`}
              >
                <div
                  onClick={() => handleSelectProject(project)}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <span>{project.icon}</span>
                  <span className="truncate flex-1">{project.name}</span>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(project);
                      setShowDocumentsPanel(true);
                    }}
                    className="text-brownish-gray-400 hover:text-brownish-gray-200 p-1 rounded hover:bg-brownish-gray-700"
                    title="Manage documents"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProject(project);
                    }}
                    className="text-brownish-gray-400 hover:text-brownish-gray-200 p-1 rounded hover:bg-brownish-gray-700"
                    title="Edit project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="text-brownish-gray-400 hover:text-red-400 p-1 rounded hover:bg-brownish-gray-700"
                    title="Delete project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-3">
          {Object.entries(sessionGroups).map(([groupName, groupSessions]) => {
            if (groupSessions.length === 0) return null;
            return (
              <div key={groupName} className="mb-4">
                <h3 className="text-xs font-semibold text-brownish-gray-400 mb-2 px-2 uppercase tracking-wider">
                  {groupName}
                </h3>
                <div className="space-y-1">
                  {groupSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group relative px-3 py-2.5 rounded-lg cursor-pointer hover:bg-brownish-gray-800 transition-colors duration-150 ${
                        currentSessionId === session.id ? 'bg-brownish-gray-800 border border-brownish-gray-700' : ''
                      }`}
                    >
                      <div
                        onClick={() => loadSessionMessages(session.id)}
                        className="flex-1 truncate text-sm pr-6"
                      >
                        {session.title}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-brownish-gray-400 hover:text-red-400 transition-all duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Toolbar */}
        <div className="border-t border-brownish-gray-800 p-3 flex gap-2">
          {/* Profile Button */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full h-10 bg-brownish-gray-800 hover:bg-brownish-gray-700 rounded-xl transition-colors duration-150 flex items-center justify-center font-semibold text-sm border border-brownish-gray-700"
            >
              {userEmail.charAt(0).toUpperCase()}
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-brownish-gray-800 rounded-xl shadow-2xl border border-brownish-gray-700 py-2 z-10 animate-slideIn">
                <div className="px-4 py-3 border-b border-brownish-gray-700">
                  <p className="text-sm font-medium truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    router.push('/settings');
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-brownish-gray-700 transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-brownish-gray-700 transition-colors duration-150 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => router.push('/settings')}
            className="h-10 w-10 bg-brownish-gray-800 hover:bg-brownish-gray-700 rounded-xl transition-colors duration-150 flex items-center justify-center border border-brownish-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-brownish-gray-900">
        {/* Header */}
        <div className="bg-brownish-gray-900 border-b border-brownish-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-brownish-gray-300 hover:text-white hover:bg-brownish-gray-800 rounded-xl p-2 transition-colors duration-150"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="ml-4">
              {selectedProject ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedProject.icon}</span>
                    <h1 className="text-lg font-semibold text-white">
                      {selectedProject.name}
                    </h1>
                  </div>
                  <p className="text-xs text-brownish-gray-400 mt-0.5">
                    {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                  </p>
                </div>
              ) : (
                <h1 className="text-lg font-semibold text-white">
                  LLM Chat
                </h1>
              )}
            </div>
          </div>
          {selectedProject && (
            <button
              onClick={() => setShowDocumentsPanel(true)}
              className="text-brownish-gray-300 hover:text-brownish-gray-100 hover:bg-brownish-gray-800 rounded-xl p-2 transition-colors duration-150"
              title="Manage documents"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-brownish-gray-400 mt-32">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-brownish-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-2xl font-semibold text-brownish-gray-200 mb-2">Start a conversation</p>
                <p className="text-sm text-brownish-gray-400">Ask me anything or choose a project from the sidebar</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="group animate-slideIn"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold shadow-lg ${
                      message.role === 'user'
                        ? 'bg-brownish-gray-600 text-white'
                        : 'bg-brownish-gray-700 text-brownish-gray-100'
                    }`}>
                      {message.role === 'user' ? userEmail.charAt(0).toUpperCase() : 'AI'}
                    </div>

                    {/* Message content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-brownish-gray-200">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-brownish-gray-100 whitespace-pre-wrap leading-relaxed text-base">
                          {message.content}
                        </p>
                      </div>

                      {/* Copy button - appears on hover */}
                      {message.role === 'assistant' && (
                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => copyMessage(message.id, message.content)}
                            className="text-xs text-brownish-gray-400 hover:text-brownish-gray-200 flex items-center gap-1 transition-colors duration-150"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="group animate-slideIn">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-brownish-gray-700 text-brownish-gray-100 flex items-center justify-center text-sm font-semibold shadow-lg">
                    AI
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-brownish-gray-200">Assistant</span>
                    </div>
                    <p className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-brownish-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="inline-block w-2 h-2 bg-brownish-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="inline-block w-2 h-2 bg-brownish-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-brownish-gray-800 bg-brownish-gray-900">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {/* Selected files and web search indicator */}
            {(selectedFiles.length > 0 || webSearchEnabled) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {/* Web search indicator */}
                {webSearchEnabled && (
                  <div className="flex items-center gap-2 bg-brownish-gray-700 border border-brownish-gray-600 rounded-xl px-3 py-1.5 text-sm">
                    <svg className="w-4 h-4 text-brownish-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className="text-brownish-gray-200">Web Search</span>
                    <button
                      type="button"
                      onClick={() => setWebSearchEnabled(false)}
                      className="text-brownish-gray-400 hover:text-red-400 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {/* Selected files */}
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-brownish-gray-800 border border-brownish-gray-700 rounded-xl px-3 py-1.5 text-sm"
                  >
                    <span className="text-brownish-gray-300 truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-brownish-gray-400 hover:text-red-400 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={sendMessage} className="relative">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="relative flex items-center gap-2 bg-brownish-gray-800 border border-brownish-gray-700 rounded-xl shadow-lg focus-within:border-brownish-gray-600 focus-within:ring-2 focus-within:ring-brownish-gray-600 focus-within:ring-opacity-30 transition-all duration-150">
                {/* Plus button for file upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 ml-2 text-brownish-gray-400 hover:text-brownish-gray-200 p-1.5 rounded-lg hover:bg-brownish-gray-700 transition-colors duration-150"
                  title="Upload files or images"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Web Search Toggle */}
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={`flex-shrink-0 p-1.5 rounded-lg transition-colors duration-150 ${
                    webSearchEnabled
                      ? 'text-brownish-gray-100 bg-brownish-gray-600'
                      : 'text-brownish-gray-400 hover:text-brownish-gray-200 hover:bg-brownish-gray-700'
                  }`}
                  title={webSearchEnabled ? 'Web search enabled' : 'Enable web search'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message LLM Chat..."
                  className="flex-1 px-2 py-2.5 bg-transparent resize-none focus:outline-none text-brownish-gray-100 placeholder-brownish-gray-500 text-sm leading-relaxed max-h-[120px]"
                  disabled={loading}
                  rows={1}
                  style={{ minHeight: '40px' }}
                />

                <button
                  type="submit"
                  disabled={loading || (!input.trim() && selectedFiles.length === 0)}
                  className="flex-shrink-0 mr-2 bg-brownish-gray-600 text-white p-1.5 rounded-lg hover:bg-brownish-gray-500 disabled:bg-brownish-gray-700 disabled:cursor-not-allowed transition-all duration-150 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleSaveProject}
        project={editingProject}
        userId={userId}
      />

      {/* Documents Panel */}
      <DocumentsPanel
        isOpen={showDocumentsPanel}
        onClose={() => {
          setShowDocumentsPanel(false);
          if (selectedProject) {
            loadDocumentCount(selectedProject.id);
          }
        }}
        projectId={selectedProject?.id || null}
        projectName={selectedProject?.name || ''}
        userId={userId}
      />

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideIn {
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
