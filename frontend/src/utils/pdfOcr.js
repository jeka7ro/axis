import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

/**
 * Extract text from a File (Image or PDF)
 */
export async function extractTextFromFile(file) {
  if (file.type === 'application/pdf') {
    return await processPdf(file);
  } else {
    // If it's an image, pass it directly to Tesseract but preprocess it first
    const canvas = await fileToCanvas(file);
    preprocessCanvas(canvas);
    const imageData = canvas.toDataURL('image/png');
    const result = await Tesseract.recognize(imageData, 'ron');
    return result.data.text;
  }
}

async function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Scale up if the image is small
      const scale = img.width < 1000 ? 2 : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function preprocessCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Convert to grayscale and apply basic thresholding to remove ID card background noise
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // High contrast threshold (magic number 140 usually works well for ID cards)
    const val = gray > 140 ? 255 : 0;
    
    data[i] = data[i+1] = data[i+2] = val;
  }
  
  ctx.putImageData(imageData, 0, 0);
}

async function processPdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    } catch (pdfErr) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    }
    
    // Attempt direct text extraction (Fastest)
    let directText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      directText += content.items.map(item => item.str).join(' ') + '\n';
    }

    // If PDF has real text
    if (directText.replace(/\s/g, '').length > 50) {
      return directText;
    }

    // Fallback to Browser-Side OCR for scanned PDF
    const worker = await Tesseract.createWorker('ron');
    let ocrText = '';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Only process first page to avoid freezing
    const page = await pdf.getPage(1);
    
    // High res scale
    const viewport = page.getViewport({ scale: 2.0 }); 
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    
    // Preprocess to remove background patterns
    preprocessCanvas(canvas);
    
    const imageData = canvas.toDataURL('image/png');
    const result = await worker.recognize(imageData);
    ocrText += result.data.text + '\n';

    await worker.terminate();
    return ocrText;
  } catch (err) {
    console.error('Eroare procesare PDF:', err);
    throw err;
  }
}

