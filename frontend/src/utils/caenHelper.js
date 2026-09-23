import caenCodes from '../data/caen_codes.json';

export const getCaenInfo = (code) => {
  if (!code) return null;
  const clean = String(code).replace(/\D/g, '');
  if (!clean) return null;
  if (caenCodes[clean]) return caenCodes[clean];
  const padded = clean.padStart(4, '0');
  return caenCodes[padded] || null;
};

export const getCaenDescription = (code) => {
  const info = getCaenInfo(code);
  return info?.denumire || '';
};

export default {
  getCaenInfo,
  getCaenDescription
};
