import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X, ChevronRight, ChevronLeft, LayoutDashboard, ClipboardList,
  FileText, CheckCircle2, Settings, Users, Zap, BookOpen,
  BarChart3, PlusCircle, Clock, Archive
} from 'lucide-react';

// ─── guide slide definitions ───────────────────────────────────────────────
const SLIDES = [
  {
    id: 'welcome',
    icon: BookOpen,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    accentBar: 'bg-blue-600',
    title: 'Welcome to RELDMS! 👋',
    subtitle: 'Your centralized Release Request management portal',
    body: (
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          Submit, track, and manage release requests end-to-end.
        </li>
        <li className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          Stay updated on request statuses in real time.
        </li>
        <li className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          Collaborate with your team through a streamlined workflow.
        </li>
        <li className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          This short guide will walk you through the key features.
        </li>
      </ul>
    ),
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    accentBar: 'bg-violet-600',
    title: 'Dashboard',
    subtitle: 'Your command center at a glance',
    body: (
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
          <span><strong>Overview cards</strong> — see incoming, active, delayed, and upcoming requests instantly.</span>
        </li>
        <li className="flex items-start gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
          <span><strong>Bar chart</strong> — visual breakdown of request statuses.</span>
        </li>
        <li className="flex items-start gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
          <span><strong>Recent requests table</strong> — quick access to the latest submissions.</span>
        </li>
        <li className="flex items-start gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
          Click any stat card to navigate directly to the filtered request list.
        </li>
      </ul>
    ),
  },
  {
    id: 'requests',
    icon: ClipboardList,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    accentBar: 'bg-amber-500',
    title: 'All Requests',
    subtitle: 'Create and manage every release request',
    body: (
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <PlusCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span>Click <strong>"New Request"</strong> to submit a new release request with product, device, and deadline details.</span>
        </li>
        <li className="flex items-start gap-2">
          <PlusCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span>Use the <strong>search bar and filters</strong> to find requests by status, assignee, or date range.</span>
        </li>
        <li className="flex items-start gap-2">
          <PlusCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span>Click any row to open the <strong>Request Detail</strong> view and update its status or add notes.</span>
        </li>
        <li className="flex items-start gap-2">
          <PlusCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          Export or import requests via the <strong>Excel import</strong> button for bulk operations.
        </li>
      </ul>
    ),
  },
  {
    id: 'my-requests',
    icon: FileText,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    accentBar: 'bg-sky-500',
    title: 'My Requests',
    subtitle: 'Track the requests you own',
    body: (
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          Shows all requests where <strong>you are the assigned owner</strong>.
        </li>
        <li className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          Monitor the progress of your own submissions without the noise of others.
        </li>
        <li className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          Update statuses and add comments directly from the detail view.
        </li>
      </ul>
    ),
  },
  {
    id: 'completed',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accentBar: 'bg-emerald-500',
    title: 'Completed Requests',
    subtitle: 'History of all finished releases',
    body: (
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          View all requests that have been <strong>successfully completed</strong>.
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          Useful for auditing, reporting, and referencing past releases.
        </li>
        <li className="flex items-start gap-2">
          <Archive className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          The <strong>Backup Viewer</strong> also lets you browse auto and manual data snapshots anytime.
        </li>
      </ul>
    ),
  },
  {
    id: 'admin',
    icon: Settings,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    accentBar: 'bg-rose-500',
    title: 'Settings & User Management',
    subtitle: 'For administrators and advanced users',
    body: (
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <Users className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <span><strong>Users page</strong> — create, edit, or deactivate user accounts and assign roles.</span>
        </li>
        <li className="flex items-start gap-2">
          <Settings className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <span><strong>Settings</strong> — configure system-wide options, employee lists, and permissions.</span>
        </li>
        <li className="flex items-start gap-2">
          <Settings className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          Role-based access ensures each user sees only what they need.
        </li>
      </ul>
    ),
  },
  {
    id: 'ready',
    icon: Zap,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    accentBar: 'bg-blue-600',
    title: "You're all set! 🚀",
    subtitle: "Start managing your release requests today",
    body: (
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          Head to <strong>All Requests</strong> to create your first release request.
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          Check the <strong>Dashboard</strong> daily for status overviews and upcoming deadlines.
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          You can re-open this guide anytime from <strong>Settings → Help & Guide</strong>.
        </li>
      </ul>
    ),
  },
];

// ─── localStorage helpers ──────────────────────────────────────────────────
function guideKey(userId) {
  return `rel_guide_dismissed_${userId}`;
}

export function hasUserDismissedGuide(userId) {
  if (!userId) return false;
  return localStorage.getItem(guideKey(userId)) === 'true';
}

export function dismissGuide(userId) {
  if (!userId) return;
  localStorage.setItem(guideKey(userId), 'true');
}

// ─── UserGuide modal ───────────────────────────────────────────────────────
export default function UserGuide({ open, onClose }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Reset to first slide whenever the modal opens + lock body scroll
  useEffect(() => {
    if (open) {
      setStep(0);
      document.body.classList.add('modal-open');
      return () => document.body.classList.remove('modal-open');
    }
  }, [open]);

  if (!open) return null;

  const slide = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;
  const Icon = slide.icon;

  const handleClose = () => {
    if (dontShowAgain && user?.id) {
      dismissGuide(user.id);
    }
    onClose();
  };

  const handleSkip = () => {
    // "Skip" always marks as dismissed so it won't re-appear next login
    if (user?.id) dismissGuide(user.id);
    onClose();
  };

  const handleFinish = () => {
    if (user?.id) dismissGuide(user.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top accent bar */}
        <div className={`h-1 w-full ${slide.accentBar} transition-colors duration-300`} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${slide.iconBg} transition-colors duration-300`}>
              <Icon className={`w-5 h-5 ${slide.iconColor} transition-colors duration-300`} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-900 leading-tight">{slide.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{slide.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-2 flex-shrink-0"
            title="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[160px]">
          {slide.body}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? `w-6 h-2 ${slide.accentBar}`
                  : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
          {/* Don't show again checkbox (last slide only) */}
          {isLast ? (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
              />
              <span className="text-xs text-slate-500">Don't show again</span>
            </label>
          ) : (
            <button
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
            >
              Skip guide
            </button>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Get Started <Zap className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
