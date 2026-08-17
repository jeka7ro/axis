import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: {
    full_name: 'Test Administrator',
    email: 'admin@axis.ro',
    role: 'Super Admin'
  }, // Pre-filled for development showcase
  isAuthenticated: true, // Auto-logged in for now to speed up development
  token: 'mock-jwt-token',
  currency: localStorage.getItem('axis_currency') || 'EUR',
  
  login: (userData, token) => set({ user: userData, isAuthenticated: true, token }),
  logout: () => set({ user: null, isAuthenticated: false, token: null }),
  setRole: (role) => set((state) => ({ user: { ...state.user, role } })),
  setCurrency: (currency) => {
    localStorage.setItem('axis_currency', currency);
    set({ currency });
  },
}));

export default useAuthStore;
