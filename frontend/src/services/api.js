export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://axis-v01.up.railway.app/api' : 'http://localhost:8000/api');

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

export const addClientToBlacklist = async (id, payload = {}) => {
  const response = await fetch(`${API_URL}/clients/${id}/blacklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to add client to blacklist');
  return response.json();
};

export const removeClientFromBlacklist = async (id) => {
  const response = await fetch(`${API_URL}/clients/${id}/unblacklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to remove client from blacklist');
  return response.json();
};

export const fetchBlacklistedClients = async () => {
  const response = await fetch(`${API_URL}/clients/blacklist/all`);
  if (!response.ok) throw new Error('Failed to fetch blacklisted clients');
  return response.json();
};

export const lookupClientByCui = async (cui) => {
  const response = await fetch(`${API_URL}/clients/lookup/${cui}`);
  if (!response.ok) throw new Error('Failed to lookup client');
  return response.json();
};

export const searchPublicCompanies = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const response = await fetch(`${API_URL}/clients/public-search?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) return [];
  return response.json();
};

export const fetchClientJEVAudit = async (id) => {
  const response = await fetch(`${API_URL}/clients/${id}/jev-audit`);
  if (!response.ok) throw new Error('Failed to fetch JEV audit certificate');
  return response.json();
};

export const fetchAdminNetwork = async (name, contextCui = '') => {
  const url = `${API_URL}/clients/admin-network?name=${encodeURIComponent(name)}${contextCui ? `&context_cui=${encodeURIComponent(contextCui)}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch administrator network');
  return response.json();
};

export const fetchCompanyFullIntel = async (cui, name = '', forceRefresh = false) => {
  const response = await fetch(`${API_URL}/clients/company-full-intel?cui=${encodeURIComponent(cui)}&name=${encodeURIComponent(name)}&force_refresh=${Boolean(forceRefresh)}`);
  if (!response.ok) throw new Error('Failed to fetch company full intel');
  return response.json();
};

export const fetchPersonFullIntel = async (name, contextCui = '') => {
  const url = `${API_URL}/clients/person-full-intel?name=${encodeURIComponent(name)}${contextCui ? `&context_cui=${encodeURIComponent(contextCui)}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch person full intel');
  return response.json();
};

export const fetchPortalJustCases = async (query) => {
  const response = await fetch(`${API_URL}/clients/portal-just?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to fetch portal just cases');
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

export const evaluateClient = async (id, forceRefresh = false) => {
  const response = await fetch(`${API_URL}/clients/${id}/evaluate?force_refresh=${Boolean(forceRefresh)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to evaluate client');
  }
  return response.json();
};

export const evaluateCompanyByCui = async (cui, forceRefresh = false) => {
  const response = await fetch(`${API_URL}/clients/evaluate-by-cui/${cui}?force_refresh=${Boolean(forceRefresh)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.detail || 'Failed to evaluate company');
  }
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

export const fetchClientFleetTelemetryReport = async (clientId) => {
  const response = await fetch(`${API_URL}/clients/${clientId}/fleet-telemetry-report`);
  if (!response.ok) throw new Error('Failed to fetch client fleet telemetry report');
  return response.json();
};

export const fetchClientOnrcDetails = async (clientId) => {
  const response = await fetch(`${API_URL}/clients/${clientId}/onrc-details`);
  if (!response.ok) throw new Error('Failed to fetch ONRC details');
  return response.json();
};

export const uploadClientDocument = async (clientId, file, documentType = "Certificat Constatator ONRC") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);
  const response = await fetch(`${API_URL}/clients/${clientId}/upload-document`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) throw new Error('Failed to upload client document');
  return response.json();
};

export const fetchClientDocuments = async (clientId) => {
  const response = await fetch(`${API_URL}/clients/${clientId}/documents`);
  if (!response.ok) throw new Error('Failed to fetch client documents');
  return response.json();
};

export const fetchClientPublicDeepResearch = async (clientId) => {
  const response = await fetch(`${API_URL}/clients/${clientId}/public-deep-research`);
  if (!response.ok) throw new Error('Failed to fetch public deep research');
  return response.json();
};

export const sendAssistantMessage = async ({ query, clientId, context = {}, signal = null }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000); // 28s timeout

  const effectiveSignal = signal || controller.signal;

  try {
    const response = await fetch(`${API_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        client_id: clientId || null,
        context
      }),
      signal: effectiveSignal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Eroare la comunicarea cu Asistentul AI Axis');
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Timpul de procesare a expirat (timeout). Registrele externe sau motorul AI răspund cu întârziere.');
    }
    throw error;
  }
};

export const fetchSuggestedPrompts = async (clientId = null) => {
  const url = clientId ? `${API_URL}/assistant/suggested-prompts?client_id=${clientId}` : `${API_URL}/assistant/suggested-prompts`;
  const response = await fetch(url);
  if (!response.ok) return { prompts: [] };
  return response.json();
};

export const fetchAssistantConfig = async () => {
  try {
    const response = await fetch(`${API_URL}/assistant/config`);
    if (!response.ok) return { configured: false };
    return response.json();
  } catch {
    return { configured: false };
  }
};



