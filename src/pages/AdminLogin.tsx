import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email === 'firdaushadi442@gmail.com' && password === '21111990firdaus') {
      // In a real app, use proper auth. For this requirement, simple client-side check is enough.
      sessionStorage.setItem('adminAuth', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Email atau kata laluan tidak sah.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute top-6 left-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-emerald-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
      </div>

      <div className="max-w-md w-full bg-emerald-900/80 backdrop-blur-sm border border-emerald-800 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-8 font-serif">Admin Panel</h2>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-emerald-200 mb-2">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-emerald-950 border border-emerald-700 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="admin@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-emerald-200 mb-2">Kata Laluan</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-emerald-950 border border-emerald-700 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold py-3 rounded-xl transition-colors mt-4"
          >
            Log Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
