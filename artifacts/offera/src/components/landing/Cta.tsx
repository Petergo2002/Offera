import React from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function Cta() {
  const [, setLocation] = useLocation();

  return (
    <section className="py-40 px-6">
      <div className="max-w-7xl mx-auto rounded-[4rem] bg-on-surface text-white p-12 lg:p-32 text-center relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(44,52,55,0.4)]">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        <div className="absolute top-0 right-0 w-[60%] h-full bg-primary/10 blur-[150px] -z-10" />
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="font-headline text-5xl lg:text-[100px] font-black tracking-tighter mb-12 leading-[0.85]">
            Bygg framtiden. <br/> <span className="text-primary italic">Offera</span> den nu.
          </h2>
          <p className="text-on-surface-variant text-xl lg:text-3xl mb-16 opacity-70 leading-relaxed font-medium">
            Gå med i eliten av digitala säljare. Ingen setup-avgift, ingen bindningstid.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Button 
              size="lg"
              className="cta-gradient h-24 px-16 rounded-[2rem] text-3xl font-black shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
              onClick={() => setLocation("/auth")}
            >
              Skapa min första offert
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
