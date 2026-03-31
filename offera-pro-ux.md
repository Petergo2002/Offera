# Plan: Offera Pro UI/UX Overhaul (Lobby Pattern)

Detta är den definitiva planen för att lyfta Offera till en global standard (SaaS 2025). Vi implementerar ett "Lobby"-mönster (Quick View) som fungerar som en mellanstation mellan listan och den tunga editorn. Detta tar bort "knapp-kaoset" och gör tracking till en naturlig del av flödet.

## Goal
Skapa en "smidigare" och mer professionell upplevelse genom att centralisera hantering och spårning i en Side-panel (Sheet) och städa upp Dashboard/Arkiv.

## Tasks

### Phase 1: The Lobby (Component)
- [ ] **Task 1: Skapa `ProposalQuickView` (Sheet)**
  - Implementera en `Sheet` (Slide-over från höger) som hämtar komplett data för en offert.
  - Svara på spårningsbehovet: Visa en vertikal Timeline med händelser (Skapad, Visad, Signerad).
  - Verify: Klicka på en dummy-knapp och se panelen glida in med korrekt data.

### Phase 2: UI Cleanup (Dashboard & Archive)
- [ ] **Task 2: Städa Dashboard-tabellen**
  - Ta bort alla "Inmatningsvy"- och "Radera"-knappar från rader/kort.
  - Gör hela raden klickbar för att öppna `ProposalQuickView`.
  - Lägg till en subtil "Hover-state" med `framer-motion` för premium-känsla.
  - Verify: Dashboard ser renare ut och klick öppnar rätt panel.
- [ ] **Task 3: Unifiera Arkivet**
  - Ersätt nuvarande dialog-logik i `archive.tsx` med den nya `ProposalQuickView`.
  - Verify: Samma smidiga upplevelse i både Arkiv och Dashboard.

### Phase 3: Builder Polish
- [ ] **Task 4: Implementera "Sync Status" i Builder**
  - Lägg till en diskret indikator (t.ex. en liten grön punkt/text: "Alla ändringar sparade") i header-vyn på `document-builder.tsx`.
  - Verify: Texten ändras till "Sparar..." under pågående nätverksanrop.

### Phase 4: Data Visualization
- [ ] **Task 5: Aktivera Dashboard Charts**
  - Implementera `recharts` i `dashboard.tsx` för att visa affärsvärde-trender istället för bara statiska siffror.
  - Verify: Grafen renderas korrekt med riktig data från API:et.

## Done When
- [x] Dashboard och Arkiv är "rena" från knapp-brus (max 1 knapp per rad visible by default).
- [x] Spårning (Tracking) visas proaktivt i en Slide-over vid klick.
- [x] Editorn (Builder) känns tryggare med en "Autosave"-indikator.
- [x] Alla "vibe"-inställningar från förra planen (Glassmorphism, etc.) är bevarade.

---

## Notes (Smart Decisions)
1. **Varför Sheet istället för Navigering?** Navigering till en tung editor är en "destruktiv" handling för användarens fokus. En Sheet låter dem kolla spårning på 5 offerter på 10 sekunder utan att lämna listan.
2. **Varför inga knappar i listan?** Industry standard för Pro-verktyg (t.ex. Linear, Stripe) är att dölja sekundära handlingar. Det minskar "stress" i UI:t.
3. **Mobile First**: På mobil konverteras Sheet automatiskt till en Bottom-drawer (via Vaul) för optimal touch-ergonomi.
