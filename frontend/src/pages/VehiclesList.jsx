import { useState, useEffect } from 'react';
import { Trash2, ChevronLeft, ChevronRight, Edit2, Search, Download } from 'lucide-react';
import { fetchVehicles, createVehicle, deleteVehicle, updateVehicle, fetchVehicleBrands } from '../services/api';

const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    license_plate: '',
    status: 'Disponibil',
    mileage: 0,
    engine_type: 'Diesel',
    transmission: 'Automată',
    color: '',
    rental_price_short_term: 0,
    rental_price_long_term: 0
  });

  // Table state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch separately to avoid one failing the other
      const [vehiclesRes, brandsRes] = await Promise.allSettled([
        fetchVehicles(),
        fetchVehicleBrands()
      ]);
      
      if (vehiclesRes.status === 'fulfilled') {
        setVehicles(vehiclesRes.value);
      } else {
        console.error("Failed to load vehicles:", vehiclesRes.reason);
      }

      if (brandsRes.status === 'fulfilled') {
        setBrands(brandsRes.value);
      } else {
        console.error("Failed to load brands:", brandsRes.reason);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      make: '', model: '', year: new Date().getFullYear(), vin: '', license_plate: '',
      status: 'Disponibil', mileage: 0, engine_type: 'Diesel', transmission: 'Automată',
      color: '', rental_price_short_term: 0, rental_price_long_term: 0
    });
    setEditingId(null);
    setErrorMessage('');
  };

  const handleEdit = (vehicle) => {
    setFormData({ 
      ...vehicle,
      rental_price_short_term: Number(vehicle.rental_price_short_term || 0).toFixed(2),
      rental_price_long_term: Number(vehicle.rental_price_long_term || 0).toFixed(2)
    });
    setEditingId(vehicle.id);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      // Asigură-te că prețurile sunt trimise ca numere valide (tratează separatorul de mii/zecimale românesc)
      const parseLocalFloat = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(',', '.'));
      };

      const payload = {
        ...formData,
        rental_price_short_term: parseLocalFloat(formData.rental_price_short_term),
        rental_price_long_term: parseLocalFloat(formData.rental_price_long_term)
      };

      if (editingId) {
        await updateVehicle(editingId, payload);
      } else {
        await createVehicle(payload);
      }
      setIsModalOpen(false);
      resetForm();
      loadVehicles();
    } catch (error) {
      console.error(error);
      setErrorMessage(editingId ? 'Eroare la actualizarea mașinii. Verifică datele introduse.' : 'Eroare la adăugarea mașinii. Verifică datele introduse.');
    }
  };

  const handleDelete = async (id) => {
    if(confirm('Sigur dorești să ștergi acest autoturism?')) {
      try {
        await deleteVehicle(id);
        loadVehicles();
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      } catch(e) {
        console.error(e);
      }
    }
  };

  // Pagination and Filtering logic
  const filteredVehicles = vehicles.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.make && v.make.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q)) ||
      (v.license_plate && v.license_plate.toLowerCase().includes(q)) ||
      (v.vin && v.vin.toLowerCase().includes(q)) ||
      (v.status && v.status.toLowerCase().includes(q))
    );
  });

  const totalItems = filteredVehicles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(paginatedVehicles.map(v => v.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const isAllSelected = paginatedVehicles.length > 0 && selectedIds.length === paginatedVehicles.length;

  const exportToExcel = () => {
    const headers = ['Nr. Crt.', 'Marca', 'Model', 'An', 'Nr. Inmatriculare', 'VIN', 'Status', 'Kilometraj', 'Combustibil', 'Transmisie', 'Pret/Zi (EUR)', 'Pret/Luna (EUR)'];
    const rows = filteredVehicles.map((v, i) => [
      i + 1,
      v.make,
      v.model,
      v.year,
      v.license_plate,
      v.vin,
      v.status,
      v.mileage,
      v.engine_type,
      v.transmission,
      v.rental_price_short_term,
      v.rental_price_long_term
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell || ''}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `flota_axis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Flotă Proprie (Autoturisme)</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Download size={18} />
            Export to Excel
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            + Adaugă Mașină
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Bulk Actions & Search Area */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50/50 dark:bg-gray-800/50 min-h-[64px] justify-between`}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută după marcă, model, nr. înmat, VIN..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm"
            />
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in duration-200">
              <span className="text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                {selectedIds.length} selectate
              </span>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 transition-colors">
                <Edit2 size={16} /> Bulk Edit
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 transition-colors">
                <Trash2 size={16} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th scope="col" className="px-4 py-4 w-16">Nr. Crt.</th>
                <th className="px-6 py-4">Marcă & Model</th>
                <th className="px-6 py-4">Nr. Înmat.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Detalii</th>
                <th className="px-6 py-4">Preț/Zi</th>
                <th className="px-6 py-4">Preț/Lună</th>
                <th className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-8">Se încarcă...</td></tr>
              ) : paginatedVehicles.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-8">Nu există autoturisme în flotă.</td></tr>
              ) : (
                paginatedVehicles.map((v, idx) => (
                  <tr key={v.id} className={`border-b dark:border-gray-700 transition-colors ${selectedIds.includes(v.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(v.id)}
                        onChange={() => handleSelectRow(v.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="font-medium text-gray-900 dark:text-white truncate" title={v.make}>
                        {v.make}
                      </div>
                      <div className="text-sm text-gray-500 truncate" title={v.model}>{v.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-gray-900 dark:text-white">{v.license_plate}</div>
                      <div className="text-xs text-gray-500">An: {v.year}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs max-w-[200px]">
                      <div className="truncate" title={`${v.mileage?.toLocaleString('ro-RO')} km • ${v.engine_type}`}>{v.mileage?.toLocaleString('ro-RO')} km • {v.engine_type}</div>
                      <div className="truncate text-gray-500" title={v.transmission}>{v.transmission}</div>
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">€{v.rental_price_short_term?.toFixed(0) || 0}</td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">€{v.rental_price_long_term?.toFixed(0) || 0}</td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(v)}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-gray-900 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        title="Editează"
                      >
                        <Edit2 size={16} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)} 
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-red-600 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        title="Șterge"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Afișează</span>
              <select 
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1 text-sm focus:ring-primary focus:border-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="font-medium">Total: {totalItems}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Pagina {currentPage} din {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'Editează Autoturism' : 'Adaugă Autoturism Nou'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                ✕
              </button>
            </div>
            
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                {errorMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Marcă</label>
                  <select 
                    required 
                    value={formData.make} 
                    onChange={e => {
                      const newMake = e.target.value;
                      const brandObj = brands.find(b => b.name === newMake);
                      setFormData({
                        ...formData, 
                        make: newMake,
                        model: brandObj?.models?.length > 0 ? brandObj.models[0].name : ''
                      });
                    }} 
                    className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"
                  >
                    <option value="" disabled>Selectează Marca</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.name}>{brand.name}</option>
                    ))}
                    <option value="Altă Marcă">Altă Marcă</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
                  {formData.make === 'Altă Marcă' || !brands.find(b => b.name === formData.make) ? (
                    <input 
                      type="text" 
                      required 
                      value={formData.model} 
                      onChange={e => setFormData({...formData, model: e.target.value})} 
                      placeholder="Introduceți modelul..."
                      className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"
                    />
                  ) : (
                    <select 
                      required 
                      value={formData.model} 
                      onChange={e => setFormData({...formData, model: e.target.value})} 
                      className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"
                    >
                      {brands.find(b => b.name === formData.make)?.models?.map(model => (
                        <option key={model.id} value={model.name}>{model.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">An Fabricație</label>
                  <input type="number" required value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nr. Înmatriculare</label>
                  <input type="text" required value={formData.license_plate} onChange={e => setFormData({...formData, license_plate: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serie Șasiu (VIN)</label>
                  <input type="text" required value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option>Disponibil</option>
                    <option>Închiriat</option>
                    <option>Rezervat</option>
                    <option>În Service</option>
                    <option>Daună</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kilometraj</label>
                  <input type="number" required value={formData.mileage} onChange={e => setFormData({...formData, mileage: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Combustibil</label>
                  <select value={formData.engine_type} onChange={e => setFormData({...formData, engine_type: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option>Diesel</option>
                    <option>Benzină</option>
                    <option>Hibrid</option>
                    <option>Electric</option>
                    <option>PHEV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cutie de viteze</label>
                  <select value={formData.transmission} onChange={e => setFormData({...formData, transmission: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option>Automată</option>
                    <option>Manuală</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preț Chirie / Zi (€)</label>
                  <input type="number" step="0.01" required value={formData.rental_price_short_term} onChange={e => setFormData({...formData, rental_price_short_term: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preț Chirie / Lună (€)</label>
                  <input type="number" step="0.01" required value={formData.rental_price_long_term} onChange={e => setFormData({...formData, rental_price_long_term: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">Anulează</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
                  {editingId ? 'Actualizează Autoturism' : 'Salvează Autoturism'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesList;
