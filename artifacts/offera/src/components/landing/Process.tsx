import React from "react";
import { FileText, PenTool, BarChart3, ShieldCheck } from "lucide-react";

interface ProcessStep {
  step: string;
  label: string;
  title: string;
  desc: string;
  icon: any;
}

const STEPS: ProcessStep[] = [
  {
    step: "01",
    label: "Importera",
    title: "Smarta Underlag",
    desc: "Anslut ditt CRM eller klistra in projektbeskrivningen. Vår AI strukturerar allt.",
    icon: FileText
  },
  {
    step: "02",
    label: "Designa",
    title: "Visuell Perfektion",
    desc: "Välj en arkitektonisk mall. Anpassa typsnitt, färger och layout med ett klick.",
    icon: PenTool
  },
  {
    step: "03",
    label: "Analysera",
    title: "Real-time Tracking",
    desc: "Se exakt när kunden läser offerten och vilka delar de fokuserar på.",
    icon: BarChart3
  },
  {
    step: "04",
    label: "Stäng",
    title: "Legal Signering",
    desc: "Kunden signerar digitalt. Affären är klar, fakturan skapas automatiskt.",
    icon: ShieldCheck
  }
];

export function Process() {
  return (
    <section className="py-40 bg-white" id="process">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-32">
          <h2 className="text-[11px] font-black text-primary uppercase tracking-[0.4em] mb-6">Arbetsflödet</h2>
          <h3 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter text-on-surface leading-[0.9]">
            Från idé till <br/> <span className="text-primary italic">signerat</span> kontrakt.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-10 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent" />
          
          {STEPS.map((p, i) => (
            <div key={i} className="group relative">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mb-8 border border-outline-variant/10 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-subtle group-hover:shadow-primary/20">
                <p.icon className="h-7 w-7" />
              </div>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[10px] font-black text-primary opacity-40">{p.step}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{p.label}</span>
              </div>
              <h4 className="font-headline text-2xl font-black text-on-surface mb-4">{p.title}</h4>
              <p className="text-on-surface-variant font-medium opacity-60 leading-relaxed italic">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
