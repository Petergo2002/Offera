import React, { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  ArrowLeft, Palette, Settings, GripVertical, Plus, 
  Heading, Type, Image as ImageIcon, Table as TableIcon, Minus,
  Send, Eye, Save, Loader2, Trash2
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { 
  getGetProposalQueryOptions,
  useUpdateProposal, 
  useSendProposal,
  type Proposal,
  type ProposalSection,
  type ContentBlock,
  type ContentBlockType,
  type PricingRow
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";

const FONT_OPTIONS = [
  { id: "inter", name: "Inter (Stilren & Modern)", family: "'Inter', sans-serif" },
  { id: "playfair", name: "Playfair (Premium Serif)", family: "'Playfair Display', serif" },
  { id: "dm-sans", name: "DM Sans (Mjuk & Geometrisk)", family: "'DM Sans', sans-serif" },
];

export default function ProposalBuilder() {
  const [, params] = useRoute("/proposal/:id");
  const id = parseInt(params?.id || "0", 10);
  const { toast } = useToast();
  
  const { data: initialProposal, isLoading } = useQuery(getGetProposalQueryOptions(id));
  const { mutateAsync: updateProposal, isPending: isSaving } = useUpdateProposal();
  const { mutateAsync: sendProposal, isPending: isSending } = useSendProposal();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [activeTab, setActiveTab] = useState<"sections" | "design">("sections");
  const [isPreview, setIsPreview] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  
  const [sendEmail, setSendEmail] = useState("");
  const [sendMessage, setSendMessage] = useState("");

  useEffect(() => {
    if (initialProposal && !proposal) {
      setProposal(initialProposal);
      setSendEmail(initialProposal.clientEmail || "");
    }
  }, [initialProposal, proposal]);

  if (isLoading || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Generate ID helper
  const genId = () => Math.random().toString(36).substr(2, 9);

  // --- Handlers ---
  const handleSave = async () => {
    try {
      await updateProposal({
        id,
        data: {
          title: proposal.title,
          clientName: proposal.clientName,
          clientEmail: proposal.clientEmail,
          sections: proposal.sections,
          branding: proposal.branding,
          totalValue: proposal.totalValue,
        }
      });
      toast({ title: "Sparad", description: "Offerten har sparats." });
    } catch (e) {
      toast({ variant: "destructive", title: "Fel", description: "Kunde inte spara." });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendEmail) return;
    try {
      // Auto-save first
      await updateProposal({ id, data: { ...proposal, clientEmail: sendEmail } });
      // Send
      const res = await sendProposal({
        id,
        data: { clientEmail: sendEmail, personalMessage: sendMessage }
      });
      setProposal(res);
      setSendModalOpen(false);
      toast({ title: "Offert skickad!", description: `Skickad till ${sendEmail}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Fel", description: "Kunde inte skicka." });
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(proposal.sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setProposal({ ...proposal, sections: items });
  };

  const addSection = () => {
    const newSection: ProposalSection = {
      id: `sec_${genId()}`,
      title: "Ny Sektion",
      blocks: []
    };
    setProposal({ ...proposal, sections: [...proposal.sections, newSection] });
  };

  const updateSectionTitle = (secId: string, title: string) => {
    setProposal({
      ...proposal,
      sections: proposal.sections.map(s => s.id === secId ? { ...s, title } : s)
    });
  };

  const deleteSection = (secId: string) => {
    if(!confirm("Radera sektion?")) return;
    setProposal({
      ...proposal,
      sections: proposal.sections.filter(s => s.id !== secId)
    });
  };

  const addBlock = (secId: string, type: ContentBlockType) => {
    const newBlock: ContentBlock = {
      id: `blk_${genId()}`,
      type,
      content: type === "heading" ? "Ny Rubrik" : type === "text" ? "Skriv din text här..." : "",
      level: type === "heading" ? 2 : undefined,
      rows: type === "pricing" ? [{ id: genId(), description: "Tjänst / Produkt", quantity: 1, unitPrice: 0, total: 0 }] : undefined,
      vatEnabled: type === "pricing" ? true : undefined,
      discount: 0
    };
    
    setProposal({
      ...proposal,
      sections: proposal.sections.map(s => 
        s.id === secId ? { ...s, blocks: [...s.blocks, newBlock] } : s
      )
    });
  };

  const updateBlock = (secId: string, blockId: string, updates: Partial<ContentBlock>) => {
    const updatedSections = proposal.sections.map(s => {
      if (s.id !== secId) return s;
      return {
        ...s,
        blocks: s.blocks.map(b => {
          if (b.id !== blockId) return b;
          
          // If pricing, recalculate totals if rows change
          const updatedBlock = { ...b, ...updates };
          if (updatedBlock.type === "pricing" && updatedBlock.rows) {
             let grandTotal = 0;
             updatedBlock.rows = updatedBlock.rows.map(r => {
               const rowTotal = r.quantity * r.unitPrice;
               return { ...r, total: rowTotal };
             });
             const sub = updatedBlock.rows.reduce((sum, r) => sum + r.total, 0);
             const discountAmount = sub * ((updatedBlock.discount || 0) / 100);
             const taxBase = sub - discountAmount;
             const vat = updatedBlock.vatEnabled ? taxBase * 0.25 : 0;
             grandTotal = taxBase + vat;
             
             // Very hacky way to sync total value to proposal root, but functional for MVP
             setTimeout(() => {
               setProposal(prev => prev ? { ...prev, totalValue: grandTotal } : prev);
             }, 0);
          }
          return updatedBlock;
        })
      };
    });
    setProposal({ ...proposal, sections: updatedSections });
  };

  const deleteBlock = (secId: string, blockId: string) => {
    setProposal({
      ...proposal,
      sections: proposal.sections.map(s => 
        s.id === secId ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s
      )
    });
  };

  // --- Dynamic CSS Variables ---
  const customStyles = {
    "--proposal-accent": proposal.branding.accentColor,
    "--proposal-font": FONT_OPTIONS.find(f => f.id === proposal.branding.font)?.family || 'Inter',
  } as React.CSSProperties;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      
      {/* SIDEBAR */}
      <aside className={`w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${isPreview ? '-ml-72' : ''}`}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link href="/" className="text-sidebar-muted hover:text-white transition-colors p-2 -ml-2 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <span className="ml-2 font-medium text-white truncate">{proposal.title}</span>
        </div>

        <div className="flex p-2 gap-1 border-b border-sidebar-border">
          <button 
            onClick={() => setActiveTab("sections")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "sections" ? "bg-sidebar-accent text-white" : "text-gray-400 hover:text-gray-200"}`}
          >
            Innehåll
          </button>
          <button 
            onClick={() => setActiveTab("design")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "design" ? "bg-sidebar-accent text-white" : "text-gray-400 hover:text-gray-200"}`}
          >
            Design
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "sections" ? (
            <div className="space-y-4">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="sections">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {proposal.sections.map((sec, index) => (
                        <Draggable key={sec.id} draggableId={sec.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="group flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border hover:border-sidebar-accent transition-colors"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div {...provided.dragHandleProps} className="text-gray-500 hover:text-white cursor-grab active:cursor-grabbing">
                                  <GripVertical size={16} />
                                </div>
                                <span className="text-sm font-medium text-gray-200 truncate">{sec.title}</span>
                              </div>
                              <button onClick={() => deleteSection(sec.id)} className="text-gray-500 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              <Button variant="outline" className="w-full bg-transparent border-sidebar-border text-gray-300 hover:bg-sidebar-accent hover:text-white" onClick={addSection}>
                <Plus size={16} className="mr-2" /> Lägg till sektion
              </Button>
            </div>
          ) : (
            <div className="space-y-6 text-gray-200">
              <div className="space-y-3">
                <Label className="text-gray-400 text-xs uppercase tracking-wider">Accentfärg</Label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={proposal.branding.accentColor}
                    onChange={e => setProposal({...proposal, branding: {...proposal.branding, accentColor: e.target.value}})}
                    className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent p-0"
                  />
                  <Input 
                    value={proposal.branding.accentColor}
                    onChange={e => setProposal({...proposal, branding: {...proposal.branding, accentColor: e.target.value}})}
                    className="bg-sidebar-accent/50 border-sidebar-border text-white font-mono"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-gray-400 text-xs uppercase tracking-wider">Typografi</Label>
                <div className="grid gap-2">
                  {FONT_OPTIONS.map(font => (
                    <button
                      key={font.id}
                      onClick={() => setProposal({...proposal, branding: {...proposal.branding, font: font.id as any}})}
                      className={`text-left p-3 rounded-lg border transition-colors ${proposal.branding.font === font.id ? 'bg-primary/10 border-primary text-white' : 'bg-sidebar-accent/50 border-sidebar-border text-gray-300 hover:border-gray-500'}`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-400 text-xs uppercase tracking-wider">Företagslogotyp (URL)</Label>
                <Input 
                  placeholder="https://..." 
                  value={proposal.branding.logoUrl || ""}
                  onChange={e => setProposal({...proposal, branding: {...proposal.branding, logoUrl: e.target.value}})}
                  className="bg-sidebar-accent/50 border-sidebar-border text-white"
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN EDITOR AREA */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0" style={customStyles}>
        {/* Topbar */}
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Input 
              value={proposal.title}
              onChange={e => setProposal({...proposal, title: e.target.value})}
              className="text-lg font-semibold border-transparent hover:border-border focus:border-primary px-2 py-1 h-auto w-64 bg-transparent shadow-none"
            />
            <StatusBadge status={proposal.status} />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4 bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setIsPreview(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!isPreview ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Redigera
              </button>
              <button 
                onClick={() => setIsPreview(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${isPreview ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Eye size={14} /> Förhandsgranska
              </button>
            </div>

            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Spara
            </Button>
            <Button 
              className="bg-[var(--proposal-accent)] hover:opacity-90 text-white"
              onClick={() => setSendModalOpen(true)}
            >
              <Send className="w-4 h-4 mr-2" />
              Skicka offert
            </Button>
          </div>
        </header>

        {/* Paper Canvas */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div 
            className={`max-w-[850px] mx-auto bg-white rounded-xl transition-all duration-500 ${isPreview ? 'shadow-2xl ring-1 ring-black/5' : 'shadow-sm border border-border'}`}
            style={{ fontFamily: 'var(--proposal-font)', minHeight: '1056px' }}
          >
            {/* Branding Header */}
            <div className="p-12 pb-6 flex items-center justify-between border-b border-gray-100">
              {proposal.branding.logoUrl ? (
                <img src={proposal.branding.logoUrl} alt="Logo" className="h-12 object-contain" />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <ImageIcon size={24} />
                </div>
              )}
              <div className="text-right">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--proposal-accent)' }}>Offert</h2>
                <p className="text-gray-500 mt-1">Till: {proposal.clientName}</p>
                <p className="text-gray-400 text-sm">{format(new Date(proposal.createdAt), "d MMM yyyy", { locale: sv })}</p>
              </div>
            </div>

            {/* Sections */}
            <div className="p-12 pt-6 space-y-12">
              {proposal.sections.map((section) => (
                <div key={section.id} className="group relative">
                  {!isPreview && (
                    <div className="absolute -left-12 top-0 bottom-0 w-8 flex flex-col items-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-px h-full bg-border" />
                    </div>
                  )}
                  
                  {/* Section Title Editor */}
                  {!isPreview ? (
                    <input 
                      value={section.title}
                      onChange={e => updateSectionTitle(section.id, e.target.value)}
                      className="text-2xl font-bold mb-6 w-full outline-none text-foreground bg-transparent placeholder:text-gray-300"
                      placeholder="Sektionstitel"
                    />
                  ) : (
                    section.title && <h3 className="text-2xl font-bold mb-6 text-foreground">{section.title}</h3>
                  )}

                  {/* Blocks */}
                  <div className="space-y-4">
                    {section.blocks.map(block => (
                      <BlockEditor 
                        key={block.id} 
                        block={block} 
                        isPreview={isPreview}
                        onChange={(updates) => updateBlock(section.id, block.id, updates)}
                        onDelete={() => deleteBlock(section.id, block.id)}
                      />
                    ))}
                  </div>

                  {/* Add Block Menu */}
                  {!isPreview && (
                    <div className="mt-6 pt-4 border-t border-dashed border-gray-200 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-gray-400 flex items-center mr-2">Lägg till:</span>
                      <button onClick={() => addBlock(section.id, "heading")} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Rubrik"><Heading size={16} /></button>
                      <button onClick={() => addBlock(section.id, "text")} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Text"><Type size={16} /></button>
                      <button onClick={() => addBlock(section.id, "image")} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Bild"><ImageIcon size={16} /></button>
                      <button onClick={() => addBlock(section.id, "pricing")} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Prislista"><TableIcon size={16} /></button>
                      <button onClick={() => addBlock(section.id, "divider")} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Linje"><Minus size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
          <div className="h-24" /> {/* Bottom padding */}
        </main>
      </div>

      {/* Send Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSend}>
            <DialogHeader>
              <DialogTitle>Skicka offert till kund</DialogTitle>
              <DialogDescription>
                Detta skickar en unik, säker länk till din kund.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
                <div className="truncate text-sm font-mono text-muted-foreground">
                  {window.location.origin}{import.meta.env.BASE_URL}p/{proposal.publicSlug}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}p/${proposal.publicSlug}`);
                  toast({title: "Kopierad!"});
                }}>
                  Kopiera
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Kundens E-post</Label>
                <Input 
                  type="email" 
                  value={sendEmail} 
                  onChange={e => setSendEmail(e.target.value)}
                  placeholder="kund@foretag.se"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Personligt meddelande (valfritt)</Label>
                <Textarea 
                  value={sendMessage} 
                  onChange={e => setSendMessage(e.target.value)}
                  placeholder="Hej, här kommer offerten vi pratade om..."
                  className="h-24 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSendModalOpen(false)}>Avbryt</Button>
              <Button type="submit" disabled={isSending} className="bg-[var(--proposal-accent)] text-white hover:opacity-90">
                {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Skicka länk
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Block Editor Component ---
function BlockEditor({ 
  block, 
  isPreview, 
  onChange, 
  onDelete 
}: { 
  block: ContentBlock, 
  isPreview: boolean,
  onChange: (updates: Partial<ContentBlock>) => void,
  onDelete: () => void
}) {

  // Auto-resize content editable
  const handleContent = (e: React.FormEvent<HTMLDivElement>) => {
    onChange({ content: e.currentTarget.textContent || "" });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(val);

  if (block.type === "heading") {
    const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
    const sizeClass = block.level === 1 ? 'text-4xl' : block.level === 2 ? 'text-2xl' : 'text-xl';
    
    if (isPreview) {
      return <Tag className={`${sizeClass} font-bold text-foreground py-2`}>{block.content}</Tag>;
    }
    return (
      <div className="relative group">
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center">
          <select 
            value={block.level} 
            onChange={e => onChange({ level: parseInt(e.target.value) })}
            className="text-xs bg-gray-100 border-none rounded p-1 mr-1 outline-none"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
        </div>
        <div 
          contentEditable 
          suppressContentEditableWarning
          onBlur={handleContent}
          data-placeholder="Skriv rubrik..."
          className={`${sizeClass} font-bold text-foreground py-2 outline-none`}
        >
          {block.content}
        </div>
      </div>
    );
  }

  if (block.type === "text") {
    if (isPreview) {
      return <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{block.content}</p>;
    }
    return (
      <div className="relative group">
        <button onClick={onDelete} className="absolute -left-8 top-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
          <Trash2 size={14}/>
        </button>
        <div 
          contentEditable 
          suppressContentEditableWarning
          onBlur={handleContent}
          data-placeholder="Börja skriva..."
          className="text-gray-600 leading-relaxed min-h-[1.5rem] outline-none whitespace-pre-wrap"
        >
          {block.content}
        </div>
      </div>
    );
  }

  if (block.type === "divider") {
    if (isPreview) return <hr className="my-8 border-gray-200" />;
    return (
      <div className="relative group py-4">
        <button onClick={onDelete} className="absolute -left-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
          <Trash2 size={14}/>
        </button>
        <hr className="border-gray-200" />
      </div>
    );
  }

  if (block.type === "image") {
    if (isPreview) {
      return block.imageUrl ? <img src={block.imageUrl} alt="" className="w-full rounded-lg my-4" /> : null;
    }
    return (
      <div className="relative group my-4">
        <button onClick={onDelete} className="absolute -left-8 top-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 z-10">
          <Trash2 size={14}/>
        </button>
        {block.imageUrl ? (
          <div className="relative group/img">
            <img src={block.imageUrl} alt="" className="w-full rounded-lg border border-border" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <Button variant="secondary" onClick={() => onChange({imageUrl: ""})}>Byt bild</Button>
            </div>
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 gap-3">
            <ImageIcon size={32} />
            <Input 
              placeholder="Klistra in bild-URL här..." 
              className="max-w-xs text-center"
              onBlur={e => onChange({imageUrl: e.target.value})}
              onKeyDown={e => { if(e.key === 'Enter') onChange({imageUrl: e.currentTarget.value}) }}
            />
          </div>
        )}
      </div>
    );
  }

  if (block.type === "pricing") {
    const rows = block.rows || [];
    const subtotal = rows.reduce((acc, r) => acc + (r.total || 0), 0);
    const discountAmount = subtotal * ((block.discount || 0) / 100);
    const taxBase = subtotal - discountAmount;
    const vat = block.vatEnabled ? taxBase * 0.25 : 0;
    const grandTotal = taxBase + vat;

    const updateRow = (rowId: string, field: keyof PricingRow, value: any) => {
      const newRows = rows.map(r => r.id === rowId ? { ...r, [field]: value } : r);
      onChange({ rows: newRows });
    };

    const addRow = () => {
      onChange({ rows: [...rows, { id: Math.random().toString(), description: "", quantity: 1, unitPrice: 0, total: 0 }] });
    };

    const deleteRow = (rowId: string) => {
      onChange({ rows: rows.filter(r => r.id !== rowId) });
    };

    return (
      <div className="my-8 relative group">
        {!isPreview && (
           <button onClick={onDelete} className="absolute -left-8 top-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 z-10">
             <Trash2 size={14}/>
           </button>
        )}
        <div className="border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium">Beskrivning</th>
                <th className="py-3 px-4 font-medium w-24 text-right">Antal</th>
                <th className="py-3 px-4 font-medium w-32 text-right">A-pris</th>
                <th className="py-3 px-4 font-medium w-32 text-right">Totalt</th>
                {!isPreview && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr key={row.id} className="bg-white group/row">
                  <td className="py-2 px-4">
                    {isPreview ? row.description : (
                      <input 
                        className="w-full outline-none bg-transparent" 
                        value={row.description} 
                        placeholder="Tjänst/Produkt"
                        onChange={e => updateRow(row.id, 'description', e.target.value)} 
                      />
                    )}
                  </td>
                  <td className="py-2 px-4 text-right">
                    {isPreview ? row.quantity : (
                      <input 
                        type="number" 
                        className="w-full outline-none bg-transparent text-right" 
                        value={row.quantity} 
                        onChange={e => updateRow(row.id, 'quantity', parseFloat(e.target.value) || 0)} 
                      />
                    )}
                  </td>
                  <td className="py-2 px-4 text-right">
                    {isPreview ? formatCurrency(row.unitPrice) : (
                      <input 
                        type="number" 
                        className="w-full outline-none bg-transparent text-right" 
                        value={row.unitPrice} 
                        onChange={e => updateRow(row.id, 'unitPrice', parseFloat(e.target.value) || 0)} 
                      />
                    )}
                  </td>
                  <td className="py-2 px-4 text-right font-medium text-foreground">
                    {formatCurrency(row.total || 0)}
                  </td>
                  {!isPreview && (
                    <td className="pr-2">
                       <button onClick={() => deleteRow(row.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100"><Trash2 size={14}/></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {!isPreview && (
            <div className="bg-gray-50/50 py-2 px-4 border-b border-border flex justify-start">
               <button onClick={addRow} className="text-xs font-medium text-[var(--proposal-accent)] hover:underline flex items-center gap-1">
                 <Plus size={12}/> Lägg till rad
               </button>
            </div>
          )}

          {/* Totals */}
          <div className="bg-gray-50/30 p-4 border-t border-border flex flex-col items-end gap-2 text-sm">
            <div className="flex justify-between w-64 text-muted-foreground">
              <span>Delsumma:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between w-64 items-center text-muted-foreground">
              <span className="flex items-center gap-2">
                Rabatt (%): 
                {!isPreview && (
                  <input 
                    type="number" 
                    className="w-12 bg-white border border-border rounded px-1 py-0.5 text-right outline-none focus:border-primary"
                    value={block.discount || 0}
                    onChange={e => onChange({ discount: parseFloat(e.target.value) || 0 })}
                  />
                )}
                {isPreview && (block.discount ? `(${block.discount}%)` : '')}
              </span>
              <span className="text-red-500">-{formatCurrency(discountAmount)}</span>
            </div>

            <div className="flex justify-between w-64 items-center text-muted-foreground">
              <span className="flex items-center gap-2">
                Moms (25%):
                {!isPreview && (
                  <Switch 
                    checked={block.vatEnabled} 
                    onCheckedChange={v => onChange({ vatEnabled: v })} 
                  />
                )}
              </span>
              <span>{formatCurrency(vat)}</span>
            </div>

            <div className="w-64 h-px bg-border my-1" />
            
            <div className="flex justify-between w-64 font-bold text-lg text-foreground" style={{ color: 'var(--proposal-accent)' }}>
              <span>Att betala:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
