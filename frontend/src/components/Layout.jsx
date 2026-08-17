import { useState, useEffect } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Car, Settings, LogOut, Sun, Moon, Shield, Megaphone, ShieldAlert, Cpu, MapPin, Bell } from 'lucide-react';
import useAuthStore from '../store/authStore';

const Layout = () => {
  const { isAuthenticated, logout, user, setRole } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
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

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name || 'Utilizator'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <LogOut size={16} />
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-8 justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Panou de Control</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
              <Shield size={16} className="text-gray-500 dark:text-gray-400" />
              <select 
                value={user?.role} 
                onChange={(e) => setRole(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Axis Manager">Axis Manager</option>
                <option value="Dealer Sales">Dealer Sales</option>
              </select>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title="Schimbă Tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
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
