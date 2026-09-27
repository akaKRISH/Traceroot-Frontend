import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { AuthError, AuthSession, login, loginWithGoogle, register } from "../lib/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface AuthPageProps {
  onAuthenticated: (session: AuthSession) => void;
}

type Mode = "sign-in" | "create-account";

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.23-.2-1.77H12v3.42h5.37c-.11.85-.72 2.13-2.08 2.99l-.02.11 3.02 2.29.21.02c1.93-1.75 2.85-4.32 2.85-7.06Z" />
    <path fill="#34A853" d="M12 21.63c2.63 0 4.84-.85 6.45-2.33l-3.21-2.42c-.86.59-2.01 1-3.24 1a5.86 5.86 0 0 1-5.54-4.02l-.11.01-3.14 2.38-.04.1A9.74 9.74 0 0 0 12 21.63Z" />
    <path fill="#FBBC05" d="M6.46 13.86A5.72 5.72 0 0 1 6.15 12c0-.65.12-1.29.3-1.86l-.01-.13-3.18-2.42-.1.05A9.4 9.4 0 0 0 2.13 12c0 1.56.38 3.03 1.04 4.36l3.29-2.5Z" />
    <path fill="#EA4335" d="M12 6.15c1.56 0 2.62.66 3.22 1.21l2.35-2.25C16.12 3.79 14.63 2.37 12 2.37a9.74 9.74 0 0 0-8.83 5.27l3.29 2.5A5.86 5.86 0 0 1 12 6.15Z" />
  </svg>
);

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const complete = (session: AuthSession) => {
    localStorage.setItem("traceroot.session", JSON.stringify(session));
    onAuthenticated(session);
  };

  useEffect(() => {
    if (!clientId) return;
    const loadGoogle = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          if (!credential) return setError("Google did not return an identity credential.");
          setPending(true);
          setError(null);
          try {
            complete(await loginWithGoogle(credential));
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
          } finally {
            setPending(false);
          }
        },
      });
      setGoogleReady(true);
    };

    if (window.google) loadGoogle();
    else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = loadGoogle;
      scriptRef.current = script;
      document.head.appendChild(script);
    }
    return () => scriptRef.current?.remove();
  }, [clientId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      complete(
        mode === "sign-in"
          ? await login(email, password)
          : await register(name.trim(), email, password)
      );
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : "Authentication could not be completed.");
    } finally {
      setPending(false);
    }
  };

  const toggleMode = () => {
    setMode((current) => (current === "sign-in" ? "create-account" : "sign-in"));
    setError(null);
  };

  return (
    <main className="grid-bg min-h-full bg-paper p-4 sm:p-8 lg:p-12 flex items-center justify-center">
      <section className="w-full max-w-[960px] border-2 border-ink bg-paper shadow-brut-lg grid md:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b-2 border-ink p-7 sm:p-10 md:border-b-0 md:border-r-2 md:min-h-[620px] flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <span className="mono label text-ink">TRACE_ROOT / ACCESS</span>
            <span className="h-2 w-2 bg-ok border border-ink" title="Authentication service ready" />
          </div>
          <div className="mt-auto mb-auto py-12">
            <p className="label mb-4">OBSERVABILITY, WITHOUT BLIND SPOTS</p>
            <h1 className="t-hero text-ink leading-[0.9]">TRACE<br />ROOT.</h1>
            <p className="mt-7 max-w-sm t-body text-ink/70">
              Connect your production signals to the people who can act on them.
            </p>
          </div>
          <div className="border-t-2 border-ink pt-4 flex gap-3 items-start">
            <ShieldCheck size={18} className="shrink-0" strokeWidth={2.25} />
            <p className="mono label leading-relaxed text-ink/70">
              PROJECT-ISOLATED DATA<br />ENCRYPTED SESSION TOKENS
            </p>
          </div>
        </div>

        <div className="p-7 sm:p-10">
          <p className="label">{mode === "sign-in" ? "ACCOUNT AUTHENTICATION" : "CREATE YOUR ACCOUNT"}</p>
          <h2 className="t-kpi mt-3 text-ink">{mode === "sign-in" ? "Sign in" : "Start monitoring"}</h2>
          <p className="mt-2 t-body text-ink/60">
            {mode === "sign-in" ? "Use your TraceRoot account to continue." : "Create an account to set up your first project."}
          </p>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            {mode === "create-account" && <Field label="FULL NAME" value={name} onChange={setName} autoComplete="name" />}
            <Field label="WORK EMAIL" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <div>
              <label className="label block mb-1.5" htmlFor="password">PASSWORD</label>
              <div className="flex border-2 border-ink bg-paper focus-within:shadow-brut">
                <input id="password" required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 mono t-body text-ink focus:outline-none" />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} className="w-11 border-l-2 border-ink grid place-items-center hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="border-2 border-ink bg-danger/25 px-3 py-2 mono label text-ink">{error}</p>}

            <button disabled={pending} type="submit" className="w-full h-11 border-2 border-ink bg-ink text-paper flex items-center justify-center gap-2 mono t-body font-bold shadow-brut transition-none enabled:hover:translate-x-[2px] enabled:hover:translate-y-[2px] enabled:hover:shadow-none enabled:active:translate-x-[4px] enabled:active:translate-y-[4px] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              {pending ? <LoaderCircle className="animate-spin" size={17} /> : <>{mode === "sign-in" ? "SIGN IN" : "CREATE ACCOUNT"} <ArrowRight size={17} /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-ink" /><span className="mono label">OR</span><span className="h-px flex-1 bg-ink" /></div>
          <button type="button" disabled={!googleReady || pending} onClick={() => window.google?.accounts.id.prompt()} className="w-full h-11 border-2 border-ink bg-paper flex items-center justify-center gap-2 mono t-body font-bold shadow-brut transition-none enabled:hover:bg-white enabled:hover:translate-x-[2px] enabled:hover:translate-y-[2px] enabled:hover:shadow-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            <GoogleMark /> {clientId ? (googleReady ? "CONTINUE WITH GOOGLE" : "LOADING GOOGLE…") : "GOOGLE AUTH NOT CONFIGURED"}
          </button>
          {!clientId && <p className="mt-2 mono label text-ink/55">SET VITE_GOOGLE_CLIENT_ID TO ENABLE GOOGLE SIGN-IN</p>}

          <p className="mt-7 t-body text-ink/70">
            {mode === "sign-in" ? "New to TraceRoot?" : "Already have an account?"}{" "}
            <button type="button" onClick={toggleMode} className="font-bold underline underline-offset-4 hover:text-info focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
};

const Field: React.FC<{ label: string; type?: string; value: string; onChange: (value: string) => void; autoComplete: string }> = ({ label, type = "text", value, onChange, autoComplete }) => (
  <div>
    <label className="label block mb-1.5" htmlFor={label}>{label}</label>
    <input id={label} required type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="w-full border-2 border-ink bg-paper px-3 py-2.5 mono t-body text-ink focus:outline-none focus:shadow-brut" />
  </div>
);
