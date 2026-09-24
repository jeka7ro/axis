import { useState, useMemo } from 'react';
import { TrendingUp, Users, Table as TableIcon } from 'lucide-react';

export const FinancialPerformanceCard = ({ balance = {}, title = "Performanță Financiară & Bilanțuri Oficiale" }) => {
  const [hoveredBar, setHoveredBar] = useState(null);

  // Normalize list of historical balance rows
  const istoric = useMemo(() => {
    let list = Array.isArray(balance?.istoric) ? [...balance.istoric] : [];
    if (list.length === 0 && balance?.an && (balance?.cifra_afaceri !== undefined || balance?.datorii !== undefined)) {
      list = [{
        an: balance.an,
        cifra_afaceri: balance.cifra_afaceri || 0,
        venituri_totale: balance.venituri_totale || balance.cifra_afaceri || 0,
        cheltuieli: balance.cheltuieli || 0,
        profit_net: balance.profit_net || 0,
        pierdere_neta: balance.pierdere_neta || (balance.profit_net < 0 ? -balance.profit_net : 0),
        salariati: balance.angajati || balance.salariati || 0,
        active_imobilizate: balance.active_imobilizate || 0,
        creante: balance.creante || 0,
        casa_banci: balance.casa_banci || balance.disponibil_bancar || 0,
        datorii: balance.datorii || 0
      }];
    }
    // Sort descending for table (newest year first)
    return list.sort((a, b) => Number(b.an) - Number(a.an));
  }, [balance]);

  // Chronological order for chart (oldest to newest)
  const chartData = useMemo(() => {
    return [...istoric].sort((a, b) => Number(a.an) - Number(b.an));
  }, [istoric]);

  const latest = istoric[0] || {};
  const latestYear = latest.an || balance?.an || (new Date().getFullYear() - 1);
  const totalYears = balance?.ani_raportati || istoric.length;
  const minYear = chartData[0]?.an || latestYear;
  const maxYear = chartData[chartData.length - 1]?.an || latestYear;

  // Format currency
  const fmt = (val) => {
    if (val === undefined || val === null || val === '') return '—';
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('ro-RO').format(num);
  };

  // Find max value for chart scaling
  const maxVal = useMemo(() => {
    let m = 1;
    chartData.forEach(d => {
      m = Math.max(
        m, 
        Number(d.cifra_afaceri || 0), 
        Number(d.venituri_totale || 0), 
        Number(d.profit_net || 0),
        Number(d.pierdere_neta || 0)
      );
    });
    return m * 1.15; // 15% headroom
  }, [chartData]);

  const formatShortValue = (val) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val.toString();
  };

  if (istoric.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in">
        <div className="flex items-center gap-2 mb-2 text-emerald-600">
          <TrendingUp size={20} />
          <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
        </div>
        <p className="text-xs text-gray-500">Datele bilanțurilor oficiale nu sunt disponibile momentan pentru această entitate.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 animate-in fade-in transition-all">
      {/* 1. Header with Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-emerald-500 shrink-0" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Situații financiare anuale depuse la Ministerul Finanțelor Publice ({totalYears} {totalYears === 1 ? 'an raportat' : 'ani raportați'})
          </p>
        </div>
        <div>
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs">
            Ultimul Bilanț: {latestYear}
          </span>
        </div>
      </div>

      {/* 2. 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* KPI 1: Cifra de Afaceri */}
        <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
              Cifră de Afaceri Netă ({latestYear})
            </span>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white mt-1">
              {fmt(latest.cifra_afaceri)} <span className="text-xs font-semibold text-gray-400">RON</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Venituri: {fmt(latest.venituri_totale || latest.cifra_afaceri)} RON
          </div>
        </div>

        {/* KPI 2: Rezultat Net */}
        <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
              Rezultat Net ({latestYear})
            </span>
            <div className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${
              (latest.profit_net != null && latest.profit_net !== 0 ? latest.profit_net : (latest.pierdere_neta ? -latest.pierdere_neta : 0)) >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {(() => {
                const val = latest.profit_net != null && latest.profit_net !== 0 ? latest.profit_net : (latest.pierdere_neta ? -latest.pierdere_neta : 0);
                return <>{val > 0 ? '+' : ''}{fmt(val)} <span className="text-xs font-semibold opacity-75">RON</span></>;
              })()}
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {(latest.profit_net || 0) >= 0 ? 'Profit Net Raportat' : 'Pierdere Netă Raportată'}
          </div>
        </div>

        {/* KPI 3: Număr Mediu Salariați */}
        <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
              Număr Mediu Salariați
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Users size={22} className="text-gray-700 dark:text-gray-300 shrink-0" />
              <div className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                {latest.salariati || latest.angajati || 0}{' '}
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 font-sans">salariați</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Conform declarației 100/101
          </div>
        </div>

        {/* KPI 4: Datorii Totale */}
        <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
              Datorii Totale
            </span>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-amber-500 mt-1">
              {fmt(latest.datorii)} <span className="text-xs font-semibold text-gray-400">RON</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Creanțe: {fmt(latest.creante)} RON
          </div>
        </div>
      </div>

      {/* 3. Bar Chart Section: Evoluție Financiară Multianuală */}
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/60 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-emerald-500" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Evoluție Financiară Multianuală (Bilanțuri {minYear} - {maxYear})
          </h4>
        </div>

        {/* Chart Container */}
        <div className="relative pt-6 pb-2 px-2 bg-gray-50/30 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-700/40 overflow-hidden">
          {/* Y Axis Guide Lines */}
          <div className="h-56 relative w-full flex flex-col justify-between pointer-events-none select-none">
            {[1, 0.75, 0.5, 0.25, 0].map((step, idx) => (
              <div key={idx} className="relative w-full border-b border-gray-200/50 dark:border-gray-700/40 flex items-center">
                <span className="absolute -top-2.5 left-0 text-[10px] text-gray-400">
                  {formatShortValue(maxVal * step)}
                </span>
              </div>
            ))}
          </div>

          {/* Grouped Bars */}
          <div className="absolute inset-0 pt-6 pb-8 pl-12 pr-4 flex items-end justify-around gap-2">
            {chartData.map((d, yearIdx) => {
              const caHeight = Math.max(3, (Number(d.cifra_afaceri || 0) / maxVal) * 100);
              const venHeight = Math.max(3, (Number(d.venituri_totale || d.cifra_afaceri || 0) / maxVal) * 100);
              const pNet = Number(d.profit_net || 0);
              const pHeight = Math.max(3, (Math.max(0, pNet) / maxVal) * 100);
              const lNet = Number(d.pierdere_neta || (pNet < 0 ? -pNet : 0));
              const lHeight = Math.max(3, (Math.max(0, lNet) / maxVal) * 100);

              const isHovered = hoveredBar === yearIdx;

              return (
                <div 
                  key={d.an} 
                  className="flex-1 flex flex-col items-center justify-end h-full max-w-[90px] group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBar(yearIdx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-24 z-30 p-2.5 rounded-xl bg-gray-900/95 dark:bg-gray-800 text-white shadow-xl text-[11px] whitespace-nowrap border border-gray-700 pointer-events-none animate-in fade-in zoom-in-95">
                      <div className="font-bold text-center border-b border-gray-700 pb-1 mb-1 text-emerald-400">
                        Anul {d.an}
                      </div>
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-emerald-400">C.A.:</span>
                        <span className="font-bold">{fmt(d.cifra_afaceri)} RON</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-blue-400">Venituri:</span>
                        <span className="">{fmt(d.venituri_totale || d.cifra_afaceri)} RON</span>
                      </div>
                      {pNet > 0 && (
                        <div className="flex items-center gap-1.5 justify-between text-emerald-400">
                          <span>Profit Net:</span>
                          <span className="font-bold">+{fmt(pNet)} RON</span>
                        </div>
                      )}
                      {lNet > 0 && (
                        <div className="flex items-center gap-1.5 justify-between text-rose-400">
                          <span>Pierdere:</span>
                          <span className="font-bold">-{fmt(lNet)} RON</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* The Group of Bars */}
                  <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                    {/* Bar 1: Cifra Afaceri (Emerald) */}
                    <div 
                      className="w-2.5 sm:w-3.5 bg-emerald-500 rounded-t-sm group-hover:brightness-110 transition-all duration-300"
                      style={{ height: `${caHeight}%` }}
                      title={`Cifra Afaceri: ${fmt(d.cifra_afaceri)} RON`}
                    />
                    {/* Bar 2: Venituri Totale (Blue) */}
                    <div 
                      className="w-2.5 sm:w-3.5 bg-blue-500 rounded-t-sm group-hover:brightness-110 transition-all duration-300"
                      style={{ height: `${venHeight}%` }}
                      title={`Venituri Totale: ${fmt(d.venituri_totale || d.cifra_afaceri)} RON`}
                    />
                    {/* Bar 3: Profit Net (Dark Green) */}
                    {pNet > 0 && (
                      <div 
                        className="w-2.5 sm:w-3.5 bg-emerald-700 dark:bg-emerald-600 rounded-t-sm group-hover:brightness-110 transition-all duration-300"
                        style={{ height: `${pHeight}%` }}
                        title={`Profit Net: ${fmt(pNet)} RON`}
                      />
                    )}
                    {/* Bar 4: Pierdere Neta (Red) */}
                    {lNet > 0 && (
                      <div 
                        className="w-2.5 sm:w-3.5 bg-rose-500 rounded-t-sm group-hover:brightness-110 transition-all duration-300"
                        style={{ height: `${lHeight}%` }}
                        title={`Pierdere Netă: ${fmt(lNet)} RON`}
                      />
                    )}
                  </div>

                  {/* Year Label */}
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-semibold group-hover:text-emerald-500 transition-colors">
                    {d.an}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap mt-4 text-xs font-medium text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 shrink-0" />
            <span>Cifră Afaceri</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm bg-blue-500 shrink-0" />
            <span>Venituri Totale</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-700 dark:bg-emerald-600 shrink-0" />
            <span>Profit Net</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm bg-rose-500 shrink-0" />
            <span>Pierdere Netă</span>
          </div>
        </div>
      </div>

      {/* 4. Comparative Table: Tabel Comparativ Bilanț pe Toți Anii Raportați */}
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center gap-2 mb-3">
          <TableIcon size={16} className="text-emerald-600" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Tabel Comparativ Bilanț pe Toți Anii Raportați
          </h4>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700/70 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/80 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">AN</th>
                <th className="px-4 py-3 whitespace-nowrap">CIFRĂ AFACERI</th>
                <th className="px-4 py-3 whitespace-nowrap">VENITURI TOTALE</th>
                <th className="px-4 py-3 whitespace-nowrap">CHELTUIELI</th>
                <th className="px-4 py-3 whitespace-nowrap">PROFIT NET</th>
                <th className="px-4 py-3 whitespace-nowrap">PIERDERE NETĂ</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">SALARIAȚI</th>
                <th className="px-4 py-3 whitespace-nowrap">ACTIVE IMOB.</th>
                <th className="px-4 py-3 whitespace-nowrap">CREANȚE</th>
                <th className="px-4 py-3 whitespace-nowrap">CASA &amp; BĂNCI</th>
                <th className="px-4 py-3 whitespace-nowrap">DATORII TOTALE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800">
              {istoric.map((row) => {
                const profitNet = Number(row.profit_net || 0);
                const pierdereNeta = Number(row.pierdere_neta || (profitNet < 0 ? -profitNet : 0));
                const venituri = row.venituri_totale || row.cifra_afaceri || 0;

                return (
                  <tr key={row.an} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors">
                    {/* An Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs bg-emerald-50/60 dark:bg-emerald-950/20">
                        {row.an}
                      </span>
                    </td>
                    {/* Cifra Afaceri */}
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {fmt(row.cifra_afaceri)}
                    </td>
                    {/* Venituri Totale */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {fmt(venituri)}
                    </td>
                    {/* Cheltuieli */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {fmt(row.cheltuieli)}
                    </td>
                    {/* Profit Net */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {profitNet > 0 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(profitNet)}</span>
                      ) : (
                        <span className="text-gray-400 font-semibold">—</span>
                      )}
                    </td>
                    {/* Pierdere Neta */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {pierdereNeta > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">{fmt(pierdereNeta)}</span>
                      ) : (
                        <span className="text-gray-400 font-semibold">—</span>
                      )}
                    </td>
                    {/* Salariati */}
                    <td className="px-4 py-3 font-bold text-center text-gray-900 dark:text-white whitespace-nowrap">
                      {row.salariati || row.angajati || 0}
                    </td>
                    {/* Active Imobilizate */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {fmt(row.active_imobilizate)}
                    </td>
                    {/* Creante */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {fmt(row.creante)}
                    </td>
                    {/* Casa & Banci */}
                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {fmt(row.casa_banci || row.disponibil_bancar)}
                    </td>
                    {/* Datorii Totale */}
                    <td className="px-4 py-3 font-bold text-amber-500 whitespace-nowrap">
                      {fmt(row.datorii)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialPerformanceCard;
