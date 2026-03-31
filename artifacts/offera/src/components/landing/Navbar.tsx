import React from "react";
import { ShieldCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface NavItem {
  name: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Funktioner", href: "#funktioner" },
  { name: "Process", href: "#process" },
  { name: "Priser", href: "#priser" },
  { name: "FAQ", href: "#faq" }
];

export function Navbar() {
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setLocation("/")}>
            <div className="w-8 h-8 auth-gradient rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-headline font-black tracking-tighter text-on-surface">Offera</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a 
                key={item.name} 
                href={item.href} 
                className="font-bold text-sm text-on-surface-variant/70 hover:text-on-surface transition-all tracking-wide"
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="hidden sm:flex font-black text-[11px] uppercase tracking-widest text-on-surface-variant/60"
            onClick={() => setLocation("/auth")}
          >
            Logga in
          </Button>
          <Button 
            className="cta-gradient text-white font-black text-xs uppercase tracking-widest px-8 py-3 rounded-xl shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
            onClick={() => setLocation("/auth")}
          >
            Kom igång
          </Button>
          <button 
            className="md:hidden p-2 text-on-surface"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Stäng meny" : "Öppna meny"}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-outline-variant/10 p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          {NAV_ITEMS.map((item) => (
            <a 
              key={item.name} 
              href={item.href} 
              className="block font-black text-sm uppercase tracking-widest text-on-surface"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.name}
            </a>
          ))}
          <hr className="border-outline-variant/10" />
          <Button 
            className="w-full justify-center rounded-xl py-6 auth-gradient text-white font-black uppercase tracking-widest text-xs"
            onClick={() => setLocation("/auth")}
          >
            Logga in
          </Button>
        </div>
      )}
    </nav>
  );
}
