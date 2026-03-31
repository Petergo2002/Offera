import React from "react";
import {
  Building2,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Upload,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isDirty,
    isSaving,
  } = useCompanySettings();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = React.useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Fel filtyp",
        description: "Vänligen ladda upp en bild (PNG, JPG, SVG).",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      await updateSettings({ logoUrl: base64 });
      setIsUploading(false);
      toast({
        title: "Logotyp laddad",
        description: "Klicka på Spara för att använda den i dina offerter.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (field: string, value: string) => {
    updateSettings({ [field]: value });
  };

  const handleSave = async () => {
    try {
      await saveSettings();
      toast({
        title: "Inställningarna sparades",
        description: "Företagsprofilen används nu som standard i nya offerter.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte spara inställningarna",
        description: error instanceof Error ? error.message : "Försök igen.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-8 bg-primary rounded-full" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
            Inställningar
          </p>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface">
          Företagsprofil
        </h1>
        <p className="mt-4 max-w-xl text-lg text-on-surface-variant/70 leading-relaxed font-medium">
          Dessa uppgifter kommer att användas som standard för alla dina
          offerter. Din logotyp och kontaktinformation syns direkt för dina
          kunder.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Left Column: Branding */}
        <div className="md:col-span-4 space-y-8">
          <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-subtle bg-white">
            <CardHeader className="bg-surface-container-low p-8">
              <CardTitle className="text-xl font-black tracking-tight">
                Varumärke
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40">
                Sätt din visuella identitet
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col items-center gap-6">
                <div
                  className={cn(
                    "relative h-40 w-40 rounded-[2rem] border-4 border-dashed border-outline-variant/10 bg-surface-container-lowest flex items-center justify-center overflow-hidden group transition-all duration-500",
                    settings.logoUrl
                      ? "border-solid border-primary/20"
                      : "hover:border-primary/40",
                  )}
                >
                  {settings.logoUrl ? (
                    <>
                      <img
                        src={settings.logoUrl}
                        alt="Företagslogotyp"
                        className="max-h-[80%] max-w-[80%] object-contain mt-2"
                      />
                      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => void updateSettings({ logoUrl: undefined })}
                          className="h-10 w-10 rounded-xl bg-white text-error shadow-elevated flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-on-surface-variant/30 text-center p-4">
                      <Upload size={32} strokeWidth={1} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Ladda upp logga
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                    accept="image/*"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 w-full">
                  <ShieldCheck size={20} className="text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-on-surface tracking-tight leading-none">
                      Smart komprimering
                    </p>
                    <p className="text-[10px] text-on-surface-variant/60 leading-tight">
                      Din logotyp skalas automatiskt för bästa prestanda.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-8 rounded-[2rem] bg-surface-container-low/50 border border-outline-variant/10 border-dashed">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-xl bg-on-surface text-surface flex items-center justify-center">
                <Zap size={16} />
              </div>
              <h4 className="font-black text-on-surface tracking-tight">
                Proffstips
              </h4>
            </div>
            <p className="text-xs text-on-surface-variant/70 leading-relaxed font-medium">
              Använd en PNG-bild med genomskinlig bakgrund för bästa resultat i
              alla offertdesigner.
            </p>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-8 space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-subtle overflow-hidden bg-white">
            <CardHeader className="bg-surface-container-low p-8">
              <CardTitle className="text-xl font-black tracking-tight">
                Företagsinformation
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40">
                Vem är avsändaren?
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Företagsnamn
                </Label>
                <div className="relative group">
                  <Building2
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) =>
                      handleChange("companyName", e.target.value)
                    }
                    placeholder="Ditt företagsnamn"
                    className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Kontaktperson
                </Label>
                <div className="relative group">
                  <User
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="contactName"
                    value={settings.contactName}
                    onChange={(e) =>
                      handleChange("contactName", e.target.value)
                    }
                    placeholder="För- och efternamn"
                    className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgNumber" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Org-nummer
                </Label>
                <div className="relative group">
                  <ShieldCheck
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="orgNumber"
                    value={settings.orgNumber}
                    onChange={(e) => handleChange("orgNumber", e.target.value)}
                    placeholder="55xxxx-xxxx"
                    className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  E-post
                </Label>
                <div className="relative group">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="email"
                    value={settings.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="kontakt@foretag.se"
                    className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Telefon
                </Label>
                <div className="relative group">
                  <Phone
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="070-000 00 00"
                    className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Gatuadress
                </Label>
                <div className="relative group">
                  <MapPin
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Gatunamn 1"
                    className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Postnummer
                </Label>
                <Input
                  id="postalCode"
                  value={settings.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  placeholder="123 45"
                  className="h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Ort
                </Label>
                <Input
                  id="city"
                  value={settings.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Stockholm"
                  className="h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <p className="ml-1 text-[11px] text-on-surface-variant/55">
                  Dessa fält fyller avsändaren i offerten med samma struktur som
                  i avtalsparterna.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website" className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-1">
                  Webbplats
                </Label>
                <div className="relative group">
                  <Globe
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
                  />
                  <Input
                    id="website"
                    value={settings.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="https://www.foretag.se"
                    className="pl-12 h-14 rounded-2xl border-none bg-surface-container-low shadow-inner-subtle focus-visible:ring-2 focus-visible:ring-primary/20 font-bold transition-all"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6 p-8 rounded-[2.5rem] bg-surface-container-low/30 border border-outline-variant/10 group overflow-hidden relative">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-black text-on-surface tracking-tight text-lg">
                  Spara när du är klar
                </p>
                <p className="text-xs text-on-surface-variant/60 font-medium">
                  Ändringarna ligger kvar i formuläret tills du väljer att spara dem.
                </p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-on-surface-variant/60">
                {isDirty
                  ? "Du har osparade ändringar i företagsprofilen."
                  : "Allt är sparat."}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isDirty || isSaving}
                  onClick={resetSettings}
                  className="h-12 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest"
                >
                  Ångra
                </Button>
                <Button
                  type="button"
                  disabled={!isDirty || isSaving || isUploading}
                  onClick={() => void handleSave()}
                  className="h-12 rounded-2xl px-8 text-[11px] font-black uppercase tracking-widest"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sparar
                    </>
                  ) : (
                    "Spara inställningar"
                  )}
                </Button>
              </div>
            </div>

            {/* Decorative Background Zap */}
            <div className="absolute right-[-20px] top-[-20px] text-primary/5 transform rotate-12 transition-transform group-hover:scale-110 duration-1000">
              <Zap size={160} strokeWidth={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
