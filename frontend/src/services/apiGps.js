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

export const markAlertsAsRead = async (ids) => {
  const response = await fetch(`${API_URL}/gps/alerts/bulk-read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!response.ok) throw new Error('Failed to mark alerts as read');
  return response.json();
};

export const deleteAlerts = async (ids) => {
  const response = await fetch(`${API_URL}/gps/alerts/bulk-delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!response.ok) throw new Error('Failed to delete alerts');
  return response.json();
};
