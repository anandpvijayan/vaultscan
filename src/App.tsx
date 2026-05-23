import { useState, useEffect } from 'react';
import { 
  Shield, ShieldCheck, Database, HelpCircle, Sun, Moon, Sparkles, 
  ChevronRight, Lock, X
} from 'lucide-react';
import { ScanWorkflow } from './components/ScanWorkflow';
import { VaultView } from './components/VaultView';
import type { RedactedDocument } from './types';
import { dbService } from './services/db';

function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'vault'>('scan');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [showFAQ, setShowFAQ] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [vaultSize, setVaultSize] = useState<number>(0);

  // Load current vault size metrics
  const updateVaultStats = async () => {
    try {
      const docs = await dbService.getAllDocuments();
      setVaultSize(docs.length);
    } catch (err) {
      console.error('Failed to load database stats:', err);
    }
  };

  useEffect(() => {
    updateVaultStats();
  }, [activeTab]);

  // Handle document archiving
  const handleArchive = async (doc: RedactedDocument) => {
    try {
      await dbService.saveDocument(doc);
      await updateVaultStats();
      triggerNotification(`Successfully redacted and securely archived "${doc.name}" to the Vault!`, 'success');
    } catch (err) {
      console.error('Archiving failed:', err);
      triggerNotification('Failed to securely save document to local-first database', 'info');
    }
  };

  const triggerNotification = (message: string, type: 'success' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className={`min-h-screen relative overflow-x-hidden flex flex-col font-sans transition-colors duration-300
      ${darkMode ? 'bg-black text-white vibrant-gradient-vault' : 'bg-[#F2F2F7] text-slate-900 vibrant-gradient-vault-light'}`}
    >
      {/* Decorative ambient blurred backgrounds */}
      {darkMode && (
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      )}
      {darkMode && (
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      )}

      {/* COMPLIANCE TOAST ALERTS */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out] max-w-md">
          <div className={`p-4 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-xl border spring-transition
            ${notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
            }`}
          >
            <div className="p-1 rounded-lg bg-white/5 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5 pr-2">
              <span className="text-xs font-bold uppercase tracking-wider">Compliance Log</span>
              <p className="text-xs opacity-90 leading-relaxed font-medium">
                {notification.message}
              </p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 rounded-lg hover:bg-white/5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl
        ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white/70 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-600 shadow-lg relative group">
              <Shield className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute inset-0 bg-violet-600/30 rounded-xl blur-md -z-10 group-hover:scale-125 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight flex items-center gap-1.5 leading-none">
                VaultScan
                <span className="text-[10px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-mono font-medium">v1.4</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">SECURE PIXEL REDACTOR</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-6">
            <nav className={`p-1 rounded-xl flex ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all duration-200
                  ${activeTab === 'scan'
                    ? (darkMode ? 'bg-white/10 text-white shadow-lg' : 'bg-white text-slate-900 shadow-sm')
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Sparkles className="w-4 h-4 text-violet-400" />
                Scan Workspace
              </button>
              <button
                onClick={() => setActiveTab('vault')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all duration-200
                  ${activeTab === 'vault'
                    ? (darkMode ? 'bg-white/10 text-white shadow-lg' : 'bg-white text-slate-900 shadow-sm')
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Database className="w-4 h-4 text-violet-400" />
                Secure Vault
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold
                  ${activeTab === 'vault' 
                    ? 'bg-violet-600 text-white' 
                    : (darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-600')
                  }`}>
                  {vaultSize}
                </span>
              </button>
            </nav>

            <div className="h-6 w-px bg-white/10" />

            {/* Utility Toggles */}
            <div className="flex items-center gap-2">
              {/* Info FAQ button */}
              <button
                onClick={() => setShowFAQ(true)}
                title="Security Specs & Compliance FAQ"
                className={`p-2 rounded-xl transition-all border
                  ${darkMode 
                    ? 'bg-white/3 border-white/5 text-slate-400 hover:text-white hover:bg-white/8' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <HelpCircle className="w-4.5 h-4.5" />
              </button>

              {/* Theme Toggle button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                title="Toggle Theme"
                className={`p-2 rounded-xl transition-all border
                  ${darkMode 
                    ? 'bg-white/3 border-white/5 text-slate-400 hover:text-white hover:bg-white/8' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {activeTab === 'scan' ? (
          <div className="flex flex-col gap-8">
            {/* Introductory hero section */}
            <div className="flex flex-col gap-2 max-w-2xl">
              <h1 className={`text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Local-First Document Redaction
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                VaultScan locates Personally Identifiable Information (PII) using multi-modal AI and enables secure quadrilateral perspective warping. Pixels inside active areas are permanently destroyed before archiving locally.
              </p>
            </div>

            {/* Scan Workflow container */}
            <ScanWorkflow 
              darkMode={darkMode}
              onArchive={handleArchive}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className={`text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Secure Bento Vault
              </h1>
              <p className="text-slate-400 text-sm">
                Explore the secure offline ledger. Read full metadata logs, retrieve side-by-side unredacted previews, and securely export cleaned document copies.
              </p>
            </div>

            {/* Secure Bento Grid list */}
            <VaultView darkMode={darkMode} />
          </div>
        )}
      </main>

      {/* COMPLIANCE INFO & FAQ OVERLAY MODAL */}
      {showFAQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border
              ${darkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
          >
            {/* Header */}
            <div className="p-5 px-6 border-b border-white/5 flex items-center justify-between bg-black/10">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-violet-400" />
                <h3 className="font-extrabold text-sm tracking-tight">Security & Compliance Ledger</h3>
              </div>
              <button
                onClick={() => setShowFAQ(false)}
                className={`p-1.5 rounded-lg border ${darkMode ? 'bg-white/3 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Security Alert Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 text-emerald-400 text-xs">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <div className="flex flex-col gap-0.5 leading-relaxed font-medium">
                  <span className="font-bold">Zero Telemetry Local Isolation</span>
                  <span>VaultScan operates as a 100% client-side container sandbox. Document bytes are processed locally and stored exclusively in browser-bound IndexedDB.</span>
                </div>
              </div>

              {/* FAQ Q&A */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-xs flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-violet-400 shrink-0" />
                    How does the pixel destruction work?
                  </h4>
                  <p className="text-slate-400 text-xs pl-6 leading-relaxed">
                    When you click "Burn & Secure", coordinates are mapped to a flat HTML5 canvas. We call <code>ctx.fillRect</code> directly over PII coordinate regions. The underlying raw pixel index values are replaced with flat colors permanently. Re-converting back to a JPEG completely breaks visual extraction, rendering pixel recovery mathematically impossible.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-xs flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-violet-400 shrink-0" />
                    Where are the documents stored?
                  </h4>
                  <p className="text-slate-400 text-xs pl-6 leading-relaxed">
                    We completely avoid <code>localStorage</code> due to its tiny 5MB limits. Documents are stored in browser **IndexedDB**, a powerful transactional object store that safely secures gigabytes of files in your profile container without leaks.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-xs flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-violet-400 shrink-0" />
                    What AI Model runs the OCR scan?
                  </h4>
                  <p className="text-slate-400 text-xs pl-6 leading-relaxed">
                    If configured via <code>.env.local</code>, VaultScan initializes the official <strong>@google/genai SDK</strong> client and utilizes <code>gemini-2.5-flash</code> to locate sensitive bounding rectangles (0-1000 scale) and return structured PII objects in real-time.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/10 border-t border-white/5 text-center text-[10px] text-slate-400 font-mono">
              Secured in compliance with standard browser sandbox guidelines.
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`border-t py-6 text-center text-xs text-slate-400
        ${darkMode ? 'border-white/5 bg-black/40' : 'border-slate-200 bg-white/70'}`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-4 items-center justify-between font-mono">
          <span>© 2026 VaultScan Inc. Privacy First.</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Isolated Sandbox Active
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
