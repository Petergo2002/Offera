import React from "react";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup" | "reset";

export default function AuthPage() {
  const { toast } = useToast();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = React.useState<AuthMode>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        return;
      }

      if (mode === "signup") {
        if (password.length < 8) {
          throw new Error("Lösenordet måste vara minst 8 tecken.");
        }

        if (password !== confirmPassword) {
          throw new Error("Lösenorden matchar inte.");
        }

        const result = await signUp(email.trim(), password);

        if (result.needsEmailConfirmation) {
          setNotice(
            "Kontot är skapat. Kontrollera din inkorg för att verifiera e-postadressen innan du loggar in.",
          );
        } else {
          toast({
            title: "Konto skapat",
            description: "Du är nu inloggad och kan fortsätta i Offera.",
          });
        }

        return;
      }

      await resetPassword(email.trim());
      setNotice(
        "Vi har skickat en återställningslänk till din e-postadress.",
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          mode === "reset"
            ? "Kunde inte skicka återställningslänk"
            : "Autentisering misslyckades",
        description:
          error instanceof Error ? error.message : "Försök igen om en stund.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased overflow-x-hidden">
      <main className="min-h-screen flex items-center justify-center p-6 sm:p-12 relative">
        {/* Architectural Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[5%] right-[0%] w-[30%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-elevated border border-outline-variant/10">
          {/* Left Side: Visual/Branding */}
          <div className="hidden md:flex flex-col justify-between p-16 bg-surface-container-low relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-16">
                <div className="w-10 h-10 auth-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-headline font-black tracking-tighter text-on-surface">Offera</span>
              </div>
              
              <h2 className="text-5xl font-headline font-black text-on-surface leading-[1.1] mb-8 tracking-tighter">
                Den nya standarden för <br/>
                <span className="text-primary italic">affärsförslag.</span>
              </h2>
              
              <p className="text-on-surface-variant max-w-sm text-lg leading-relaxed italic opacity-80">
                Effektivisera ditt arbetsflöde med precisionsverktyg designade för moderna kreatörer och digitala arkitekter.
              </p>
            </div>

            <div className="relative z-10 mt-12">
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/50 border border-white backdrop-blur-sm shadow-subtle">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className="w-10 h-10 rounded-full border-2 border-white bg-surface-container-high" 
                    />
                  ))}
                </div>
                <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant opacity-60">Används av 2,000+ bolag</p>
              </div>
            </div>

            {/* Abstract Pattern - SVG from Stitch */}
            <div className="absolute bottom-0 right-0 w-full h-full opacity-[0.03] pointer-events-none translate-x-1/4 translate-y-1/4">
              <svg className="w-full h-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <path className="text-primary" d="M0,400 L400,400 L400,0 L350,0 L350,350 L0,350 Z" fill="currentColor"></path>
                <path className="text-primary" d="M50,300 L300,300 L300,50 L250,50 L250,250 L50,250 Z" fill="currentColor"></path>
                <path className="text-primary" d="M100,200 L200,200 L200,100 L150,100 L150,150 L100,150 Z" fill="currentColor"></path>
              </svg>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="p-8 sm:p-16 flex flex-col justify-center bg-white">
            <div className="mb-10 text-center md:text-left">
              <h1 className="text-4xl font-headline font-black tracking-tighter text-on-surface mb-3 leading-none">
                {mode === "login" ? "Välkommen tillbaka" : mode === "signup" ? "Skapa ditt konto" : "Återställ lösenord"}
              </h1>
              <p className="text-on-surface-variant text-lg font-medium opacity-70">
                {mode === "login" 
                  ? "Logga in för att hantera dina offerter." 
                  : mode === "signup" 
                    ? "Börja din resa med Offera idag."
                    : "Ange din e-post för att få en länk."}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="mb-10 flex p-1.5 bg-surface-container-low rounded-2xl">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setNotice(null);
                  }}
                  className={cn(
                    "flex-1 py-3 px-6 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                    mode === m 
                      ? "bg-white text-on-surface shadow-subtle" 
                      : "text-on-surface-variant hover:text-on-surface opacity-60"
                  )}
                >
                  {m === "login" ? "Logga in" : "Signa upp"}
                </button>
              ))}
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 px-1">
                  E-postadress
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-40" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="namn@bolag.se"
                    required
                    className="h-16 pl-12 rounded-2xl border-none bg-surface-container-low font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary shadow-inner-primary transition-all"
                  />
                </div>
              </div>

              {mode !== "reset" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">
                      Lösenord
                    </Label>
                    {mode === "login" && (
                      <button 
                        type="button"
                        onClick={() => setMode("reset")}
                        className="text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary-dim transition-colors"
                      >
                        Glömt lösenord?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-40" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-16 pl-12 rounded-2xl border-none bg-surface-container-low font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary shadow-inner-primary transition-all"
                    />
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60 px-1">
                    Bekräfta lösenord
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-40" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Skriv lösenordet igen"
                      required
                      className="h-16 pl-12 rounded-2xl border-none bg-surface-container-low font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary shadow-inner-primary transition-all"
                    />
                  </div>
                </div>
              )}

              {notice && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary animate-in zoom-in-95">
                  {notice}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-16 rounded-2xl auth-gradient text-white text-xl font-black shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Skicka länk"}
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-on-surface-variant font-bold text-sm opacity-60">
                Säker 256-bit SSL-kryptering är aktiv
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 opacity-30 group grayscale hover:grayscale-0 transition-all">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Verified by Supabase</span>
              </div>
            </div>
            
            {mode === "reset" && (
              <button
                onClick={() => setMode("login")}
                className="mt-8 text-sm font-black uppercase tracking-widest text-primary hover:text-primary-dim transition-colors"
              >
                Tillbaka till logga in
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full py-12 bg-surface border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40">
          <div className="flex items-center gap-4">
            <span className="text-lg font-black tracking-tighter text-on-surface">Offera</span>
            <div className="h-4 w-[1px] bg-outline-variant" />
            <p className="text-xs font-bold leading-relaxed text-on-surface-variant">© 2024 Offera Inc. Built for architects of the digital age.</p>
          </div>
          <nav className="flex gap-8">
            {["Privacy", "Terms", "Support"].map(l => (
              <a key={l} href="#" className="text-xs font-bold tracking-widest uppercase hover:text-primary transition-colors">{l}</a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
