import React from "react";
import { ShieldCheck } from "lucide-react";

const FOOTER_COLUMNS = [
  { title: "Produkt", links: ["Funktioner", "Processen", "Säkerhet", "Prissättning"] },
  { title: "Resurser", links: ["Dokumentation", "Success Stories", "Blogg", "Hjälpcenter"] },
  { title: "Bolaget", links: ["Om oss", "Karriär", "Presskit", "Kontakt"] }
];

export function Footer() {
  return (
    <footer className="bg-surface-container-low/50 border-t border-outline-variant/10 py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-24">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-10">
              <div className="w-10 h-10 auth-gradient rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <span className="text-3xl font-black tracking-tighter text-on-surface">Offera</span>
            </div>
            <p className="text-on-surface-variant font-medium leading-relaxed opacity-60 italic">
              Vi bygger nästa generations plattform för digital försäljning och kontraktshantering. Designad i Norden för den globala marknaden.
            </p>
          </div>
          
          {FOOTER_COLUMNS.map(col => (
             <div key={col.title}>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface mb-8 opacity-40">{col.title}</h5>
               <ul className="space-y-4">
                 {col.links.map(l => (
                   <li key={l}>
                     <a href="#" className="font-bold text-sm text-on-surface-variant hover:text-primary transition-colors tracking-wide">
                       {l}
                     </a>
                   </li>
                 ))}
               </ul>
             </div>
          ))}
        </div>

        <div className="pt-12 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-8 text-on-surface-variant font-black text-[10px] uppercase tracking-widest opacity-40">
            <a href="#" className="hover:text-primary transition-colors">Integritet</a>
            <a href="#" className="hover:text-primary transition-colors">Termer</a>
            <a href="#" className="hover:text-primary transition-colors">Sitemap</a>
          </div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-on-surface-variant/40">
            © 2024 OFFERA INC. ENGINEERED WITH PRECISION.
          </p>
        </div>
      </div>
    </footer>
  );
}
