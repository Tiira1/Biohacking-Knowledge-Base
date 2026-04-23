import { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { DocumentMetadata, Message, Citation } from './types';
import ChatUI from './components/ChatUI';
import AdminConsole from './components/AdminConsole';
import PDFPreview from './components/PDFPreview';
import { BookOpen, ShieldCheck, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [docs, setDocs] = useState<DocumentMetadata[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
      setDocs(data);
    });
    return () => unsubscribe();
  }, []);

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-white font-bold shadow-md">
            B
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter font-display text-slate-900 leading-none">
            Biohacking <span className="text-emerald-600">Lab</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="flex gap-4">
            <button 
              onClick={() => setView('student')}
              className={`text-sm font-bold uppercase tracking-wide pb-1 transition-all ${view === 'student' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Student Portal
            </button>
            <button 
              onClick={() => setView('admin')}
              className={`text-sm font-bold uppercase tracking-wide pb-1 transition-all ${view === 'admin' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Admin Console
            </button>
          </nav>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase">
            <Database size={12} />
            {docs.length} DOCUMENTS INDEXED
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex flex-1 overflow-hidden transition-all duration-300">
        <div className={`flex flex-1 overflow-hidden ${selectedCitation ? 'w-[60%]' : 'w-full'}`}>
          {view === 'student' ? (
            <ChatUI docs={docs} onCitationClick={handleCitationClick} />
          ) : (
            <AdminConsole 
              isAuthenticated={isAdminAuthenticated} 
              onAuthenticated={() => setIsAdminAuthenticated(true)}
              docs={docs}
            />
          )}
        </div>

        {/* Right Pane: PDF Visualizer */}
        <AnimatePresence>
          {selectedCitation && (
            <motion.section 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[40%] bg-slate-100 border-l border-slate-200 flex flex-col overflow-hidden shadow-2xl"
            >
              <PDFPreview 
                citation={selectedCitation} 
                onClose={() => setSelectedCitation(null)}
                doc={docs.find(d => d.id === selectedCitation.docId)}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-slate-900 text-white flex items-center px-6 text-[10px] justify-between uppercase tracking-[0.2em] font-bold">
        <div className="flex gap-4">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> 
            AI System: Online
          </span>
          <span className="opacity-50">Grounding Engine: Gemini 1.5 Pro</span>
        </div>
        <div>© 2024 BIOHACKING KNOWLEDGE SYSTEM • ACADEMIC USE ONLY</div>
      </footer>
    </div>
  );
}
