import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2, User, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, CheckSquare, Trash, AlertCircle, FileText, Check, CreditCard, ScanLine } from 'lucide-react';
import { fetchClients, createClient, updateClient, deleteClient, lookupClientByCui } from '../services/api';
import { extractTextFromFile, parseRomanianIDCard } from '../utils/pdfOcr';

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newClient, setNewClient] = useState({ type: 'PJ', name: '', cui_cnp: '', representative_cnp: '', representative_address: '' });
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  
  // Table state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const loadClients = async () => {
    setLoading(true);
    setApiError("");
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error(error);
      setApiError("Eroare de conexiune la serverul de date (Railway). Vă rugăm să reîncărcați pagina sau să așteptați câteva momente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (isEditing && newClient.id) {
        await updateClient(newClient.id, newClient);
      } else {
        await createClient(newClient);
      }
      setIsModalOpen(false);
      setIsEditing(false);
      setNewClient({ type: 'PJ', name: '', cui_cnp: '', representative_cnp: '', representative_address: '' });
      loadClients();
    } catch (error) {
      setFormError(error.message || "Eroare la salvare. Verificați datele introduse.");
      console.error(error);
    }
  };

  const handleEditClick = (client) => {
    setNewClient(client);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Ești sigur că vrei să ștergi acest client?")) {
      try {
        await deleteClient(id);
        loadClients();
      } catch (error) {
        console.error("Eroare la ștergere:", error);
        alert("Eroare la ștergerea clientului.");
      }
    }
  };

  const handleCuiBlur = async () => {
    if (!newClient.cui_cnp || newClient.cui_cnp.length < 5 || newClient.type === 'PF') return;
    try {
      const data = await lookupClientByCui(newClient.cui_cnp);
      if (data) {
        setNewClient(prev => ({ 
          ...prev, 
          name: data.name || prev.name,
          address: data.address || prev.address,
          reg_com: data.reg_com || prev.reg_com
        }));
      }
    } catch (error) {
      console.warn("Could not fetch company data automatically from ANAF.", error);
    }
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const text = await extractTextFromFile(file);
      
      const idData = parseRomanianIDCard(text);
      setNewClient(prev => {
        if (prev.type === 'PJ') {
          return {
            ...prev,
            representative_name: idData.name,
            representative_cnp: idData.cui_cnp,
            representative_address: idData.address,
            id_card_series: idData.id_card_series,
            id_card_number: idData.id_card_number,
            id_card_issued_by: idData.id_card_issued_by,
            id_card_valid_from: idData.id_card_valid_from,
            id_card_valid_until: idData.id_card_valid_until
          };
        } else {
          return {
            ...prev,
            name: idData.name,
            cui_cnp: idData.cui_cnp,
            address: idData.address,
            id_card_series: idData.id_card_series,
            id_card_number: idData.id_card_number,
            id_card_issued_by: idData.id_card_issued_by,
            id_card_valid_from: idData.id_card_valid_from,
            id_card_valid_until: idData.id_card_valid_until
          };
        }
      });
    } catch (err) {
      console.error(err);
      alert('Eroare la scanarea buletinului: ' + (err.message || err));
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleCUIOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const text = await extractTextFromFile(file);
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let cui = '';
      let regCom = '';
      let firma = '';
      let address = '';
      
      const cleanCuiText = text.replace(/O/gi, '0').replace(/l/gi, '1').replace(/I/gi, '1');
      const cuiMatch = cleanCuiText.match(/\b(RO)?\s*([0-9]{6,10})\b/);
      if (cuiMatch) {
        cui = (cuiMatch[1] || '') + cuiMatch[2];
      }
      
      const regComMatch = text.match(/[JFCL]\s*\d{1,2}\s*\/\s*\d+\s*\/\s*\d{4}/i);
      if (regComMatch) {
        regCom = regComMatch[0].replace(/\s+/g, '');
      }
      
      const firmaIdx = lines.findIndex(l => l.toUpperCase().includes('FIRMA') || l.toUpperCase().includes('DENUMIRE'));
      if (firmaIdx !== -1 && lines[firmaIdx + 1]) {
        firma = lines[firmaIdx + 1];
        if (firma.toUpperCase().includes('SEDIUL') || firma.length < 3) {
          const sameLineMatch = lines[firmaIdx].match(/(?:FIRMA|DENUMIRE)\s*(.+)/i);
          if (sameLineMatch) firma = sameLineMatch[1].trim();
        }
      }
      
      // Dacă a pus CUI-ul la firmă (din greșeală de OCR)
      if (firma && /^[0-9]+$/.test(firma.replace(/\s+/g, ''))) {
         if (!cui) cui = firma.replace(/\s+/g, '');
         firma = '';
      }
      
      const sediuIdx = lines.findIndex(l => l.toUpperCase().includes('SEDIUL SOCIAL') || l.toUpperCase().includes('SEDIUL'));
      if (sediuIdx !== -1 && lines[sediuIdx + 1]) {
        address = lines[sediuIdx + 1];
        if (lines[sediuIdx + 2] && !lines[sediuIdx + 2].toUpperCase().includes('NUMAR') && !lines[sediuIdx + 2].toUpperCase().includes('COD')) {
           address += ', ' + lines[sediuIdx + 2];
        }
      }

      if (cui) {
        try {
          const anafData = await lookupClientByCui(cui);
          if (anafData) {
             firma = anafData.name || firma;
             address = anafData.address || address;
             regCom = anafData.reg_com || regCom;
          }
        } catch (anafErr) {
          console.warn("ANAF lookup failed post-OCR", anafErr);
        }
      }

      setNewClient(prev => ({
        ...prev,
        name: firma,
        cui_cnp: cui,
        reg_com: regCom,
        address: address,
      }));
    } catch (err) {
      console.error(err);
      alert('Eroare la scanarea buletinului: ' + (err.message || err));
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedClients.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Pagination and Filtering logic
  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (client.name && client.name.toLowerCase().includes(q)) ||
      (client.cui_cnp && client.cui_cnp.toLowerCase().includes(q)) ||
      (client.address && client.address.toLowerCase().includes(q)) ||
      (client.reg_com && client.reg_com.toLowerCase().includes(q)) ||
      (client.representative_name && client.representative_name.toLowerCase().includes(q))
    );
  });

  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const isAllSelected = paginatedClients.length > 0 && selectedIds.length === paginatedClients.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clienți</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestionează portofoliul de clienți și evaluările AI.
          </p>
        </div>
        <button 
          onClick={() => {
            setFormError("");
            setIsEditing(false);
            setNewClient({ type: 'PJ', name: '', cui_cnp: '', representative_cnp: '', representative_address: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          <span>Client Nou</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută după nume, CUI, adresă..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm"
            />
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-sm font-medium text-gray-500 mr-2">{selectedIds.length} selectate</span>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 transition-colors">
                <CheckSquare size={16} /> Bulk Edit
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 transition-colors">
                <Trash size={16} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
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
                <th scope="col" className="px-6 py-4">Nume Client</th>
                <th scope="col" className="px-6 py-4">CUI / CNP</th>
                <th scope="col" className="px-6 py-4">Tip</th>
                <th scope="col" className="px-6 py-4">Risc AI</th>
                <th scope="col" className="px-6 py-4">Data Adăugării</th>
                <th scope="col" className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-3"></div>
                      Se încarcă clienții...
                    </div>
                  </td>
                </tr>
              ) : apiError ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-red-500 bg-red-50/50 dark:bg-red-900/10">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} />
                      <span className="font-medium">{apiError}</span>
                      <button 
                        onClick={loadClients} 
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        Reîncearcă conexiunea
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                    Nu s-a găsit niciun client. Adaugă unul nou.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, idx) => (
                  <tr 
                    key={client.id} 
                    className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${selectedIds.includes(client.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(client.id)}
                        onChange={() => handleSelectRow(client.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {client.name}
                    </td>
                    <td className="px-6 py-4">{client.cui_cnp}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        {client.type === 'PJ' ? <Building2 size={16} /> : <User size={16} />}
                        {client.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {client.latest_score !== undefined && client.latest_score !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                            client.latest_score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                            client.latest_score >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' : 
                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                          }`}>
                            {client.latest_score}/100
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{new Date(client.created_at).toLocaleDateString('ro-RO')}</td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      <Link 
                        to={`/clients/${client.id}`} 
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-primary border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        title="Vizualizare"
                      >
                        <Eye size={18} strokeWidth={1.5} />
                      </Link>
                      <button 
                        onClick={() => handleEditClick(client)}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-blue-500 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        title="Editare"
                      >
                        <Edit2 size={18} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(client.id)}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-red-500 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        title="Ștergere"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-xl w-full border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Editare Client' : 'Adaugă Client Nou'}</h3>
              <button onClick={() => { setIsModalOpen(false); setIsEditing(false); setNewClient({ type: 'PJ', name: '', cui_cnp: '' }); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="add-client-form" onSubmit={handleAddClient} className="space-y-5">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Tip Client</label>
                <div className="flex gap-4 items-center">
                  <select 
                    value={newClient.type} 
                    onChange={e => setNewClient({...newClient, type: e.target.value})}
                    className="block flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="PJ">Persoană Juridică (Firma)</option>
                    <option value="PF">Persoană Fizică</option>
                  </select>
                  
                  <div className="flex items-center space-x-2 ml-auto">
                    {newClient.type === 'PJ' && (
                      <label className="cursor-pointer py-2 px-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm font-medium transition-colors text-blue-700 dark:text-blue-300 flex items-center gap-2 shadow-sm whitespace-nowrap">
                        {ocrLoading ? <span className="animate-pulse">Se scanează...</span> : (
                          <>
                            <FileText size={16} />
                            <span>CUI</span>
                          </>
                        )}
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleCUIOCR} disabled={ocrLoading} />
                      </label>
                    )}
                    <label className="cursor-pointer py-2 px-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors dark:text-white flex items-center gap-2 shadow-sm whitespace-nowrap">
                      {ocrLoading ? <span className="animate-pulse">Se scanează...</span> : (
                        <>
                          <CreditCard size={16} />
                          <span>Buletin</span>
                        </>
                      )}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleOCR} disabled={ocrLoading} />
                    </label>
                  </div>
                </div>
              </div>
              {newClient.type === 'PJ' ? (
                <>
                  <div className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 border-b pb-2 dark:border-gray-700 uppercase">
                    Date Companie
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">CUI</label>
                      <input 
                        type="text" 
                        required
                        value={newClient.cui_cnp}
                        onChange={e => setNewClient({...newClient, cui_cnp: e.target.value})}
                        onBlur={handleCuiBlur}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Nr. Reg. Com.</label>
                      <input 
                        type="text" 
                        value={newClient.reg_com || ''}
                        onChange={e => setNewClient({...newClient, reg_com: e.target.value})}
                        placeholder="Ex: J40/1234/2020"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Denumire Companie <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="Se completează automat din ANAF"
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Adresă / Sediu Social</label>
                    <input 
                      type="text" 
                      value={newClient.address || ''}
                      onChange={e => setNewClient({...newClient, address: e.target.value})}
                      placeholder="Adresa completă"
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 mt-6 border-b pb-2 dark:border-gray-700 uppercase">
                    Date Reprezentant Legal
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Nume Reprezentant</label>
                    <input 
                      type="text" 
                      value={newClient.representative_name || ''}
                      onChange={e => setNewClient({...newClient, representative_name: e.target.value})}
                      placeholder="Nume Reprezentant (sau folosește OCR)"
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">CNP Reprezentant</label>
                      <input 
                        type="text" 
                        value={newClient.representative_cnp || ''}
                        onChange={e => setNewClient({...newClient, representative_cnp: e.target.value})}
                        placeholder="Ex: 1810806..."
                        maxLength={13}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Serie Buletin</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_series || ''}
                        onChange={e => setNewClient({...newClient, id_card_series: e.target.value.toUpperCase()})}
                        placeholder="Ex: RX"
                        maxLength={2}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Număr Buletin</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_number || ''}
                        onChange={e => setNewClient({...newClient, id_card_number: e.target.value})}
                        placeholder="Ex: 123456"
                        maxLength={6}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Adresă Domiciliu (Reprezentant)</label>
                      <input 
                        type="text" 
                        value={newClient.representative_address || ''}
                        onChange={e => setNewClient({...newClient, representative_address: e.target.value})}
                        placeholder="Adresa din buletin"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Emis de</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_issued_by || ''}
                        onChange={e => setNewClient({...newClient, id_card_issued_by: e.target.value})}
                        placeholder="Ex: SPCLEP Bucuresti Sec 1"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil de la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_from || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_from: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil până la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_until || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_until: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 border-b pb-2 dark:border-gray-700 uppercase">
                    Date Persoană Fizică
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">CNP</label>
                    <input 
                      type="text" 
                      required
                      value={newClient.cui_cnp}
                      onChange={e => setNewClient({...newClient, cui_cnp: e.target.value})}
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Nume Complet <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nume și prenume"
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Adresă Domiciliu</label>
                    <input 
                      type="text" 
                      value={newClient.address || ''}
                      onChange={e => setNewClient({...newClient, address: e.target.value})}
                      placeholder="Adresa completă"
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 border-b pb-2 dark:border-gray-700 uppercase">Date Buletin (C.I.)</div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Serie</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_series || ''}
                        onChange={e => setNewClient({...newClient, id_card_series: e.target.value.toUpperCase()})}
                        placeholder="Ex: RX"
                        maxLength={2}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Număr</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_number || ''}
                        onChange={e => setNewClient({...newClient, id_card_number: e.target.value})}
                        placeholder="Ex: 123456"
                        maxLength={6}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Emis de</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_issued_by || ''}
                        onChange={e => setNewClient({...newClient, id_card_issued_by: e.target.value})}
                        placeholder="Ex: SPCLEP Bucuresti Sec 1"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil de la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_from || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_from: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil până la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_until || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_until: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </>
              )}
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-b-3xl">
              <button type="button" onClick={() => { setIsModalOpen(false); setIsEditing(false); setNewClient({ type: 'PJ', name: '', cui_cnp: '' }); }} className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                Anulare
              </button>
              <button type="submit" form="add-client-form" className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;
