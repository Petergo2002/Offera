import React from "react";
import { Sparkles, Check, Zap } from "lucide-react";

const BENEFITS = [
  "Se exakt tid spenderad per sida",
  "AI-prognos för sannolikhet att vinna dealen",
  "Automatiska 'follow-up' påminnelser",
  "Integrerad chat direkt i offertvyn"
];

export function Analytics() {
  return (
    <section className="py-40 bg-surface-container-low/20 overflow-hidden" id="funktioner">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="animate-in fade-in slide-in-from-left-12 duration-1000">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-8 shadow-sm">
              <Sparkles className="h-3 w-3" />
              Dataledd Försäljning
            </div>
            <h2 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter text-on-surface leading-[0.9] mb-8">
              Låt datan sköta <br/> <span className="text-primary italic">förhandlingen.</span>
            </h2>
            <p className="text-xl text-on-surface-variant leading-relaxed font-medium opacity-80 mb-12 max-w-xl">
              Sluta gissa. Få djupa insikter i hur dina förslag tas emot. Se heatmap-analyser över prissättningsavsnitt och få notiser vid varje interaktion.
            </p>
            
            <ul className="space-y-6">
              {BENEFITS.map(item => (
                <li key={item} className="flex items-center gap-4 group">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-black text-sm uppercase tracking-widest text-on-surface opacity-70">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-[3rem] opacity-30 -z-10" />
            <div className="bg-on-surface rounded-[3rem] shadow-2xl p-3 border border-outline-variant/10">
              <div className="rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/5">
                <img 
                  src="/assets/analytics.png" 
                  alt="Analytics Insights UI" 
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-2000"
                />
              </div>
            </div>
            
            {/* Overlay Stat Card */}
            <div className="absolute -bottom-10 -left-10 p-8 bg-white rounded-3xl shadow-elevated border border-outline-variant/10 animate-bounce-subtle">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 text-left">Deal Velocity</p>
                  <p className="text-2xl font-black text-on-surface">+34.2%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
