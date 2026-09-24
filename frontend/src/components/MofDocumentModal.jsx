import { useState } from 'react';
import { FileText, X, Copy, Check, Printer, ExternalLink, ShieldCheck, BookOpen, Download, Loader2 } from 'lucide-react';

const MofDocumentModal = ({ isOpen, onClose, publication }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !publication) return null;

  const handleCopy = () => {
    // Extract plain text from HTML content or use raw
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = publication.continut || '';
    const plainText = tempDiv.innerText || tempDiv.textContent || '';
    
    const fullText = `MONITORUL OFICIAL AL ROMÂNIEI - PARTEA A IV-A\nPublicația Nr. ${publication.publicatieNr} din data de ${publication.data}\nTitlu: ${publication.titlu_publicatie || publication.denumire}\n\n${plainText}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/clients/mof/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicatieNr: publication.publicatieNr || '',
          data: publication.data || '',
          denumire: publication.denumire || '',
          titlu_publicatie: publication.titlu_publicatie || '',
          continut: publication.continut || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Eroare la generarea PDF-ului pe server');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanEntity = (publication.denumire || 'document')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/__+/g, '_')
        .slice(0, 30);
      a.download = `Monitorul_Oficial_${publication.publicatieNr || 'act'}_${cleanEntity}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback: trigger print dialog for saving to PDF
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${publication.titlu_publicatie || 'Monitorul Oficial'}</title>
          <style>
            body { font-family: Georgia, serif; line-height: 1.6; padding: 40px; color: #111; }
            h1 { font-size: 18px; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .meta { font-size: 13px; color: #555; margin-bottom: 25px; }
            p { margin-bottom: 12px; text-align: justify; }
          </style>
        </head>
        <body>
          <h1>Monitorul Oficial al României • Partea a IV-a</h1>
          <div class="meta">
            <strong>Nr. Publicație:</strong> ${publication.publicatieNr} &nbsp;|&nbsp;
            <strong>Data:</strong> ${publication.data} &nbsp;|&nbsp;
            <strong>Act:</strong> ${publication.titlu_publicatie || publication.denumire}
          </div>
          <div>${publication.continut || ''}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20 dark:to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Monitorul Oficial al României • Partea a IV-a
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  Document Oficial
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5 line-clamp-1">
                {publication.titlu_publicatie || publication.denumire}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              title="Descarcă documentul în format PDF"
            >
              {isDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span className="hidden sm:inline">Descarcă PDF</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Copiază textul actului"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Tipărește actul"
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Închide fereastra"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50 dark:bg-gray-900/40">
          {/* Metadata Banner - Crisp rounded-lg styling */}
          <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Date de Înregistrare & Publicare</span>
              <span className="text-blue-500 text-[11px] font-medium">REGCOM / FIRMEAPI</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80">
                <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide block mb-0.5">
                  Număr Publicație
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  Nr. {publication.publicatieNr || '-'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80">
                <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide block mb-0.5">
                  Data Publicării
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  {publication.data || '-'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80">
                <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wide block mb-0.5">
                  Subiect / Entitate
                </span>
                <span className="font-bold text-gray-900 dark:text-white truncate block text-sm" title={publication.denumire}>
                  {publication.denumire || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Legal Gazette Act Body */}
          <div className="p-6 md:p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs">
            <div className="text-center pb-4 mb-5 border-b border-gray-100 dark:border-gray-700">
              <div className="text-[11px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase">
                ROMÂNIA • MINISTERUL JUSTIȚIEI
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mt-1">
                OFICIUL NAȚIONAL AL REGISTRULUI COMERȚULUI
              </div>
              <h4 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mt-2">
                {publication.titlu_publicatie || publication.denumire}
              </h4>
            </div>

            {/* Document Text */}
            {publication.continut ? (
              <div 
                className="text-xs md:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans space-y-3 prose-p:my-2 prose-p:text-justify selection:bg-blue-100 dark:selection:bg-blue-900/40"
                dangerouslySetInnerHTML={{ __html: publication.continut }}
              />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">
                Conținutul integral al acestui act nu este disponibil în format text.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Document oficial verificat în Monitorul Oficial al României</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>Descarcă PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Închide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MofDocumentModal;

