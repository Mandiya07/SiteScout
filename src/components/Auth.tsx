import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  db,
  doc,
  setDoc,
  serverTimestamp
} from '../lib/firebase';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, RefreshCw, ExternalLink, ShieldAlert, Sparkles, ShieldCheck, Ticket } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import Logo from './Logo';

export default function Auth() {
  const { loginAsPreviewAdmin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [invitationCode, setInvitationCode] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('code') || params.get('invite') || '';
      }
    } catch (e) {}
    return '';
  });
  const [acceptBetaTerms, setAcceptBetaTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setIsInIframe(true);
      }
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      setIsPopupBlocked(false);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Ensure user document exists
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        email: result.user.email,
        displayName: result.user.displayName,
        role: 'user', // Default role
        updatedAt: serverTimestamp()
      }, { merge: true });
      
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('');
        setMessage('Sign-in cancelled. You can try again when you are ready.');
      } else if (err.code === 'auth/popup-blocked' || (err.message && err.message.toLowerCase().includes('popup-blocked'))) {
        setIsPopupBlocked(true);
        setError('Pop-up blocked! Your web browser blocked the Google authentication pop-up window.');
        setMessage('');
      } else {
        setError(err.message || 'An error occurred during sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (invitationCode.trim()) {
          try {
            const valRes = await fetch(`/api/beta/invitations/validate/${encodeURIComponent(invitationCode.trim())}`);
            if (!valRes.ok) {
              const valData = await valRes.json();
              throw new Error(valData.error || "Invalid beta invitation code.");
            }
          } catch (valErr: any) {
            throw new Error(valErr.message || "Invalid beta invitation code.");
          }
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await sendEmailVerification(result.user);
        
        // Create user document
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          displayName: name,
          role: 'user',
          createdAt: serverTimestamp()
        });

        // Link beta invitation if provided
        if (invitationCode.trim()) {
          try {
            await fetch("/api/beta/invitations/accept", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-id": result.user.uid },
              body: JSON.stringify({
                invitationCodeOrToken: invitationCode.trim(),
                userId: result.user.uid,
                acceptTerms: acceptBetaTerms
              })
            });
          } catch (invErr) {
            console.warn("Beta invitation linking note:", invErr);
          }
        }
        
        setMessage('Account created! Please check your email to verify your account.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
        <div className="text-center flex flex-col items-center">
          <div className="mb-4">
            <Logo variant="full" size="md" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isLogin ? 'Sign in to your account to continue' : 'Get started with SiteScout AI'}
          </p>
        </div>

        {/* Dedicated Embedded Frame Pop-Up Restriction Card */}
        {(isPopupBlocked || isInIframe) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {isPopupBlocked ? "Pop-up Window Blocked by Browser" : "Embedded Preview Frame Detected"}
                </h4>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                  {isPopupBlocked 
                    ? "Your browser prevented the Google Sign-In pop-up from opening inside this embedded preview iframe. You can sign in immediately with one click below or open the app in a new tab."
                    : "Browsers restrict pop-up windows inside embedded preview frames. You can sign in directly below with one click or open the application in a new tab."}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              <button
                type="button"
                onClick={() => loginAsPreviewAdmin()}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Sign in as Sipho M.</span>
              </button>

              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs border border-amber-300 dark:border-slate-700 shadow-xs transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Open in New Tab</span>
              </a>
            </div>

            <p className="text-[10px] text-amber-700 dark:text-amber-400/80">
              Tip: In a dedicated browser tab, Google authentication pop-ups work normally without iframe restrictions.
            </p>
          </div>
        )}

        {error && !isPopupBlocked && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30 border border-red-200 dark:border-red-800/30">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3 text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        )}

        {message && (
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/30 border border-green-200 dark:border-green-800/30">
            <div className="flex">
              <div className="text-sm text-green-700 dark:text-green-300">{message}</div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {!isLogin && (
              <div>
                <label className="sr-only" htmlFor="name">Full Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserPlus className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="block w-full rounded-md border-0 py-2.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="sr-only" htmlFor="email-address">Email address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border-0 py-2.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  className="block w-full rounded-md border-0 py-2.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="sr-only" htmlFor="invitationCode">Beta Invitation Code</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Ticket className="h-5 w-5 text-indigo-400" />
                  </div>
                  <input
                    id="invitationCode"
                    name="invitationCode"
                    type="text"
                    className="block w-full rounded-md border-0 py-2.5 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700 font-mono uppercase"
                    placeholder="Beta Invitation Code (e.g. BETA-AGY-1001)"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">
                  Controlled Beta Access: A valid invite code links your agency or business tester privileges.
                </p>
              </div>
            )}
          </div>

          {!isLogin && (
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                required
                checked={acceptBetaTerms}
                onChange={(e) => setAcceptBetaTerms(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <span>
                I agree to the <strong>Beta Tester Agreement</strong> and evaluate pre-release software under test parameters.
              </span>
            </label>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Optional remember me */}
            </div>

            {isLogin && (
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    {isLogin ? (
                      <LogIn className="h-5 w-5 text-blue-500 group-hover:text-blue-400" aria-hidden="true" />
                    ) : (
                      <UserPlus className="h-5 w-5 text-blue-500 group-hover:text-blue-400" aria-hidden="true" />
                    )}
                  </span>
                  {isLogin ? 'Sign in' : 'Sign up'}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-transparent dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              <span className="text-sm font-semibold leading-6">Google</span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <button
              type="button"
              onClick={() => loginAsPreviewAdmin()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 dark:border-amber-900/50 transition-colors cursor-pointer w-full justify-center"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>One-Click Sign In as Sipho M. (Super Admin)</span>
            </button>
            <p className="text-[10px] text-slate-400">
              Instant access for review and testing without pop-up permissions
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold leading-6 text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
