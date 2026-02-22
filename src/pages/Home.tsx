import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { EVENT_DETAILS } from '../lib/constants';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Islamic Motif Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="max-w-2xl w-full bg-emerald-900/50 backdrop-blur-md border border-emerald-800/50 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative z-10">
        <div className="w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          <img 
            src="https://raw.githubusercontent.com/g-59129199-Firdaus/borang/refs/heads/main/photo_2026-02-22_14-32-32.png" 
            alt="Logo PASTI" 
            className="w-full h-full object-contain drop-shadow-xl"
            crossOrigin="anonymous"
          />
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold text-amber-400 mb-6 leading-tight font-serif">
          {EVENT_DETAILS.title}
        </h1>
        
        <div className="space-y-4 mb-10 text-emerald-100/80 text-lg">
          <div className="flex items-center justify-center gap-3">
            <Calendar className="w-5 h-5 text-amber-400/80" />
            <span>{EVENT_DETAILS.date}</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <MapPin className="w-5 h-5 text-amber-400/80" />
            <span>{EVENT_DETAILS.location}</span>
          </div>
        </div>
        
        <Link 
          to="/payment" 
          className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:-translate-y-1"
        >
          Buat Pembayaran
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
      
      <div className="mt-12 text-emerald-500/60 text-sm">
        <Link to="/admin" className="hover:text-amber-400/60 transition-colors">Admin Login</Link>
      </div>
    </div>
  );
}
