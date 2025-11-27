'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  last_used: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState('');
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
    loadApiKeys(storedUserId);
  }, [router]);

  const loadApiKeys = async (uid: string) => {
    try {
      const response = await fetch(`/api/keys?userId=${uid}`);
      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: newKeyName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }

      setNewlyCreatedKey(data.key.fullKey);
      setNewKeyName('');
      setShowNewKeyModal(true);
      loadApiKeys(userId);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      loadApiKeys(userId);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
          <button
            onClick={() => router.push('/chat')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Chat
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="col-span-1">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('integrations')}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  activeTab === 'integrations'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Integrations
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  activeTab === 'account'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Account
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="col-span-3">
            {activeTab === 'integrations' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    API Keys
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Create API keys to use your LLM in external applications. Compatible with OpenAI SDK.
                  </p>
                </div>

                <div className="p-6">
                  {/* Create New Key */}
                  <div className="mb-6 flex gap-3">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="API Key Name (e.g., My App)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={createApiKey}
                      disabled={loading || !newKeyName.trim()}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                      {loading ? 'Creating...' : 'Create Key'}
                    </button>
                  </div>

                  {/* API Keys List */}
                  <div className="space-y-3">
                    {apiKeys.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="mb-2">No API keys yet</p>
                        <p className="text-sm">Create your first API key to get started</p>
                      </div>
                    ) : (
                      apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-gray-800">{key.name}</h3>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                {key.key}
                              </code>
                            </div>
                            <p className="text-xs text-gray-500">
                              Created {new Date(key.created_at).toLocaleDateString()}
                              {key.last_used && ` • Last used ${new Date(key.last_used).toLocaleDateString()}`}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteApiKey(key.id)}
                            className="ml-4 text-red-600 hover:text-red-700 px-3 py-1 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Usage Instructions */}
                  {apiKeys.length > 0 && (
                    <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">
                        How to use your API key:
                      </h4>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p>Use your API key with any OpenAI-compatible application:</p>
                        <pre className="bg-white p-3 rounded border border-blue-200 overflow-x-auto text-xs">
{`from openai import OpenAI

client = OpenAI(
    base_url="https://llm-chat-window-6f6r88iqy-ekoapps.vercel.app/api/v1",
    api_key="YOUR_API_KEY_HERE"
)

response = client.chat.completions.create(
    model="local-model",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-800">Account</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={userEmail}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              API Key Created Successfully!
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Save this key now. You won't be able to see it again!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-4 py-3 rounded border border-gray-300 text-sm break-all">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey, 'new')}
                  className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 transition text-sm"
                >
                  {copiedKeyId === 'new' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Store this key securely. Anyone with this key can access your LLM.
              </p>
            </div>
            <button
              onClick={() => {
                setShowNewKeyModal(false);
                setNewlyCreatedKey('');
              }}
              className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900 transition"
            >
              I've saved my key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
