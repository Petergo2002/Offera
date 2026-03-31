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

const PLANS: PricingPlan[] = [
  {
    name: "Frilans",
    price: "249",
    desc: "För solo-kreatörer som vill ha ett proffsigt ansikte utåt.",
    features: ["5 Offerter/mån", "Basmallar", "Digital Signering", "E-post Support"],
    cta: "Starta Gratis",
    popular: false
  },
  {
    name: "Byrå Pro",
    price: "699",
    desc: "Vår mest populära plan för team som skalar snabbt.",
    features: ["Obegränsade Offerter", "Elite Mallbibliotek", "Full Analytics (AI)", "Teamsamarbeten", "Custom Branding"],
    cta: "Välj Pro Planen",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Anpassade lösningar för stora organisationer och koncerner.",
    features: ["SAML/SSO", "API-Integration", "Dedikerad Success Manager", "Anpassade Juridiska Villkor"],
    cta: "Kontakta Oss",
    popular: false
  }
];

export function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <section className="py-40 bg-white" id="priser">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="mb-24">
          <h2 className="text-[11px] font-black text-primary uppercase tracking-[0.4em] mb-6">Prissättning</h2>
          <h3 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter text-on-surface leading-[0.9]">
            Enkelhet i <span className="text-primary italic">varje</span> nivå.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((p, i) => (
            <div 
              key={i} 
              className={cn(
                "p-12 rounded-[3rem] border transition-all duration-500 flex flex-col text-left group",
                p.popular 
                  ? "bg-on-surface text-white border-on-surface shadow-2xl scale-105 z-10" 
                  : "bg-surface-container-low border-outline-variant/10 text-on-surface hover:bg-white hover:border-primary/20"
              )}
            >
              <div className="mb-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-50">{p.name}</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">{p.price === "Custom" ? "Custom" : `${p.price} kr`}</span>
                  {p.price !== "Custom" && <span className="text-sm font-bold opacity-40">/ mån</span>}
                </div>
                <p className={cn("mt-6 text-sm font-medium leading-relaxed italic opacity-70")}>{p.desc}</p>
              </div>

              <div className="space-y-5 mb-12 flex-1">
                {p.features.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", p.popular ? "bg-white/10 text-white" : "bg-primary/10 text-primary")}>
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest opacity-80">{f}</span>
                  </div>
                ))}
              </div>

              <Button 
                className={cn(
                  "h-16 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                  p.popular 
                    ? "bg-white text-on-surface hover:bg-surface-container-low shadow-xl" 
                    : "bg-on-surface text-white hover:opacity-90"
                )}
                onClick={() => setLocation("/auth")}
              >
                {p.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <p className="mt-12 text-sm font-bold text-on-surface-variant opacity-40 italic">Inget kreditkort krävs. 14 dagars gratis provperiod på alla planer.</p>
      </div>
    </section>
  );
}
