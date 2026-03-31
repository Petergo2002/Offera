import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, CheckCircle2, RotateCcw, XCircle, Plus } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

import { useQuery } from "@tanstack/react-query";
import type { Proposal } from "@workspace/api-zod";
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
import { api } from "@/lib/api";
import {
  FONT_PAIRINGS,
  calculatePricingTotals,
  isPartiesSection,
  normalizeDesignSettings,
  formatCurrency,
  resolveDynamicText,
} from "@/lib/document";
import { Badge } from "@/components/ui/badge";

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
  const signingToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("signing_token") || ""
      : "";
  const { toast } = useToast();

  const {
    data: fetchedProposal,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["public-proposal", slug, signingToken],
    queryFn: () => api.getPublicProposal(slug, signingToken || undefined),
  });
  const [isResponding, setIsResponding] = useState(false);

  const [latestProposal, setLatestProposal] = useState<Proposal | null>(null);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Offerten hittades inte</h1>
          <p className="text-muted-foreground mt-2">
            Länken kan vara felaktig eller inaktuell.
          </p>
        </div>
      </div>
    );
  }

  const isAccepted = proposal.status === "accepted";
  const isDeclined = proposal.status === "declined";
  const isAwaitingResponse =
    proposal.status === "sent" || proposal.status === "viewed";
  const canRespond = isAwaitingResponse && signingToken.length > 0;

  const customStyles = {
    "--proposal-accent": branding?.accentColor || "#FF5C00",
    "--proposal-font": branding
      ? FONT_PAIRINGS[branding.fontPairing].bodyFamily
      : "'Inter', sans-serif",
    "--proposal-heading-font": branding
      ? FONT_PAIRINGS[branding.fontPairing].headingFamily
      : "'Manrope', sans-serif",
  } as React.CSSProperties;
  const placeholderContext = {
    clientName: proposal.clientName || proposal.parties.recipient.companyName,
    clientEmail: proposal.clientEmail || proposal.parties.recipient.email,
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
        signingToken,
      });
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
        signingToken,
        signerName: normalizedName,
        initials,
        signatureDataUrl,
        termsAccepted: true,
      });

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
        className="max-w-[1120px] mx-auto bg-white rounded-none sm:rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] border border-black/[0.03] overflow-hidden print:shadow-none print:border-none print:rounded-none relative z-10"
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
            className="relative flex min-h-[640px] w-full flex-col justify-center overflow-hidden px-8 py-20 md:px-24 md:py-32"
            style={{
              backgroundColor: branding.coverBackground || "var(--proposal-accent)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />

            <div className="absolute top-12 left-8 right-8 flex items-center justify-between md:left-24 md:right-24">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="h-12 object-contain brightness-0 invert md:h-16"
                />
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
                className="mb-8 text-6xl font-black leading-[0.9] tracking-tighter md:text-8xl"
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
                className="max-w-2xl text-xl font-medium leading-relaxed opacity-80 md:text-3xl"
              >
                {resolveDynamicText(
                  branding.coverSubheadline,
                  placeholderContext,
                )}
              </motion.p>
            </div>

            <div className="absolute bottom-16 left-8 text-white/70 md:left-24">
              <div className="mb-2 flex items-center gap-4">
                <div className="h-px w-8 bg-white/30" />
                <p className="text-sm font-black uppercase tracking-widest">
                  Förberedd för
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
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
          <div className="flex flex-col items-start justify-between gap-6 border-b border-gray-100 p-8 pb-8 md:flex-row md:items-center md:p-16">
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

        <div className="px-8 py-20 md:px-24 md:py-32 space-y-24">
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
                    <div className="grid gap-0 md:grid-cols-2">
                      <div className="border-b border-gray-100 p-8 md:border-b-0 md:border-r">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                          Tjänsteleverantör
                        </p>
                        <h3 className="text-2xl font-black tracking-tight text-foreground">
                          {proposal.parties.sender.companyName || "Ej angivet"}
                        </h3>
                        {proposal.parties.sender.orgNumber ? (
                          <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-gray-400">
                            Org: {proposal.parties.sender.orgNumber}
                          </p>
                        ) : null}
                        <div className="mt-5 space-y-1 text-sm font-medium leading-6 text-gray-600">
                          {proposal.parties.sender.contactName ? (
                            <p>{proposal.parties.sender.contactName}</p>
                          ) : null}
                          {proposal.parties.sender.email ? (
                            <p>{proposal.parties.sender.email}</p>
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

                      <div className="p-8">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
                          Motpart
                        </p>
                        <h3 className="text-2xl font-black tracking-tight text-foreground">
                          {proposal.parties.recipient.kind === "company"
                            ? proposal.parties.recipient.companyName || "Ej angivet"
                            : proposal.parties.recipient.contactName || "Ej angivet"}
                        </h3>
                        {proposal.parties.recipient.kind === "company" &&
                        proposal.parties.recipient.orgNumber ? (
                          <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-gray-400">
                            Org: {proposal.parties.recipient.orgNumber}
                          </p>
                        ) : null}
                        <div className="mt-5 space-y-1 text-sm font-medium leading-6 text-gray-600">
                          {proposal.parties.recipient.kind === "company" &&
                          proposal.parties.recipient.contactName ? (
                            <p>{proposal.parties.recipient.contactName}</p>
                          ) : null}
                          {proposal.parties.recipient.email ? (
                            <p>{proposal.parties.recipient.email}</p>
                          ) : null}
                          {proposal.parties.recipient.phone ? (
                            <p>{proposal.parties.recipient.phone}</p>
                          ) : null}
                          {proposal.parties.recipient.address ? (
                            <p>
                              {proposal.parties.recipient.address}
                              {proposal.parties.recipient.postalCode ||
                              proposal.parties.recipient.city
                                ? `, ${[
                                    proposal.parties.recipient.postalCode,
                                    proposal.parties.recipient.city,
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
                          className="my-16 overflow-hidden rounded-[3rem] border border-gray-100 bg-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)]"
                        >
                          {/* Premium Package Header */}
                          <div className="bg-white p-10 md:p-16">
                            <div className="max-w-3xl">
                              <div className="mb-8 flex items-center gap-4">
                                <div
                                  className="h-1.5 w-16 rounded-full"
                                  style={{
                                    backgroundColor: "var(--proposal-accent)",
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
                              <p className="mb-12 text-xl font-medium leading-relaxed text-gray-500/80">
                                {block.description}
                              </p>

                                {block.features && block.features.length > 0 && (
                                  <div className="grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
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

                          <div className="bg-gray-50/40 px-10 py-6 border-y border-gray-100 flex items-center justify-between">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">
                              Kostnadsspecifikation
                            </h4>
                          </div>

                          <div className="overflow-x-auto">
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

                          <div className="bg-gray-50/50 p-12 md:p-16 border-t border-gray-100 flex flex-col items-end">
                            <div className="space-y-6 w-full max-w-sm">
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

                              <div className="flex justify-between items-end gap-10">
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
                                    className="font-black text-5xl md:text-6xl tracking-tighter tabular-nums leading-none block"
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

                {(proposal.signedByName ||
                  proposal.signatureInitials ||
                  proposal.signatureDataUrl) && (
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

                    {proposal.signatureDataUrl ? (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                        <img
                          src={proposal.signatureDataUrl}
                          alt="Kundens signatur"
                          className="mx-auto max-h-28 w-auto"
                        />
                      </div>
                    ) : proposal.signatureInitials ? (
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
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md mx-auto text-center space-y-6"
              >
                <h3 className="text-2xl font-bold">Redo att gå vidare?</h3>
                <p className="text-gray-500">
                  Genom att acceptera godkänner du villkoren i denna offert.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-base bg-white"
                    onClick={handleDecline}
                    disabled={isResponding}
                  >
                    Avvisa offert
                  </Button>
                  <Button
                    size="lg"
                    className="h-14 px-8 text-base text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
                    style={{
                      backgroundColor: "var(--proposal-accent)",
                      boxShadow:
                        "0 10px 25px -5px color-mix(in srgb, var(--proposal-accent) 40%, transparent)",
                    }}
                    onClick={() => setSignatureModalOpen(true)}
                    disabled={isResponding}
                  >
                    {isResponding ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Acceptera Offert"
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : isAwaitingResponse ? (
              <div className="text-center py-4 text-gray-400 no-print space-y-2">
                <p>Den här visningslänken kan inte användas för att signera.</p>
                <p>Öppna den personliga länken som skickades till motpartens e-postadress.</p>
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

      <Dialog open={signatureModalOpen} onOpenChange={handleSignatureModalChange}>
        <DialogContent className="left-0 right-0 top-4 mx-auto w-[calc(100vw-1.5rem)] max-w-[42rem] translate-x-0 translate-y-0 gap-0 overflow-hidden p-0 sm:top-6 sm:w-[calc(100vw-3rem)]">
          <DialogHeader className="px-6 pt-6 pb-0 sm:px-8">
            <DialogTitle className="text-2xl font-bold">
              Signera och acceptera offert
            </DialogTitle>
            <DialogDescription className="sr-only">
              Fyll i namn, initialer och rita din signatur för att acceptera offerten.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-6 py-6 sm:px-8 space-y-6">
            <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4 flex items-start gap-3">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0"
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

            <div className="space-y-3">
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

            <div className="space-y-3">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-medium">Rita din signatur</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground"
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
                      className: "block h-[220px] w-full cursor-crosshair touch-none",
                    }}
                  />
                ) : (
                  <div className="h-[220px]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Signaturen sparas som en krypterad bild tillsammans med tidpunkt
                och signeringsbevis.
              </p>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border border-border">
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

          <DialogFooter className="px-6 pb-6 sm:px-8 flex-col sm:flex-row gap-2">
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
