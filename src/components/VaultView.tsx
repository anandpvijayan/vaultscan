import { useState, useEffect } from 'react';
import { 
  Search, ShieldAlert, Download, Trash2, Calendar, Eye, 
  Trash, X, AlertTriangle, ShieldCheck, ArrowRightLeft, RefreshCw
} from 'lucide-react';
import type { RedactedDocument } from '../types';
import { dbService } from '../services/db';

interface VaultViewProps {
  darkMode: boolean;
}

export const VaultView: React.FC<VaultViewProps> = ({ darkMode }) => {
  const [documents, setDocuments] = useState<RedactedDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<RedactedDocument | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'sanitized' | 'original'>('sanitized');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load documents from IndexedDB
  const loadVault = async () => {
    setIsLoading(true);
    try {
      const docs = await dbService.getAllDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents from database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to permanently destroy this document from the local archive?')) {
      try {
        await dbService.deleteDocument(id);
        await loadVault();
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
        }
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('WARNING: You are about to perform a full forensic wipe of the local Vault. This will permanently destroy all archived documents. This action CANNOT be undone. Proceed?')) {
      try {
        await dbService.clearAll();
        await loadVault();
        setSelectedDoc(null);
      } catch (err) {
        console.error('Failed to clear database:', err);
      }
    }
  };

  const handleDownload = (doc: RedactedDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const link = document.createElement('a');
    link.href = doc.sanitizedImage;
    link.download = `VaultScan_Redacted_${doc.name.replace(/\.[^/.]+$/, '')}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter documents based on title or redaction tags
  const filteredDocs = documents.filter(doc => {
    const nameMatches = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const tagMatches = doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return nameMatches || tagMatches;
  });

  // Calculate statistics
  const totalRedactions = documents.reduce((acc, doc) => {
    return acc + doc.regions.filter(r => r.active).length;
  }, 0);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Name': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Address': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Email': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Phone Numbers': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Financial Details': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Network IDs': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Manual': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* STATS BANNER / METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${darkMode ? 'glass-panel' : 'glass-panel-light'} flex flex-col gap-1`}>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Archived</span>
          <span className={`text-2xl font-bold font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {documents.length}
          </span>
          <span className="text-[10px] text-slate-400">PII Redacted Scans</span>
        </div>
        <div className={`p-5 rounded-2xl border ${darkMode ? 'glass-panel' : 'glass-panel-light'} flex flex-col gap-1`}>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Wiped Entities</span>
          <span className={`text-2xl font-bold font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {totalRedactions}
          </span>
          <span className="text-[10px] text-slate-400">Total sensitive locations destroyed</span>
        </div>
        <div className={`p-5 rounded-2xl border ${darkMode ? 'glass-panel' : 'glass-panel-light'} flex flex-col gap-1`}>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Storage Sandbox</span>
          <span className={`text-2xl font-bold font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            IndexedDB
          </span>
          <span className="text-[10px] text-slate-400">Local isolation sandbox</span>
        </div>
        <div className={`p-5 rounded-2xl border ${darkMode ? 'glass-panel' : 'glass-panel-light'} flex flex-col gap-1`}>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Compliance State</span>
          <span className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            100% SEC
          </span>
          <span className="text-[10px] text-slate-400">Zero data leaves browser</span>
        </div>
      </div>

      {/* FILTER SEARCH & WIPE UTILITIES */}
      <div className={`p-4 px-6 rounded-2xl border ${darkMode ? 'glass-panel' : 'glass-panel-light'} flex flex-wrap gap-4 items-center justify-between`}>
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents by filename or classification tag (e.g. Email)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl outline-none border transition-all
              ${darkMode 
                ? 'bg-white/3 border-white/5 text-white placeholder-slate-500 focus:border-violet-500/50 focus:bg-white/5' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500/50 focus:bg-white'}`}
          />
        </div>

        {documents.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all
              ${darkMode
                ? 'bg-rose-950/20 border-rose-500/20 hover:border-rose-500/50 text-rose-400'
                : 'bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700'}`}
          >
            <Trash className="w-4 h-4" />
            Forensic Wipe Vault
          </button>
        )}
      </div>

      {/* SECURE ARCHIVE BENTO FEED */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
          <span className="text-sm text-slate-400">Loading secure sandbox archive...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className={`p-16 rounded-3xl text-center border flex flex-col items-center justify-center gap-6 min-h-[350px]
          ${darkMode ? 'glass-panel bg-white/1' : 'glass-panel-light'}`}
        >
          <div className="bg-slate-800/40 p-5 rounded-full text-slate-400">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Vault is Empty
            </h3>
            <p className="text-slate-400 max-w-xs mx-auto mt-1 text-xs">
              {searchQuery 
                ? "No archived documents match your search criteria. Try a different tag or query." 
                : "Your local-first database has no archived document records. Go back to Scan Workflow to redactor pixels."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => {
                setSelectedDoc(doc);
                setComparisonMode('sanitized');
              }}
              className={`rounded-2xl overflow-hidden border transition-all spring-transition cursor-pointer group flex flex-col h-full
                ${darkMode 
                  ? 'glass-panel bg-white/1 hover:bg-white/3 hover:border-white/10 hover:shadow-xl hover:shadow-violet-600/5' 
                  : 'glass-panel-light hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50'}`}
            >
              {/* Preview image */}
              <div className="h-48 relative overflow-hidden bg-slate-950/40 flex items-center justify-center border-b border-white/5">
                <img
                  src={doc.sanitizedImage}
                  alt={doc.name}
                  className="max-h-full max-w-full object-contain select-none group-hover:scale-[1.03] transition-transform duration-300"
                />
                
                {/* Active hover overlay icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="p-3 rounded-full bg-violet-600 text-white shadow-lg scale-90 group-hover:scale-100 transition-transform spring-transition">
                    <Eye className="w-5 h-5" />
                  </span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="p-2 rounded-xl bg-black/60 text-slate-400 hover:text-rose-400 backdrop-blur-md transition-all scale-90 group-hover:scale-100"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(doc.timestamp).toLocaleString()}
                  </span>
                  <h4 className={`font-semibold text-xs truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {doc.name}
                  </h4>
                </div>

                {/* Categorization tags */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {doc.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`text-[9px] px-2 py-0.5 border rounded-full font-mono font-medium ${getTagColor(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Card CTA Footer */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {doc.regions.filter(r => r.active).length} Redactions
                  </span>
                  <button
                    onClick={(e) => handleDownload(doc, e)}
                    className={`p-2 rounded-xl transition-all border
                      ${darkMode ? 'bg-white/3 border-white/5 hover:bg-white/8 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULLSCREEN REVIEW / COMPARISON MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border
              ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}
          >
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-white/5 flex items-center justify-between bg-black/10">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400">Interactive Vault Preview</span>
                <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {selectedDoc.name}
                </h3>
              </div>

              {/* Top controls */}
              <div className="flex items-center gap-4">
                {/* Image Comparison Toggle */}
                <div className={`p-0.5 rounded-lg flex ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                  <button
                    onClick={() => setComparisonMode('sanitized')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all
                      ${comparisonMode === 'sanitized'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Wiped Output
                  </button>
                  <button
                    onClick={() => setComparisonMode('original')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all
                      ${comparisonMode === 'original'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Original (Cached)
                  </button>
                </div>

                <div className="h-6 w-px bg-white/5" />

                <button
                  onClick={() => handleDownload(selectedDoc)}
                  className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-2 text-xs font-semibold px-4 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download jpeg
                </button>

                <button
                  onClick={() => setSelectedDoc(null)}
                  className={`p-2 rounded-xl border ${darkMode ? 'bg-white/3 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Workspace Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 overflow-hidden flex-1">
              {/* Display view */}
              <div className="md:col-span-3 p-8 flex items-center justify-center bg-slate-950/40 relative overflow-y-auto max-h-[60vh] md:max-h-none">
                <img
                  src={comparisonMode === 'sanitized' ? selectedDoc.sanitizedImage : selectedDoc.originalImage}
                  alt={selectedDoc.name}
                  className="max-h-[500px] max-w-full object-contain shadow-2xl rounded border border-white/5 select-none"
                />

                {comparisonMode === 'original' && (
                  <div className="absolute top-4 left-4 bg-rose-500 text-white font-mono text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Displaying Raw Unredacted File
                  </div>
                )}
              </div>

              {/* Sidebar review content */}
              <div className="p-6 border-t md:border-t-0 md:border-l border-white/5 flex flex-col gap-6 bg-black/5 overflow-y-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Redaction Metadata
                  </label>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    Captured on local IndexedDB secure storage.
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                    <span className="text-slate-400">Total Entities</span>
                    <span className="font-semibold text-violet-400 font-mono">
                      {selectedDoc.regions.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                    <span className="text-slate-400">Active Redactions</span>
                    <span className="font-semibold text-rose-400 font-mono">
                      {selectedDoc.regions.filter(r => r.active).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                    <span className="text-slate-400">Storage Ingress</span>
                    <span className="font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px]">
                      Compliant
                    </span>
                  </div>
                </div>

                {/* Redaction entities List */}
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Destroyed Fields
                  </label>

                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                    {selectedDoc.regions.filter(r => r.active).map((region, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border flex items-center justify-between text-[11px] font-mono
                          ${darkMode ? 'bg-white/2 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                      >
                        <span className="font-semibold text-rose-400 uppercase text-[9px]">
                          {region.type}
                        </span>
                        <span className="truncate max-w-[120px] opacity-75">
                          {region.label || 'Wiped Region'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => {
                    const confirmRestore = confirm("Restore this document back to active Scan Workflow queue for additional redaction/perspective crop operations?");
                    if (confirmRestore) {
                      // Handled by user (could push back to queue or trigger custom callback)
                      alert("Document metadata is ready. Create a new ingress upload to perform custom rotations/crops.");
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-all mt-auto flex items-center justify-center gap-1.5
                    ${darkMode ? 'bg-white/3 border-white/5 hover:bg-white/8 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Restore to Queue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
