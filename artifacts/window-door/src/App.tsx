import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut, useClerk } from '@clerk/clerk-react';
import { publishableKeyFromHost } from '@clerk/shared/keys';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import HomePage from '@/pages/home';
import GalleryPage from '@/pages/gallery';
import QuotePage from '@/pages/quote';
import AdminPage from '@/pages/admin';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.png` },
  variables: {
    colorPrimary: '#304b43',
    colorForeground: '#293934',
    colorMutedForeground: '#6e7b74',
    colorDanger: '#a83f35',
    colorBackground: '#faf8f2',
    colorInput: '#fffdf8',
    colorInputForeground: '#293934',
    colorNeutral: '#d9d4c9',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
    cardBox: { width: '440px', maxWidth: '100%', background: '#faf8f2', borderRadius: '20px', overflow: 'hidden' },
    card: { boxShadow: 'none', border: '0', background: 'transparent' },
    footer: { boxShadow: 'none', border: '0', background: 'transparent' },
    headerTitle: { color: '#293934', fontFamily: 'Manrope, sans-serif', fontWeight: '700' },
    headerSubtitle: { color: '#6e7b74' },
    socialButtonsBlockButtonText: { color: '#293934', fontWeight: '600' },
    formFieldLabel: { color: '#293934', fontWeight: '600' },
    footerActionLink: { color: '#304b43', fontWeight: '700' },
    footerActionText: { color: '#6e7b74' },
    dividerText: { color: '#6e7b74' },
    identityPreviewEditButton: { color: '#304b43' },
    formFieldSuccessText: { color: '#304b43' },
    alertText: { color: '#293934' },
    logoBox: { marginBottom: '12px' },
    logoImage: { objectFit: 'contain' },
    socialButtonsBlockButton: { borderRadius: '10px', borderColor: '#d9d4c9', background: '#fffdf8' },
    formButtonPrimary: { borderRadius: '999px', background: '#304b43', color: '#faf8f2' },
    formFieldInput: { borderRadius: '10px', background: '#fffdf8', color: '#293934', borderColor: '#d9d4c9' },
    footerAction: { color: '#6e7b74' },
    dividerLine: { background: '#d9d4c9' },
    alert: { borderRadius: '10px' },
    otpCodeFieldInput: { borderRadius: '10px', color: '#293934' },
    formFieldRow: { marginBottom: '16px' },
    main: { gap: '16px' },
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  const userRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (userRef.current !== undefined && userRef.current !== id) cache.clear();
      userRef.current = id;
    });
    return unsubscribe;
  }, [addListener, cache]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function HomeRedirect() {
  return <><SignedIn><Redirect to="/admin" /></SignedIn><SignedOut><HomePage /></SignedOut></>;
}

function SignInPage() {
  return <main className="grain min-h-[100dvh] bg-[hsl(var(--background))] px-4 py-10 flex items-center justify-center"><div className="w-full max-w-md"><p className="eyebrow text-center text-[hsl(var(--muted-foreground))] mb-6">LopezXconstruction · Home, made better</p><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div></main>;
}

function SignUpPage() {
  return <main className="grain min-h-[100dvh] bg-[hsl(var(--background))] px-4 py-10 flex items-center justify-center"><div className="w-full max-w-md"><p className="eyebrow text-center text-[hsl(var(--muted-foreground))] mb-6">LopezXconstruction · Home, made better</p><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div></main>;
}

function ClerkRoutedApp() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to manage your projects and estimates.' } },
      signUp: { start: { title: 'Create your account', subtitle: 'A better home starts with a clear conversation.' } },
    }}
    routerPush={(to: string) => setLocation(stripBase(to))}
    routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <TooltipProvider>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/quote" component={QuotePage} />
            <Route path="/gallery" component={GalleryPage} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  const devClerkBypass = import.meta.env.DEV && !clerkPubKey;
  if (!clerkPubKey && !devClerkBypass) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <div className="grain min-h-[100dvh]"><WouterRouter base={basePath}><ClerkRoutedApp /></WouterRouter></div>;
}

export default App;
