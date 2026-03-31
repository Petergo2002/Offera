# Plan: Skapa-hubben (Create Hub)

Denna plan syftar till att konsolidera sättet användaren skapar nytt innehåll (offerter och mallar) genom att transformera dagens mallbibliotek till en central hubb. Vi tar bort den nuvarande dialogen på Dashboarden för att istället leda användaren till en inspirerande och effektiv "Skapa"-sida.

## User Review Required

> [!IMPORTANT]
> Vi kommer att ta bort `ProposalStartDialog` från Dashboarden. Istället för att öppna en dialog vid klick på "Ny offert", skickas användaren till `/create`. Detta är en förändring i applikationens navigationsmönster som syftar till ökad tydlighet.

> [!TIP]
> För en "vibe"-booster kommer vi att lägga till ett dedikerat kort för "Blank offert" i toppen av listan, så att det känns lika naturligt som att välja en mall.

## Proposed Changes

### [Web-vyer & Navigering]

#### [MODIFY] [App.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/App.tsx)
- Byt ut rutt `/templates` till `/create`.

#### [MODIFY] [layout.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/layout.tsx)
- Uppdatera navigeringslänken: "Mallbibliotek" -> "Skapa".
- Byt ikon till en mer "start-orienterad" ikon (t.ex. `Plus` eller `Sparkles`).

#### [MODIFY] [dashboard.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/pages/dashboard.tsx)
- Ändra funktionen för "Ny offert"-knappen till `setLocation('/create')`.
- Ta bort all kod relaterad till `ProposalStartDialog`.

### [Komponenter]

#### [MODIFY] [template-card.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/template-card.tsx)
- Gör "Använd mall" (eller liknande) till den primära knappen istället för "Förhandsgranska".
- Lägg till en direktaktivering av mallen så att offerten skapas med ett klick.

### [Sidor]

#### [NEW] [create.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/pages/create.tsx)
- Baseras på nuvarande `templates.tsx` (vi byter namn och utökar).
- Innehåller en prominent sektion/kort för "Blank offert" i början av rutnätet.
- Uppdaterad header: "Vad vill du skapa idag?" för att dämpa känslan av ett statiskt bibliotek.

## Open Questions

- Vill du att även "Skapa ny mall"-alternativet ska presenteras som ett kort i början av listan bredvid "Blank offert", eller ska vi behålla knappen i headern? (Jag rekommenderar båda för maximal åtkomst).
- Bör vi lägga till en genväg även direkt i sidebaren för "Skapa Blank Offert" under den nya "Skapa"-menyn?

## Verification Plan

### Automated Tests
- `npm run typecheck` för att säkerställa att inga brutna rutter eller saknade komponenter finns.

### Manual Verification
1. Klicka på "Ny offert" från Dashboard -> Kontrollera omdirigering till `/create`.
2. Välj "Blank offert" på Skapa-sidan -> Kontrollera nyskapad offert i Builder.
3. Välj en mall på Skapa-sidan -> Kontrollera nyskapad offert baserad på mall.
4. Dubbelkolla att "Skapa"-länken i sidebaren fungerar korrekt.
