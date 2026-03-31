import React from "react";

const LOGOS = ["VOX", "SYNDICATE", "VOLVO", "FORBES", "STRIPE"];

export function TrustBar() {
  return (
    <section className="py-24 bg-surface-container-low/30 border-y border-outline-variant/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
          <span className="text-xl font-black italic tracking-tighter text-on-surface">Vinnare av "Best UI 2024"</span>
          <div className="flex flex-wrap justify-center items-center gap-16">
            {LOGOS.map((logo) => (
              <span key={logo} className="text-2xl font-black tracking-tighter text-on-surface">{logo}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
