const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://axis-v1-backend-production.up.railway.app/api' : 'http://localhost:8000/api');

export const fetchOffers = async () => {
  const response = await fetch(`${API_URL}/offers/`);
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

export const deleteOffer = async (id) => {
  const response = await fetch(`${API_URL}/offers/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete offer');
  return response.json();
};

export const generateContract = async (id, vehicleId) => {
  const response = await fetch(`${API_URL}/offers/${id}/generate-contract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicle_id: vehicleId })
  });
  if (!response.ok) throw new Error('Failed to generate contract');
  return response.json();
};

export const fetchContracts = async () => {
  const response = await fetch(`${API_URL}/offers/contracts`);
  if (!response.ok) throw new Error('Failed to fetch contracts');
  return response.json();
};

export const sendESign = async (id) => {
  // Mock endpoint, will fail on actual backend if not implemented,
  // but we'll mock the success in the UI for now.
  return new Promise(resolve => setTimeout(() => resolve({status: 'Trimis la Semnat'}), 800));
};

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
