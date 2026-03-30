import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, X, KeyRound, RefreshCw, Sun, Moon } from 'lucide-react';
import AmkorLogo from '../assets/amkor-logo.svg';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import DeveloperCredit from '../components/ca/DeveloperCredit';
import TechnicianSelectModal from '../components/TechnicianSelectModal';

const ROLES = ['Admin', 'Reliability Engineer', 'Failure Analysis', 'Technician', 'Planner'];

const OPS = [
  { sym: '+', fn: (a, b) => a + b },
  { sym: '−', fn: (a, b) => a - b },
  { sym: '×', fn: (a, b) => a * b },
];

function generateMath() {
  const op = OPS[Math.floor(Math.random() * OPS.length)];
  let a, b;
  if (op.sym === '×') {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
  } else if (op.sym === '−') {
    a = Math.floor(Math.random() * 41) + 10;
    b = Math.floor(Math.random() * a);
  } else {
    a = Math.floor(Math.random() * 50) + 1;
    b = Math.floor(Math.random() * 50) + 1;
  }
  return { question: `What is ${a} ${op.sym} ${b}?`, answer: op.fn(a, b) };
}

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');

  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotDone, setForgotDone] = useState(false);
  const [mathChallenge, setMathChallenge] = useState(() => generateMath());
  const [mathAnswer, setMathAnswer] = useState('');
  const [forgotNewPw, setForgotNewPw] = useState('');
  const [forgotNewPwConfirm, setForgotNewPwConfirm] = useState('');
  const [showForgotNewPw, setShowForgotNewPw] = useState(false);

  const refreshMath = useCallback(() => {
    setMathChallenge(generateMath());
    setMathAnswer('');
  }, []);

  // Technician auth-code gate
  const [showTechCode, setShowTechCode]   = useState(false);
  const [techDigits, setTechDigits]       = useState(['', '', '', '', '', '']);
  const [techCodeError, setTechCodeError] = useState('');
  const [showEmpSelect, setShowEmpSelect] = useState(false);
  const digitRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const { login, register, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [userCount, setUserCount] = useState(null);
  const [appMode, setAppMode] = useState('REL'); // 'REL' | 'CA'

  // Fetch public user count (no auth needed)
  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.approved_users != null) setUserCount(d.approved_users); })
      .catch(() => {});
  }, []);

  const handleGuestLogin = async (employee) => {
    setLoading(true);
    setError('');
    try {
      await loginAsGuest(employee);
      navigate('/');
    } catch (err) {
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
    const next = [...techDigits];
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
        setTechDigits(['','','','','','']);
        digitRefs[0].current?.focus();
        return;
      }
    } catch {
      setTechCodeError('Verification failed. Please try again.');
      return;
    }
    setShowTechCode(false);
    setTechDigits(['','','','','','']);
    setTechCodeError('');
    setShowEmpSelect(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (parseInt(mathAnswer, 10) !== mathChallenge.answer) {
      setForgotError('Incorrect answer to the math question. Please try again.');
      refreshMath();
      return;
    }
    if (forgotNewPw !== forgotNewPwConfirm) {
      setForgotError('Passwords do not match.');
      return;
    }
    if (forgotNewPw.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await api.forgotPassword(forgotEmail, forgotNewPw);
      setForgotDone(true);
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password.');
      refreshMath();
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setShowForgotPw(false);
    setForgotDone(false);
    setForgotEmail('');
    setMathChallenge(generateMath());
    setMathAnswer('');
    setForgotNewPw('');
    setForgotNewPwConfirm('');
    setForgotError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ email, username, password, role });
        setSuccess('Account created! Please wait for admin approval before logging in.');
        setIsRegister(false);
        setPassword('');
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen flex login-enter">
      {/* Left - Visual */}
      <div className={`hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden transition-all duration-500 ${appMode === 'CA' ? 'bg-gradient-to-br from-slate-900 via-violet-950 to-purple-950' : 'bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950'}`}>
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className={`absolute top-16 left-16 w-72 h-72 border rounded-full ${appMode === 'CA' ? 'border-violet-400' : 'border-blue-400'}`} />
          <div className={`absolute bottom-24 right-12 w-52 h-52 border rounded-full ${appMode === 'CA' ? 'border-purple-400' : 'border-cyan-400'}`} />
          <div className={`absolute top-36 right-28 w-36 h-36 border rounded-lg rotate-45 ${appMode === 'CA' ? 'border-violet-300' : 'border-blue-300'}`} />
          <div className={`absolute bottom-16 left-36 w-28 h-28 border-2 rounded-lg rotate-12 ${appMode === 'CA' ? 'border-violet-500' : 'border-blue-500'}`} />
          <div className={`absolute top-56 left-56 w-18 h-18 rounded-full ${appMode === 'CA' ? 'bg-violet-600/40' : 'bg-blue-600/40'}`} />
          <div className={`absolute bottom-56 right-36 w-24 h-24 rounded-lg rotate-45 ${appMode === 'CA' ? 'bg-purple-500/20' : 'bg-cyan-500/20'}`} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
        <div className="relative text-center px-12 max-w-md">
          <img src={AmkorLogo} alt="Amkor Technology" className="h-14 mx-auto mb-8 brightness-0 invert opacity-90" />
          <div className={`w-16 h-0.5 mx-auto mb-6 rounded-full ${appMode === 'CA' ? 'bg-violet-500' : 'bg-blue-500'}`} />
          <p className={`text-xs font-medium uppercase tracking-[0.25em] mb-3 ${appMode === 'CA' ? 'text-violet-400' : 'text-blue-400'}`}>
            {appMode === 'CA' ? 'Construction Analysis' : 'Reliability Data Management'}
          </p>
          <h1 className="font-heading text-6xl font-black text-white mb-3 tracking-tight leading-none">
            {appMode === 'CA' ? 'CADMS' : 'RELDMS'}
          </h1>
          <h2 className={`font-heading text-sm font-medium mb-6 tracking-[0.2em] uppercase ${appMode === 'CA' ? 'text-violet-300/70' : 'text-blue-300/70'}`}>
            {appMode === 'CA' ? 'Data Management System' : 'Data Management System'}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            {appMode === 'CA'
              ? 'Manage construction analysis requests and track sample findings through structured evaluation steps.'
              : 'Track reliability testing requests through customizable process steps with precision and efficiency.'}
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['RE', 'FA', 'PL', 'TK'].map((initials, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                  {initials}
                </div>
              ))}
            </div>
            <span className="text-sm text-slate-400">
              {userCount != null
                ? `${userCount} Engineer${userCount !== 1 ? 's' : ''} Registered`
                : '+2.4k Engineers Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-900 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="w-full max-w-md stagger-children">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src={AmkorLogo} alt="Amkor Technology" className="h-10 brightness-0 dark:invert" />
          </div>

          {/* App Mode Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1">
              <button
                type="button"
                onClick={() => setAppMode('REL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                  appMode === 'REL'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                RELDMS
              </button>
              <button
                type="button"
                onClick={() => {
                  const caUrl = window.location.protocol + '//' + window.location.hostname + ':' + (Number(window.location.port || 80) + 1);
                  window.open(caUrl, '_blank');
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
              >
                CADMS ↗
              </button>
              <button
                type="button"
                onClick={() => window.open('https://synapse-it.amkor.com/fadms/index.php/auth/login', '_blank')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                FADMS ↗
              </button>
            </div>
          </div>

          <h2 className="font-heading text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
            {isRegister
              ? 'Fill in the details to create your account.'
              : appMode === 'CA'
                ? 'Sign in to your Amkor CADMS account.'
                : 'Sign in to your Amkor RELDMS account.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/40 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                placeholder="you@amkor.com"
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => { setShowForgotPw(!showForgotPw); setForgotError(''); setForgotEmail(''); refreshMath(); }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 pr-10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2.5
                font-medium transition-all shadow-sm hover:shadow-blue-500/25 hover:shadow-lg disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : <><span>Sign In</span><span aria-hidden>→</span></>)}
            </button>
          </form>

          {!isRegister && showForgotPw && (
            <div className="mt-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-400" /> Reset Password
                </span>
                <button type="button" onClick={resetForgotFlow} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!forgotDone ? (
                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                      placeholder="your-email@amkor.com"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Verify you're human</p>
                      <button type="button" onClick={refreshMath} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" title="New question">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{mathChallenge.question}</p>
                    <input
                      type="number"
                      required
                      value={mathAnswer}
                      onChange={e => setMathAnswer(e.target.value)}
                      placeholder="Your answer"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showForgotNewPw ? 'text' : 'password'}
                      required
                      value={forgotNewPw}
                      onChange={e => setForgotNewPw(e.target.value)}
                      placeholder="New password (min. 6 characters)"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 pr-9 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                    <button type="button" onClick={() => setShowForgotNewPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                      {showForgotNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    type={showForgotNewPw ? 'text' : 'password'}
                    required
                    value={forgotNewPwConfirm}
                    onChange={e => setForgotNewPwConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />

                  {forgotError && <p className="text-xs text-red-500 dark:text-red-400">{forgotError}</p>}

                  <button type="submit" disabled={forgotLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50">
                    {forgotLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Password Reset!</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">You can now log in with your new password.</p>
                  <button type="button" onClick={resetForgotFlow}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-medium">
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          )}

          {!isRegister && (
            <div className="mt-5">
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                <span className="mx-3 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">or</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              </div>

              {!showTechCode ? (
                <button
                  type="button"
                  onClick={() => { setShowTechCode(true); setTechCodeError(''); setTechDigits(['','','','','','']); }}
                  disabled={loading}
                  className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-white rounded-lg px-4 py-2.5
                    font-medium transition-all shadow-sm hover:shadow-amber-500/20 hover:shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Login as Technician
                </button>
              ) : (
                <div className="mt-4 bg-slate-50 dark:bg-slate-800 border border-amber-400/40 dark:border-amber-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Technician Authentication</span>
                    </div>
                    <button type="button" onClick={() => { setShowTechCode(false); setTechCodeError(''); }}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Enter the 6-digit authentication code to continue.</p>
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
                        className={`w-10 h-12 text-center text-lg font-bold rounded-lg border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all
                          ${techCodeError ? 'border-red-500 text-red-400' : 'border-slate-300 dark:border-slate-600 focus:border-amber-500'}
                          focus:ring-2 ${techCodeError ? 'focus:ring-red-500/20' : 'focus:ring-amber-500/20'}`}
                      />
                    ))}
                  </div>
                  {techCodeError && (
                    <p className="text-xs text-red-500 dark:text-red-400 text-center mb-3">{techCodeError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleTechCodeSubmit}
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-white rounded-lg px-4 py-2.5
                      font-medium transition-all text-sm disabled:opacity-50"
                  >
                    {loading ? 'Please wait...' : 'Confirm & Login'}
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
              className="ml-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-600">
            <span>Need assistance? Contact System Admin</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-700">
            <a href="#" className="hover:text-slate-600 dark:hover:text-slate-500 transition-colors">Security Policy</a>
            <span>·</span>
            <a href="#" className="hover:text-slate-600 dark:hover:text-slate-500 transition-colors">Internal Wiki</a>
            <span>·</span>
            <span>v4.2.0-stable</span>
          </div>
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
