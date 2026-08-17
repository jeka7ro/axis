import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { Users, FileText, Car, CheckCircle } from 'lucide-react';
import { fetchClients } from '../services/api';
import { fetchOffers, fetchContracts } from '../services/apiOffers';
import { fetchGPSAlerts } from '../services/apiGps';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState({
    clients: [],
    offers: [],
    contracts: [],
    alerts: [],
    loading: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clients, offers, contracts, alerts] = await Promise.all([
          fetchClients().catch(() => []),
          fetchOffers().catch(() => []),
          fetchContracts().catch(() => []),
          fetchGPSAlerts().catch(() => [])
        ]);

        setData({
          clients,
          offers,
          contracts,
          alerts,
          loading: false
        });
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };
    
    loadData();
  }, []);

  // Compute stats
  const activeClients = data.clients.length;
  const pendingOffers = data.offers.filter(o => o.status === 'Draft' || o.status === 'În Așteptare').length;
  const signedContracts = data.contracts.length;
  const newAlerts = data.alerts.filter(a => !a.is_read).length;

  const stats = [
    { name: 'Clienți Activi', value: activeClients.toString(), icon: Users, change: 'total în sistem', changeType: 'neutral' },
    { name: 'Oferte în Așteptare', value: pendingOffers.toString(), icon: FileText, change: 'drafturi', changeType: 'neutral' },
    { name: 'Contracte Semnate (Lună)', value: signedContracts.toString(), icon: CheckCircle, change: 'total', changeType: 'positive' },
    { name: 'Alerte GPS', value: data.alerts.length.toString(), icon: Car, change: `${newAlerts} noi`, changeType: newAlerts > 0 ? 'negative' : 'neutral' },
  ];

  const recentContracts = [...data.contracts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const recentAlerts = [...data.alerts].filter(a => !a.is_read).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Salut, {user?.full_name?.split(' ')[0] || 'Utilizator'}!
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Iată o privire de ansamblu asupra platformei tale de azi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item) => (
          <div key={item.name} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {item.name}
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                  {data.loading ? '...' : item.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-primary/10 text-primary`}>
                <item.icon size={24} />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm font-medium ${
                item.changeType === 'positive' ? 'text-green-600' : 
                item.changeType === 'negative' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Contracte Recente */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">Activitate Contractuală</h4>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimele 5</span>
          </div>
          {data.loading ? (
             <div className="text-center py-8 text-gray-400 text-sm">Se încarcă datele...</div>
          ) : recentContracts.length === 0 ? (
             <div className="text-center py-8 text-gray-400 text-sm">Niciun contract generat recent.</div>
          ) : (
             <div className="space-y-3">
               {recentContracts.map(contract => (
                 <div key={contract.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">{contract.contract_number}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(contract.created_at).toLocaleDateString('ro-RO')}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md font-medium">Semnat</span>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Alerte AI */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              Analiză Risc Flotă
            </h4>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">AI Monitor</span>
          </div>
          {data.loading ? (
             <div className="text-center py-8 text-gray-400 text-sm">Analiză în curs...</div>
          ) : recentAlerts.length === 0 ? (
             <div className="text-center py-8 text-gray-400 text-sm">Nicio alertă activă. Flota este în siguranță.</div>
          ) : (
             <div className="space-y-3">
               {recentAlerts.map(alert => (
                 <div key={alert.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className="font-medium text-gray-900 dark:text-white text-sm flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                        {alert.vehicle_plate}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(alert.created_at).toLocaleTimeString('ro-RO')}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{alert.message}</div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
