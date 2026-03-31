import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, CheckCircle2, RotateCcw, XCircle, Plus, LockKeyhole } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api, type PublicProposalView } from "@/lib/api";
import {
  FONT_PAIRINGS,
  calculatePricingTotals,
  isPartiesSection,
  normalizeDesignSettings,
  formatCurrency,
  resolveDynamicText,
} from "@/lib/document";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SIGNATURE_CANVAS_HEIGHT = 220;
const MAX_SIGNATURE_DATA_URL_LENGTH = 500_000;

function normalizeInitialsInput(value: string) {
  return value.replace(/\s+/g, "").toUpperCase().slice(0, 5);
}

function normalizeSignerName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Kontrollera att alla fält är korrekt ifyllda och försök igen.";
}

export default function PublicProposal() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug || "";
  const accessToken =
    typeof window !== "undefined"
      ? (() => {
          const searchParams = new URLSearchParams(window.location.search);
          return searchParams.get("token") || searchParams.get("signing_token") || "";
        })()
      : "";
  const { toast } = useToast();

  const {
    data: fetchedProposal,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["public-proposal", slug, accessToken],
    queryFn: () => api.getPublicProposal(slug, accessToken || undefined),
  });
  const [isResponding, setIsResponding] = useState(false);

  const [latestProposal, setLatestProposal] = useState<PublicProposalView | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [initials, setInitials] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureCanvasWidth, setSignatureCanvasWidth] = useState(0);
  const [signatureDraftDataUrl, setSignatureDraftDataUrl] = useState("");

  const signaturePadRef = useRef<SignatureCanvas | null>(null);
  const signaturePadContainerRef = useRef<HTMLDivElement | null>(null);

  const proposal = latestProposal ?? fetchedProposal;
  const branding = proposal ? normalizeDesignSettings(proposal.branding) : null;

  useLayoutEffect(() => {
    if (!signatureModalOpen) {
      return;
    }

    let frameId = 0;
    const syncWidth = () => {
      const container = signaturePadContainerRef.current;
      const measuredWidth = container
        ? Math.floor(container.getBoundingClientRect().width)
        : 0;
      const nextWidth = Math.max(measuredWidth, 280);

      if (!container || measuredWidth === 0) {
        frameId = window.requestAnimationFrame(syncWidth);
        return;
      }

      setSignatureCanvasWidth((currentWidth) => {
        if (currentWidth === nextWidth) {
          return currentWidth;
        }

        const pad = signaturePadRef.current;
        if (pad && !pad.isEmpty()) {
          setSignatureDraftDataUrl(pad.toDataURL("image/png"));
        }

        return nextWidth;
      });
    };

    frameId = window.requestAnimationFrame(syncWidth);
    window.addEventListener("resize", syncWidth);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", syncWidth);
    };
  }, [signatureModalOpen]);

  useEffect(() => {
    if (!signatureModalOpen || !signatureCanvasWidth) {
      return;
    }

    const pad = signaturePadRef.current;
    if (!pad) {
      return;
    }

    pad.clear();
    if (signatureDraftDataUrl) {
      pad.fromDataURL(signatureDraftDataUrl);
      setHasSignature(true);
      return;
    }

    setHasSignature(false);
  }, [signatureCanvasWidth, signatureDraftDataUrl, signatureModalOpen]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "true" && !isLoading && proposal) {
      // Small timeout to ensure fonts and images are fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return;
  }, [isLoading, proposal]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!proposal) {
    const errorMessage =
      error instanceof Error ? error.message : "Länken kan vara felaktig eller inaktuell.";
    const isAccessDenied =
      errorMessage.includes("403") ||
      errorMessage.includes("personliga länken") ||
      errorMessage.includes("workspace-session");

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">
            {isAccessDenied ? "Åtkomst nekad" : "Offerten hittades inte"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isAccessDenied
              ? "Den här offerten kräver den personliga länken från e-posten eller en inloggad workspace-session."
              : "Länken kan vara felaktig eller inaktuell."}
          </p>
        </div>
      </div>
    );
  }

  if (proposal.tokenRequired) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center sm:min-h-[calc(100vh-5rem)]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.18)]"
          >
            <div className="border-b border-black/5 bg-[radial-gradient(circle_at_top,_rgba(255,92,0,0.14),_transparent_58%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-[#FF5C00]" />
                Offera
              </div>
              <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[#111111] text-white shadow-[0_16px_40px_-22px_rgba(0,0,0,0.65)]">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div className="mt-6 space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Personlig offert
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-[2.2rem]">
                  Åtkomst kräver din signeringslänk
                </h1>
                <p className="max-w-sm text-sm font-medium leading-6 text-slate-500 sm:text-[15px]">
                  Den här offerten är personlig. Kontakta avsändaren för att få din signeringslänk.
                </p>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Så fungerar det
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Offerten öppnas först när mottagaren använder sin personliga länk från e-posten. Det skyddar kunduppgifter och ser till att rätt person kan signera.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-dashed border-slate-200 px-4 py-4 text-sm leading-6 text-slate-500">
                Om du är avsändaren kan du öppna offerten från din inloggade workspacevy.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const isAccepted = proposal.status === "accepted";
  const isDeclined = proposal.status === "declined";
  const isAwaitingResponse =
    proposal.status === "sent" || proposal.status === "viewed";
  const canRespond = isAwaitingResponse && accessToken.length > 0;
  const hasPreviewBanner = isAwaitingResponse;
  const previewBadgeLabel = canRespond
    ? "Signeringslänk aktiv"
    : "Förhandsvisning";
  const previewTitle = canRespond
    ? "Den här personliga länken kan användas för att signera."
    : "Du tittar på en läsbar förhandsvisning.";
  const previewDescription = canRespond
    ? "Du kan acceptera offerten direkt härifrån eller markera att något behöver ändras."
    : "För att svara eller signera behöver mottagaren öppna sin personliga länk från e-posten.";

  const customStyles = {
    "--proposal-accent": branding?.accentColor || "#FF5C00",
    "--proposal-font": branding
      ? FONT_PAIRINGS[branding.fontPairing].bodyFamily
      : "'Inter', sans-serif",
    "--proposal-heading-font": branding
      ? FONT_PAIRINGS[branding.fontPairing].headingFamily
      : "'Manrope', sans-serif",
  } as React.CSSProperties;
  const recipient = proposal.parties.recipient ?? {
    companyName: "",
    orgNumber: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
    kind: "company" as const,
  };
  const placeholderContext = {
    clientName: proposal.clientName || recipient?.companyName || "",
    clientEmail: proposal.clientEmail || recipient?.email || "",
    createdAt: proposal.createdAt,
    serviceName: proposal.title,
    title: proposal.title,
  };

  const resetSignatureForm = () => {
    setSignerName("");
    setInitials("");
    setTermsAccepted(false);
    setHasSignature(false);
    setSignatureDraftDataUrl("");
    signaturePadRef.current?.clear();
  };

  const handleSignatureEnd = () => {
    const pad = signaturePadRef.current;
    if (!pad) {
      setHasSignature(false);
      return;
    }

    setHasSignature(!pad.isEmpty());
  };

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
    setHasSignature(false);
    setSignatureDraftDataUrl("");
  };

  const handleSignatureModalChange = (open: boolean) => {
    if (!open) {
      const pad = signaturePadRef.current;
      if (pad && !pad.isEmpty()) {
        setSignatureDraftDataUrl(pad.toDataURL("image/png"));
      }
    }

    setSignatureModalOpen(open);
  };

  const handleDecline = async () => {
    setIsResponding(true);
    try {
      const response = await api.respondToProposal(slug, {
        action: "decline",
      }, accessToken);
      setLatestProposal(response);
      setSignatureModalOpen(false);
      await refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte avvisa offerten",
        description: getErrorMessage(error),
      });
    } finally {
      setIsResponding(false);
    }
  };

  const handleAccept = async () => {
    const pad = signaturePadRef.current;
    const normalizedName = normalizeSignerName(signerName);

    if (!pad || pad.isEmpty()) {
      toast({
        variant: "destructive",
        title: "Signatur saknas",
        description: "Rita din signatur innan du accepterar offerten.",
      });
      return;
    }

    const signatureDataUrl = pad.getTrimmedCanvas().toDataURL("image/png");

    if (signatureDataUrl.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
      toast({
        variant: "destructive",
        title: "Signaturen är för stor",
        description: "Rensa signaturen och försök igen med en kortare underskrift.",
      });
      return;
    }

    try {
      setIsResponding(true);
      const response = await api.respondToProposal(slug, {
        action: "accept",
        signerName: normalizedName,
        initials,
        signatureDataUrl,
        termsAccepted: true,
      }, accessToken);

      setLatestProposal(response);
      setSignatureModalOpen(false);
      resetSignatureForm();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: [branding?.accentColor || "#FF5C00", "#ffffff", "#000000"],
      });
      await refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunde inte signera offerten",
        description: getErrorMessage(error),
      });
    } finally {
      setIsResponding(false);
    }
  };

  const canSubmitAcceptance =
    normalizeSignerName(signerName).length > 0 &&
    initials.length > 0 &&
    termsAccepted &&
    hasSignature;

  return (
    <div className="min-h-screen bg-[#FDFDFD] sm:py-20 sm:px-6 selection:bg-primary/10 selection:text-primary" style={customStyles}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn(
          "max-w-[1120px] mx-auto bg-white rounded-none sm:rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] border border-black/[0.03] overflow-hidden print:shadow-none print:border-none print:rounded-none relative z-10",
          branding?.vibePreset === "editorial" && "vibe-editorial",
          branding?.vibePreset === "architectural" && "vibe-architectural",
          branding?.vibePreset === "minimal" && "vibe-minimal",
          (branding?.glassmorphismEnabled || branding?.vibePreset === "glass") && "vibe-glass",
        )}
        style={{ fontFamily: "var(--proposal-font)" }}
      >
        <style>
          {`
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; margin: 0 !important; padding: 0 !important; }
              .min-h-screen { min-height: auto !important; padding: 0 !important; }
              .max-w-[1120px] { max-width: 100% !important; width: 100% !important; margin: 0 !important; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}
        </style>
        {branding?.coverEnabled ? (
          <div
            className="relative flex min-h-[560px] w-full flex-col justify-center overflow-hidden px-5 py-16 sm:px-8 sm:py-20 md:min-h-[640px] md:px-24 md:py-32"
            style={{
              backgroundColor: branding.coverBackground || "var(--proposal-accent)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />

            <div className="absolute left-5 right-5 top-8 flex items-center justify-between sm:left-8 sm:right-8 sm:top-12 md:left-24 md:right-24">
              {branding.logoUrl ? (
                <div className="rounded-[1.35rem] bg-white/96 px-4 py-3 shadow-[0_14px_32px_-18px_rgba(0,0,0,0.55)] backdrop-blur">
                  <img
                    src={branding.logoUrl}
                    alt="Logo"
                    className="h-10 w-auto max-w-[180px] object-contain md:h-14 md:max-w-[240px]"
                  />
                </div>
              ) : (
                <div />
              )}
              <div className="hidden md:block">
                <Badge
                  variant="outline"
                  className="rounded-full border-white/20 bg-white/10 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-md"
                >
                  {proposal.status === "accepted" ? "Signerad & Klar" : "Affärsförslag"}
                </Badge>
              </div>
            </div>

            <div className="relative z-10 max-w-4xl text-white">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="mb-6 text-[3.25rem] font-black leading-[0.92] tracking-tighter sm:mb-8 sm:text-6xl md:text-8xl"
              >
                {resolveDynamicText(
                  branding.coverHeadline || proposal.title,
                  placeholderContext,
                )}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="max-w-2xl text-base font-medium leading-relaxed opacity-80 sm:text-xl md:text-3xl"
              >
                {resolveDynamicText(
                  branding.coverSubheadline,
                  placeholderContext,
                )}
              </motion.p>
            </div>

            <div className="absolute bottom-10 left-5 text-white/70 sm:bottom-16 sm:left-8 md:left-24">
              <div className="mb-2 flex items-center gap-4">
                <div className="h-px w-8 bg-white/30" />
                <p className="text-[11px] font-black uppercase tracking-widest sm:text-sm">
                  Förberedd för
                </p>
              </div>
              <p className="text-xl font-bold text-white sm:text-2xl">
                {resolveDynamicText(proposal.clientName, placeholderContext)}
              </p>
              <p className="mt-1 text-sm opacity-60">
                Utskriven {format(new Date(proposal.createdAt), "d MMMM yyyy", {
                  locale: sv,
                })}
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-5 border-b border-gray-100 p-5 pb-5 sm:p-8 md:flex-row md:items-center md:p-16">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-14 object-contain"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-gray-100" />
            )}
            <div className="text-left md:text-right">
              <h1
                className="text-4xl font-bold tracking-tight"
                style={{ color: "var(--proposal-accent)" }}
              >
                Offert
              </h1>
              <div className="mt-4 space-y-1 text-gray-500">
                <p className="font-medium text-foreground">{proposal.title}</p>
                <p>
                  Till: {resolveDynamicText(proposal.clientName, placeholderContext)}
                </p>
                <p className="text-sm">
                  {format(new Date(proposal.createdAt), "d MMMM yyyy", {
                    locale: sv,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasPreviewBanner ? (
          <div className="no-print border-b border-black/[0.04] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,247,247,0.92))] px-5 py-5 sm:px-8 md:px-24">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                    canRespond
                      ? "border-transparent text-white"
                      : "border-black/10 bg-white text-foreground",
                  )}
                  style={
                    canRespond
                      ? {
                          backgroundColor: "var(--proposal-accent)",
                        }
                      : undefined
                  }
                >
                  {previewBadgeLabel}
                </Badge>
                <div className="space-y-1">
                  <p className="text-base font-black tracking-tight text-foreground sm:text-lg">
                    {previewTitle}
                  </p>
                  <p className="max-w-3xl text-sm font-medium leading-6 text-gray-500">
                    {previewDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start rounded-[1.4rem] border border-black/5 bg-white/90 px-4 py-3 shadow-[0_14px_34px_-26px_rgba(0,0,0,0.24)]">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: canRespond
                      ? "var(--proposal-accent)"
                      : "#9CA3AF",
                  }}
                />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                    Status
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {canRespond ? "Svar aktivt" : "Läsläge"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-5 py-20 sm:px-8 md:px-24 md:py-32 space-y-24">
          {proposal.personalMessage && (
            <div
              className="p-10 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row gap-8 items-start animate-in fade-in duration-1000"
            >
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-gray-100">
                <span className="text-xl font-bold" style={{ color: "var(--proposal-accent)" }}>"</span>
              </div>
              <p className="text-xl md:text-2xl font-medium text-gray-700 leading-relaxed italic">
                {proposal.personalMessage}
              </p>
            </div>
          )}

          {proposal.sections.map((section, idx) => (
            <React.Fragment key={section.id}>
              {idx > 0 && branding?.dividerStyle === "line" && (
                <hr className="border-gray-100 my-16" />
              )}
              {idx > 0 && branding?.dividerStyle === "decorative" && (
                <div className="flex justify-center items-center gap-3 my-16 opacity-30">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--proposal-accent)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--proposal-accent)]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--proposal-accent)]" />
                </div>
              )}
              {idx > 0 && branding?.dividerStyle === "space" && (
                <div className="h-16" />
              )}

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                {isPartiesSection(section) ? (
                  <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-gray-50/40 shadow-[0_20px_45px_-18px_rgba(0,0,0,0.08)]">
                    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                      <div className="border-b border-gray-100 p-5 sm:p-8 md:border-b-0 md:border-r">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                          Tjänsteleverantör
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground break-words">
                          {proposal.parties.sender.companyName || "Ej angivet"}
                        </h3>
                        {proposal.parties.sender.orgNumber ? (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Org: {proposal.parties.sender.orgNumber}
                          </p>
                        ) : null}
                        <div className="mt-5 space-y-1.5 text-sm font-medium leading-6 text-gray-600 break-words">
                          {proposal.parties.sender.contactName ? (
                            <p>{proposal.parties.sender.contactName}</p>
                          ) : null}
                          {proposal.parties.sender.email ? (
                            <p className="text-xs sm:text-sm">{proposal.parties.sender.email}</p>
                          ) : null}
                          {proposal.parties.sender.phone ? (
                            <p>{proposal.parties.sender.phone}</p>
                          ) : null}
                          {proposal.parties.sender.address ? (
                            <p>
                              {proposal.parties.sender.address}
                              {proposal.parties.sender.postalCode || proposal.parties.sender.city
                                ? `, ${[
                                    proposal.parties.sender.postalCode,
                                    proposal.parties.sender.city,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-5 sm:p-8">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                          Motpart
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground break-words">
                          {recipient.kind === "company"
                            ? recipient.companyName || "Ej angivet"
                            : recipient.contactName || "Ej angivet"}
                        </h3>
                        {recipient.kind === "company" &&
                        recipient.orgNumber ? (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Org: {recipient.orgNumber}
                          </p>
                        ) : null}
                        <div className="mt-5 space-y-1.5 text-sm font-medium leading-6 text-gray-600 break-words">
                          {recipient.kind === "company" &&
                          recipient.contactName ? (
                            <p>{recipient.contactName}</p>
                          ) : null}
                          {recipient.email ? (
                            <p className="text-xs sm:text-sm">{recipient.email}</p>
                          ) : null}
                          {recipient.phone ? (
                            <p>{recipient.phone}</p>
                          ) : null}
                          {recipient.address ? (
                            <p>
                              {recipient.address}
                              {recipient.postalCode ||
                              recipient.city
                                ? `, ${[
                                    recipient.postalCode,
                                    recipient.city,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                {section.title && (
                  <h2 className="text-3xl md:text-4xl font-black mb-10 text-foreground tracking-tight">
                    {resolveDynamicText(section.title, placeholderContext)}
                  </h2>
                )}
                <div className="space-y-8">
                  {section.blocks.map((block) => {
                    if (block.type === "heading") {
                      const Tag =
                        block.level === 1
                          ? "h1"
                          : block.level === 3
                            ? "h3"
                            : "h2";
                      const sizeClass =
                        block.level === 1
                          ? "text-4xl md:text-5xl"
                          : block.level === 2
                            ? "text-2xl"
                            : "text-xl";
                      return (
                        <Tag
                          key={block.id}
                          className={`${sizeClass} font-black text-foreground tracking-tight`}
                        >
                          {resolveDynamicText(block.content, placeholderContext)}
                        </Tag>
                      );
                    }
                    if (block.type === "text") {
                      return (
                        <p
                          key={block.id}
                          className="text-lg text-gray-600 leading-[1.8] whitespace-pre-wrap max-w-4xl"
                        >
                          {resolveDynamicText(block.content, placeholderContext)}
                        </p>
                      );
                    }
                    if (block.type === "divider") {
                      return (
                        <div key={block.id} className="h-px w-full bg-gray-100 my-12" />
                      );
                    }
                    if (block.type === "image") {
                      return block.imageUrl ? (
                        <div key={block.id} className="relative group overflow-hidden rounded-[2rem] shadow-lg my-12">
                           <img
                            src={block.imageUrl}
                            alt=""
                            className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                      ) : null;
                    }
                    if (block.type === "pricing" && block.rows) {
                      const totals = calculatePricingTotals(block);

                      return (
                        <div
                          key={block.id}
                          className={cn(
                            "my-16 overflow-hidden rounded-[3rem] border transition-all duration-700",
                            (branding?.glassmorphismEnabled || branding?.vibePreset === "glass") 
                              ? "glass-card" 
                              : "border-gray-100 bg-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)]",
                            branding?.vibePreset === "minimal" && "border-transparent shadow-subtle"
                          )}
                        >
                          {/* Premium Package Header */}
                          <div className="bg-white p-10 md:p-16">
                            <div className="max-w-3xl">
                              <div className="mb-8 flex items-center gap-4">
                                <div
                                  className={cn(
                                    "h-1.5 w-16 rounded-full",
                                    branding?.gradientEnabled && "bg-primary-gradient"
                                  )}
                                  style={{
                                    backgroundColor: branding?.gradientEnabled ? undefined : "var(--proposal-accent)",
                                  }}
                                />
                                <span
                                  className="text-xs font-black uppercase tracking-[0.25em]"
                                  style={{ color: "var(--proposal-accent)" }}
                                >
                                  Inkluderat Paket
                                </span>
                              </div>

                              <h3 className="mb-6 text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                                {resolveDynamicText(
                                  block.content || "Tjänstepaket",
                                  placeholderContext,
                                )}
                              </h3>
                              <p className="mb-10 text-lg md:mb-12 md:text-xl font-medium leading-relaxed text-gray-500/80">
                                {block.description}
                              </p>

                                {block.features && block.features.length > 0 && (
                                  <div className="grid grid-cols-1 gap-x-12 gap-y-5 md:gap-y-6 md:grid-cols-2">
                                  {block.features.map((feature, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-4 transition-transform hover:translate-x-1"
                                    >
                                      <div
                                        className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                                        style={{
                                          backgroundColor: "color-mix(in srgb, var(--proposal-accent) 15%, transparent)",
                                        }}
                                      >
                                        <Plus
                                          className="h-3 w-3 stroke-[3]"
                                          style={{
                                            color: "var(--proposal-accent)",
                                          }}
                                        />
                                      </div>
                                      <span className="text-lg font-bold text-gray-700 tracking-tight">
                                        {feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-gray-50/40 px-6 py-5 md:px-10 md:py-6 border-y border-gray-100 flex items-center justify-between">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">
                              Kostnadsspecifikation
                            </h4>
                          </div>

                          <div className="md:hidden divide-y divide-gray-100">
                            {totals.rows.map((row) => (
                              <div key={row.id} className="bg-white px-6 py-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-black text-foreground text-xl tracking-tight leading-tight">
                                      {row.description}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <div
                                        className="text-[10px] font-black uppercase inline-flex px-2 py-1 rounded-full"
                                        style={{
                                          color:
                                            row.type === "one_time"
                                              ? "#d97706"
                                              : "var(--proposal-accent)",
                                          backgroundColor:
                                            row.type === "one_time"
                                              ? "rgba(245, 158, 11, 0.12)"
                                              : "color-mix(in srgb, var(--proposal-accent) 15%, transparent)",
                                        }}
                                      >
                                        {row.type === "one_time"
                                          ? "Engångs"
                                          : row.interval === "yearly"
                                            ? "Årlig avgift"
                                            : "Löpande avgift"}
                                      </div>
                                      {row.type === "recurring" && row.bindingPeriod ? (
                                        <Badge
                                          variant="secondary"
                                          className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                                        >
                                          {row.bindingPeriod} mån bindning
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xl font-black tabular-nums text-foreground">
                                      {formatCurrency(row.total || 0)}
                                    </p>
                                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                      totalt
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-gray-50/70 p-4">
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                      Antal
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-gray-700">
                                      {row.quantity} {row.unit || "st"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                      A-pris
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-gray-700">
                                      {formatCurrency(row.unitPrice)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                      Intervall
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-gray-700">
                                      {row.type === "recurring"
                                        ? row.interval === "yearly"
                                          ? "Per år"
                                          : "Per mån"
                                        : "Engång"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-base border-collapse min-w-[600px]">
                              <thead className="text-gray-400 border-b border-gray-100">
                                <tr>
                                  <th className="py-6 px-10 text-[11px] font-black uppercase tracking-widest text-left">
                                    Beskrivning
                                  </th>
                                  <th className="py-6 px-8 text-[11px] font-black uppercase tracking-widest text-right w-28">
                                    Antal
                                  </th>
                                  <th className="py-6 px-8 text-[11px] font-black uppercase tracking-widest text-right w-36">
                                    A-pris
                                  </th>
                                  <th className="py-6 px-10 text-[11px] font-black uppercase tracking-widest text-right w-36">
                                    Totalt
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {totals.rows.map((row) => (
                                  <tr key={row.id} className="bg-white group">
                                    <td className="py-8 px-10">
                                      <div className="font-black text-foreground text-xl tracking-tight leading-tight">
                                        {row.description}
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-3">
                                        {row.type === "recurring" && (
                                          <div
                                            className="text-[10px] font-black uppercase inline-flex px-2 py-1 rounded-full"
                                            style={{
                                              color: "var(--proposal-accent)",
                                              backgroundColor:
                                                "color-mix(in srgb, var(--proposal-accent) 15%, transparent)",
                                            }}
                                          >
                                            {row.interval === "yearly"
                                              ? "Årlig avgift"
                                              : "Löpande avgift"}
                                          </div>
                                        )}
                                        {row.type === "recurring" && row.bindingPeriod && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                                          >
                                            {row.bindingPeriod} mån bindning
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-8 px-8 text-right font-bold text-gray-500 tabular-nums">
                                      {row.quantity} {row.unit || "st"}
                                    </td>
                                    <td className="py-8 px-8 text-right font-bold text-gray-500 tabular-nums">
                                      {formatCurrency(row.unitPrice)}
                                    </td>
                                    <td className="py-8 px-10 text-right font-black text-foreground text-xl tabular-nums">
                                      {formatCurrency(row.total || 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="bg-gray-50/50 p-6 md:p-16 border-t border-gray-100 flex flex-col items-end">
                            <div className="space-y-5 md:space-y-6 w-full max-w-sm">
                              <div className="flex justify-between items-center text-gray-500">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                  Första faktura
                                </span>
                                <span className="text-xl font-bold tabular-nums">
                                  {formatCurrency(totals.subtotal)}
                                </span>
                              </div>

                              {block.discount ? (
                                <div className="flex justify-between items-center font-bold text-emerald-600">
                                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                    Rabatt ({block.discount}%)
                                  </span>
                                  <span className="text-xl tabular-nums">
                                    -{formatCurrency(totals.discountAmount)}
                                  </span>
                                </div>
                              ) : null}

                              {totals.setupTotal > 0 && (
                                <div className="flex justify-between items-center text-gray-500">
                                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                    Initial investering
                                  </span>
                                  <span className="font-bold tabular-nums">
                                    {formatCurrency(totals.setupTotal)}
                                  </span>
                                </div>
                              )}

                              {totals.monthlyEquivalent > 0 && (
                                <div className="flex justify-between items-center text-gray-500">
                                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                    Löpande månadskostnad
                                  </span>
                                  <span className="font-bold tabular-nums">
                                    {formatCurrency(totals.monthlyEquivalent)}
                                  </span>
                                </div>
                              )}

                              {totals.recurringYearly > 0 && (
                                <div className="flex justify-between items-center text-gray-500">
                                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                    Årlig löpande kostnad
                                  </span>
                                  <span className="font-bold tabular-nums">
                                    {formatCurrency(totals.recurringYearly)}
                                  </span>
                                </div>
                              )}

                              {block.vatEnabled && (
                                <div className="flex justify-between items-center text-gray-400">
                                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                    Moms (25%)
                                  </span>
                                  <span className="font-bold tabular-nums">
                                    {formatCurrency(totals.vat)}
                                  </span>
                                </div>
                              )}

                              <div className="h-px w-full bg-gray-200/60 my-8" />

                              <div className="flex justify-between items-end gap-6 md:gap-10">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-black uppercase text-gray-400 tracking-[0.2em]">
                                    {totals.totalLabel}
                                  </span>
                                  <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                    {totals.totalSubtitle}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span
                                    className="font-black text-[2.65rem] sm:text-5xl md:text-6xl tracking-tighter tabular-nums leading-none block"
                                    style={{ color: "var(--proposal-accent)" }}
                                  >
                                    {formatCurrency(
                                      totals.hasRecurring
                                        ? totals.contractTotal
                                        : totals.total,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                  </>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="bg-gray-50 p-8 md:p-12 border-t border-gray-100 no-print">
          <AnimatePresence mode="wait">
            {isAccepted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  Offert signerad ✓
                </h3>

                {(proposal.signedByName || proposal.signatureInitials) && (
                  <div className="my-8 max-w-md mx-auto p-8 border border-border bg-white rounded-2xl shadow-sm text-left space-y-5">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">
                        Signerad av
                      </p>
                      {proposal.signedByName ? (
                        <p className="text-2xl font-semibold text-foreground">
                          {proposal.signedByName}
                        </p>
                      ) : null}
                      {proposal.signatureInitials ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          Initialer: {proposal.signatureInitials}
                        </p>
                      ) : null}
                    </div>

                    {proposal.signatureInitials ? (
                      <div
                        className="text-5xl font-serif italic text-foreground"
                        style={{ color: "var(--proposal-accent)" }}
                      >
                        {proposal.signatureInitials}
                      </div>
                    ) : null}

                    {proposal.signedAt && (
                      <p className="text-sm text-muted-foreground font-mono">
                        Signerad{" "}
                        {format(new Date(proposal.signedAt), "d MMMM yyyy 'kl.' HH:mm", {
                          locale: sv,
                        })}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-gray-500 text-lg">
                  Tack för förtroendet! Vi ser fram emot samarbetet.
                </p>
              </motion.div>
            ) : isDeclined ? (
              <div className="text-center py-8 text-gray-500">
                Du har avvisat denna offert. Kontakta oss om du har frågor.
              </div>
            ) : canRespond ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-10 rounded-[2.5rem] border text-center transition-all duration-500",
                  (branding?.glassmorphismEnabled || branding?.vibePreset === "glass")
                    ? "glass-card bg-primary/5"
                    : "bg-white border-primary/20 shadow-[0_20px_50px_-12px_rgba(var(--primary),0.12)]"
                )}
              >
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-3xl font-black text-foreground mb-4 tracking-tight"> Redo att gå vidare? </h3>
                  <p className="text-muted-foreground mb-10 text-lg font-medium">
                    Klicka på knappen nedan för att signera offerten digitalt.
                    När du har signerat skickas en bekräftelse till båda parter.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                      size="lg"
                      className={cn(
                        "h-16 px-10 rounded-2xl text-lg font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95",
                        branding?.gradientEnabled ? "jewel-gradient border-none text-white" : "bg-primary text-white shadow-lg shadow-primary/25"
                      )}
                      style={!branding?.gradientEnabled ? { backgroundColor: "var(--proposal-accent)" } : {}}
                      onClick={() => setSignatureModalOpen(true)}
                    >
                      Signera & Acceptera
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-sm font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-error hover:bg-error/5 h-16 px-8 rounded-2xl"
                      onClick={handleDecline}
                      disabled={isResponding}
                    >
                      Behöver ändras
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : isAwaitingResponse ? (
              <div className="text-center py-4 text-gray-400 no-print space-y-2">
                <p>Det här är en läsbar förhandsvisning av offerten.</p>
                <p>För att svara eller signera behöver mottagaren öppna sin personliga länk från e-posten.</p>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 no-print">
                Denna offert kan inte längre besvaras.
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="text-center mt-12 text-sm text-gray-400 pb-8 font-sans no-print">
        Skapad med <span className="font-semibold text-gray-600">Offera</span>
      </div>

      {canRespond && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 no-print hidden sm:block"
        >
          <div className="glass-card flex items-center gap-6 px-8 py-4 rounded-full border border-primary/20 shadow-2xl">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                Totalt belopp
              </span>
              <span className="text-xl font-black tabular-nums">
                {formatCurrency(proposal.totalValue)}
              </span>
            </div>
            <div className="w-px h-8 bg-primary/10" />
            <Button
              className={cn(
                "rounded-full px-8 h-12 font-black uppercase tracking-widest text-[11px] shadow-lg transition-all hover:scale-110",
                branding?.gradientEnabled ? "jewel-gradient border-none text-white" : "bg-primary text-white"
              )}
              style={!branding?.gradientEnabled ? { backgroundColor: "var(--proposal-accent)" } : {}}
              onClick={() => setSignatureModalOpen(true)}
            >
              Signera nu
            </Button>
          </div>
        </motion.div>
      )}

      <Dialog open={signatureModalOpen} onOpenChange={handleSignatureModalChange}>
        <DialogContent className="left-0 right-0 top-2 mx-auto flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[42rem] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-[1.75rem] p-0 sm:top-6 sm:w-[calc(100vw-3rem)] sm:rounded-[2rem]">
          <DialogHeader className="shrink-0 px-5 pt-5 pb-0 sm:px-8 sm:pt-6">
            <DialogTitle className="text-xl font-bold sm:text-2xl">
              Signera och acceptera offert
            </DialogTitle>
            <DialogDescription className="sr-only">
              Fyll i namn, initialer och rita din signatur för att acceptera offerten.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6 space-y-5 sm:space-y-6">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-4 sm:px-5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white sm:h-11 sm:w-11"
                style={{ backgroundColor: "var(--proposal-accent)" }}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Klar att godkänna</p>
                <p>
                  Den här länken är personlig och kopplad till rätt mottagare.
                  Du behöver bara fylla i namn, initialer och signatur.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <Label htmlFor="signer-name" className="text-sm font-medium">
                Fullständigt namn
              </Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                placeholder="t.ex. Peter Larsson"
                className="h-12"
                autoFocus
              />
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <Label htmlFor="initials" className="text-sm font-medium">
                Initialer
              </Label>
              <Input
                id="initials"
                value={initials}
                onChange={(event) =>
                  setInitials(normalizeInitialsInput(event.target.value))
                }
                placeholder="t.ex. PL"
                className="h-12 uppercase tracking-[0.3em]"
                maxLength={5}
              />
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <Label className="text-sm font-medium">Rita din signatur</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 self-start px-2 text-muted-foreground sm:self-auto"
                  onClick={handleClearSignature}
                  disabled={!hasSignature || isResponding}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Rensa signatur
                </Button>
              </div>

              <div
                ref={signaturePadContainerRef}
                className="relative rounded-2xl border border-border bg-white shadow-sm overflow-hidden"
              >
                {!hasSignature && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Signera här med mus eller finger
                  </div>
                )}
                {signatureCanvasWidth > 0 ? (
                  <SignatureCanvas
                    ref={signaturePadRef}
                    penColor="#111827"
                    clearOnResize={false}
                    onEnd={handleSignatureEnd}
                    canvasProps={{
                      width: signatureCanvasWidth,
                      height: SIGNATURE_CANVAS_HEIGHT,
                      className: "block h-[200px] w-full cursor-crosshair touch-none sm:h-[220px]",
                    }}
                  />
                ) : (
                  <div className="h-[200px] sm:h-[220px]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Signaturen sparas som en krypterad bild tillsammans med tidpunkt
                och signeringsbevis.
              </p>
            </div>

            <div className="flex items-start space-x-3 rounded-lg border border-border bg-muted/50 p-4">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Godkänn villkor och digital signering
                </label>
                <p className="text-sm text-muted-foreground">
                  Jag har läst och godkänner denna offert och bekräftar att min
                  elektroniska signatur ska behandlas som bindande.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/70 bg-white px-5 py-4 sm:flex-row sm:px-8 sm:py-5">
            <Button
              variant="outline"
              onClick={() => handleSignatureModalChange(false)}
              className="w-full sm:w-auto"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!canSubmitAcceptance || isResponding}
              className="w-full sm:w-auto text-white shadow-md"
              style={{ backgroundColor: "var(--proposal-accent)" }}
            >
              {isResponding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Signera & Acceptera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
