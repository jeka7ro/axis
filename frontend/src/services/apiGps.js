const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const fetchLiveLocations = async () => {
  const response = await fetch(`${API_URL}/gps/live`);
  if (!response.ok) throw new Error('Failed to fetch live GPS data');
  return response.json();
};

export const fetchGPSAlerts = async () => {
  const response = await fetch(`${API_URL}/gps/alerts`);
  if (!response.ok) throw new Error('Failed to fetch GPS alerts');
  return response.json();
};
