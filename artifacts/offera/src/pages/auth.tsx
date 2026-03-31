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
            "Kontot är skapat. Kontrollera din inkorg för att verifiera e-postadressen.",
          );
        } else {
          toast({
            title: "Konto skapat",
            description: "Välkommen till Offera!",
          });
        }
        return;
      }

      await resetPassword(email.trim());
      setNotice("Vi har skickat en återställningslänk till din e-post.");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ett fel uppstod",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface antialiased flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      <div className="w-full max-w-[480px] animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary-gradient rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 transition-transform hover:scale-110">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <span className="text-4xl font-display font-black tracking-tighter text-on-surface">Offera</span>
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight text-on-surface mb-3">
            {mode === "login" ? "Välkommen tillbaka" : mode === "signup" ? "Skapa ditt konto" : "Återställ lösenord"}
          </h1>
          <p className="text-on-surface-variant font-medium opacity-60">
            {mode === "login" ? "Proffsiga offerter på sekunder." : "Börja skicka vinnande förslag idag."}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-3xl p-10 rounded-[3rem] border border-white shadow-3xl shadow-primary/5 relative group">
          {/* Subtle line at the top */}
          <div className="absolute top-0 left-12 right-12 h-[2px] bg-primary-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Mode Switcher - Modern Pills */}
          <div className="mb-10 flex p-1.5 bg-surface-container-low rounded-2xl">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setNotice(null);
                }}
                className={cn(
                  "flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  mode === m 
                    ? "bg-white text-on-surface shadow-subtle" 
                    : "text-on-surface-variant hover:text-on-surface opacity-40 hover:opacity-80"
                )}
              >
                {m === "login" ? "Logga in" : "Signa upp"}
              </button>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-50 px-2">
                E-post
              </Label>
              <div className="relative group/input">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-30 group-focus-within/input:text-primary transition-colors" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namn@bolag.se"
                  required
                  className="h-16 pl-14 rounded-2xl border-transparent bg-surface-container-low font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary shadow-inner-primary transition-all"
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-50">
                    Lösenord
                  </Label>
                  {mode === "login" && (
                    <button 
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-dim transition-colors"
                    >
                      Glömt?
                    </button>
                  )}
                </div>
                <div className="relative group/input">
                  <LockKeyhole className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-30 group-focus-within/input:text-primary transition-colors" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-16 pl-14 rounded-2xl border-transparent bg-surface-container-low font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary shadow-inner-primary transition-all"
                  />
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-50 px-2">
                  Bekräfta
                </Label>
                <div className="relative group/input">
                  <LockKeyhole className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant opacity-30 group-focus-within/input:text-primary transition-colors" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Samma igen"
                    required
                    className="h-16 pl-14 rounded-2xl border-transparent bg-surface-container-low font-bold text-lg focus-visible:ring-2 focus-visible:ring-primary shadow-inner-primary transition-all"
                  />
                </div>
              </div>
            )}

            {notice && (
              <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/10 text-xs font-bold text-primary animate-in zoom-in-95 leading-relaxed">
                {notice}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-18 rounded-2xl bg-primary-gradient text-white text-xl font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 group"
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="flex items-center">
                  <span>{mode === "login" ? "Logga in" : mode === "signup" ? "Skapa konto" : "Skicka länk"}</span>
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {mode === "reset" && (
            <button
              onClick={() => setMode("login")}
              className="mt-8 w-full text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40 hover:opacity-100 transition-opacity"
            >
              Tillbaka till logga in
            </button>
          )}
        </div>

        <div className="mt-12 text-center opacity-30 select-none">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">Secured by industry standards</p>
          <div className="flex items-center justify-center gap-6">
            <ShieldCheck className="h-5 w-5" />
            <KeyRound className="h-5 w-5" />
            <Mail className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
