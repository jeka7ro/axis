import jsPDF from 'jspdf';

/**
 * Generates an executive 2-page Romanian Automotive Operational Leasing & Fidejusiune Contract PDF.
 * Uses high-resolution HTML5 Canvas rendering (200 DPI) to completely prevent font distortion
 * and render flawless Romanian characters (ă, â, î, ș, ț).
 */
export const generateContractPdf = async ({
  offer,
  client,
  vehicle,
  templateType = 'standard',
  fidejusorData = {},
  contractNum = null
}) => {
  const pWidth = 1680;
  const pHeight = 2376;
  const isFidejusor = (templateType || '').toLowerCase() === 'fidejusor';

  const nrContract = contractNum || `AXIS-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const dataContract = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Format helpers
  const fmtCurr = (val) => {
    const num = Number(val || 0);
    const curr = offer?.currency || 'EUR';
    return `${num.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  };

  const advanceAmount = ((offer?.vehicle_price || 0) * (offer?.advance_percent || 0)) / 100;
  const residualAmount = ((offer?.vehicle_price || 0) * (offer?.residual_value_percent || 0)) / 100;

  // ----------------------------------------------------
  // HELPER: Rounded Rectangle
  // ----------------------------------------------------
  const drawRoundedRect = (ctx, x, y, width, height, radius, fill, stroke) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  // ----------------------------------------------------
  // HELPER: Word Wrap
  // ----------------------------------------------------
  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = (text || '').split(' ');
    let line = '';
    let curY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, curY);
    return curY + lineHeight;
  };

  // ====================================================
  // PAGE 1: TITLE, PĂRȚI, VEHICUL, CONDIȚII FINANCIARE
  // ====================================================
  const p1Canvas = document.createElement('canvas');
  p1Canvas.width = pWidth;
  p1Canvas.height = pHeight;
  const p1 = p1Canvas.getContext('2d');

  p1.fillStyle = '#FFFFFF';
  p1.fillRect(0, 0, pWidth, pHeight);

  // Top Accent Bar
  p1.fillStyle = '#0891b2';
  p1.fillRect(0, 0, pWidth, 16);

  // Header Brand & Title
  p1.fillStyle = '#0f172a';
  p1.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText('AXIS FLEET MANAGEMENT • DIVIZIA LEASING OPERAȚIONAL', 80, 70);

  p1.fillStyle = '#64748b';
  p1.font = 'normal 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText(`Contract Oficial Înregistrat • Pagina 1 / 2`, pWidth - 80 - 340, 70);

  // Title Box
  p1.fillStyle = '#f8fafc';
  p1.strokeStyle = '#e2e8f0';
  p1.lineWidth = 2;
  drawRoundedRect(p1, 80, 95, pWidth - 160, 100, 12, true, true);

  p1.fillStyle = '#0f172a';
  p1.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText(
    isFidejusor 
      ? 'CONTRACT DE LEASING OPERAȚIONAL CU ANGAJAMENT DE FIDEJUSIUNE' 
      : 'CONTRACT DE ÎNCHIRIERE AUTO / LEASING OPERAȚIONAL', 
    110, 142
  );

  p1.fillStyle = '#0891b2';
  p1.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText(`Nr. Înregistrare: ${nrContract}    •    Data Emiterii: ${dataContract}`, 110, 175);

  let y = 225;

  // CAPITOLUL I: PĂRȚILE CONTRACTANTE
  p1.fillStyle = '#0f172a';
  p1.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText('CAPITOLUL I. PĂRȚILE CONTRACTANTE', 80, y);
  y += 24;

  const clientName = client?.name || offer?.client?.name || 'Locatar Client';
  const clientCui = client?.cui_cnp || offer?.client?.cui_cnp || 'CUI/CNP';
  const clientAddr = client?.address || offer?.client?.address || 'Mun. București';
  const clientRep = client?.representative_name || client?.name || 'Reprezentant Legal';
  const clientReg = client?.reg_com || 'J40/___/____';

  const fName = fidejusorData?.name || offer?.fidejusor_name || clientRep;
  const fCnp = fidejusorData?.cnp || offer?.fidejusor_cnp || '___________';
  const fAddr = fidejusorData?.address || offer?.fidejusor_address || clientAddr;
  const fQual = fidejusorData?.quality || offer?.fidejusor_quality || 'Administrator / Fidejusor Garant';

  const partiesText = 
    `1.1. S.C. AXIS RENT S.R.L., societate de leasing operațional și închirieri auto, cu sediul social în București, CUI RO12345678, reprezentată legal, denumită în continuare „LOCATOR” sau „AXIS”;\n\n` +
    `1.2. ${clientName}, CIF/CUI ${clientCui}, Reg. Com. ${clientReg}, având sediul social în ${clientAddr}, reprezentată legal de ${clientRep}, în calitate de „LOCATAR” / „DEBITOR PRINCIPAL”;\n\n` +
    (isFidejusor ? `1.3. ${fName}, domiciliat(ă) în ${fAddr}, identificat(ă) prin CNP ${fCnp}, având calitatea de ${fQual} în cadrul Locatarului, acționând în nume personal în calitate de „FIDEJUSOR / GARANT SOLIDAR”.` : '');

  p1.fillStyle = '#334155';
  p1.font = 'normal 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  y = wrapText(p1, partiesText, 80, y, pWidth - 160, 26);
  y += 10;

  // CAPITOLUL II: OBIECTUL CONTRACTULUI ȘI DESCRIEREA AUTOVEHICULULUI
  p1.fillStyle = '#0f172a';
  p1.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText('CAPITOLUL II. OBIECTUL CONTRACTULUI ȘI VEHICULUL TRANSMIS ÎN FOLOSINȚĂ', 80, y);
  y += 20;

  p1.fillStyle = '#334155';
  p1.font = 'normal 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  y = wrapText(p1, 'Locatorul acordă Locatarului folosința exclusivă a autovehiculului descris în tabelul de mai jos, conform specificațiilor tehnice agreate:', 80, y, pWidth - 160, 24);
  y += 8;

  // Table Vehicul
  const vRows = [
    ['Marcă și Model:', `${vehicle?.make || offer?.vehicle_make || 'Nespecificat'} ${vehicle?.model || offer?.vehicle_model || ''}`],
    ['Serie Șasiu (VIN):', vehicle?.vin || 'În curs de alocare din stoc / Comandă nouă'],
    ['Număr Înmatriculare:', vehicle?.license_plate || 'Număr provizoriu / Alocat la livrare'],
    ['Valoare de Catalog (Preț):', fmtCurr(offer?.vehicle_price)],
    ['Modul Telematică & GPS:', 'Echipat cu modul GPS Axis Active Telematics (Monitorizare permanentă)']
  ];

  p1.fillStyle = '#f8fafc';
  p1.strokeStyle = '#cbd5e1';
  p1.lineWidth = 1.5;
  drawRoundedRect(p1, 80, y, pWidth - 160, vRows.length * 40, 10, true, true);

  vRows.forEach(([lbl, val], idx) => {
    const rowY = y + idx * 40;
    if (idx > 0) {
      p1.strokeStyle = '#e2e8f0';
      p1.beginPath();
      p1.moveTo(80, rowY);
      p1.lineTo(pWidth - 80, rowY);
      p1.stroke();
    }
    p1.fillStyle = '#475569';
    p1.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p1.fillText(lbl, 100, rowY + 26);

    p1.fillStyle = '#0f172a';
    p1.font = 'normal 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p1.fillText(val, 480, rowY + 26);
  });
  y += vRows.length * 40 + 35;

  // CAPITOLUL III: CONDIȚII FINANCIARE
  p1.fillStyle = '#0f172a';
  p1.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText('CAPITOLUL III. TERMENE, CONDIȚII FINANCIARE ȘI GRAFIC DE PLATĂ', 80, y);
  y += 24;

  const fRows = [
    ['Durată Contractuală:', `${offer?.period_months || 60} luni consecutive`],
    ['Avans Inițial de Garanție:', `${offer?.advance_percent || 20}% (${fmtCurr(advanceAmount)})`],
    ['Rată Lunară de Folosință (Chirie):', `${fmtCurr(offer?.monthly_rate)} / lună (fără TVA)`],
    ['Valoare Reziduală la Termen:', `${offer?.residual_value_percent || 1}% (${fmtCurr(residualAmount)})`],
    ['Rată Dobândă de Referință:', `${offer?.interest_rate || 5.9}% pe an`],
    ['Scadență Plată Facturi:', '5 zile lucrătoare de la data emiterii fiecărei facturi lunare']
  ];

  p1.fillStyle = '#f8fafc';
  p1.strokeStyle = '#cbd5e1';
  p1.lineWidth = 1.5;
  drawRoundedRect(p1, 80, y, pWidth - 160, fRows.length * 40, 10, true, true);

  fRows.forEach(([lbl, val], idx) => {
    const rowY = y + idx * 40;
    if (idx > 0) {
      p1.strokeStyle = '#e2e8f0';
      p1.beginPath();
      p1.moveTo(80, rowY);
      p1.lineTo(pWidth - 80, rowY);
      p1.stroke();
    }
    p1.fillStyle = '#475569';
    p1.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p1.fillText(lbl, 100, rowY + 26);

    p1.fillStyle = idx === 2 ? '#0891b2' : '#0f172a';
    p1.font = idx === 2 ? 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'normal 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p1.fillText(val, 480, rowY + 26);
  });

  // Footer Note on Page 1
  p1.fillStyle = '#94a3b8';
  p1.font = 'italic 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1.fillText('Continuitatea clauzelor legale, a garanției de fidejusiune și a semnăturilor este detaliată în Pagina 2.', 80, pHeight - 50);

  // ====================================================
  // PAGE 2: TELEMATICS, FIDEJUSIUNE, LITIGII & SEMNĂTURI
  // ====================================================
  const p2Canvas = document.createElement('canvas');
  p2Canvas.width = pWidth;
  p2Canvas.height = pHeight;
  const p2 = p2Canvas.getContext('2d');

  p2.fillStyle = '#FFFFFF';
  p2.fillRect(0, 0, pWidth, pHeight);

  // Top Accent Bar
  p2.fillStyle = '#0891b2';
  p2.fillRect(0, 0, pWidth, 16);

  // Header Brand & Title
  p2.fillStyle = '#0f172a';
  p2.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2.fillText('AXIS FLEET MANAGEMENT • CLAUZE CONTRACTUALE & APROBĂRI', 80, 70);

  p2.fillStyle = '#64748b';
  p2.font = 'normal 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2.fillText(`Contract Oficial Înregistrat • Pagina 2 / 2`, pWidth - 80 - 340, 70);

  let y2 = 110;

  // CAPITOLUL IV: TELEMATICS & GPS
  p2.fillStyle = '#0f172a';
  p2.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2.fillText('CAPITOLUL IV. MONITORIZARE GPS, TELEMATICĂ ȘI SIGURANȚA ACTIVULUI', 80, y2);
  y2 += 22;

  const gpsClause = 
    `4.1. Locatarul ia la cunoștință și este în mod expres de acord că vehiculul este echipat cu sistem telematic activ GPS Axis, destinat protejării proprietății Locatorului, alertării în caz de depășire a perimetrului teritorial autorizat, detectării deconectării bateriei și prevenirii înstrăinării ilicite.\n` +
    `4.2. Locatarului îi este strict interzisă intervenția neautorizată asupra dispozitivului GPS sau a circuitelor conexe. Orice tentativă de bruiaj sau dezactivare dă dreptul Locatorului de a rezilia contractul de plin drept și de a proceda la imobilizarea și recuperarea imediată a vehiculului.`;

  p2.fillStyle = '#334155';
  p2.font = 'normal 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  y2 = wrapText(p2, gpsClause, 80, y2, pWidth - 160, 24);
  y2 += 15;

  // CAPITOLUL V: CLAUZĂ DE FIDEJUSIUNE (CERINȚĂ OFICIALĂ MARIA / COD CIVIL)
  if (isFidejusor) {
    p2.fillStyle = '#991b1b'; // Red / Warning Dark
    p2.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2.fillText('CAPITOLUL V. ANGAJAMENTUL DE FIDEJUSIUNE SOLIDARĂ (ART. 2280 - 2323 COD CIVIL)', 80, y2);
    y2 += 22;

    const fidejusorClause = 
      `5.1. Fidejusorul (${fName}, CNP ${fCnp}) se obligă în mod irevocabil, necondiționat și solidar cu Debitorul Principal (Locatarul) să garanteze executarea integrală și la termen a tuturor obligațiilor prezente și viitoare ce decurg din prezentul contract de leasing operațional.\n` +
      `5.2. Renunțarea la Beneficiul de Discuțiune și Diviziune: În conformitate cu Art. 2294 și Art. 2300 din Codul Civil Român, Fidejusorul declară expres și neechivoc că RENUNȚĂ LA BENEFICIUL DE DISCUȚIUNE ȘI LA BENEFICIUL DE DIVIZIUNE. Locatorul este îndreptățit să urmărească patrimoniul Fidejusorului direct, imediat și fără o prealabilă executare silită a Locatarului.\n` +
      `5.3. Întinderea Garanției: Fidejusiunea acoperă debitele principale (rate de chirie lunare), penalitățile contractuale de 0.15%/zi de întârziere, daunele și franșizele CASCO/RCA, amenzile rutiere neachitate și costurile de recuperare și repatriere a vehiculului.\n` +
      `5.4. Titlu Executoriu: Părțile recunosc în mod liber calitatea de titlu executoriu a prezentului angajament în condițiile legislației aplicabile.`;

    // Draw background card for fidejusiune
    p2.fillStyle = '#fffbeb';
    p2.strokeStyle = '#fde68a';
    p2.lineWidth = 1.5;
    drawRoundedRect(p2, 80, y2 - 4, pWidth - 160, 290, 10, true, true);

    p2.fillStyle = '#78350f';
    p2.font = 'normal 15.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    wrapText(p2, fidejusorClause, 100, y2 + 18, pWidth - 200, 23);
    y2 += 310;
  } else {
    p2.fillStyle = '#0f172a';
    p2.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2.fillText('CAPITOLUL V. DREPTURI, OBLIGAȚII ȘI ÎNCETAREA CONTRACTULUI', 80, y2);
    y2 += 22;

    const stdClause = 
      `5.1. Locatarul se obligă să exploateze vehiculul conform destinației și instrucțiunilor tehnice ale producătorului.\n` +
      `5.2. Subînchirierea vehiculului către terțe părți este strict interzisă fără acordul prealabil scris al Locatorului.\n` +
      `5.3. În caz de întârziere la plată a facturilor lunare peste 15 zile, Locatorul are dreptul de a sista utilizarea și a recupera vehiculul de îndată.`;

    p2.fillStyle = '#334155';
    p2.font = 'normal 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    y2 = wrapText(p2, stdClause, 80, y2, pWidth - 160, 24);
    y2 += 20;
  }

  // CAPITOLUL VI: LITIGII ȘI LEGEA APLICABILĂ
  p2.fillStyle = '#0f172a';
  p2.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2.fillText('CAPITOLUL VI. LITIGII, LEGEA APLICABILĂ ȘI SEMNĂTURI', 80, y2);
  y2 += 22;

  const finalClause = 
    `Prezentul contract este guvernat de legislația română. Eventualele litigii nesoluționate pe cale amiabilă vor fi deduse spre judecată instanțelor judecătorești competente de la sediul Locatorului din Municipiul București.\n` +
    `Încheiat astăzi, ${dataContract}, în exemplare originale cu putere juridică egală.`;

  p2.fillStyle = '#334155';
  p2.font = 'normal 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  y2 = wrapText(p2, finalClause, 80, y2, pWidth - 160, 24);
  y2 += 30;

  // BLOC SEMNĂTURI
  const numCols = isFidejusor ? 3 : 2;
  const colWidth = (pWidth - 160 - (numCols - 1) * 30) / numCols;

  const sigBoxes = [
    { title: 'LOCATOR', sub: 'S.C. AXIS RENT S.R.L.', note: 'Reprezentant Legal' },
    { title: 'LOCATAR (DEBITOR)', sub: clientName, note: `Reprezentat: ${clientRep}` }
  ];

  if (isFidejusor) {
    sigBoxes.push({ title: 'FIDEJUSOR (GARANT)', sub: fName, note: 'În nume personal' });
  }

  sigBoxes.forEach((box, idx) => {
    const boxX = 80 + idx * (colWidth + 30);
    p2.fillStyle = '#f8fafc';
    p2.strokeStyle = '#cbd5e1';
    p2.lineWidth = 1.5;
    drawRoundedRect(p2, boxX, y2, colWidth, 230, 12, true, true);

    p2.fillStyle = '#0f172a';
    p2.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2.fillText(box.title, boxX + 24, y2 + 40);

    p2.fillStyle = '#475569';
    p2.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2.fillText(box.sub, boxX + 24, y2 + 70);

    p2.fillStyle = '#64748b';
    p2.font = 'normal 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2.fillText(box.note, boxX + 24, y2 + 95);

    // Signature Line
    p2.strokeStyle = '#94a3b8';
    p2.lineWidth = 1;
    p2.setLineDash([4, 4]);
    p2.beginPath();
    p2.moveTo(boxX + 24, y2 + 180);
    p2.lineTo(boxX + colWidth - 24, y2 + 180);
    p2.stroke();
    p2.setLineDash([]);

    p2.fillStyle = '#94a3b8';
    p2.font = 'normal 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2.fillText('Semnătură / Ștampilă Autorizată', boxX + 24, y2 + 205);
  });

  // Footer Branding
  p2.fillStyle = '#94a3b8';
  p2.font = 'normal 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2.fillText(`Document generat prin Platforma Axis Fleet • ${nrContract}`, 80, pHeight - 40);

  // ====================================================
  // ASSEMBLE PDF WITH JSPDF
  // ====================================================
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Add Page 1
  const p1Data = p1Canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(p1Data, 'JPEG', 0, 0, pdfWidth, pdfHeight);

  // Add Page 2
  pdf.addPage();
  const p2Data = p2Canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(p2Data, 'JPEG', 0, 0, pdfWidth, pdfHeight);

  // Download File
  const filename = `Contract_${isFidejusor ? 'Fidejusiune_' : ''}${nrContract}.pdf`;
  pdf.save(filename);

  return filename;
};
