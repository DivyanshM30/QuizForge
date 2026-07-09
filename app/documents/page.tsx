'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/store/quiz-store';
import AppNav from '@/components/AppNav';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import { FileText, Trash2, Zap, Pencil, Check, X, Upload, AlertCircle } from 'lucide-react';

interface DocumentMeta {
  id: string;
  title: string;
  wordCount: number;
  createdAt: string;
  quizCount: number;
}

export default function DocumentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { setDocumentText, setDocumentId } = useQuizStore();

  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to load documents');
      setDocuments(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchDocuments();
  }, [status, fetchDocuments]);

  /* Load the stored text and jump straight to quiz config. */
  const handleNewQuiz = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error('Failed to load document');
      const doc = await res.json();
      setDocumentText(doc.text);
      setDocumentId(doc.id);
      router.push('/upload?step=config');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? Past quiz results are kept.')) return;
    const prev = documents;
    setDocuments((d) => d.filter((doc) => doc.id !== id));
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) setDocuments(prev);
  };

  const startRename = (doc: DocumentMeta) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
  };

  const submitRename = async (id: string) => {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title) return;
    const prev = documents;
    setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, title } : doc)));
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) setDocuments(prev);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading your documents…" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <AppNav />

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:px-6 md:py-10 space-y-8">
        <div className="text-center space-y-1">
          <h1 className="font-display text-4xl md:text-5xl text-white tracking-tight">
            Your documents
          </h1>
          <p className="text-white/50 text-sm">
            Generate new quizzes without re-uploading — your 20 most recent uploads are kept
          </p>
        </div>

        {error && (
          <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm max-w-2xl mx-auto">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {documents.length === 0 ? (
          <div className="liquid-glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto">
            <span className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <FileText size={22} className="text-white/40" />
            </span>
            <div className="space-y-1">
              <h2 className="text-white font-semibold">No documents yet</h2>
              <p className="text-white/40 text-sm">
                Upload a PDF or DOCX and it will be saved here for future quizzes.
              </p>
            </div>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              <Upload size={15} />
              Upload a document
            </Link>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="liquid-glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-white/[0.03] transition-colors"
              >
                {/* Icon + meta */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-white/50" />
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {editingId === doc.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename(doc.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          aria-label="Document title"
                          className="flex-1 min-w-0 bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-white/40 transition-all"
                        />
                        <button
                          onClick={() => submitRename(doc.id)}
                          aria-label="Save title"
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-green-400 hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel rename"
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-white font-medium text-sm truncate">{doc.title}</p>
                    )}
                    <p className="text-white/40 text-xs tabular-nums">
                      {doc.wordCount.toLocaleString()} words
                      {' · '}{doc.quizCount} {doc.quizCount === 1 ? 'quiz' : 'quizzes'}
                      {' · '}{new Date(doc.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startRename(doc)}
                    aria-label="Rename document"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    aria-label="Delete document"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleNewQuiz(doc.id)}
                    disabled={busyId === doc.id}
                    className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-white/90 disabled:opacity-60 transition-all text-sm cursor-pointer"
                  >
                    <Zap size={14} />
                    {busyId === doc.id ? 'Loading…' : 'New Quiz'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
