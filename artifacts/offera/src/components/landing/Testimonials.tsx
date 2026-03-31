import React from "react";
import { Quote } from "lucide-react";

interface Testimonial {
  text: string;
  author: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    text: "Offera har helt ändrat hur vi pitcherar för våra klienter. Vi skickar inte längre PDF:er, vi skickar upplevelser.",
    author: "Erik Ställberg",
    role: "Creative Director @ Vox"
  },
  {
    text: "Att kunna se exakt när kunden öppnar offerten ger oss ett enormt övertag i förhandlingen. AI-estimaten stämmer till 95%.",
    author: "Lisa Bergström",
    role: "Grundare @ Studio 24"
  },
  {
    text: "Det absolut smidigaste verktyget på marknaden. Vi sparar minst 4 timmar per vecka på administrativt arbete.",
    author: "Marcus Lindman",
    role: "Säljchef @ TechNexus"
  }
];

export function Testimonials() {
  return (
    <section className="py-40 bg-surface-container-low/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-4 border-surface bg-on-surface/5" />
              ))}
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Wall of Love</span>
          </div>
          <h3 className="font-headline text-5xl lg:text-7xl font-black tracking-tighter text-on-surface leading-[0.9]">
            Vad de <span className="text-primary italic">bästa</span> säger.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-10 rounded-[3rem] bg-white border border-outline-variant/10 shadow-subtle hover:shadow-elevated transition-all flex flex-col justify-between group">
              <Quote className="h-10 w-10 text-primary opacity-10 mb-8 group-hover:opacity-100 transition-opacity duration-700" />
              <p className="text-xl font-bold text-on-surface leading-normal italic mb-10">"{t.text}"</p>
              <div>
                <p className="font-black text-sm uppercase tracking-widest text-on-surface">{t.author}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-50 mt-1">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
