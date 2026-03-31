import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  { q: "Är den digitala signaturen juridiskt bindande?", a: "Ja, alla signaturer i Offera följer eIDAS-förordningen och är fullt juridiskt bindande i hela EU." },
  { q: "Kan jag använda min egen domän för offerterna?", a: "Absolut! I Pro-planen kan du koppla din egen domän (t.ex. offerter.dittbolag.se) för en helt integrerad upplevelse." },
  { q: "Hur fungerar AI-analysen?", a: "Vår AI modellerar beteendet hos dina kunder och jämför det med historisk data för att ge dig realtidsinsikter om dealens status." },
  { q: "Går det att integrera med mitt CRM?", a: "Ja, vi har färdiga integrationer för HubSpot, Salesforce och Pipedrive, samt ett öppet API för egna lösningar." }
];

export function Faq() {
  const [activeFaq, setActiveFaq] = React.useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <section className="py-40 bg-white" id="faq">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-24">
           <h3 className="font-headline text-5xl font-black tracking-tighter text-on-surface">Vanliga frågor.</h3>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((f, i) => (
            <div 
              key={i} 
              className="rounded-3xl border border-outline-variant/10 overflow-hidden cursor-pointer group"
              onClick={() => toggleFaq(i)}
            >
              <button 
                className="w-full text-left p-8 flex items-center justify-between bg-surface-container-low/20 group-hover:bg-surface-container-low/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-expanded={activeFaq === i}
                aria-controls={`faq-answer-${i}`}
              >
                <h4 className="font-black text-sm uppercase tracking-widest text-on-surface">{f.q}</h4>
                <div className={cn("transition-transform duration-300", activeFaq === i ? "rotate-180" : "")}>
                  <ChevronDown className="h-5 w-5 text-on-surface-variant opacity-40" />
                </div>
              </button>
              {activeFaq === i && (
                <div 
                  id={`faq-answer-${i}`}
                  className="p-8 bg-white text-on-surface-variant font-medium text-lg italic leading-relaxed border-t border-outline-variant/5 animate-in slide-in-from-top-2"
                  role="region"
                >
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
