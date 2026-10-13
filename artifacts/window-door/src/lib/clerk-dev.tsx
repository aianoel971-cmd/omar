import { createContext, useContext, type ReactNode } from 'react';

type DevUser = { id: string } | null;

function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = window.location.pathname;
  return path === `${base}/admin` || path.startsWith(`${base}/admin`);
}

const DevClerkContext = createContext<{ signedIn: boolean }>({ signedIn: false });

export function ClerkProvider({ children }: { children: ReactNode }) {
  return (
    <DevClerkContext.Provider value={{ signedIn: isAdminRoute() }}>
      {children}
    </DevClerkContext.Provider>
  );
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { signedIn } = useContext(DevClerkContext);
  return signedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { signedIn } = useContext(DevClerkContext);
  return signedIn ? null : <>{children}</>;
}

export function useAuth() {
  const { signedIn } = useContext(DevClerkContext);
  return {
    isLoaded: true,
    isSignedIn: signedIn,
    userId: signedIn ? 'dev-admin' : null,
  };
}

export function useClerk() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return {
    addListener: (listener: (event: { user: DevUser }) => void) => {
      listener({ user: isAdminRoute() ? { id: 'dev-admin' } : null });
      return () => {};
    },
    signOut: () => {
      window.location.assign(`${base}/`);
    },
  };
}

export function SignIn() {
  return <DevPrompt title="Sign in to continue" />;
}

export function SignUp() {
  return <DevPrompt title="Create your account" />;
}

function DevPrompt({ title }: { title: string }) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <main className="grain min-h-[100dvh] bg-[hsl(var(--background))] px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-sm">
        <p className="eyebrow text-[hsl(var(--primary))]">Local development mode</p>
        <h1 className="serif mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Clerk authentication is bypassed in local development. Open the admin
          dashboard to continue as the demo team.
        </p>
        <a href={`${base}/admin`} className="btn-primary mt-6 w-full">
          Open admin dashboard
        </a>
      </div>
    </main>
  );
}