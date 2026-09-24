const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://axis-v01.up.railway.app/api' : 'http://localhost:8000/api');

export const fetchCampaigns = async (activeOnly = false) => {
  const url = activeOnly ? `${API_URL}/campaigns?active_only=true` : `${API_URL}/campaigns`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Nu s-au putut încărca campaniile de finanțare');
  return response.json();
};

export const fetchCampaign = async (id) => {
  const response = await fetch(`${API_URL}/campaigns/${id}`);
  if (!response.ok) throw new Error('Nu s-a putut încărca campania selectată');
  return response.json();
};

export const createCampaign = async (data) => {
  const response = await fetch(`${API_URL}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Eroare la crearea campaniei');
  return response.json();
};

export const updateCampaign = async (id, data) => {
  const response = await fetch(`${API_URL}/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Eroare la actualizarea campaniei');
  return response.json();
};

export const deleteCampaign = async (id) => {
  const response = await fetch(`${API_URL}/campaigns/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Eroare la ștergerea campaniei');
  return response.json();
};
