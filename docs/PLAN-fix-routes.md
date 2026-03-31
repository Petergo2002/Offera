# [DEBUG] Fix Route 404 & Standardize Templates URL

Användaren upplever 404-fel när hen navigerar tillbaka från en mall, berodde på att systemet försökte gå till `/templates` medan rutten i själva verket hette `/create`. Denna plan fixar felet och skapar en konsekvent rutt-struktur.

## Proposed Changes

### [ROUTING] Standardize on `/templates`

#### [MODIFY] [App.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/App.tsx)
- Ändra `/create` till `/templates`.

#### [MODIFY] [layout.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/components/layout.tsx)
- Uppdatera nav-länkar.

#### [MODIFY] [Dashboard.tsx](file:///Users/petergorgees/Downloads/Quote-Builder-Pro/artifacts/offera/src/pages/Dashboard.tsx)
- Uppdatera "Skapa"-knappar.

## Verification Plan
1. Navigera till Mallar.
2. Öppna/Redigera mall.
3. Klicka på "Tillbaka".
4. Verifiera `/templates` rutt fungerar (ingen 404).
