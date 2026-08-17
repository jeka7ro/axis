import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, AlertTriangle, ShieldCheck, FileText, ChevronRight, ShieldAlert, MapPin } from 'lucide-react';
import { fetchClient, evaluateClient } from '../services/api';

const ClientDetails = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [activeTab, setActiveTab] = useState('financial');

  const loadClient = async () => {
    try {
      const data = await fetchClient(id);
      setClient(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await evaluateClient(id);
      await loadClient(); // Reload to get new evaluation
    } catch (error) {
      console.error("OSINT API Error:", error);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Se încarcă detaliile clientului...</div>;
  if (!client) return <div className="p-8 text-center text-red-500">Clientul nu a fost găsit.</div>;

  const latestEval = client.evaluations && client.evaluations.length > 0 
    ? client.evaluations[client.evaluations.length - 1] 
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Black List Warning */}
      {client.name === 'Dino Home Construct SRL' && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="text-red-600 mt-0.5 shrink-0" size={20} />
          <div>
            <h3 className="font-bold text-red-800 dark:text-red-400">Client Inclus în Black List (PF/PJ)</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">Datorii &gt; 90 zile &amp; suspiciune subînchiriere flotă. Ofertarea este blocată și regulile GPS sunt setate pe Severitate Critică.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clients" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profil Client</h2>
      </div>

      {/* Main Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{client.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">CUI/CNP: {client.cui_cnp} • Tip: {client.type}</p>
        </div>
        <button 
          onClick={handleEvaluate}
          disabled={evaluating}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <BrainCircuit size={18} className={evaluating ? "animate-pulse" : ""} />
          <span>{evaluating ? "Se analizează..." : "Generare Evaluare AI"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 mt-6">
        <button 
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'financial' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Evaluare Financiară AI
        </button>
        <button 
          onClick={() => setActiveTab('gps')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'gps' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Raport Risc GPS & Flotă AI
        </button>
      </div>

      {activeTab === 'financial' && (
        <>
          {!latestEval ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center mt-6">
              <BrainCircuit size={48} className="mx-auto text-blue-500 mb-4 opacity-50" />
              <p className="text-blue-700 dark:text-blue-300 font-medium">Nu există nicio evaluare AI pentru acest client.</p>
              <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-2">Apasă pe butonul de mai sus pentru a analiza datele ANAF, Biroul de Credit și istoricul intern.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 animate-in fade-in">
              {/* Score Card */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
                
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Scor AI de Finanțare</div>
                <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-4 border-gray-100 dark:border-gray-700">
                   <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                     <circle
                       cx="60" cy="60" r="58"
                       stroke="currentColor"
                       strokeWidth="4"
                       fill="transparent"
                       className={latestEval.score > 70 ? 'text-green-500' : latestEval.score > 40 ? 'text-yellow-500' : 'text-red-500'}
                       strokeDasharray="364"
                       strokeDashoffset={364 - (364 * latestEval.score) / 100}
                     />
                   </svg>
                   <div className="text-4xl font-bold text-gray-900 dark:text-white">{latestEval.score}</div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {latestEval.score > 70 ? <ShieldCheck className="text-green-500" size={18}/> : <AlertTriangle className="text-red-500" size={18}/>}
                  <span className="font-medium text-gray-900 dark:text-white">Risc: {latestEval.risk_level}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Generat la: {new Date(latestEval.created_at).toLocaleString('ro-RO')}</p>
              </div>

              {/* AI Summary Card */}
              <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> Sumar Executiv AI
                </h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-l-4 border-primary">
                  {latestEval.ai_summary}
                </div>
                
                <h4 className="font-medium text-gray-900 dark:text-white mt-6 mb-3">Date financiare extrase</h4>
                <div className="grid grid-cols-2 gap-4">
                  {latestEval.raw_financial_data && JSON.parse(latestEval.raw_financial_data) && (
                    <>
                      {/* Render ANAF Data */}
                      {Object.entries(JSON.parse(latestEval.raw_financial_data).anaf || {}).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
                          <div className="font-medium text-gray-900 dark:text-white mt-1">
                            {typeof value === 'boolean' ? (value ? 'DA' : 'NU') : (typeof value === 'number' ? new Intl.NumberFormat('ro-RO').format(value) : value)}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Balance Sheet Section */}
                {latestEval.raw_financial_data && JSON.parse(latestEval.raw_financial_data) && JSON.parse(latestEval.raw_financial_data).balance !== undefined && (
                  <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${Object.keys(JSON.parse(latestEval.raw_financial_data).balance).length > 0 ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                      Bilanț Financiar {Object.keys(JSON.parse(latestEval.raw_financial_data).balance).length > 0 ? `(Anul ${JSON.parse(latestEval.raw_financial_data).balance.an})` : ''}
                    </h4>
                    
                    {Object.keys(JSON.parse(latestEval.raw_financial_data).balance).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(JSON.parse(latestEval.raw_financial_data).balance).filter(([key]) => key !== 'an').map(([key, value]) => (
                          <div key={`bal_${key}`} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
                            <div className={`font-medium mt-1 ${key === 'profit_net' && value < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                              {typeof value === 'number' ? new Intl.NumberFormat('ro-RO').format(value) : value} {key !== 'angajati' ? 'RON' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-4 rounded-xl text-sm border border-orange-100 dark:border-orange-800/30">
                        Datele bilanțului contabil nu sunt disponibile momentan la furnizorul OpenAPI pentru această companie (Eroare 500 / Lipsă Date).
                      </div>
                    )}
                  </div>
                )}

                {/* Rețea Asociați OSINT Section */}
                {latestEval.raw_financial_data && JSON.parse(latestEval.raw_financial_data) && JSON.parse(latestEval.raw_financial_data).personnel && (
                  <div className="mt-8">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <BrainCircuit size={18} className="text-primary" /> Analiză OSINT (Rețea Asociați)
                    </h4>
                    
                    {/* OSINT Flags */}
                    {JSON.parse(latestEval.raw_financial_data).osint_flags?.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {JSON.parse(latestEval.raw_financial_data).osint_flags.map((flag, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Personnel Table */}
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                      <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-4 py-3">Nume persoană</th>
                            <th className="px-4 py-3">Rol</th>
                            <th className="px-4 py-3 text-center">Alte Firme Active</th>
                            <th className="px-4 py-3 text-center">Firme Faliment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {JSON.parse(latestEval.raw_financial_data).personnel.map((person, idx) => (
                            <tr key={idx} className="bg-white dark:bg-gray-800">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{person.nume}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
                                  {person.rol} ({person.cota_participare}%)
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-center font-medium ${person.alte_companii_active > 3 ? 'text-orange-500' : ''}`}>
                                {person.alte_companii_active}
                              </td>
                              <td className="px-4 py-3 text-center font-medium">
                                {person.companii_faliment > 0 ? (
                                  <span className="text-red-500">{person.companii_faliment} (Risc)</span>
                                ) : (
                                  <span className="text-green-500">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {JSON.parse(latestEval.raw_financial_data).personnel.length === 0 && (
                            <tr>
                              <td colSpan="4" className="px-4 py-4 text-center text-gray-500">Nu au fost găsiți asociați.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'gps' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 animate-in fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-100 text-red-600 rounded-full dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Raport de Risc GPS (Monitorizare Flotă)</h3>
              <p className="text-sm text-gray-500">Generat automat pe baza traseelor de la vehiculele LT / ST.</p>
            </div>
          </div>
          
          <div className="space-y-6">
             <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
               <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Evaluare Pattern-uri Suspicioase</h4>
               <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                 Sistemul AI a identificat **suprapuneri de adrese și rute frecvente** cu alte entități din portofoliul Axis. Risc crescut de subînchiriere neautorizată (Cross-Fleet Usage).
               </p>
               
               <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-4 rounded-r-xl">
                 <h5 className="font-medium text-red-800 dark:text-red-400 text-sm mb-1">Alerte Curente:</h5>
                 <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-300 space-y-1">
                   <li>Vehiculul B-123-AXS (ST) staționează frecvent peste noapte la sediul <b>Dino Home Construct</b> (client cu istoric negativ).</li>
                   <li>Ofertarea nouă pentru vehicule comerciale ar putea fi direcționată tot către terți. Se recomandă <b>Contract Fidejusor</b> sau respingerea cererii.</li>
                 </ul>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                 <div className="text-sm text-gray-500 mb-1">Acuratețe AI</div>
                 <div className="text-xl font-bold text-gray-900 dark:text-white">94%</div>
                 <div className="text-xs text-green-600 mt-1">Conform 1200+ ore monitorizare</div>
               </div>
               <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                 <div className="text-sm text-gray-500 mb-1">Status Recomandare</div>
                 <div className="text-xl font-bold text-red-600">Investigație Manuală</div>
                 <div className="text-xs text-gray-500 mt-1">Acțiune blocantă pt depart. aprobări</div>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* GPS Monitoring History */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-primary" /> Istoric Monitorizare GPS (Silențios)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3">Vehicul</th>
                <th scope="col" className="px-4 py-3">Eveniment / Locație</th>
                <th scope="col" className="px-4 py-3">Data și Ora</th>
                <th scope="col" className="px-4 py-3">Status Permisiune</th>
                <th scope="col" className="px-4 py-3">Decizie AI</th>
              </tr>
            </thead>
            <tbody>
               <tr>
                 <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                   Niciun eveniment GPS înregistrat. Monitorizarea este activă.
                 </td>
               </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
