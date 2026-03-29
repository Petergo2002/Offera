import React, { useState } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { getGetPublicProposalQueryOptions, useRespondToProposal } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function PublicProposal() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug || "";
  
  const { data: proposal, isLoading, refetch } = useQuery(getGetPublicProposalQueryOptions(slug));
  const { mutateAsync: respond, isPending: isResponding } = useRespondToProposal();

  const [hasRespondedLocally, setHasRespondedLocally] = useState(false);

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
          <p className="text-muted-foreground mt-2">Länken kan vara felaktig eller inaktuell.</p>
        </div>
      </div>
    );
  }

  const handleAction = async (action: "accept" | "decline") => {
    try {
      await respond({ slug, data: { action } });
      if (action === "accept") {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: [proposal.branding.accentColor, '#ffffff', '#000000']
        });
      }
      setHasRespondedLocally(true);
      refetch();
    } catch (error) {
      console.error(error);
    }
  };

  const isAccepted = proposal.status === "accepted" || (hasRespondedLocally && proposal.status !== "declined");
  const isDeclined = proposal.status === "declined";
  const canRespond = proposal.status === "sent" || proposal.status === "viewed";

  const customStyles = {
    "--proposal-accent": proposal.branding.accentColor,
    "--proposal-font": proposal.branding.font === 'playfair' ? "'Playfair Display', serif" : 
                       proposal.branding.font === 'dm-sans' ? "'DM Sans', sans-serif" : "'Inter', sans-serif",
  } as React.CSSProperties;

  const formatCurrency = (val: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6" style={customStyles}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[850px] mx-auto bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden"
        style={{ fontFamily: 'var(--proposal-font)' }}
      >
        {/* Header */}
        <div className="p-8 md:p-16 pb-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-100 gap-6">
          {proposal.branding.logoUrl ? (
            <img src={proposal.branding.logoUrl} alt="Logo" className="h-14 object-contain" />
          ) : (
            <div className="w-14 h-14 bg-gray-100 rounded-xl" />
          )}
          <div className="text-left md:text-right">
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--proposal-accent)' }}>Offert</h1>
            <div className="mt-4 space-y-1 text-gray-500">
              <p className="font-medium text-foreground">{proposal.title}</p>
              <p>Till: {proposal.clientName}</p>
              <p className="text-sm">{format(new Date(proposal.createdAt), "d MMMM yyyy", { locale: sv })}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-16 space-y-12">
          {proposal.personalMessage && (
            <div className="p-6 bg-gray-50 rounded-xl italic text-gray-700 border-l-4" style={{ borderColor: 'var(--proposal-accent)' }}>
              "{proposal.personalMessage}"
            </div>
          )}

          {proposal.sections.map((section) => (
            <div key={section.id}>
              {section.title && <h2 className="text-2xl font-bold mb-6 text-foreground">{section.title}</h2>}
              <div className="space-y-6">
                {section.blocks.map(block => {
                  if (block.type === "heading") {
                    const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
                    const sizeClass = block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-xl' : 'text-lg';
                    return <Tag key={block.id} className={`${sizeClass} font-bold text-foreground`}>{block.content}</Tag>;
                  }
                  if (block.type === "text") {
                    return <p key={block.id} className="text-gray-600 leading-relaxed whitespace-pre-wrap">{block.content}</p>;
                  }
                  if (block.type === "divider") {
                    return <hr key={block.id} className="my-8 border-gray-200" />;
                  }
                  if (block.type === "image") {
                    return block.imageUrl ? <img key={block.id} src={block.imageUrl} alt="" className="w-full rounded-xl my-4" /> : null;
                  }
                  if (block.type === "pricing" && block.rows) {
                    const subtotal = block.rows.reduce((acc, r) => acc + (r.total || 0), 0);
                    const discountAmount = subtotal * ((block.discount || 0) / 100);
                    const taxBase = subtotal - discountAmount;
                    const vat = block.vatEnabled ? taxBase * 0.25 : 0;
                    const grandTotal = taxBase + vat;
                    
                    return (
                      <div key={block.id} className="my-8 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm md:text-base">
                          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                            <tr>
                              <th className="py-4 px-6 font-medium">Beskrivning</th>
                              <th className="py-4 px-6 font-medium text-right">Antal</th>
                              <th className="py-4 px-6 font-medium text-right">A-pris</th>
                              <th className="py-4 px-6 font-medium text-right">Totalt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {block.rows.map(row => (
                              <tr key={row.id} className="bg-white">
                                <td className="py-4 px-6">{row.description}</td>
                                <td className="py-4 px-6 text-right">{row.quantity}</td>
                                <td className="py-4 px-6 text-right">{formatCurrency(row.unitPrice)}</td>
                                <td className="py-4 px-6 text-right font-medium">{formatCurrency(row.total || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="bg-gray-50/50 p-6 border-t border-gray-200 flex flex-col items-end gap-3 text-sm md:text-base">
                          <div className="flex justify-between w-64 text-gray-500">
                            <span>Delsumma:</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          {block.discount ? (
                            <div className="flex justify-between w-64 text-gray-500">
                              <span>Rabatt ({block.discount}%):</span>
                              <span className="text-red-500">-{formatCurrency(discountAmount)}</span>
                            </div>
                          ) : null}
                          {block.vatEnabled && (
                            <div className="flex justify-between w-64 text-gray-500">
                              <span>Moms (25%):</span>
                              <span>{formatCurrency(vat)}</span>
                            </div>
                          )}
                          <div className="w-64 h-px bg-gray-200 my-2" />
                          <div className="flex justify-between w-64 font-bold text-xl text-foreground" style={{ color: 'var(--proposal-accent)' }}>
                            <span>Totalt att betala:</span>
                            <span>{formatCurrency(grandTotal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-8 md:p-12 border-t border-gray-100">
          <AnimatePresence mode="wait">
            {isAccepted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-2">Offert Accepterad</h3>
                <p className="text-gray-500 text-lg">Tack för förtroendet! Vi ser fram emot samarbetet.</p>
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
                <p className="text-gray-500">Genom att acceptera godkänner du villkoren i denna offert.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="h-14 px-8 text-base bg-white"
                    onClick={() => handleAction("decline")}
                    disabled={isResponding}
                  >
                    Avvisa offert
                  </Button>
                  <Button 
                    size="lg" 
                    className="h-14 px-8 text-base text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: 'var(--proposal-accent)', boxShadow: `0 10px 25px -5px color-mix(in srgb, var(--proposal-accent) 40%, transparent)` }}
                    onClick={() => handleAction("accept")}
                    disabled={isResponding}
                  >
                    {isResponding ? <Loader2 className="w-5 h-5 animate-spin" /> : "Acceptera Offert"}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                Denna offert kan inte längre besvaras.
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      <div className="text-center mt-12 text-sm text-gray-400 pb-8 font-sans">
        Skapad med <span className="font-semibold text-gray-600">Offera</span>
      </div>
    </div>
  );
}
