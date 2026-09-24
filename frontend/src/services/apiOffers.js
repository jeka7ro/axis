const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://axis-v01.up.railway.app/api' : 'http://localhost:8000/api');

export const fetchOffers = async (role = null, dealerName = null) => {
  let url = `${API_URL}/offers/`;
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (dealerName) params.append('dealer_name', dealerName);
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch offers');
  return response.json();
};

export const fetchOffer = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}`);
  if (!response.ok) throw new Error('Failed to fetch offer');
  return response.json();
};

export const updateOffer = async (id, data) => {
  const response = await fetch(`${API_URL}/offers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update offer');
  return response.json();
};

export const createOffer = async (data) => {
  const response = await fetch(`${API_URL}/offers/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create offer');
  return response.json();
};

export const approveOffer = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}/approve`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to approve offer');
  return response.json();
};

export const submitOfferForApproval = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}/submit-approval`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to submit offer for approval');
  return response.json();
};

export const deleteOffer = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete offer');
  return response.json();
};

export const fetchFidejusorSuggestion = async (clientId) => {
  const response = await fetch(`${API_URL}/offers/fidejusor-suggestion/${clientId}`);
  if (!response.ok) throw new Error('Failed to fetch fidejusor suggestion');
  return response.json();
};

export const generateContract = async (id, vehicleId, templateType = 'standard', fidejusorData = {}) => {
  const payload = {
    vehicle_id: vehicleId ? parseInt(vehicleId, 10) : null,
    template_type: templateType,
    fidejusor_name: fidejusorData?.name || null,
    fidejusor_cnp: fidejusorData?.cnp || null,
    fidejusor_address: fidejusorData?.address || null,
    fidejusor_id_card: fidejusorData?.id_card || null,
    fidejusor_quality: fidejusorData?.quality || null
  };
  const response = await fetch(`${API_URL}/offers/${id}/generate-contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to generate contract');
  return response.json();
};

export const fetchContracts = async () => {
  const response = await fetch(`${API_URL}/offers/contracts`);
  if (!response.ok) throw new Error('Failed to fetch contracts');
  return response.json();
};

// Dual-Pass Namirial eSign API calls
export const sendESignEnvelope = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}/esign/send`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Eroare la crearea plicului eSign');
  return response.json();
};

export const signClientESign = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}/esign/sign-client`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Eroare la semnarea clientului');
  return response.json();
};

export const signAxisESign = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}/esign/sign-axis`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Eroare la contrasemnarea Axis');
  return response.json();
};

export const fetchESignAuditTrail = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}/esign/audit-trail`);
  if (!response.ok) throw new Error('Nu s-a putut descărca jurnalul de audit');
  return response.json();
};

export const sendESign = sendESignEnvelope;


export const uploadTemplate = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/offers/upload-template`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Failed to upload template');
  return response.json();
};
