import { create } from 'zustand';

const initialAvatar = localStorage.getItem('axis_user_avatar') || '/jeka.png';

const useAuthStore = create((set) => ({
  user: {
    full_name: 'Eugeniu Cazmal',
    email: 'eugeniu@axisrent.ro',
    role: 'Super Admin',
    initials: 'EC',
    avatar: initialAvatar
  }, // Pre-filled for development showcase
  isAuthenticated: true, // Auto-logged in for now to speed up development
  token: 'mock-jwt-token',
  currency: localStorage.getItem('axis_currency') || 'EUR',
  
  login: (userData, token) => set({ user: userData, isAuthenticated: true, token }),
  logout: () => set({ user: null, isAuthenticated: false, token: null }),
  setRole: (role) => set((state) => ({ user: { ...state.user, role } })),
  setAvatar: (avatarUrl) => {
    if (avatarUrl) {
      localStorage.setItem('axis_user_avatar', avatarUrl);
    } else {
      localStorage.removeItem('axis_user_avatar');
    }
    set((state) => ({ user: { ...state.user, avatar: avatarUrl } }));
  },
  setCurrency: (currency) => {
    localStorage.setItem('axis_currency', currency);
    set({ currency });
  },
}));

export default useAuthStore;
