import { useState, useEffect } from 'react';
import { Trash2, ChevronLeft, ChevronRight, Edit2, Search, Download, X } from 'lucide-react';
import { fetchVehicles, createVehicle, deleteVehicle, updateVehicle, fetchVehicleBrands } from '../services/api';

const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fleetFilter, setFleetFilter] = useState('ALL'); // 'ALL' | 'LT' | 'ST'
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    license_plate: '',
    status: 'Disponibil',
    fleet_type: 'LT',
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
      status: 'Disponibil', fleet_type: 'LT', mileage: 0, engine_type: 'Diesel', transmission: 'Automată',
      color: '', rental_price_short_term: 0, rental_price_long_term: 0
    });
    setEditingId(null);
    setErrorMessage('');
  };

  const handleEdit = (vehicle) => {
    setFormData({ 
      ...vehicle,
      fleet_type: vehicle.fleet_type || 'LT',
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
    const vFleet = v.fleet_type || 'LT';
    const matchesFleet = fleetFilter === 'ALL' || vFleet === fleetFilter;
    if (!matchesFleet) return false;

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
    const headers = ['Nr. Crt.', 'Marca', 'Model', 'An', 'Nr. Inmatriculare', 'VIN', 'Regim', 'Status', 'Kilometraj', 'Combustibil', 'Transmisie', 'Pret/Zi (EUR)', 'Pret/Luna (EUR)'];
    const rows = filteredVehicles.map((v, i) => [
      i + 1,
      v.make,
      v.model,
      v.year,
      v.license_plate,
      v.vin,
      v.fleet_type || 'LT',
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
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Flotă Proprie (Autoturisme)</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestionare autovehicule disponibile pentru leasing operațional (LT) și rent a car (ST).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-semibold shadow-xs"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-5 py-2 rounded-full hover:bg-gray-800 dark:hover:bg-white transition-colors text-xs font-semibold shadow-xs"
          >
            + Adaugă Mașină
          </button>
        </div>
      </div>

      {/* Fleet Filter Tabs (Cerința 6 Alin) */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => { setFleetFilter('ALL'); setCurrentPage(1); }}
          className={`px-3.5 py-1.5 rounded-full border transition-colors ${
            fleetFilter === 'ALL' 
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          Toată Flota ({vehicles.length})
        </button>
        <button
          type="button"
          onClick={() => { setFleetFilter('LT'); setCurrentPage(1); }}
          className={`px-3.5 py-1.5 rounded-full border transition-colors ${
            fleetFilter === 'LT' 
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          LT - Leasing Operațional ({vehicles.filter(v => (v.fleet_type || 'LT') === 'LT').length})
        </button>
        <button
          type="button"
          onClick={() => { setFleetFilter('ST'); setCurrentPage(1); }}
          className={`px-3.5 py-1.5 rounded-full border transition-colors ${
            fleetFilter === 'ST' 
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
          }`}
        >
          ST - Rent a Car ({vehicles.filter(v => v.fleet_type === 'ST').length})
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Bulk Actions & Search Area */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50 dark:bg-gray-900 min-h-[64px] justify-between`}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Caută după marcă, model, nr. înmat, VIN..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-11 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none dark:text-white shadow-xs"
            />
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in duration-200">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                {selectedIds.length} selectate
              </span>
              <button onClick={() => {
                if (confirm(`Sigur doriți să ștergeți cele ${selectedIds.length} vehicule selectate?`)) {
                  selectedIds.forEach(id => deleteVehicle(id));
                  setSelectedIds([]);
                  loadData();
                }
              }} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Trash2 size={14} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-5 py-3.5 w-12">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th scope="col" className="px-4 py-3.5 w-16">Nr. Crt.</th>
                <th className="px-5 py-3.5">Marcă & Model</th>
                <th className="px-5 py-3.5">Nr. Înmat.</th>
                <th className="px-5 py-3.5">Regim Flotă</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Detalii Tehnice</th>
                <th className="px-5 py-3.5">Preț/Zi</th>
                <th className="px-5 py-3.5">Preț/Lună</th>
                <th className="px-5 py-3.5 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading ? (
                <tr><td colSpan="10" className="text-center py-8 text-sm text-gray-500">Se încarcă...</td></tr>
              ) : paginatedVehicles.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-8 text-sm text-gray-500">Nu există autoturisme în flotă conform filtrelor.</td></tr>
              ) : (
                paginatedVehicles.map((v, idx) => (
                  <tr key={v.id} className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition-colors ${selectedIds.includes(v.id) ? 'bg-gray-50 dark:bg-gray-800/80 font-medium' : 'bg-white dark:bg-gray-800'}`}>
                    <td className="px-5 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(v.id)}
                        onChange={() => handleSelectRow(v.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <div className="font-semibold text-gray-900 dark:text-white truncate" title={v.make}>
                        {v.make}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={v.model}>{v.model}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{v.license_plate}</div>
                      <div className="text-[11px] text-gray-400">An: {v.year}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        (v.fleet_type || 'LT') === 'LT'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                      }`}>
                        {v.fleet_type || 'LT'} ({v.fleet_type === 'ST' ? 'Rent' : 'Leasing'})
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
                        {v.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs max-w-[200px]">
                      <div className="truncate text-gray-700 dark:text-gray-300" title={`${v.mileage?.toLocaleString('ro-RO')} km • ${v.engine_type}`}>{v.mileage?.toLocaleString('ro-RO')} km • {v.engine_type}</div>
                      <div className="truncate text-gray-400 text-[11px]" title={v.transmission}>{v.transmission}</div>
                    </td>
                    <td className="px-5 py-4 font-medium whitespace-nowrap text-xs">€{v.rental_price_short_term?.toFixed(0) || 0}</td>
                    <td className="px-5 py-4 font-medium whitespace-nowrap text-xs">€{v.rental_price_long_term?.toFixed(0) || 0}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(v)}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                          title="Editează"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Sigur doriți să ștergeți vehiculul ${v.license_plate}?`)) {
                              deleteVehicle(v.id).then(() => loadData());
                            }
                          }}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
                          title="Șterge"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Afișează</span>
              <select 
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-2.5 py-1 text-xs focus:ring-1 focus:ring-gray-400"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Total: {totalItems}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span>
              Pagina {currentPage} din {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'Editează Autoturism' : 'Adaugă Autoturism Nou'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-800">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Regim Flotă</label>
                  <select value={formData.fleet_type || 'LT'} onChange={e => setFormData({...formData, fleet_type: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option value="LT">LT - Leasing Operațional (Termen Lung)</option>
                    <option value="ST">ST - Rent a Car (Termen Scurt)</option>
                  </select>
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
