'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppNav from '@/components/AppNav';
import LoadingSpinner from '@/components/LoadingSpinner';
import { User, Lock, AlertTriangle, AlertCircle, CheckCircle2, Brain } from 'lucide-react';

interface Account {
  name: string | null;
  email: string;
  hasPassword: boolean;
  reviewEnabled: boolean;
  createdAt: string;
}

function Banner({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  return (
    <div className={`liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-sm ${
      kind === 'error' ? 'text-red-400' : 'text-green-400'
    }`}>
      {kind === 'error' ? <AlertCircle size={16} className="flex-shrink-0" /> : <CheckCircle2 size={16} className="flex-shrink-0" />}
      {text}
    </div>
  );
}

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-all';
const labelClass = 'text-white/60 text-xs font-medium uppercase tracking-widest';

export default function SettingsPage() {
  const { status, update } = useSession();
  const router = useRouter();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [reviewEnabled, setReviewEnabled] = useState(false);
  const [togglingReview, setTogglingReview] = useState(false);

  const [confidenceEnabled, setConfidenceEnabled] = useState(false);
  const [togglingConfidence, setTogglingConfidence] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch('/api/account');
      if (!res.ok) throw new Error('Failed to load account');
      const data = await res.json();
      setAccount(data);
      setName(data.name ?? '');
      setReviewEnabled(Boolean(data.reviewEnabled));
      setConfidenceEnabled(Boolean(data.confidenceEnabled));
    } catch {
      setBanner({ kind: 'error', text: 'Failed to load your account' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchAccount();
  }, [status, fetchAccount]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    setBanner(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      setBanner({ kind: 'success', text: 'Profile updated' });
      update().catch(() => {});
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setBanner({ kind: 'error', text: 'New passwords do not match' });
      return;
    }
    setSavingPassword(true);
    setBanner(null);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to change password');
      setBanner({ kind: 'success', text: 'Password updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleReview = async () => {
    const next = !reviewEnabled;
    setTogglingReview(true);
    setBanner(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewEnabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update preference');
      setReviewEnabled(next);
      setBanner({
        kind: 'success',
        text: next
          ? 'Spaced repetition enabled - missed questions will now enter your review queue'
          : 'Spaced repetition disabled - your existing queue is kept but paused',
      });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to update preference' });
    } finally {
      setTogglingReview(false);
    }
  };

  const handleToggleConfidence = async () => {
    const next = !confidenceEnabled;
    setTogglingConfidence(true);
    setBanner(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceEnabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update preference');
      setConfidenceEnabled(next);
      setBanner({
        kind: 'success',
        text: next
          ? 'Confidence tracking enabled - you can rate Sure/Unsure before each answer'
          : 'Confidence tracking disabled',
      });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to update preference' });
    } finally {
      setTogglingConfidence(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setBanner(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete account');
      await signOut({ callbackUrl: '/' });
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to delete account' });
      setDeleting(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading settings…" />
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

      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-4 py-8 md:px-6 md:py-10 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-4xl md:text-5xl text-white tracking-tight">
            Settings
          </h1>
          <p className="text-white/50 text-sm">Manage your account</p>
        </div>

        {banner && <Banner kind={banner.kind} text={banner.text} />}

        {/* ── Profile ── */}
        <section className="liquid-glass-card rounded-3xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <User size={15} className="text-white/50" />
            </span>
            <h2 className="text-white font-semibold">Profile</h2>
          </div>

          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Email</label>
              <input value={account?.email ?? ''} disabled aria-label="Email (read-only)"
                className={`${inputClass} opacity-50 cursor-not-allowed`} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="name" className={labelClass}>Full name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={savingName}
              className="bg-white text-black rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {savingName ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        {/* ── Password ── */}
        <section className="liquid-glass-card rounded-3xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Lock size={15} className="text-white/50" />
            </span>
            <h2 className="text-white font-semibold">Password</h2>
          </div>

          {account?.hasPassword ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="current-password" className={labelClass}>Current password</label>
                <input
                  id="current-password" type="password" autoComplete="current-password" required
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••" className={inputClass}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className={labelClass}>New password</label>
                  <input
                    id="new-password" type="password" autoComplete="new-password" required minLength={8}
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••" className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className={labelClass}>Confirm new</label>
                  <input
                    id="confirm-password" type="password" autoComplete="new-password" required minLength={8}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="bg-white text-black rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          ) : (
            <p className="text-white/50 text-sm leading-relaxed">
              You sign in with Google, so there&apos;s no password on this account.
              To add one, use the &quot;Forgot password&quot; flow from the sign-in page.
            </p>
          )}
        </section>

        {/* ── Study preferences ── */}
        <section className="liquid-glass-card rounded-3xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Brain size={15} className="text-white/50" />
            </span>
            <h2 className="text-white font-semibold">Study preferences</h2>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-white text-sm font-medium">Spaced repetition (Daily Review)</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Questions you miss come back for review on a 1 → 3 → 7 → 21 day
                schedule until you master them. Turning this off pauses the queue
                without deleting it.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={reviewEnabled}
              aria-label="Toggle spaced repetition"
              onClick={handleToggleReview}
              disabled={togglingReview}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:opacity-60 ${
                reviewEnabled ? 'bg-green-500/80' : 'bg-white/10 border border-white/20'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  reviewEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="h-px bg-white/5" />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-white text-sm font-medium">Confidence tracking</p>
              <p className="text-white/50 text-sm leading-relaxed">
                Rate each answer Sure or Unsure before submitting. Your dashboard
                gains a calibration view showing where you&apos;re confidently wrong -
                the most dangerous knowledge gaps - and those questions come back
                for review sooner.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={confidenceEnabled}
              aria-label="Toggle confidence tracking"
              onClick={handleToggleConfidence}
              disabled={togglingConfidence}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:opacity-60 ${
                confidenceEnabled ? 'bg-green-500/80' : 'bg-white/10 border border-white/20'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  confidenceEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* ── Danger zone ── */}
        <section className="liquid-glass-card rounded-3xl p-8 space-y-5 border border-red-500/10">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={15} className="text-red-400" />
            </span>
            <h2 className="text-white font-semibold">Danger zone</h2>
          </div>

          <p className="text-white/50 text-sm leading-relaxed">
            Deleting your account permanently removes your profile, all uploaded
            documents, and every quiz result. This cannot be undone.
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="delete-confirm" className={labelClass}>
                Type <span className="text-red-400 font-semibold">DELETE</span> to confirm
              </label>
              <input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className={`${inputClass} focus:border-red-500/50`}
              />
            </div>
            <button
              onClick={handleDelete}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              className="bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {deleting ? 'Deleting…' : 'Delete account permanently'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
