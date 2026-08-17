import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Car } from 'lucide-react';
import { 
  fetchVehicleBrands, 
  createVehicleBrand, 
  deleteVehicleBrand, 
  createVehicleModel, 
  deleteVehicleModel 
} from '../services/api';

const Nomenclatures = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBrands, setExpandedBrands] = useState({});
  
  // Modals state
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState(null);
  
  // Form state
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await fetchVehicleBrands();
      setBrands(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const toggleBrand = (id) => {
    setExpandedBrands(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    try {
      await createVehicleBrand(newBrandName);
      setNewBrandName('');
      setIsBrandModalOpen(false);
      loadBrands();
    } catch (error) {
      alert("Eroare la adăugarea mărcii. Posibil să existe deja.");
    }
  };

  const handleDeleteBrand = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Ești sigur că vrei să ștergi această marcă? Se vor șterge toate modelele asociate!")) return;
    try {
      await deleteVehicleBrand(id);
      loadBrands();
    } catch (error) {
      alert("Eroare la ștergerea mărcii.");
    }
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    try {
      await createVehicleModel(activeBrandId, newModelName);
      setNewModelName('');
      setIsModelModalOpen(false);
      
      // Auto-expand the brand we just added to
      setExpandedBrands(prev => ({ ...prev, [activeBrandId]: true }));
      loadBrands();
    } catch (error) {
      alert("Eroare la adăugarea modelului. Posibil să existe deja.");
    }
  };

  const handleDeleteModel = async (id) => {
    if (!window.confirm("Ești sigur că vrei să ștergi acest model?")) return;
    try {
      await deleteVehicleModel(id);
      loadBrands();
    } catch (error) {
      alert("Eroare la ștergerea modelului.");
    }
  };

  const openModelModal = (e, brandId) => {
    e.stopPropagation();
    setActiveBrandId(brandId);
    setNewModelName('');
    setIsModelModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nomenclatoare Flotă</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestionează dicționarul de Mărci și Modele auto disponibile în platformă.
          </p>
        </div>
        <button 
          onClick={() => setIsBrandModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          <span>Marcă Nouă</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-3"></div>
            Se încarcă...
          </div>
        ) : brands.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Nicio marcă definită. Adaugă o marcă pentru a începe.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {brands.map(brand => (
              <div key={brand.id} className="flex flex-col">
                <div 
                  onClick={() => toggleBrand(brand.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400">
                      {expandedBrands[brand.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">
                      {brand.name}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium">
                      {brand.models?.length || 0} modele
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => openModelModal(e, brand.id)}
                      className="p-2 flex items-center gap-2 text-sm text-gray-600 hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                    >
                      <Plus size={16} /> Adaugă Model
                    </button>
                    <button 
                      onClick={(e) => handleDeleteBrand(e, brand.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                      title="Șterge Marcă"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedBrands[brand.id] && (
                  <div className="pl-12 pr-4 pb-4 bg-gray-50/50 dark:bg-gray-900/20">
                    {brand.models?.length === 0 ? (
                      <div className="text-sm text-gray-500 py-2 italic">Niciun model adăugat.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                        {brand.models?.map(model => (
                          <div 
                            key={model.id} 
                            className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                              <Car size={16} className="text-gray-400" />
                              {model.name}
                            </div>
                            <button 
                              onClick={() => handleDeleteModel(model.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Adaugă Marcă Nouă</h3>
            <form onSubmit={handleAddBrand}>
              <input 
                type="text" 
                required
                placeholder="Ex: Mercedes-Benz"
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
                className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-6"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsBrandModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  Anulare
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors">
                  Salvează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Adaugă Model Nou</h3>
            <form onSubmit={handleAddModel}>
              <input 
                type="text" 
                required
                placeholder="Ex: G-Class G63 AMG"
                value={newModelName}
                onChange={e => setNewModelName(e.target.value)}
                className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-6"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModelModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  Anulare
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors">
                  Salvează
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nomenclatures;
