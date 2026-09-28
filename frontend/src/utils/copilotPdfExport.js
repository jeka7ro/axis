import jsPDF from 'jspdf';

/**
 * Helper to draw crisp rounded rectangles on Canvas
 */
function drawCanvasRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Cleans markdown formatting for plain text display while identifying structure
 */
function stripMarkdownSymbols(line) {
  return line
    .replace(/^#+\s*/, '')
    .replace(/^\>\s*/, '')
    .replace(/^\s*[-*•]\s*/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .trim();
}

/**
 * Extracts company name or CUI from text if present
 */
function extractEntityMeta(text) {
  const cuiMatch = text.match(/\b(?:RO)?(\d{6,10})\b/i);
  const cui = cuiMatch ? cuiMatch[1] : null;

  const titleMatch = text.match(/###\s*(?:Raport\s+Faptic\s+Executiv|Evaluare\s+Executivă|Analiză\s+Risc|Dosar)?[:\s*]+([^\n(]+)/i);
  let name = null;
  if (titleMatch) {
    name = titleMatch[1].replace(/\*\*/g, '').trim();
  } else {
    const boldMatch = text.match(/\*\*([A-Z0-9\s.,-]{3,40}(?:SRL|SA|S\.R\.L\.|S\.A\.))\*\*/i);
    if (boldMatch) name = boldMatch[1].trim();
  }

  return { cui, name };
}

/**
 * Generates an executive, professional PDF report from an Axis Copilot message
 */
export async function exportCopilotMessagePdf(messageText, options = {}) {
  if (!messageText || typeof messageText !== 'string') {
    throw new Error('Textul mesajului este invalid.');
  }

  const pWidth = 1680;
  const pHeight = 2376;
  const marginX = 90;
  const contentWidth = pWidth - (marginX * 2);
  const dateStr = new Date().toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = new Date().toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const { cui, name } = extractEntityMeta(messageText);
  const subjectName = options.clientName || name || (cui ? `Companie CUI ${cui}` : 'Analiză Executivă Axis Copilot');
  const subjectCui = options.clientCui || cui || 'Nedefinit';

  // Helper to create a new page canvas
  const createPageCanvas = (pageNumber) => {
    const canvas = document.createElement('canvas');
    canvas.width = pWidth;
    canvas.height = pHeight;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pWidth, pHeight);

    // Top Brand Accent Line
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, pWidth, 18);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 18, pWidth, 6);

    // Header Content
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('AXIS FINANCIAL PLATFORM • CENTRU EXECUTIV COPILOT', marginX, 68);

    ctx.fillStyle = '#64748b';
    ctx.font = 'normal 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Raport Oficial de Analiză Faptică • Pagina ${pageNumber}`, pWidth - marginX - 350, 68);

    // Header Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, 85);
    ctx.lineTo(pWidth - marginX, 85);
    ctx.stroke();

    return { canvas, ctx };
  };

  const pages = [];
  let currentPageIndex = 0;
  let { canvas, ctx } = createPageCanvas(currentPageIndex + 1);
  pages.push(canvas);

  let curY = 120;

  // Title Box on Page 1
  drawCanvasRoundRect(ctx, marginX, curY, contentWidth, 120, 16, '#f8fafc', '#e2e8f0', 2);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subjectName, marginX + 30, curY + 48);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`CUI Oficial: ${subjectCui}   •   Data Emiterii: ${dateStr}, ${timeStr}   •   Securitate: STRICT CONFIDENȚIAL`, marginX + 30, curY + 86);

  curY += 150;

  // Split message into raw lines
  const rawLines = messageText.split('\n');

  const checkPageBreak = (neededHeight) => {
    if (curY + neededHeight > pHeight - 140) {
      currentPageIndex++;
      const newPage = createPageCanvas(currentPageIndex + 1);
      canvas = newPage.canvas;
      ctx = newPage.ctx;
      pages.push(canvas);
      curY = 120;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      curY += 12;
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      checkPageBreak(30);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(marginX, curY + 10);
      ctx.lineTo(pWidth - marginX, curY + 10);
      ctx.stroke();
      curY += 28;
      continue;
    }

    // Markdown Table Row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.includes('---') || trimmed.includes(':---')) {
        continue; // skip separator row
      }
      checkPageBreak(45);
      const cells = trimmed.split('|').slice(1, -1).map(c => stripMarkdownSymbols(c));
      const colWidth = Math.floor(contentWidth / Math.max(cells.length, 1));
      
      const isHeader = i > 0 && rawLines[i + 1]?.includes('---');
      if (isHeader) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(marginX, curY - 5, contentWidth, 38);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else {
        ctx.fillStyle = '#334155';
        ctx.font = 'normal 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      }

      cells.forEach((cell, cellIdx) => {
        const cellX = marginX + (cellIdx * colWidth) + 12;
        ctx.fillText(cell, cellX, curY + 20);
      });

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX, curY + 33);
      ctx.lineTo(pWidth - marginX, curY + 33);
      ctx.stroke();

      curY += 38;
      continue;
    }

    // Section Headers (### or ## or uppercase key headers)
    if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('# ') || /^(CONCLUZIE|DECIZIE|SITUAȚIE|EVALUARE|RAPORT|RECOMANDARE)/i.test(trimmed)) {
      checkPageBreak(70);
      const cleanHeader = stripMarkdownSymbols(trimmed);
      
      // Decorative bar
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(marginX, curY + 8, 5, 26);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(cleanHeader, marginX + 18, curY + 28);
      curY += 46;
      continue;
    }

    // Alert Callouts (> Blockquote)
    if (trimmed.startsWith('>')) {
      const cleanQuote = stripMarkdownSymbols(trimmed);
      checkPageBreak(65);

      const isCritical = /critic|alert[aă]|faliment|radiat|ineligibil|respins/i.test(cleanQuote);
      const bgColor = isCritical ? '#fef2f2' : '#f0fdf4';
      const borderColor = isCritical ? '#ef4444' : '#10b981';
      const textColor = isCritical ? '#991b1b' : '#065f46';

      drawCanvasRoundRect(ctx, marginX, curY, contentWidth, 54, 10, bgColor, borderColor, 1.5);

      ctx.fillStyle = textColor;
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(cleanQuote, marginX + 20, curY + 32);
      curY += 70;
      continue;
    }

    // Bullet points / lists
    const isBullet = /^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
    const cleanText = stripMarkdownSymbols(trimmed);

    ctx.font = isBullet 
      ? 'normal 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'normal 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const indent = isBullet ? marginX + 30 : marginX + 8;
    const maxTextWidth = contentWidth - (isBullet ? 40 : 16);

    if (isBullet) {
      checkPageBreak(30);
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(marginX + 15, curY + 12, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Word wrap rendering
    ctx.fillStyle = '#1e293b';
    const words = cleanText.split(' ');
    let line = '';
    const lineHeight = 26;

    for (let w = 0; w < words.length; w++) {
      const testLine = line + words[w] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && w > 0) {
        checkPageBreak(lineHeight);
        ctx.fillText(line.trim(), indent, curY + 16);
        line = words[w] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    checkPageBreak(lineHeight);
    ctx.fillText(line.trim(), indent, curY + 16);
    curY += lineHeight + 6;
  }

  // Draw footer on all pages
  const totalPages = pages.length;
  pages.forEach((pCanvas, idx) => {
    const pCtx = pCanvas.getContext('2d');
    
    // Bottom rule
    pCtx.strokeStyle = '#e2e8f0';
    pCtx.lineWidth = 1;
    pCtx.beginPath();
    pCtx.moveTo(marginX, pHeight - 75);
    pCtx.lineTo(pWidth - marginX, pHeight - 75);
    pCtx.stroke();

    pCtx.fillStyle = '#94a3b8';
    pCtx.font = 'normal 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    pCtx.fillText('Generat de Axis AI Copilot • Agregare automată registre oficiale (ANAF, ONRC, Just.ro) • Document intern confidențial', marginX, pHeight - 50);

    const pageNotice = `Pagina ${idx + 1} din ${totalPages}`;
    const noticeWidth = pCtx.measureText(pageNotice).width;
    pCtx.fillText(pageNotice, pWidth - marginX - noticeWidth, pHeight - 50);
  });

  // Assemble into jsPDF document
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let p = 0; p < pages.length; p++) {
    if (p > 0) pdf.addPage();
    const imgData = pages[p].toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  }

  const safeName = (subjectName || 'Raport_Axis_Copilot').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const fileName = `Raport_Axis_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
  return fileName;
}
