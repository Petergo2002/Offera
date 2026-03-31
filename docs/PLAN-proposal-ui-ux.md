# 🔥 Plan: Fullständig UX/UI Redesign av Offertbyggaren (/proposal/:id)

Denna plan adresserar de fyra huvudmålen för att göra offertskapandet ("Curated Canvas") till en premiumupplevelse: egen helskärms-sida, snygg automatisk parter-visning, professionellt förhandsgranskningsflöde (Preview) och rent UI där allt får plats.

## 🔴 User Review Required

> [!IMPORTANT]
> **Helskärmsvy ("Sin egna page")**: För att ge byggaren "sin egna page" föreslår jag att vi bryter ut `/proposal/:id` från den vanliga `<Layout>`-komponenten med sidomenyn. Den nya byggaren får istället en egen ren topbar (som Notion/Figma) med knappar för Spara, Skicka och Förhandsgranska. Godkänner du detta?

> [!WARNING]
> **Parter (Automatiskt Cover Block)**: Istället för att tvinga dig skriva in dynamiska variabler (t.ex. `{{clientName}}`) i texten hela tiden, kommer vi bygga in ett fast, snyggt avsnitt högst upp i varje offert (ett "Kvitto/Header"-block) som *automatiskt* visar vem offerten är från och till baserat på vad man skrivit in i "Parter"-menyn. 

---

## 🏗️ Föreslagna Ändringar (Arkitektur & Design)

### 1. Helskärms-layout (App.tsx & Layouting)
- Fil: `App.tsx`
- **Ändring**: Flytta `<Route path="/proposal/:id" component={ProposalBuilder} />` så den ligger utanför standard `<Layout>`. Den blir nu en egen, maximerad 100vw/100vh applikation.
- **Top Header**: En ny fast menyrad högst upp i Builder med:
  - Vänster: "Tillbaka till Dashboard" + Dokumenttitel.
  - Mitten: En modern toggle (Redigera / Förhandsgranska).
  - Höger: Inställningar (Parter/Design), Spara, och "Skicka Offert" kalkylator/knapp.

### 2. Parter-synlighet (Automatisk Header)
- Fil: `document-builder.tsx` / Nytt komponentfält `ProposalCover`
- **Ändring**: Skapa en automatisk "Header" för offerten. 
- **Flöde**: När du fyller i "Parter" via knappen, så renderas mottagaren (och avsändaren) genast i en mycket professionell, minimalistisk layout överst i offerten. Detta syns både i bygg-vyn, i PDF, och på den publika länken som kunden får. Det kräver **noll** klick eller variabler för att se snyggt ut.

### 3. Industry-Standard Preview (Förhandsgranska)
- Fil: `document-builder.tsx`
- **Ändring**: En tydlig toggle i top-baren (Tänk Vercel/Webflow). 
  - **Edit Mode**: Du ser block, linjer, inställningar och kan skriva.
  - **Preview Mode `(Förhandsgranska)`**: Alla editeringselement (paneler, plus-tecken) försvinner. Du ser exakt 100% det kunden kommer se när de öppnar länken. Detta uppfyller ditt krav på ett "väldigt bra flow".

---

## ❓ Öppna Frågor till dig

> [!TIP]
> 1. **Parter Design**: Vill du att Parter-infon högst upp ska se ut mer som ett formellt brev (Vänsterställt) eller modernt/lekfullt (Mitten-centrerat eller som ett "Digitalt Visitkort")? *Jag rekommenderar rent och vänsterställt för b2b-offert*.
> 2. **Inställningar (Parter/Färger)**: Vill du att menyn för att skriva in parter och ändra färger ska öppnas som en sidopanel till höger (Slide-over) istället för en liten popup mitt i skärmen? Detta är mycket mer "Industry Standard" (ex. Canva).

---

## ✅ Verifieringsplan

1. **Routing Test**: Öppna `/proposal/:id` och verifiera att det är en ren, 100% fullskärmsyta utan den vanliga sidomenyn.
2. **Preview Test**: Klicka på "Förhandsgranska". Verifiera att knappar, inputs och inställningar dolts och offerten ser exakt ut som kundens vy (`/p/:slug`).
3. **Parter Test**: Fyll i ett företagsnamn via Parter. Verifiera att det omedelbart och vackert renderas i toppen av offerten.
