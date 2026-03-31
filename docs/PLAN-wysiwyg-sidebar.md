# 🔥 Plan: WYSIWYG & Sidebar Navigation för Offertbyggaren

Denna plan beskriver två viktiga detaljförbättringar för att göra redigeringsupplevelsen i offertbyggaren (`/proposal/:id`) mer intuitiv ("What You See Is What You Get") och underlätta navigeringen i långa dokument.

## 🔴 User Review Required

> [!IMPORTANT]
> **WYSIWYG (What You See Is What You Get)**: Just nu ser redigeringsläget ofta ut som "formulär" (kort med border, separata inputs). Föreslaget är att vi tar bort borders från editorn och låter textfälten (rubriker, brödtext, pristabellens celler) anta exakt samma typsnitt, storlek och placering som de har i "Preview"-läget. Du klickar bara på texten och skriver, utan att det ser ut som en input-box. Godkänner du denna mer text-fokuserade design?

> [!TIP]
> **Sidomeny-scroll**: När du klickar på tex. "Parter" eller "Mina Priser" i vänstermenyn (Sidebar) vill vi att canvas-ytan automatisk ska "glida ner" (smooth scroll) till exakt det blocket. Detta kräver att vi lägger till osynliga ankare (IDs) på alla block.

---

## 🏗️ Föreslagna Ändringar (Arkitektur & Design)

### 1. Sidebar Smooth Scroll (Navigering)
- **Komponent**: `document-builder.tsx`
- **Lösning**: 
  1. Varje sektion (och specialblock som Cover/Parter) i main-vyn får ett unikt `id` (ex. `id={\`section-${section.id}\`}`).
  2. När en användare klickar på ett block i sidebaren kallar vi på `document.getElementById(...).scrollIntoView({ behavior: 'smooth', block: 'center' })`.
  3. Detta ger omedelbar visuell feedback och binder ihop sidebaren med fönstret.

### 2. WYSIWYG Redesign av Bygg-blocken
- **Komponent**: `document-builder.tsx` (BlockEditor & PricingTableEditor)
- **Problem**: Just nu omges block av gråa borders (`border-outline-variant/5`), och inputfälten ser ut som formulär.
- **Lösning (WYSIWYG)**:
  - **Rubriker**: Ta bort card-bakgrunden och låt input-fältet ha exakt den CSS-klass (storlek, font) som används i Preview. En svag hover-effekt indikerar att fältet är editerbart.
  - **Textblock**: Byt ut standard-textarean mot en kantlös WYSIWYG-yta där typsnittet matchar Preview perfekt. "Förhandsgranskning av taggar" sker direkt i texten om möjligt, annars en subtil tooltip.
  - **Pristabell**: Byt ut de synliga input-rutorna i raderna mot textfält som ser ut som vanlig text tills du klickar på dem. Ta bort överflödig padding som gör tabellen "klumpig" i edit-läge.

---

## ❓ Öppna Frågor till dig

> [!WARNING]
> 1. **Block-kontroller (Papperskorg & Typ)**: Om vi gör blocken osynliga tills du hovrar över dem (WYSIWYG), var vill du att "Radera"-knappen och inställningar (ex. byta från H1 till H2) ska ligga? 
> *Förslag*: Vi kan lägga dem som en liten svävande meny (en "Floating Toolbar") som dyker upp precis bredvid blocket när du klickar/hovrar på det, precis som i Notion. Låter det bra?

---

## ✅ Verifieringsplan

1. **Scroll-test**: Klicka på ett block i sidebaren. Verifiera att canvasytan skrollar ner mjukt och centrerar det valda blocket.
2. **WYSIWYG-test**: Dubbelkolla "Edit Mode". Verifiera att H1-rubriker är lika stora och har samma font i Edit Mode som när du ställer om till Preview Mode (förutom eventuella dolda verktyg).
