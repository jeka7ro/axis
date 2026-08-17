# Reguli de UI și Arhitectură (Axis Platform)

## Structura Tabelelor
Ori de câte ori se creează, modifică sau refactorizează un tabel de date în platformă, acesta **TREBUIE** să respecte următoarele reguli structurale și vizuale:

1. **Selector de rânduri (Checkbox):**
   - Prima coloană trebuie să fie un Checkbox pentru selectarea rândului.
   - Header-ul tabelului trebuie să aibă un "Select All" checkbox.

2. **Identificator Poziție (Nr. Crt. / ID):**
   - A doua coloană trebuie să reprezinte numărul curent (Nr. Crt.) sau ID-ul unic al rândului.

3. **Bulk Actions (Acțiuni Multiple):**
   - Dacă `selectedRows.length > 0`, trebuie să apară butoane (sau o secțiune separată deasupra/dedesubtul tabelului) pentru acțiuni în masă, ex: **Bulk Edit** și **Bulk Delete**.

4. **Design Rotunjit (Mac OS Tahoe Style):**
   - Iconițele de acțiuni pentru fiecare rând (View, Edit, Delete, etc.) trebuie să aibă contur rotund clar definit, de exemplu: `className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"`.
   - Elementele container trebuie să folosească raze curbate (ex. `rounded-2xl`, `rounded-3xl` configurate în Tailwind).

5. **Paginare & Footer:**
   - Tabelul trebuie să aibă un footer vizibil care să conțină:
     - Un selector pentru elemente pe pagină (ex: `Afișează [ 25 v ]`).
     - Numărul total de rezultate (`Total: 47`).
     - Controale de paginare (`Pagină 1 din 2  <  >`).

## Reguli de Git / Versionare
**ESTE STRICT INTERZIS** ca agentul să ruleze comanda `git push` fără aprobarea **EXPLICITĂ** și prealabilă a utilizatorului. Orice sincronizare cu serverul remote se va face doar după ce utilizatorul confirmă că este de acord cu acest pas.
