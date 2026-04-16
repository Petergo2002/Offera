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
        <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-8 shadow-sm">
            <Sparkles className="h-3 w-3" />
            Dataledd Försäljning
          </div>
          <h2 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter text-on-surface leading-[0.9] mb-8 max-w-3xl">
            Låt datan sköta <br/> <span className="text-primary italic">förhandlingen.</span>
          </h2>
          <p className="text-xl text-on-surface-variant leading-relaxed font-medium opacity-80 mb-12 max-w-2xl">
            Sluta gissa. Få djupa insikter i hur dina förslag tas emot. Se heatmap-analyser över prissättningsavsnitt och få notiser vid varje interaktion.
          </p>
          
          <ul className="flex flex-wrap justify-center gap-x-12 gap-y-6 max-w-4xl">
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
      </div>
    </section>
  );
}
