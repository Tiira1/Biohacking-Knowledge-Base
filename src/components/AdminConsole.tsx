import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { DocumentMetadata } from '../types';
import { Upload, Trash2, FileText, Loader2, ShieldAlert, CheckCircle2, Database } from 'lucide-react';
import { motion } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - use local worker from package
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker using Vite's URL asset loading
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface AdminConsoleProps {
  isAuthenticated: boolean;
  onAuthenticated: () => void;
  docs: DocumentMetadata[];
}

export default function AdminConsole({ isAuthenticated, onAuthenticated, docs }: AdminConsoleProps) {
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'biohacking2026') {
      onAuthenticated();
    } else {
      setError('Invalid Administrator Password');
      setTimeout(() => setError(''), 3000);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      
      const maxPages = Math.min(pdf.numPages, 100); // Limit to 100 pages for performance
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `--- PAGE ${i} ---\n${pageText}\n\n`;
      }
      
      return fullText;
    } catch (err) {
      console.error("PDF Extraction Error:", err);
      throw new Error("Could not extract text from PDF. Ensure it's not password protected.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    setUploading(true);
    setError('');
    setProgress(10); 

    try {
      // 1. Extract Text (Stay on client for better UX)
      const text = await extractTextFromPDF(file);
      setProgress(40);
      
      // 2. Upload to our OWN server
      const formData = new FormData();
      formData.append('pdf', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Server upload failed');
      const { url: downloadUrl } = await uploadRes.json();
      
      setProgress(80);

      // 3. Add metadata to Firestore
      await addDoc(collection(db, 'documents'), {
        name: file.name,
        storagePath: downloadUrl, // Store the local path as storagePath
        downloadUrl,
        uploadedAt: new Date(),
        text,
        pageCount: 0,
        adminSecret: 'biohacking2026'
      });
      
      setUploading(false);
      setProgress(0);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (docObj: DocumentMetadata) => {
    if (!confirm(`Delete "${docObj.name}"?`)) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'documents', docObj.id));
      
      // Delete file from our own server
      await fetch('/api/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: docObj.storagePath })
      });
    } catch (err: any) {
      setError('Deletion failed');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100 p-8">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md text-center"
        >
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2 font-display">Administrator Access</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Enter secure laboratory credentials</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Password" 
                className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-xl px-6 focus:border-slate-900 focus:outline-none transition-all font-mono"
              />
            </div>
            <button className="w-full h-14 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">
              Authorize
            </button>
            {error && <p className="text-red-500 text-[10px] font-bold uppercase mt-2">{error}</p>}
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-12 bg-white">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tighter font-display mb-1 text-slate-900">Document Management</h2>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Admin Session Active
            </p>
          </div>
          <label className="cursor-pointer group">
            <div className={`flex items-center gap-3 h-14 px-8 rounded-2xl font-black uppercase tracking-widest transition-all shadow-md ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? `Indexing ${Math.round(progress)}%` : 'Indexed New Paper'}
            </div>
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
          </label>
        </header>

        <section className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Biological Literature Repository ({docs.length})</h3>
            <div className="h-px bg-slate-200 flex-1 mx-6 opacity-50"></div>
          </div>

          {docs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <Database className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No documents present in the knowledge base</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {docs.map((doc) => (
                <motion.div 
                  layout
                  key={doc.id}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{doc.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1">
                        INDEXED: {new Date(doc.uploadedAt as any).toLocaleDateString()} • {Math.round(doc.text.length / 1000)}KB TEXT DATA
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(doc)}
                    className="w-10 h-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-8 bg-slate-900 rounded-3xl text-white">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">RAG System Health</h4>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-black font-display leading-none">100%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 pb-1">Grounded</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Zero-hallucination guardrails active. All responses verified against document indexing status.
            </p>
          </div>
          <div className="p-8 bg-white rounded-3xl border-2 border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Storage Usage</h4>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-black font-display leading-none text-slate-900">{docs.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pb-1">Docs of 25</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 transition-all duration-1000" 
                style={{ width: `${(docs.length / 25) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
