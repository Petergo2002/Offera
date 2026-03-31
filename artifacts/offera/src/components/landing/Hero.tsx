import React from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

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
              Börja bygga — Gratis
            </Button>
            <div className="flex flex-col items-center sm:items-start gap-1">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-on-surface/5" />
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-primary flex items-center justify-center text-[10px] text-white font-black">+49</div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Betrodd av 5,000+ frilansare</p>
            </div>
          </div>
        </div>

        {/* Builder Preview - Elite Visual */}
        <div className="relative max-w-6xl mx-auto group perspective-1000">
          <div className="absolute -inset-10 bg-gradient-to-r from-primary/20 via-primary-dim/20 to-primary/20 blur-[100px] opacity-30 -z-10 group-hover:opacity-50 transition-opacity duration-1000" />
          <div className="bg-white/40 backdrop-blur-md p-2 rounded-[3.5rem] border border-white/50 shadow-2xl transform rotate-x-2 group-hover:rotate-x-0 transition-transform duration-1000 shadow-primary/5">
            <div className="bg-white rounded-[3rem] shadow-elevated border border-outline-variant/10 overflow-hidden relative">
              {/* Browser Decorations */}
              <div className="bg-surface-container-high px-8 py-5 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-error/40" />
                  <div className="w-3.5 h-3.5 rounded-full bg-primary/20" />
                  <div className="w-3.5 h-3.5 rounded-full bg-primary/40" />
                </div>
                <div className="bg-white px-8 py-2 rounded-xl text-[10px] text-on-surface-variant font-black tracking-widest uppercase opacity-40 border border-outline-variant/5 min-w-[300px] text-center italic">
                  app.offera.se/builder/v2
                </div>
                <div className="w-10 h-1" />
              </div>
              
              <div className="aspect-[16/10] relative overflow-hidden bg-white">
                <img 
                  src="/assets/builder.png"
                  alt="Offera Builder Professional UI"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-2000"
                />
                
                {/* Floating Micro-UI */}
                <div className="absolute top-12 right-12 w-48 p-5 bg-white/90 backdrop-blur-xl rounded-2xl shadow-elevated border border-primary/10 animate-pulse-slow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">Live Edit</span>
                  </div>
                  <div className="h-1.5 w-full bg-on-surface/5 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-emerald-500" />
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
