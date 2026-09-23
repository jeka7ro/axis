import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Car, Settings, LogOut, Sun, Moon, 
  Shield, Megaphone, ShieldAlert, Cpu, MapPin, Bell, ChevronDown, UserCheck, Briefcase 
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const Layout = () => {
  const { isAuthenticated, logout, user, setRole } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    // Check local storage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const getPageTitle = (path) => {
    if (path.startsWith('/clients')) return 'Management Clienți & AI Intel';
    if (path.startsWith('/vehicles')) return 'Flotă Proprie & Disponibilitate';
    if (path.startsWith('/blacklist')) return 'Black List & Evaluare Risc';
    if (path.startsWith('/offers')) return 'Oferte & Contracte Leasing';
    if (path.startsWith('/campaigns')) return 'Campanii Marketing Axis';
    if (path.startsWith('/gps')) return 'Monitorizare Flotă Live (MS)';
    if (path.startsWith('/alerts')) return 'Centru Istoric Alerte';
    if (path.startsWith('/scenarios')) return 'Configurator Scenarii Scoring';
    if (path.startsWith('/nomenclatures')) return 'Nomenclatoare Sistem';
    return 'Panou de Control';
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="h-16 flex items-center justify-center px-6 border-b border-gray-200 dark:border-gray-700">
          <img src="https://axisrent.ro/wp-content/uploads/2025/06/Black-AXIS-logo-1.png" alt="Axis Rent" className="h-10 object-contain dark:invert" />
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            <li>
              <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </Link>
            </li>
            {user?.role !== 'Dealer Sales' && (
              <li>
                <Link to="/clients" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Users size={20} />
                  <span>Clienți & AI</span>
                </Link>
              </li>
            )}
            {user?.role !== 'Dealer Sales' && (
              <li>
                <Link to="/vehicles" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Car size={20} />
                  <span>Flotă Proprie</span>
                </Link>
              </li>
            )}
            {user?.role !== 'Dealer Sales' && (
              <li>
                <Link to="/blacklist" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <ShieldAlert size={20} className="text-red-500" />
                  <span>Black List</span>
                </Link>
              </li>
            )}
            <li>
              <Link to="/offers" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                <FileText size={20} />
                <span>Oferte & Contracte</span>
              </Link>
            </li>
            {user?.role !== 'Dealer Sales' && (
              <li>
                <Link to="/campaigns" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Megaphone size={20} />
                  <span>Campanii Axis</span>
                </Link>
              </li>
            )}
            {user?.role !== 'Dealer Sales' && (
              <li>
                <Link to="/gps" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <MapPin size={20} />
                  <span>Monitorizare Flotă (MS)</span>
                </Link>
              </li>
            )}
            {user?.role !== 'Dealer Sales' && (
              <li>
                <Link to="/alerts" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Bell size={20} className="text-primary" />
                  <span>Istoric Alerte</span>
                </Link>
              </li>
            )}
            {user?.role !== 'Dealer Sales' && (
              <li>
                <Link to="/scenarios" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Cpu size={20} className="text-primary" />
                  <span>Configurator Scenarii</span>
                </Link>
              </li>
            )}
            {user?.role === 'Super Admin' && (
              <li>
                <Link to="/nomenclatures" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <Settings size={20} className="text-gray-500" />
                  <span>Nomenclatoare</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Clean Minimal Sidebar Footer */}
        <div className="p-3.5 border-t border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/40">
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-gray-600 dark:text-gray-300">Axis Cloud</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700/70 px-2 py-0.5 rounded-full border border-gray-200/60 dark:border-gray-600/60">
              v2.4 Pro
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-8 justify-between sticky top-0 z-20 backdrop-blur-md bg-white/90 dark:bg-gray-800/90">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
              {getPageTitle(location.pathname)}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Platformă integrată de leasing operațional și evaluare inteligentă
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button - Tahoe Mac OS rounded */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shadow-sm"
              title={isDarkMode ? 'Comută la Mod Luminos' : 'Comută la Mod Întunecat'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Subtle Divider */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Executive User Avatar & Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(prev => !prev)}
                className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all shadow-sm group active:scale-[0.98]"
              >
                {/* Avatar Icon / Logo */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-xs shadow ring-2 ring-primary/20">
                    {user?.initials || 'EC'}
                  </div>
                  {/* Live Online Badge */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                </div>

                {/* User Info (Desktop) */}
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                    {user?.full_name || 'Eugeniu Cazmal'}
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
                    {user?.role || 'Super Admin'}
                  </div>
                </div>

                <ChevronDown 
                  size={14} 
                  className={`text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Profile Dropdown Tahoe Mac OS Style */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700/80 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl mb-2 border border-gray-100 dark:border-gray-700/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-sm shadow">
                      {user?.initials || 'EC'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {user?.full_name || 'Eugeniu Cazmal'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email || 'eugeniu@axisrent.ro'}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                          {user?.role || 'Super Admin'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role Switcher Section */}
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Comutare Rol Utilizator
                  </div>
                  <div className="space-y-1 mb-2">
                    {[
                      { id: 'Super Admin', label: 'Super Admin', desc: 'Acces complet sistem & AI', icon: Shield },
                      { id: 'Axis Manager', label: 'Axis Manager', desc: 'Gestiune operațională flotă', icon: UserCheck },
                      { id: 'Dealer Sales', label: 'Dealer Sales', desc: 'Ofertare parteneri dealer', icon: Briefcase }
                    ].map((roleOption) => {
                      const Icon = roleOption.icon;
                      const isSelected = user?.role === roleOption.id;
                      return (
                        <button
                          key={roleOption.id}
                          type="button"
                          onClick={() => {
                            setRole(roleOption.id);
                            setIsProfileOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-primary/10 border border-primary/20 text-primary dark:bg-primary/20'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Icon size={16} className={`mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <div className="text-xs font-semibold flex items-center justify-between">
                              <span>{roleOption.label}</span>
                              {isSelected && <span className="text-[10px] font-bold text-primary">Activ</span>}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                              {roleOption.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Deconectare din cont</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
