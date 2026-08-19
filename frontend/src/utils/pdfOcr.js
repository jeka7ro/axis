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
    img.onerror = () => reject(new Error('Formatul imaginii nu este recunoscut (posibil HEIC de pe iPhone). Te rugăm să încarci un fișier JPG, PNG sau PDF.'));
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
  // Normalized text for CNP to handle common OCR letter->number confusions
  const numText = text.replace(/O/gi, '0').replace(/[lI]/g, '1').replace(/S/gi, '5').replace(/B/gi, '8').replace(/Z/gi, '2').replace(/\s+/g, '');
  const cnpMatch = numText.match(/([1-8]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{6})/);
  if (cnpMatch) {
     cnp = cnpMatch[1];
  }
  
  let nume = '';
  
  // Cleaned text for Name MRZ
  const textNoSpacesMRZ = text.replace(/\s+/g, '').replace(/0/g, 'O').replace(/1/g, 'I'); 
  const mrzMatchName = textNoSpacesMRZ.match(/(?:ID|1D|I0|10)R[O0U]+([A-Z<]{15,30})/i);
  if (mrzMatchName) {
    const namePart = mrzMatchName[1];
    const parts = namePart.split(/<{2,}/);
    if (parts.length >= 2) {
      const lastName = parts[0].replace(/</g, ' ').trim();
      const firstName = parts[1].replace(/</g, ' ').trim();
      nume = `${lastName} ${firstName}`;
    } else {
      nume = namePart.replace(/</g, ' ').trim();
    }
  }

  const textLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  
  if (!nume || nume.length < 3) {
    const numeIdx = textLines.findIndex(l => l.toUpperCase().includes('NUME') || l.toUpperCase().includes('NOM') || l.toUpperCase().includes('LAST NAME'));
    if (numeIdx !== -1 && textLines[numeIdx + 1]) {
       const extrNume = textLines[numeIdx + 1].replace(/[^a-zA-ZĂÂÎȘȚăâîșț\s-]/g, '').trim();
       const prenumeIdx = textLines.findIndex(l => l.toUpperCase().includes('PRENUME') || l.toUpperCase().includes('FIRST NAME'));
       if (prenumeIdx !== -1 && textLines[prenumeIdx + 1]) {
           const extrPrenume = textLines[prenumeIdx + 1].replace(/[^a-zA-ZĂÂÎȘȚăâîșț\s-]/g, '').trim();
           // Avoid concatenating the exact same line
           if (extrNume !== extrPrenume && !extrNume.includes(extrPrenume)) {
               nume = extrNume + ' ' + extrPrenume;
           } else {
               nume = extrNume;
           }
       } else {
           nume = extrNume;
       }
    }
  }
  
  let address = '';
  const domIdx = textLines.findIndex(l => l.toUpperCase().includes('DOMICILIU') || l.toUpperCase().includes('ADDRESS'));
  if (domIdx !== -1) {
    let addrLines = [];
    for (let i = domIdx + 1; i < textLines.length; i++) {
      if (textLines[i].toUpperCase().includes('EMIS') || textLines[i].toUpperCase().includes('ISSUED')) break;
      if (textLines[i].toUpperCase().includes('SEX') || textLines[i].toUpperCase().includes('CNP')) break;
      // Skip very short garbage lines (1-2 chars like "E", "Ei", "x")
      if (textLines[i].replace(/[^a-zA-ZĂÂÎȘȚăâîșț0-9]/g, '').length < 3) continue;
      addrLines.push(textLines[i].trim());
    }
    address = addrLines.join(', ')
      // Normalize Sector patterns: "Sec..." / "Sec?" / "Sec." / "Sec " -> "Sector"
      .replace(/\bSec[\.\?\!\*…]{0,3}\s*/gi, 'Sector ')
      // Normalize "Sector" followed by random garbage before the number
      .replace(/Sector\s*[^0-9,]{0,4}([0-9])/gi, 'Sector $1')
      // Clean "SÂ" / "Să" / "SA" after Sector number (OCR misread)
      .replace(/(Sector\s*\d)\s*[SŞș][AÂăâ]/gi, '$1')
      // Normalize Mun. / Str. / Int. / Nr. spacing
      .replace(/\bMun\s*\./gi, 'Mun.')
      .replace(/\bStr\s*\./gi, 'Str.')
      .replace(/\bInt\s*\./gi, 'Int.')
      .replace(/\bnr\s*\./gi, 'nr.')
      .replace(/\bBl\s*\./gi, 'Bl.')
      .replace(/\bSc\s*\./gi, 'Sc.')
      .replace(/\bEt\s*\./gi, 'Et.')
      .replace(/\bAp\s*\./gi, 'Ap.')
      // Remove common OCR noise words
      .replace(/\b(?:NSE|E Ss|evp|eup|GOE)\b/gi, '')
      // Remove stray 3-digit numbers that are NOT part of addresses (700-999 range noise)
      .replace(/\b[789]\d{2}\b/g, '')
      // Remove special characters that shouldn't be in addresses
      .replace(/[«»<>\\|_:]/g, '')
      // Specific known OCR corrections
      .replace(/a Enășeti/gi, 'Orș. Mărășești')
      // Strip trailing short garbage fragments (1-2 letter words at end)
      .replace(/,?\s*\b[a-zA-Z]{1,2}\s*$/g, '')
      // Clean up spacing and commas
      .replace(/\s+nr\s*,/gi, ' nr.')
      .replace(/\s+nr\s*$/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/, '')
      .replace(/^\s*,\s*/, '')
      .trim();
  }
  
  let series = '';
  let number = '';
  const textCleanedSeries = text.replace(/\|/g, 'I').replace(/!/g, '1');
  const seriesMatch = textCleanedSeries.match(/SERI[A-Z\s:]*([A-Z]{2})\s*NR[A-Z\s\.:]*([0-9]{6})/i);
  if (seriesMatch) {
    series = seriesMatch[1];
    number = seriesMatch[2];
  } else {
    // Fallback: search for 2 capital letters and 6 digits anywhere
    const altMatch = textCleanedSeries.match(/\b([A-Z]{2})\s*([0-9OIlS]{6})\b/);
    if (altMatch) {
      series = altMatch[1];
      number = altMatch[2].replace(/O/gi, '0').replace(/[lI]/g, '1').replace(/S/gi, '5');
    }
  }

  let validFrom = '';
  let validUntil = '';
  const validityMatch = text.match(/(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})\s*[\-\–\—]?\s*(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})/);
  if (validityMatch) {
    validFrom = validityMatch[1].replace(/-/g, '.');
    validUntil = validityMatch[2].replace(/-/g, '.');
  } else {
    const textNoSpacesDates = text.replace(/\s+/g, '');
    const validMatchNoSpace = textNoSpacesDates.match(/(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})[\-\–\—]?(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})/);
    if (validMatchNoSpace) {
      validFrom = validMatchNoSpace[1].replace(/-/g, '.');
      validUntil = validMatchNoSpace[2].replace(/-/g, '.');
    } else {
      const dateRegex = /(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})/g;
      const datesFound = [...text.matchAll(dateRegex)].map(m => m[1]);
      if (datesFound.length >= 2) {
        validFrom = datesFound[datesFound.length - 2].replace(/-/g, '.');
        validUntil = datesFound[datesFound.length - 1].replace(/-/g, '.');
      }
    }
  }

  let issuedBy = '';
  const issuedIdx = textLines.findIndex(l => l.toUpperCase().includes('EMIS') || l.toUpperCase().includes('ISSUED'));
  if (issuedIdx !== -1) {
    const sameLineMatch = textLines[issuedIdx].match(/(?:EMIS[A\s]*DE|ISSUED\s*BY|ED\s*pier).{0,5}(SPCLEP|SPCEP|DIREC[TȚ]IA|POLI[TȚ]IA|SEC[TȚ]IA.*)/i);
    if (sameLineMatch && sameLineMatch[1].trim().length > 3) {
      issuedBy = sameLineMatch[1].trim();
    } else if (textLines[issuedIdx + 1]) {
      issuedBy = textLines[issuedIdx + 1];
    }
    if (issuedBy.toUpperCase().includes('CNP') || issuedBy.length < 3) {
       issuedBy = '';
    }
  }
  
  const dateStripRegex = /\d{2}[\.\-]\d{2}[\.\-]\d{2,4}\s*-\s*\d{2}[\.\-]\d{2}[\.\-]\d{2,4}/;
  issuedBy = issuedBy.replace(dateStripRegex, '')
                     .replace(/\b(?:20|19)\d{2}\b.*/, '')
                     .replace(/(?:ED pier|ISSUED BY|EMISA DE|EMIS DE)/gi, '')
                     .replace(/\d{2,}.*/, '') 
                     .replace(/GOE/gi, '')
                     .trim();
                     
  const issuerPrefix = issuedBy.match(/(SPCLEP|SPCEP|DIREC[TȚ]IA|POLI[TȚ]IA|SEC[TȚ]IA)/i);
  if (issuerPrefix) {
    issuedBy = issuedBy.substring(issuerPrefix.index);
  }
  
  const mrzLine2Match = numText.match(/([A-Z]{2})([0-9]{6})[<\dK\(\)]+R[O0]U/i);
  if (mrzLine2Match && !series) {
      series = mrzLine2Match[1];
      number = mrzLine2Match[2];
  }
  
  return {
    cui_cnp: cnp || '',
    name: nume || '',
    address: address || '',
    id_card_series: series || '',
    id_card_number: number || '',
    id_card_issued_by: issuedBy || '',
    id_card_valid_from: validFrom || '',
    id_card_valid_until: validUntil || ''
  };
}

