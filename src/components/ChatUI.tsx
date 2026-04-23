import { useState, useRef, useEffect } from 'react';
import { Message, Citation, DocumentMetadata } from '../types';
import { askQuestion } from '../lib/gemini';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface ChatUIProps {
  docs: DocumentMetadata[];
  onCitationClick: (citation: Citation) => void;
}

export default function ChatUI({ docs, onCitationClick }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your AI research assistant. I only answer using the uploaded biological documents. What would you like to know about Biohacking or Cellular Biology today?",
      timestamp: new Date(),
      citations: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      citations: []
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askQuestion(input, docs);
      
      // Parse citations from the response
      // Target: [Document Name, Page 5]
      const citations: Citation[] = [];
      const citationRegex = /\[([^,\]]+),\s*Page\s*(\d+)\]/g;
      let match;
      
      while ((match = citationRegex.exec(response)) !== null) {
        const docName = match[1].trim();
        const pageNum = parseInt(match[2]);
        const foundDoc = docs.find(d => d.name === docName);
        
        if (foundDoc) {
          citations.push({
            docId: foundDoc.id,
            docName: foundDoc.name,
            page: pageNum,
            snippet: "" // In a real app we'd extract the actual context snippet
          });
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        citations
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'assistant',
        content: "Sorry, I encountered an error searching the knowledge base. Please try again.",
        timestamp: new Date(),
        citations: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string, msgCitations: Citation[]) => {
    // Replace [Doc, Page] with a special span or marker that we can then render as a component
    // For simplicity, we can use ReactMarkdown with custom components or just pre-process
    const segments = content.split(/(\[[^,\]]+,\s*Page\s*\d+\])/g);

    return segments.map((seg, i) => {
      const match = seg.match(/\[([^,\]]+),\s*Page\s*(\d+)\]/);
      if (match) {
        const docName = match[1].trim();
        const pageNum = parseInt(match[2]);
        const citation = msgCitations.find(c => c.docName === docName && c.page === pageNum);
        
        return (
          <button
            key={i}
            onClick={() => citation && onCitationClick(citation)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold mx-0.5 hover:bg-emerald-200 transition-colors uppercase"
          >
            {docName} P{pageNum}
          </button>
        );
      }
      return (
        <div key={i} className="inline prose prose-sm max-w-none">
          <ReactMarkdown>{seg}</ReactMarkdown>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Search Progress */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden z-20">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-1/3 h-full bg-emerald-500"
          />
        </div>
      )}

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`relative p-5 rounded-2xl shadow-sm border ${msg.role === 'user' ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none' : 'bg-white border-slate-100 rounded-tl-none'}`}>
                  {msg.role === 'assistant' && (
                    <div className="absolute -left-1 top-4 w-0.5 h-8 bg-emerald-500 rounded-full"></div>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {renderContent(msg.content, msg.citations)}
                  </div>
                  <div className={`mt-2 text-[10px] font-mono opacity-40 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center animate-pulse">
                <Loader2 className="animate-spin" size={18} />
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl animate-pulse">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest italic">Analyzing Biohacking Database...</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Tray */}
      <div className="p-6 bg-slate-50/50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about the uploaded biology papers..."
            className="w-full h-14 pl-6 pr-32 bg-white border-2 border-slate-200 rounded-2xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-800"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 h-10 px-6 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Send size={14} />
            Ask AI
          </button>
        </div>
        <p className="text-center mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Results are strictly grounded in indexed literature
        </p>
      </div>
    </div>
  );
}
