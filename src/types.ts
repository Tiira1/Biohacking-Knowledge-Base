export interface DocumentMetadata {
  id: string;
  name: string;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: Date;
  text: string;
  pageCount: number;
}

export interface Citation {
  docId: string;
  docName: string;
  page: number;
  snippet: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations: Citation[];
}

export interface ChatSession {
  id: string;
  createdAt: Date;
  lastMessage?: string;
}
