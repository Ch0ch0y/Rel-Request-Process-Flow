import { useState } from 'react';
import {
  Mail, CheckCircle2, Layers, Zap, AlertTriangle, TrendingUp,
  Printer, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';

const MILESTONES = [
  { module: 'REL Request Module',    pct: 90, barColor: 'bg-blue-500',    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' },
  { module: 'RELMON Request Module', pct: 80, barColor: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700' },
  { module: 'WHISKER Request Module',pct: 70, barColor: 'bg-violet-500',  badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700' },
];

const ADDONS = [
  { module: 'Construction Analysis Module', pct: 63, barColor: 'bg-indigo-500', note: 'Added Construction Analysis Module' },
];

const ONGOING = [
  { title: 'Scheduling Module',      detail: 'Priority handling and machine allocation' },
  { title: 'Analytics & Reporting', detail: 'Quick extraction of outputs for KPIs and other operational needs' },
];

const REQUIREMENTS = [
  { title: 'Additional Storage Space', detail: 'We need a larger drive to host the new database and support expected high usage, data growth, and file uploads.' },
];

function ProgressRow({ label, pct, barColor, badge, note }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {badge && (
            <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge}`}>
              {pct}%
            </span>
          )}
          <span className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{label}</span>
        </div>
        <span className="flex-shrink-0 text-xs text-slate-400">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{note}</p>}
    </div>
  );
}

function Section({ num, icon: Icon, accentBg, accentBorder, title, children }) {
  return (
    <div className={`border-l-4 ${accentBorder} pl-4 py-1 space-y-3`}>
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${accentBg}`}>{num}</div>
        <Icon className={`w-4 h-4 ${accentBg.replace('bg-', 'text-')}`} />
        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function Presentation() {
  const [expanded, setExpanded] = useState(true);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-full bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 print:bg-white print:p-0">

      {/* ── Toolbar (no-print) ──────────────────────────────────────────── */}
      <div className="print:hidden flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            Milestone Email — REL Database Project
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
          <a
            href="http://10.157.17.186:8000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open RELDMS
          </a>
        </div>
      </div>

      {/* ── Email Card ──────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 print:shadow-none print:rounded-none print:border-0">

        {/* Banner */}
        <div
          className="relative overflow-hidden px-8 py-8 print:py-6"
          style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#2563eb 40%,#38bdf8 100%)' }}
        >
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1.5">Internal Project Update</p>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">REL Database Project</h1>
              <p className="text-blue-100 mt-1 font-semibold text-base">Milestone Status Report — March 16, 2026</p>
            </div>
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex flex-col items-center justify-center shadow-lg">
              <p className="text-3xl font-black text-white leading-none">80%</p>
              <p className="text-[10px] font-semibold text-blue-100 uppercase tracking-wider">Complete</p>
            </div>
          </div>
        </div>

        {/* Meta bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-8 py-3 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <div><span className="font-semibold text-slate-700 dark:text-slate-300">From: </span>Francis Mike E. Villanueva</div>
          <div><span className="font-semibold text-slate-700 dark:text-slate-300">To: </span>Team</div>
          <div><span className="font-semibold text-slate-700 dark:text-slate-300">Date: </span>March 16, 2026</div>
        </div>

        {/* Body */}
        {expanded && (
          <div className="px-8 py-7 space-y-7 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">

            <p className="text-base">Hi Team,</p>
            <p>
              REL Database Project has now passed the{' '}
              <strong className="text-blue-600 dark:text-blue-400">80% completion.</strong>
              {' '}Special Thanks to{' '}
              <strong className="text-blue-700 dark:text-blue-300">Francis</strong>{' '}
              for his continued development of this database.
            </p>

            {/* Completed Milestones */}
            <Section num="1" icon={CheckCircle2} accentBg="bg-emerald-500" accentBorder="border-emerald-500" title="Completed Milestones (80%)">
              <div className="space-y-4">
                {MILESTONES.map(m => (
                  <ProgressRow key={m.module} label={m.module} pct={m.pct} barColor={m.barColor} badge={m.badge} />
                ))}
              </div>
            </Section>

            {/* Add-on Module */}
            <Section num="2" icon={Layers} accentBg="bg-indigo-500" accentBorder="border-indigo-500" title="Add-on Module (63%)">
              <div className="space-y-3">
                {ADDONS.map(a => (
                  <ProgressRow key={a.module} label={a.module} pct={a.pct} barColor={a.barColor} note={a.note} />
                ))}
              </div>
            </Section>

            {/* Ongoing Development */}
            <Section num="3" icon={Zap} accentBg="bg-amber-500" accentBorder="border-amber-500" title="Ongoing Development">
              <div className="space-y-3">
                {ONGOING.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Requirement */}
            <Section num="4" icon={AlertTriangle} accentBg="bg-red-500" accentBorder="border-red-400" title="Requirement">
              <div className="space-y-3">
                {REQUIREMENTS.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Link callout */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  Please let me know if further details or a walkthrough of the current build are needed.
                </p>
                <a
                  href="http://10.157.17.186:8000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-flex items-center gap-1"
                >
                  http://10.157.17.186:8000 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Snapshot preview */}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Here's the snapshot of the New Web-based REL database:
              </p>
              <div
                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md"
                style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 50%,#0ea5e9 100%)' }}
              >
                <div className="flex flex-col sm:flex-row min-h-[200px]">
                  {/* Left */}
                  <div className="sm:w-2/5 p-6 flex flex-col justify-center gap-3 border-r border-white/10">
                    <div className="text-white/80 text-xs font-bold uppercase tracking-wider">Amkor Technology</div>
                    <div>
                      <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold">Reliability Data Management</p>
                      <p className="text-4xl font-black text-white leading-none mt-1">RELDMS</p>
                      <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold mt-0.5">Data Management System</p>
                    </div>
                    <p className="text-[11px] text-blue-200/80 leading-snug">
                      Track reliability testing requests through customizable process steps with precision and efficiency.
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded-full bg-yellow-400 opacity-90" />
                      ))}
                      <span className="text-[10px] text-blue-200 ml-1">17 Engineers Registered</span>
                    </div>
                  </div>
                  {/* Right */}
                  <div className="sm:w-3/5 p-6 flex flex-col justify-center gap-2.5">
                    <div className="flex gap-2 mb-0.5">
                      {['RELMS', 'GAINS ?', 'MORE ?'].map(t => (
                        <span key={t} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${t === 'RELMS' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70'}`}>{t}</span>
                      ))}
                    </div>
                    <p className="text-xl font-black text-white">Welcome Back</p>
                    <p className="text-[11px] text-blue-200">Sign in to your Amkor RELDMS account.</p>
                    <div className="space-y-2">
                      <div className="bg-white/10 rounded-lg px-3 py-2">
                        <p className="text-[9px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Corporate Email</p>
                        <p className="text-[11px] text-white/50">xxx@amkor.com</p>
                      </div>
                      <div className="bg-white/10 rounded-lg px-3 py-2">
                        <p className="text-[9px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Password</p>
                        <p className="text-[11px] text-white/30">••••••••</p>
                      </div>
                      <div className="bg-blue-500 rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] font-bold text-white">Sign In →</p>
                      </div>
                      <div className="bg-yellow-400/90 rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] font-bold text-yellow-900">Login as Technician</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Footer */}
                <div className="bg-white/10 px-5 py-2.5 border-t border-white/10 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">F</div>
                  <div>
                    <p className="text-[11px] font-bold text-white">Francis Mike E. Villanueva</p>
                    <p className="text-[9px] text-blue-200">Developer &amp; Designer</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign-off */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p>Best Regards,</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black text-white text-base flex-shrink-0">F</div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white leading-tight">Francis Mike E. Villanueva</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Developer &amp; Designer · RELDMS</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Amkor Technology Philippines</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 px-8 py-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 flex-wrap gap-2 print:hidden">
          <span>RELDMS · Amkor Technology Philippines · Internal Use Only</span>
          <span>{today}</span>
        </div>
      </div>

      <div className="hidden print:block text-center mt-6 text-xs text-slate-400">
        RELDMS · Amkor Technology Philippines · Internal Use Only · {today}
      </div>
    </div>
  );
}
