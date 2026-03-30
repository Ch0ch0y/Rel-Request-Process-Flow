import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Microscope, Eye, EyeOff, FlaskConical, ScanSearch, Layers, ArrowLeft, ShieldCheck, X } from 'lucide-react';
import api from '../api';
import DeveloperCredit from '../components/DeveloperCredit';
import TechnicianSelectModal from '../components/TechnicianSelectModal';

const ROLES = ['Admin', 'REL Engineer', 'Analyst', 'Technician', 'Planner'];

export default function Login() {
  const { login, register, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', username: '', role: 'Analyst' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Technician auth-code gate
  const [showTechCode, setShowTechCode] = useState(false);
  const [techDigits, setTechDigits] = useState(['', '', '', '', '', '']);
  const [techCodeError, setTechCodeError] = useState('');
  const [showEmpSelect, setShowEmpSelect] = useState(false);
  const digitRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleGuestLogin = async (employee) => {
    setLoading(true);
    setError('');
    try {
      await loginAsGuest(employee);
      navigate('/');
    } catch {
      setError('Unable to login as Technician. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTechCodeDigit = (idx, val) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...techDigits];
    next[idx] = cleaned;
    setTechDigits(next);
    setTechCodeError('');
    if (cleaned && idx < 5) digitRefs[idx + 1].current?.focus();
  };

  const handleTechCodeKey = (idx, e) => {
    if (e.key === 'Backspace' && !techDigits[idx] && idx > 0) {
      digitRefs[idx - 1].current?.focus();
    }
    if (e.key === 'Enter') handleTechCodeSubmit();
  };

  const handleTechCodePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill('');
    for (let i = 0; i < 6; i++) next[i] = text[i] || '';
    setTechDigits(next);
    digitRefs[Math.min(text.length, 5)].current?.focus();
  };

  const handleTechCodeSubmit = async () => {
    const code = techDigits.join('');
    if (code.length < 6) { setTechCodeError('Please enter all 6 digits.'); return; }
    try {
      const res = await api.verifyTechCode(code);
      if (!res.valid) {
        setTechCodeError('Invalid code. Please try again.');
        setTechDigits(['', '', '', '', '', '']);
        digitRefs[0].current?.focus();
        return;
      }
    } catch {
      setTechCodeError('Verification failed. Please try again.');
      return;
    }
    setShowTechCode(false);
    setTechDigits(['', '', '', '', '', '']);
    setTechCodeError('');
    setShowEmpSelect(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.email, form.username, form.password, form.role);
      } else {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Unable to connect. Check that the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 bg-gradient-to-br from-slate-900 via-violet-950 to-purple-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-20 w-80 h-80 bg-violet-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl" />
        </div>
        <a href={window.location.protocol + '//' + window.location.hostname + ':' + (Number(window.location.port || 80) - 1)}
          className="flex items-center gap-2 text-sm text-violet-300/70 hover:text-violet-200 transition-colors w-fit z-10">
          <ArrowLeft className="w-4 h-4" /> Back to RELDMS
        </a>
        <div className="z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-violet-600/30 border border-violet-500/30">
              <Microscope className="w-10 h-10 text-violet-300" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white leading-tight font-heading tracking-tight">CADMS</h1>
              <p className="text-violet-300 mt-1">Construction Analysis · Data Management</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
            Manage construction analysis requests and track samples through every analytical step —
            from receipt to final report.
          </p>
          <div className="space-y-3">
            {[
              { icon: FlaskConical, label: 'Sample Receipt & Visual Inspection' },
              { icon: ScanSearch, label: 'X-Ray, SEM & Cross-Section Analysis' },
              { icon: Layers, label: 'EDX / Chemical Analysis & Reporting' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 text-sm text-slate-400">
                <div className="p-1.5 rounded-lg bg-violet-600/20">
                  <item.icon className="w-4 h-4 text-violet-400" />
                </div>
                {item.label}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-700 z-10">Amkor Technology — CADMS</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30">
              <Microscope className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="font-black text-white tracking-tight">CADMS</p>
              <p className="text-xs text-violet-400">Construction Analysis · Data Management</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {isRegister ? 'Create Account' : 'Sign in'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {isRegister ? 'Register your Amkor CADMS account.' : 'Sign in to your Amkor CADMS account.'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                <input required value={form.username} onChange={e => set('username', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500"
                  placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} autoFocus
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500"
                placeholder="you@amkor.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-lg shadow-violet-600/20 mt-2">
              {loading ? (isRegister ? 'Creating…' : 'Signing in…') : (isRegister ? 'Create Account' : 'Sign in')}
            </button>
          </form>

          {!isRegister && (
            <div className="mt-5">
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-slate-700" />
                <span className="mx-3 text-xs text-slate-500 uppercase tracking-wider">or</span>
                <div className="flex-1 border-t border-slate-700" />
              </div>

              {!showTechCode ? (
                <button
                  type="button"
                  onClick={() => { setShowTechCode(true); setTechCodeError(''); setTechDigits(['','','','','','']); }}
                  disabled={loading}
                  className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-white rounded-lg px-4 py-2.5 font-medium transition-all shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Login as Technician
                </button>
              ) : (
                <div className="mt-4 bg-slate-800 border border-amber-400/40 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">Technician Authentication</span>
                    </div>
                    <button type="button" onClick={() => { setShowTechCode(false); setTechCodeError(''); }}
                      className="text-slate-400 hover:text-slate-200 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Enter the 6-digit authentication code to continue.</p>
                  <div className="flex gap-2 justify-center mb-3">
                    {techDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={digitRefs[i]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleTechCodeDigit(i, e.target.value)}
                        onKeyDown={e => handleTechCodeKey(i, e)}
                        onPaste={i === 0 ? handleTechCodePaste : undefined}
                        className={`w-10 h-12 text-center text-lg font-bold rounded-lg border-2 bg-slate-900 text-white outline-none transition-all
                          ${techCodeError ? 'border-red-500 text-red-400' : 'border-slate-600 focus:border-amber-500'}
                          focus:ring-2 ${techCodeError ? 'focus:ring-red-500/20' : 'focus:ring-amber-500/20'}`}
                      />
                    ))}
                  </div>
                  {techCodeError && (
                    <p className="text-xs text-red-400 text-center mb-3">{techCodeError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleTechCodeSubmit}
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-white rounded-lg px-4 py-2.5 font-medium transition-all text-sm disabled:opacity-50"
                  >
                    {loading ? 'Please wait...' : 'Confirm & Login'}
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => { setIsRegister(p => !p); setError(''); }}
              className="text-violet-400 hover:text-violet-300 font-medium">
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>

          <DeveloperCredit />
        </div>
      </div>
    </div>
    <TechnicianSelectModal
      open={showEmpSelect}
      onConfirm={(employee) => { setShowEmpSelect(false); handleGuestLogin(employee); }}
      onCancel={() => { setShowEmpSelect(false); }}
    />
    </>
  );
}
