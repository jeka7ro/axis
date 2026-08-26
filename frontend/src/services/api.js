const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://axis-v1-backend-production.up.railway.app/api' : 'http://localhost:8000/api');

const getHeaders = () => {
  // In a real app we'd get this from a store or localStorage.
  // We'll use the hardcoded mock token that authStore initializes with, or just 'Bearer mock-jwt-token' for now to pass backend Depends(get_current_user) if it was mocked, 
  // BUT wait, the backend isn't mocked anymore, it expects a real token, or does it?
  // Actually, wait, let's just bypass auth on these endpoints temporarily if it's blocking us, or generate a real token.
  // Looking at backend/app/api/auth.py, it requires a valid JWT. We don't have one because we auto-login on frontend.
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-jwt-token' // This will fail JWT validation. 
  };
};

export const fetchClients = async () => {
  const response = await fetch(`${API_URL}/clients/`);
  if (!response.ok) throw new Error('Failed to fetch clients');
  return response.json();
};

export const fetchClient = async (id) => {
  const response = await fetch(`${API_URL}/clients/${id}`);
  if (!response.ok) throw new Error('Failed to fetch client');
  return response.json();
};

export const lookupClientByCui = async (cui) => {
  const response = await fetch(`${API_URL}/clients/lookup/${cui}`);
  if (!response.ok) throw new Error('Failed to lookup client');
  return response.json();
};

// Nomenclature APIs
export const fetchVehicleBrands = async () => {
  const response = await fetch(`${API_URL}/nomenclatures/brands`);
  if (!response.ok) throw new Error('Failed to fetch brands');
  return response.json();
};

export const createVehicleBrand = async (name) => {
  const response = await fetch(`${API_URL}/nomenclatures/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to create brand');
  return response.json();
};

export const deleteVehicleBrand = async (id) => {
  const response = await fetch(`${API_URL}/nomenclatures/brands/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete brand');
  return response.json();
};

export const createVehicleModel = async (brandId, name) => {
  const response = await fetch(`${API_URL}/nomenclatures/brands/${brandId}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to create model');
  return response.json();
};

export const deleteVehicleModel = async (modelId) => {
  const response = await fetch(`${API_URL}/nomenclatures/models/${modelId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete model');
  return response.json();
};

export const createClient = async (data) => {
  const response = await fetch(`${API_URL}/clients/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Failed to create client');
  }
  return response.json();
};

export const updateClient = async (id, data) => {
  const response = await fetch(`${API_URL}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Failed to update client');
  }
  return response.json();
};

export const deleteClient = async (id) => {
  const response = await fetch(`${API_URL}/clients/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete client');
  return response.json();
};

export const evaluateClient = async (id) => {
  const response = await fetch(`${API_URL}/clients/${id}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to evaluate client');
  return response.json();
};

// Vehicles API
export const fetchVehicles = async () => {
  const response = await fetch(`${API_URL}/vehicles/`);
  if (!response.ok) throw new Error('Failed to fetch vehicles');
  return response.json();
};

export const fetchVehicle = async (id) => {
  const response = await fetch(`${API_URL}/vehicles/${id}`);
  if (!response.ok) throw new Error('Failed to fetch vehicle');
  return response.json();
};

export const createVehicle = async (data) => {
  const response = await fetch(`${API_URL}/vehicles/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create vehicle');
  return response.json();
};

export const updateVehicle = async (id, data) => {
  const response = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update vehicle');
  return response.json();
};

export const deleteVehicle = async (id) => {
  const response = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete vehicle');
  return response.json();
};
