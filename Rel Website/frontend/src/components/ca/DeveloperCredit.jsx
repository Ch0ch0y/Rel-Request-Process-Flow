import { useState } from 'react';
import { X } from 'lucide-react';
import developerPhoto from '../../assets/developer.jpg';

export default function DeveloperCredit() {
  const [showPhoto, setShowPhoto] = useState(false);
  const [showSpeech, setShowSpeech] = useState(false);

  return (
    <>
      {/* Credit Card */}
      <div
        className="mt-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-lg overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)] hover:border-violet-500/50 group"
        onClick={() => setShowSpeech(true)}
        title="Click to read a message from the developer"
      >
        <div className="px-4 py-2.5 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-violet-400 transition-colors duration-300">
            About the Developer
          </h3>
          <span className="text-[9px] text-slate-600 group-hover:text-violet-500 transition-colors duration-300 italic">
            click to read message ✦
          </span>
        </div>
        <div className="px-4 py-3 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={developerPhoto}
              alt="Francis Niño R. Villanueva"
              className="w-12 h-12 rounded-full object-cover shadow-md ring-2 ring-white/10 hover:ring-violet-400/60 transition-all duration-300 cursor-zoom-in"
              onClick={e => { e.stopPropagation(); setShowPhoto(true); }}
              onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            <div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-indigo-600 items-center justify-center shadow-md ring-2 ring-white/10"
              style={{ display: 'none' }}
            >
              <span className="text-base font-bold text-white select-none">FV</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" title="Creator" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white tracking-tight leading-tight">Francis Niño R. Villanueva</p>
            <p className="text-xs text-slate-400 mt-0.5">Developer &amp; Designer</p>
          </div>

          {/* Badge */}
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
              v1.0
            </span>
          </div>
        </div>
        <div className="px-4 pb-2.5">
          <p className="text-[10px] text-slate-600 text-center">
            &copy; {new Date().getFullYear()} Amkor Technology &mdash; All rights reserved.
          </p>
        </div>
      </div>

      {/* Photo Lightbox */}
      {showPhoto && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPhoto(false)}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowPhoto(false)}
              className="absolute -top-9 right-0 text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <X size={15} /> Close
            </button>
            <img
              src={developerPhoto}
              alt="Francis Niño R. Villanueva"
              className="w-full rounded-2xl shadow-2xl ring-2 ring-violet-500/30 object-cover"
            />
            <p className="text-center text-white/60 text-xs mt-3">
              Francis Niño R. Villanueva — Developer &amp; Designer
            </p>
          </div>
        </div>
      )}

      {/* Speech Modal */}
      {showSpeech && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSpeech(false)}
        >
          <div
            className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl max-w-xl w-full p-8 overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSpeech(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative shrink-0">
                <img
                  src={developerPhoto}
                  alt="Francis Niño R. Villanueva"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-violet-400/40 shadow-lg"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center"
                  style={{ display: 'none' }}
                >
                  <span className="text-lg font-bold text-white">FV</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">Francis Niño R. Villanueva</p>
                <p className="text-violet-400 text-xs mt-0.5">Developer &amp; Designer · Amkor Technology</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent mb-6" />

            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>
                Hello! I'm <span className="text-white font-semibold">Francis Niño</span>, the developer behind the
                RELDMS — the Reliability Data Management System. What you're looking at is something I built entirely from
                the ground up — every line of code, every UI detail, and every workflow decision was crafted with
                one goal in mind: to make the lives of the Reliability Engineering team at Amkor Technology a
                little easier.
              </p>
              <p>
                Before this system existed, tracking reliability requests meant navigating spreadsheets, emails,
                and manual follow-ups. I saw that gap and wanted to fill it with something that actually works —
                something fast, clean, and built specifically for the way this team operates.
              </p>
              <p>
                This system was built with <span className="text-violet-400 font-medium">React</span>,{' '}
                <span className="text-violet-400 font-medium">FastAPI</span>, and{' '}
                <span className="text-violet-400 font-medium">Tailwind CSS</span> — running fully offline, no
                cloud dependency, no complicated setup. Just open it and it works.
              </p>
              <p>
                I hope this tool serves you well. Whether you're an engineer submitting a request, a planner
                managing the queue, or a manager reviewing progress — this was built for you.
              </p>
              <p className="text-slate-400 italic">Thank you for trusting this work. Keep pushing forward.</p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent mt-6 mb-4" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Amkor Technology</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-400">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
                v1.0
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
