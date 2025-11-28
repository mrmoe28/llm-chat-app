'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const userId = localStorage.getItem('userId');
    if (userId) {
      router.push('/chat');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store user data
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userEmail', data.user.email);

      // Redirect to chat
      router.push('/chat');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brownish-gray-950 via-brownish-gray-900 to-brownish-gray-800">
      <div className="bg-brownish-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-brownish-gray-700 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-brownish-gray-700 rounded-xl mb-4">
            <svg className="w-10 h-10 text-brownish-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-brownish-gray-100">
            LLM Chat App
          </h1>
          <p className="text-brownish-gray-400 text-sm mt-2">Connect with AI intelligence</p>
        </div>

        <div className="flex mb-6 bg-brownish-gray-950 rounded-xl p-1.5 border border-brownish-gray-700">
          <button
            className={`flex-1 py-2.5 rounded-lg transition-all duration-200 font-medium ${
              isLogin
                ? 'bg-brownish-gray-600 text-brownish-gray-50 shadow-lg'
                : 'text-brownish-gray-400 hover:text-brownish-gray-200'
            }`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2.5 rounded-lg transition-all duration-200 font-medium ${
              !isLogin
                ? 'bg-brownish-gray-600 text-brownish-gray-50 shadow-lg'
                : 'text-brownish-gray-400 hover:text-brownish-gray-200'
            }`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brownish-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-brownish-gray-950 border border-brownish-gray-700 rounded-xl focus:ring-2 focus:ring-brownish-gray-500 focus:border-transparent text-brownish-gray-100 placeholder-brownish-gray-500 transition-all duration-200"
              placeholder="your@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brownish-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-brownish-gray-950 border border-brownish-gray-700 rounded-xl focus:ring-2 focus:ring-brownish-gray-500 focus:border-transparent text-brownish-gray-100 placeholder-brownish-gray-500 transition-all duration-200"
              placeholder="Enter your password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brownish-gray-600 text-brownish-gray-50 py-3 px-4 rounded-xl hover:bg-brownish-gray-500 disabled:bg-brownish-gray-700 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brownish-gray-400">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-brownish-gray-300 hover:text-brownish-gray-100 font-medium transition-colors duration-200"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
