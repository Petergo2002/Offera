import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface PricingPlan {
  name: string;
  price: string;
  desc: string;
  features: string[];
  cta: string;
  popular: boolean;
}

export function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <section className="py-40 bg-white" id="priser">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="mb-24">
          <h2 className="text-[11px] font-black text-primary uppercase tracking-[0.4em] mb-6">Prissättning</h2>
          <h3 className="font-headline text-5xl lg:text-8xl font-black tracking-tighter text-on-surface leading-[0.85] max-w-4xl mx-auto">
            Varför betala för att <br/>
            <span className="text-primary italic">vinna</span> projekt?
          </h3>
          <p className="mt-10 text-on-surface-variant text-xl lg:text-2xl max-w-2xl mx-auto leading-relaxed font-medium opacity-70">
            Vi tror på kraften i bra design. Därför är Offera nu helt kostnadsfritt för alla – från frilansare till stora team.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="p-12 sm:p-20 rounded-[4rem] bg-on-surface text-white border-on-surface shadow-3xl relative overflow-hidden group transition-all duration-700 hover:scale-[1.02]">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50" />
            
            <div className="relative z-10 text-center">
              <h4 className="text-[10px] font-black uppercase tracking-[0.5em] mb-8 text-primary shadow-sm">Standardutgåvan</h4>
              <div className="flex flex-col items-center gap-2 mb-12">
                <span className="text-8xl font-black tracking-tighter leading-none">0 kr</span>
                <span className="text-sm font-bold opacity-40 uppercase tracking-widest">Gratis för alltid</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 mb-16 text-left max-w-xl mx-auto">
                {[
                  "Obegränsade Offerter",
                  "Elite Mallbibliotek",
                  "Digital Signering",
                  "Full Analytics (AI)",
                  "Custom Branding",
                  "Teamsamarbeten"
                ].map(f => (
                  <div key={f} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-80">{f}</span>
                  </div>
                ))}
              </div>

              <Button 
                className="h-20 w-full sm:w-auto px-16 rounded-2xl bg-white text-on-surface hover:bg-surface-container-low text-xl font-black shadow-2xl transition-all active:scale-95 group"
                onClick={() => setLocation("/auth")}
              >
                KOM IGÅNG NU
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
          
          <p className="mt-12 text-sm font-bold text-on-surface-variant opacity-40 italic">
            Ingen provperiod, inget kreditkort, bara ren designglädje.
          </p>
        </div>
      </div>
    </section>
  );
}
