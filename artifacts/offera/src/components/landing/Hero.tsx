import React from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { TrendingUp, ShieldCheck } from "lucide-react";

export function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section className="relative pt-40 pb-24 lg:pt-56 lg:pb-40 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] right-[0%] w-[30%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-24 animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
          <div className="group cursor-default inline-flex items-center gap-2 bg-white border border-outline-variant/15 px-5 py-2 rounded-full text-[11px] font-black tracking-widest uppercase mb-10 shadow-subtle hover:border-primary/30 transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary shadow-[0_0_8px_rgba(78,69,228,0.5)]"></span>
            </span>
            <span className="text-on-surface-variant opacity-70">Nyhet v2.0:</span> 
            <span className="text-primary italic">Live AI Revisions</span>
          </div>
          
          <h1 className="font-headline text-6xl lg:text-[120px] font-black tracking-tighter text-on-surface mb-10 max-w-5xl leading-[0.85]">
            Offerter som vinner <br/>
            <span className="text-primary italic">varje</span> affär.
          </h1>
          
          <p className="text-on-surface-variant text-xl lg:text-3xl max-w-3xl mb-14 leading-relaxed font-medium opacity-80">
            Verktyget för arkitekter av den digitala eran. Skapa, skicka och signera högkonverterande förslag på rekordtid.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <Button 
              size="lg"
              className="cta-gradient h-20 px-14 rounded-2xl text-2xl font-black shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
              onClick={() => setLocation("/auth")}
            >
              Börja bygga — Gratis för alltid
            </Button>
            <div className="flex flex-col items-center sm:items-start gap-1">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-surface-container-high shadow-sm" />
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 px-1">Älskas av 5,000+ frilansare</p>
            </div>
          </div>
        </div>

        {/* Builder Preview - Elite Visual */}
        <div className="relative max-w-6xl mx-auto group perspective-2000">
          <div className="absolute -inset-20 bg-gradient-to-r from-primary/30 via-primary-dim/30 to-primary/30 blur-[120px] opacity-20 -z-10 group-hover:opacity-40 transition-opacity duration-1000" />
          
          <div className="relative bg-white/30 backdrop-blur-2xl p-3 rounded-[4rem] border border-white/40 shadow-3xl transform rotate-x-6 group-hover:rotate-x-0 transition-all duration-1000 ease-out shadow-primary/5">
            <div className="bg-white rounded-[3.5rem] shadow-elevated border border-outline-variant/10 overflow-hidden relative">
              {/* Browser Decorations - Minimalist */}
              <div className="bg-surface-container-lowest px-10 py-6 flex items-center justify-between border-b border-outline-variant/5">
                <div className="flex gap-3">
                  <div className="w-3 h-3 rounded-full bg-error/20" />
                  <div className="w-3 h-3 rounded-full bg-primary/10" />
                  <div className="w-3 h-3 rounded-full bg-primary/20" />
                </div>
                <div className="px-10 py-2.5 rounded-2xl bg-surface-container-low/50 text-[10px] text-on-surface-variant font-black tracking-[0.2em] uppercase opacity-40 italic border border-outline-variant/5">
                  preview.offera.se/proposal/mod-2026
                </div>
                <div className="w-12 h-1" />
              </div>
              
              <div className="aspect-[16/10] relative overflow-hidden bg-white">
                <img 
                  src="/assets/hero-proposal.png"
                  alt="Offera Elite Proposal Interface"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-3000 ease-out"
                />
                
                {/* Floating Micro-UI overlays */}
                <div className="absolute bottom-12 left-12 p-6 bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-elevated border border-primary/10 animate-float">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-50">Konvertering</p>
                      <p className="text-xl font-black text-on-surface">+34%</p>
                    </div>
                  </div>
                </div>

                <div className="absolute top-12 right-12 p-6 bg-primary shadow-2xl shadow-primary/40 rounded-[2rem] text-white animate-pulse-slow">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} />
                    <span className="text-sm font-black uppercase tracking-widest">Verifierad Signatur</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
