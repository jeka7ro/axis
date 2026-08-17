import useAuthStore from '../store/authStore';
import { Users, FileText, Car, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuthStore();

  const stats = [
    { name: 'Clienți Activi', value: '1,240', icon: Users, change: '+12%', changeType: 'positive' },
    { name: 'Oferte în Așteptare', value: '45', icon: FileText, change: '-2%', changeType: 'negative' },
    { name: 'Contracte Semnate (Lună)', value: '128', icon: CheckCircle, change: '+24%', changeType: 'positive' },
    { name: 'Alerte GPS', value: '3', icon: Car, change: '1 nouă', changeType: 'neutral' },
  ];

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
                  {item.value}
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
                'text-yellow-600'
              }`}>
                {item.change}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs. luna trecută</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contracte Recente</h4>
          <div className="text-center py-8 text-gray-500">
            {/* Placeholder for table */}
            Niciun contract generat încă.
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Alerte Monitorizare AI</h4>
          <div className="text-center py-8 text-gray-500">
            Nicio alertă activă momentan.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