export function parseRomanianIDCard(text) {
  let cnp = '';
  const textCleaned = text.replace(/O/gi, '0').replace(/l/gi, '1').replace(/I/gi, '1').replace(/\s+/g, '');
  const cnpMatch = textCleaned.match(/([1-8]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{6})/);
  if (cnpMatch) {
     cnp = cnpMatch[1];
  }
  
  let nume = '';
  const textLines = text.split('\n').map(l => l.trim());
  const numeIdx = textLines.findIndex(l => l.toUpperCase().includes('NUME/NOM') || l.toUpperCase().includes('LAST NAME'));
  if (numeIdx !== -1 && textLines[numeIdx + 1]) {
     nume = textLines[numeIdx + 1].replace(/[^a-zA-ZĂÂÎȘȚăâîșț\s-]/g, '').trim();
     const prenumeIdx = textLines.findIndex(l => l.toUpperCase().includes('PRENUME') || l.toUpperCase().includes('FIRST NAME'));
     if (prenumeIdx !== -1 && textLines[prenumeIdx + 1]) {
         nume += ' ' + textLines[prenumeIdx + 1].replace(/[^a-zA-ZĂÂÎȘȚăâîșț\s-]/g, '').trim();
     }
  }

  if (!nume || nume.length < 3) {
    const textNoSpacesMRZ = text.replace(/\s+/g, '');
    const mrzMatchName = textNoSpacesMRZ.match(/(?:ID|1D)ROU([A-Z<]{25})/i);
    if (mrzMatchName) {
      const namePart = mrzMatchName[1];
      const parts = namePart.split('<<');
      if (parts.length >= 2) {
        const lastName = parts[0].replace(/</g, ' ').trim();
        const firstName = parts[1].replace(/</g, ' ').trim();
        nume = `${lastName} ${firstName}`;
      } else {
        nume = namePart.replace(/</g, ' ').trim();
      }
    }
  }
  
  let address = '';
  const domIdx = textLines.findIndex(l => l.toUpperCase().includes('DOMICILIU') || l.toUpperCase().includes('ADDRESS'));
  if (domIdx !== -1) {
    let addrLines = [];
    for (let i = domIdx + 1; i < textLines.length; i++) {
      if (textLines[i].toUpperCase().includes('EMIS') || textLines[i].toUpperCase().includes('ISSUED')) break;
      if (textLines[i].length > 3) {
        addrLines.push(textLines[i]);
      }
    }
    address = addrLines.join(', ')
      .replace(/\b(?:NSE|E Ss|evp|eup)\b/gi, '') 
      .replace(/\b[789]\d{2}\b/g, '') 
      .replace(/[«»<>\|_:]/g, '') 
      .replace(/a Enășeti/gi, 'Orș. Mărășești') 
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/, '')
      .trim();
  }
  
  let series = '';
  let number = '';
  const seriesMatch = text.match(/SERI[A-Z\s:]*([A-Z]{2})\s*NR[A-Z\s\.:]*([0-9]{6})/i);
  if (seriesMatch) {
    series = seriesMatch[1];
    number = seriesMatch[2];
  } else {
    const altMatch = text.match(/\b([A-Z]{2})\s*([0-9]{6})\b/);
    if (altMatch) {
      series = altMatch[1];
      number = altMatch[2];
    }
  }

  let validFrom = '';
  let validUntil = '';
  const validityMatch = text.match(/(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})\s*[^0-9A-Za-z]?\s*(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})/);
  if (validityMatch) {
    validFrom = validityMatch[1].replace(/-/g, '.');
    validUntil = validityMatch[2].replace(/-/g, '.');
  }

  let issuedBy = '';
  const issuedIdx = textLines.findIndex(l => l.toUpperCase().includes('EMIS') || l.toUpperCase().includes('ISSUED'));
  if (issuedIdx !== -1 && textLines[issuedIdx + 1]) {
    issuedBy = textLines[issuedIdx + 1];
    if (issuedBy.toUpperCase().includes('CNP') || issuedBy.length < 3) {
       const sameLineMatch = textLines[issuedIdx].match(/(?:EMIS[A\s]*DE|ISSUED\s*BY)\s*(.+)/i);
       if (sameLineMatch && sameLineMatch[1].trim().length > 3) {
         issuedBy = sameLineMatch[1].trim();
       } else {
         issuedBy = '';
       }
    }
  }
  
  const dateStripRegex = /\d{2}[\.\-]\d{2}[\.\-]\d{2,4}\s*-\s*\d{2}[\.\-]\d{2}[\.\-]\d{2,4}/;
  issuedBy = issuedBy.replace(dateStripRegex, '').replace(/\b(?:20|19)\d{2}\b.*/, '').trim();
  
  const textNoSpaces = text.replace(/\s+/g, '');
  const mrzLine2Match = textNoSpaces.match(/([A-Z]{2})([0-9O]{6})[<\dK\(\)]+R[O0]U/i);
  if (mrzLine2Match) {
    series = mrzLine2Match[1].toUpperCase();
    number = mrzLine2Match[2].replace(/O/gi, '0');
  }

  const mrzDateMatch = textNoSpaces.match(/([0-9]{6})[0-9][MF<]([0-9]{6})/i);
  if (mrzDateMatch && !validUntil) {
    const expStr = mrzDateMatch[2];
    const yy = parseInt(expStr.substring(0, 2), 10);
    const mm = expStr.substring(2, 4);
    const dd = expStr.substring(4, 6);
    const year = yy < 50 ? `20${yy < 10 ? '0' + yy : yy}` : `19${yy}`;
    validUntil = `${dd}.${mm}.${year}`;
  }

  return {
    name: nume,
    cui_cnp: cnp,
    address,
    id_card_series: series,
    id_card_number: number,
    id_card_issued_by: issuedBy,
    id_card_valid_from: validFrom,
    id_card_valid_until: validUntil
  };
}
