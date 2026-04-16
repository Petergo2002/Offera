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

        {/* Builder Preview - Premium SaaS Showcase Visual */}
        <div className="relative max-w-6xl mx-auto group">
          <div className="absolute -inset-20 bg-gradient-to-r from-primary/30 via-primary-dim/10 to-primary/30 blur-[120px] opacity-20 -z-10" />
          
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-outline-variant/10 overflow-hidden transform transition-all duration-700 ease-out hover:shadow-primary/10">
            {/* Refined Minimalist Window Header */}
            <div className="bg-surface-container-lowest px-8 py-4 flex items-center justify-between border-b border-outline-variant/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-error/20 border border-error/10" />
                <div className="w-3 h-3 rounded-full bg-primary/20 border border-primary/10" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/10" />
              </div>
              <div className="px-6 py-1.5 rounded-lg bg-surface-container-low/30 text-[8px] text-on-surface-variant font-black tracking-[0.2em] uppercase opacity-40 italic border border-outline-variant/5">
                Live Preview System
              </div>
              <div className="w-12" />
            </div>
            
            <div className="aspect-[16/10] relative overflow-hidden bg-white p-4">
              <img 
                src="/assets/hero.png"
                alt="Offera Dashboard Interface"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
