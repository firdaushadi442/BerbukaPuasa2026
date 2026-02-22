import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Check, X, ExternalLink, Loader2, Search } from 'lucide-react';
import { getSubmissions, updateSubmissionStatus } from '../lib/api';
import type { SubmissionData } from '../types';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const isAuth = sessionStorage.getItem('adminAuth');
    if (!isAuth) {
      navigate('/admin');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await getSubmissions();
      if (res.success) {
        setSubmissions(res.data);
      } else if (res.error === 'fetch_failed') {
        alert('Gagal menyambung ke pangkalan data. Sila pastikan Google Apps Script telah di-deploy dengan akses "Anyone".');
      }
    } catch (error) {
      console.error('Failed to fetch submissions', error);
      alert('Ralat sistem semasa memuat turun data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin');
  };

  const handleStatusChange = async (rowIndex: number, newStatus: 'LULUS' | 'DITOLAK') => {
    setIsUpdating(rowIndex);
    try {
      const res = await updateSubmissionStatus(rowIndex, newStatus);
      if (res.success) {
        setSubmissions(prev => 
          prev.map(sub => sub.rowIndex === rowIndex ? { ...sub, Status: newStatus } : sub)
        );
      } else {
        alert('Gagal mengemaskini status: ' + res.message);
      }
    } catch (error) {
      alert('Ralat sistem semasa mengemaskini status.');
    } finally {
      setIsUpdating(null);
    }
  };

  const totalKutipan = submissions
    .filter(s => s.Status === 'LULUS')
    .reduce((sum, s) => sum + (Number(s.TotalAmount) || 0), 0);

  const filteredSubmissions = submissions.filter(s => 
    s.FamilyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-emerald-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-emerald-900/50 p-6 rounded-3xl border border-emerald-800/50">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 font-serif">Dashboard Admin</h1>
            <p className="text-emerald-200 text-sm mt-1">Pengurusan Pembayaran Majlis Berbuka Puasa</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-emerald-950 px-4 py-2 rounded-xl border border-emerald-800 text-right">
              <p className="text-xs text-emerald-400 uppercase tracking-wider">Jumlah Kutipan (Lulus)</p>
              <p className="text-xl font-bold text-amber-400">RM {totalKutipan}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl transition-colors border border-red-900/50"
              title="Log Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
            <input 
              type="text"
              placeholder="Cari nama keluarga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-emerald-900/50 border border-emerald-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            Segar Semula
          </button>
        </div>

        {/* Table */}
        <div className="bg-emerald-900/40 border border-emerald-800/50 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-950/80 border-b border-emerald-800/50 text-emerald-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Tarikh</th>
                  <th className="p-4 font-medium">Keluarga</th>
                  <th className="p-4 font-medium text-center">Kehadiran</th>
                  <th className="p-4 font-medium text-right">Jumlah (RM)</th>
                  <th className="p-4 font-medium text-right">AI Scan (RM)</th>
                  <th className="p-4 font-medium text-center">Resit</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-800/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-emerald-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Memuat turun data...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-emerald-400">
                      Tiada rekod dijumpai.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-emerald-800/20 transition-colors">
                      <td className="p-4 text-sm text-emerald-200 whitespace-nowrap">
                        {new Date(sub.Timestamp).toLocaleDateString('ms-MY', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 font-medium text-white">{sub.FamilyName}</td>
                      <td className="p-4 text-center text-sm text-emerald-200">
                        <div className="flex justify-center gap-3">
                          <span title="Dewasa">👨 {sub.Adults}</span>
                          <span title="Kanak-kanak">🧒 {sub.Children}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-amber-400">
                        {sub.TotalAmount}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-300">
                        {sub.ExtractedAmount ? (
                          <span title="Diekstrak oleh AI">{sub.ExtractedAmount}</span>
                        ) : (
                          <span className="text-emerald-500/30">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <a 
                          href={sub.ReceiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-lg transition-colors"
                          title="Lihat Resit"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider",
                          sub.Status === 'LULUS' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          sub.Status === 'DITOLAK' ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        )}>
                          {sub.Status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {isUpdating === sub.rowIndex ? (
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                          ) : (
                            <>
                              <button
                                onClick={() => handleStatusChange(sub.rowIndex, 'LULUS')}
                                disabled={sub.Status === 'LULUS'}
                                className="p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-emerald-700/50"
                                title="Lulus"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(sub.rowIndex, 'DITOLAK')}
                                disabled={sub.Status === 'DITOLAK'}
                                className="p-2 rounded-lg bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-red-900/50"
                                title="Tolak"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
