import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Car, Settings, LogOut, Sun, Moon, 
  Shield, Megaphone, ShieldAlert, Cpu, MapPin, Bell, ChevronDown, UserCheck, Briefcase,
  Camera, Upload, RotateCcw, ExternalLink, UserPlus, PanelLeftClose, PanelLeft
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import AxisAiCopilot from './AxisAiCopilot';
import CookieBanner from './CookieBanner';
import InviteMemberModal from './InviteMemberModal';
import { BUILD_NUMBER, BUILD_DATE, BUILD_HASH } from '../config/buildInfo';


const Layout = () => {
  const { isAuthenticated, logout, user, setRole, setAvatar } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('axis_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('axis_sidebar_collapsed', String(next));
      return next;
    });
  };

  const profileDropdownRef = useRef(null);
  const avatarInputRef = useRef(null);
  const location = useLocation();


  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Fișierul depășește limita de 10MB. Te rugăm să alegi o imagine mai mică.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setAvatar(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

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
    if (path.startsWith('/clients')) return 'Clienți & AI';
    if (path.startsWith('/vehicles')) return 'Flotă Proprie';
    if (path.startsWith('/blacklist')) return 'Black List';
    if (path.startsWith('/offers')) return 'Oferte & Contracte';
    if (path.startsWith('/campaigns')) return 'Campanii Axis';
    if (path.startsWith('/gps')) return 'Monitorizare Flotă (MS)';
    if (path.startsWith('/alerts')) return 'Istoric Alerte';
    if (path.startsWith('/scenarios')) return 'Configurator Scenarii';
    if (path.startsWith('/nomenclatures')) return 'Nomenclatoare';
    return 'Dashboard';
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/clients', label: 'Clienți & AI', icon: Users, show: user?.role !== 'Dealer Sales' },
    { path: '/vehicles', label: 'Flotă Proprie', icon: Car, show: user?.role !== 'Dealer Sales' },
    { path: '/blacklist', label: 'Black List', icon: ShieldAlert, iconClass: 'text-red-500', show: user?.role !== 'Dealer Sales' },
    { path: '/offers', label: 'Oferte & Contracte', icon: FileText, show: true },
    { path: '/campaigns', label: 'Campanii Axis', icon: Megaphone, show: user?.role !== 'Dealer Sales' },
    { path: '/gps', label: 'Monitorizare Flotă (MS)', icon: MapPin, show: user?.role !== 'Dealer Sales' },
    { path: '/alerts', label: 'Istoric Alerte', icon: Bell, iconClass: 'text-primary', show: user?.role !== 'Dealer Sales' },
    { path: '/scenarios', label: 'Configurator Scenarii', icon: Cpu, iconClass: 'text-primary', show: user?.role !== 'Dealer Sales' },
    { path: '/nomenclatures', label: 'Nomenclatoare', icon: Settings, iconClass: 'text-gray-500', show: user?.role === 'Super Admin' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-200 ease-in-out shrink-0 select-none`}>
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-gray-200 dark:border-gray-700 shrink-0`}>
          {isSidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all cursor-pointer flex items-center justify-center group"
              title="Extinde bara laterală (Axis)"
            >
              <img
                src="/axis-a-dark.png"
                alt="Axis"
                className="h-8 w-auto object-contain dark:hidden group-hover:scale-105 transition-transform"
              />
              <img
                src="/axis-a-white.png"
                alt="Axis"
                className="h-8 w-auto object-contain hidden dark:block group-hover:scale-105 transition-transform"
              />
            </button>
          ) : (
            <>
              <Link to="/dashboard" className="flex items-center pl-1">
                <img src="/footer-logo.png" alt="Axis Premium Mobility" className="h-9 w-auto object-contain dark:invert" />
              </Link>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shadow-2xs cursor-pointer"
                title="Restrânge bara laterală"
              >
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>
        
        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1.5 px-3">
            {navItems.filter(item => item.show).map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    title={item.label}
                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-semibold shadow-xs'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70'
                    }`}
                  >
                    <Icon size={20} className={`shrink-0 ${isActive ? '' : (item.iconClass || '')}`} />
                    {!isSidebarCollapsed && <span className="text-sm truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Clean Minimal Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/40">
          {isSidebarCollapsed ? (
            <div className="flex justify-center" title={`Axis Cloud v2.4 Pro (Build #${BUILD_NUMBER} · ${BUILD_DATE})`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          ) : (
            <div className="space-y-1.5 px-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Axis Cloud</span>
                </div>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700/70 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-gray-600/60 font-mono">
                  v2.4 Pro
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                <span>Build #{BUILD_NUMBER}</span>
                <span>{BUILD_DATE}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-8 justify-between sticky top-0 z-20 backdrop-blur-md bg-white/90 dark:bg-gray-800/90">
          <div className="flex items-center gap-3">
            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shadow-2xs cursor-pointer"
                title="Extinde bara laterală"
              >
                <PanelLeft size={18} />
              </button>
            )}
            <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
              {getPageTitle(location.pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button - Tahoe Mac OS rounded */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shadow-sm cursor-pointer"
              title={isDarkMode ? 'Comută la Mod Luminos' : 'Comută la Mod Întunecat'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Invite Team Member Button for Super Admin & Axis Manager */}
            {(user?.role === 'Super Admin' || user?.role === 'Axis Manager') && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer shadow-2xs"
                title="Invită utilizator nou cu rol specificat prin Brevo"
              >
                <UserPlus size={13} className="text-primary" />
                <span>Invită Echipă</span>
              </button>
            )}

            {/* Subtle Divider */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />


            {/* Executive User Avatar & Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(prev => !prev)}
                className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all shadow-sm group active:scale-[0.98]"
              >
                {/* Avatar Icon / Photo */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-xs shadow ring-2 ring-primary/20">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user?.full_name || 'User'}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    ) : (
                      user?.initials || 'EC'
                    )}
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
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl mb-1.5 border border-gray-100 dark:border-gray-700/50">
                    {/* Interactive Avatar with upload trigger */}
                    <div 
                      className="relative group cursor-pointer shrink-0"
                      onClick={() => avatarInputRef.current?.click()}
                      title="Click pentru a schimba poza de profil"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-sm shadow ring-2 ring-primary/30">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user?.full_name || 'User'}
                            className="w-full h-full object-cover select-none pointer-events-none"
                          />
                        ) : (
                          user?.initials || 'EC'
                        )}
                      </div>
                      {/* Hover overlay with Camera icon */}
                      <div className="absolute inset-0 bg-black/55 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={16} className="text-white drop-shadow" />
                      </div>
                      {/* Little camera badge */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
                        <Camera size={9} />
                      </div>
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

                  {/* Avatar Quick Action Bar */}
                  <div className="flex items-center justify-between px-1 mb-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/80 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
                    >
                      <Upload size={11} />
                      <span>Încarcă / Schimbă Poza</span>
                    </button>

                    {user?.avatar && user.avatar !== '/jeka.png' && (
                      <button
                        type="button"
                        onClick={() => setAvatar('/jeka.png')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        title="Revenire la poza jeka.png"
                      >
                        <RotateCcw size={10} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Hidden File Input for Avatar Upload */}
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />

                  {/* Invite Member Option in Dropdown */}
                  {(user?.role === 'Super Admin' || user?.role === 'Axis Manager') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsInviteModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary dark:bg-primary/15 transition-all mb-2 cursor-pointer font-bold text-xs"
                    >
                      <UserPlus size={15} className="text-primary shrink-0" />
                      <div className="flex-1">
                        <div>Invită Membru / Echipă</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                          Generează cod & trimite invitație
                        </div>
                      </div>
                    </button>
                  )}

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

        <div className="p-8 pb-12 flex flex-col justify-between min-h-[calc(100vh-80px)]">
          <div>
            <Outlet />
          </div>

          {/* Legal & GDPR Compliance Footer */}
          <footer className="mt-16 pt-6 border-t border-gray-200/60 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500 dark:text-gray-400 select-none">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-700 dark:text-gray-300">AXIS MOBILITY S.R.L.</span>
              <span>•</span>
              <span>CUI RO41298450</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Platformă Securizată GDPR (UE 2016/679)</span>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap">
              <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors underline">
                Politica de Confidențialitate
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors underline">
                Termeni și Condiții
              </Link>
              <span>•</span>
              <Link to="/cookies" className="hover:text-gray-900 dark:hover:text-white transition-colors underline">
                Politica Cookie
              </Link>
              <span>•</span>
              <button
                type="button"
                onClick={() => window.__axisOpenCookiePreferences && window.__axisOpenCookiePreferences()}
                className="hover:text-gray-900 dark:hover:text-white transition-colors underline cursor-pointer"
              >
                Setări Cookie
              </button>
              <span>•</span>
              <a
                href="https://www.dataprotection.ro"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
                title="Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal"
              >
                <span>ANSPDCP</span>
                <ExternalLink size={10} />
              </a>
            </div>
          </footer>
        </div>
      </main>

      {/* Axis In-App AI Copilot */}
      <AxisAiCopilot />

      {/* GDPR Cookie Consent Manager */}
      <CookieBanner />

      {/* Super Admin Team Invitation Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        currentUser={user}
      />
    </div>
  );
};


export default Layout;
