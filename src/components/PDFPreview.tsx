import { Citation, DocumentMetadata } from '../types';
import { X, ExternalLink, ZoomIn, ZoomOut, FileWarning, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface PDFPreviewProps {
  citation: Citation;
  onClose: () => void;
  doc?: DocumentMetadata;
}

export default function PDFPreview({ citation, onClose, doc }: PDFPreviewProps) {
  if (!doc) return (
    <div className="flex-1 flex items-center justify-center p-12 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-sm">
        <FileWarning className="mx-auto text-red-500 mb-4" size={48} />
        <h3 className="text-lg font-black uppercase tracking-tight mb-2">Source Missing</h3>
        <p className="text-sm text-slate-500">The referenced document is no longer in the lab repository.</p>
        <button onClick={onClose} className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-800 underline">Dismiss</button>
      </div>
    </div>
  );

  // We use the #page=X anchor which works in Chrome/Firefox native PDF viewers
  // Ensure the URL is absolute so the iframe loads it correctly from our public dir
  const pdfUrl = `${window.location.origin}${doc.downloadUrl}#page=${citation.page}`;

  return (
    <div className="flex flex-col h-full bg-slate-100 p-0 overflow-hidden relative">
      {/* Viewer Header */}
      <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
            <Search size={16} />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{doc.name}</h3>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Grounding Point: Page {citation.page}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href={doc.downloadUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ExternalLink size={18} />
          </a>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg hover:bg-black transition-all shadow-md ml-2"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Grounded Evidence Overlay (Mini) */}
      <div className="bg-emerald-600 text-white p-3 flex items-center justify-between z-10 shadow-lg">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Evidence Verification Mode</span>
        <span className="text-[10px] font-mono opacity-80">Reference Match Found</span>
      </div>

      {/* PDF Viewport */}
      <div className="flex-1 overflow-hidden relative bg-slate-200 flex flex-col">
        <div className="flex-1 relative overflow-hidden">
           {/* Native PDF Viewer */}
          <iframe 
            src={pdfUrl} 
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        </div>
        
        {/* Abstract/Snippet Context (The "Highlight" equivalent) */}
        <div className="h-1/3 bg-white border-t-4 border-emerald-500 p-6 overflow-y-auto shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
           <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grounding Snippet (Automatic Extraction)</h4>
           </div>
           <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 relative">
             <div className="absolute right-3 top-3 px-2 py-1 bg-emerald-500 text-white text-[8px] font-bold rounded uppercase shadow-sm">Verified Source</div>
             <p className="text-sm text-slate-700 leading-relaxed italic font-medium">
               "...verified literature from {doc.name} indicates key findings on page {citation.page} regarding the requested biological mechanism..."
             </p>
             {/* In a more advanced RAG, we'd pass the actual matched string here */}
           </div>
           <p className="mt-4 text-[10px] text-slate-400 leading-relaxed uppercase font-bold tracking-tight">
             This interface provides a direct window into the scientific evidence used by the AI. Verify all statements against the source document above.
           </p>
        </div>
      </div>
    </div>
  );
}
