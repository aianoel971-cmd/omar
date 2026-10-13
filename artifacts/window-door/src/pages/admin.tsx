import { useEffect, useState, type ReactNode } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBusinessSettingsQueryKey, getGetDashboardSummaryQueryKey, getListProductsQueryKey, getListQuotesQueryKey,
  useGetBusinessSettings, useGetDashboardSummary, useListProducts, useListQuotes, useUpdateBusinessSettings, useUpdateProduct, useUpdateQuote,
} from '@workspace/api-client-react';
import type { BusinessSettings, Product, Quote } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronRight, DoorOpen, Frame, LayoutDashboard, LogOut, PackageOpen, Settings2, ShieldCheck, SlidersHorizontal, UsersRound } from 'lucide-react';

type AdminTab = 'overview' | 'quotes' | 'catalog' | 'settings';
type ProductValues = { name: string; description: string; startingPrice: number; active: boolean; featured: boolean; badge: string };
type SettingsValues = BusinessSettings;
const statusChoices: Quote['status'][] = ['new', 'contacted', 'scheduled', 'won', 'lost'];
const statusLabels: Record<Quote['status'], string> = { new: 'New', contacted: 'Contacted', scheduled: 'Scheduled', won: 'Won', lost: 'Lost' };
const timeframeLabels: Record<string, string> = { asap: 'As soon as possible', oneToThreeMonths: '1–3 months', threeToSixMonths: '3–6 months', planning: 'Planning' };

function money(value: number, currency = 'USD') {
  try { return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `${currency} ${Math.round(value).toLocaleString()}`; }
}

function PageSkeleton() {
  return <div className="space-y-5"><div className="h-10 w-48 animate-pulse rounded-lg bg-[hsl(var(--muted))]"/><div className="grid gap-4 md:grid-cols-3"><div className="h-28 animate-pulse rounded-2xl bg-[hsl(var(--muted))]"/><div className="h-28 animate-pulse rounded-2xl bg-[hsl(var(--muted))]"/><div className="h-28 animate-pulse rounded-2xl bg-[hsl(var(--muted))]"/></div><div className="h-72 animate-pulse rounded-2xl bg-[hsl(var(--muted))]"/></div>;
}

function Stat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</span><span className="text-[hsl(var(--primary))]">{icon}</span></div><div className="serif mt-4 text-3xl font-bold tabular-nums">{value}</div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p>
  </article>;
}

function QuoteRow({ quote, currency }: { quote: Quote; currency: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const update = useUpdateQuote();
  const cache = useQueryClient();
  const form = useForm<{ adminNote: string }>({ defaultValues: { adminNote: quote.adminNote || '' } });
  const saveNote = form.handleSubmit(async (values) => {
    setError('');
    try {
      await update.mutateAsync({ quoteId: quote.id, data: { adminNote: values.adminNote.trim() || null } });
      await cache.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      await cache.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch { setError('The note could not be saved. Please try again.'); }
  });
  const updateStatus = async (status: Quote['status']) => {
    setError('');
    try {
      await update.mutateAsync({ quoteId: quote.id, data: { status } });
      await cache.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      await cache.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    } catch { setError('The quote status could not be updated. Please try again.'); }
  };
  return <article className="border-b border-[hsl(var(--border))] py-5 last:border-0" data-testid={`card-quote-${quote.id}`}>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="serif text-lg font-bold" data-testid={`text-quote-name-${quote.id}`}>{quote.name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${quote.status === 'new' ? 'bg-[#f3e5d5] text-[#80552e]' : quote.status === 'won' ? 'bg-[#dbe8dc] text-[#365843]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`status-quote-${quote.id}`}>{statusLabels[quote.status]}</span></div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]"><a href={`mailto:${quote.email}`} className="hover:underline">{quote.email}</a><a href={`tel:${quote.phone}`} className="hover:underline">{quote.phone}</a><span>{quote.postalCode}</span></div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs"><span><strong>Project:</strong> {quote.projectType === 'both' ? 'Windows & doors' : quote.projectType === 'window' ? 'Windows' : 'Entry door'}</span><span><strong>Units:</strong> {quote.quantity}</span><span><strong>Timing:</strong> {timeframeLabels[quote.timeframe] || quote.timeframe}</span><span><strong>Estimate:</strong> {money(quote.estimateLow, currency)}–{money(quote.estimateHigh, currency)}</span><span><strong>Installation:</strong> {quote.includeInstallation ? 'Included' : 'Not included'}</span><span><strong>Removal:</strong> {quote.includeRemoval ? 'Included' : 'Not included'}</span></div>
        {quote.notes && <p className="mt-3 rounded-lg bg-[hsl(var(--muted))] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Customer note · </strong>{quote.notes}</p>}
        {error && <p role="alert" className="mt-3 text-xs text-[hsl(var(--destructive))]" data-testid={`status-quote-error-${quote.id}`}>{error}</p>}
        <FormProvider {...form}><form onSubmit={saveNote} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Controller name="adminNote" control={form.control} render={({ field }) => <input {...field} maxLength={2000} aria-label={`Internal note for ${quote.name}`} placeholder="Add an internal note…" className="field min-w-0 py-2 text-xs" data-testid={`input-admin-note-${quote.id}`}/>} />
          <button type="submit" disabled={update.isPending} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs" data-testid={`button-save-note-${quote.id}`}>{update.isPending ? 'Saving…' : saved ? <><Check size={14}/> Saved</> : 'Save note'}</button>
        </form></FormProvider>
      </div>
      <div><label htmlFor={`status-${quote.id}`} className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Move through pipeline</label><select id={`status-${quote.id}`} value={quote.status} disabled={update.isPending} onChange={(e) => updateStatus(e.target.value as Quote['status'])} className="field py-2 text-xs" data-testid={`select-quote-status-${quote.id}`}>{statusChoices.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Received {new Date(quote.createdAt).toLocaleDateString()}</p></div>
    </div>
  </article>;
}

function ProductEditor({ product }: { product: Product }) {
  const updateProduct = useUpdateProduct();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const form = useForm<ProductValues>({ defaultValues: { name: product.name, description: product.description, startingPrice: product.startingPrice, active: product.active, featured: product.featured, badge: product.badge || '' } });
  const save = form.handleSubmit(async (values) => {
    setError('');
    try {
      await updateProduct.mutateAsync({ productId: product.id, data: { name: values.name.trim(), description: values.description.trim(), startingPrice: Number(values.startingPrice), active: values.active, featured: values.featured, badge: values.badge.trim() || null } });
      await client.invalidateQueries({ queryKey: getListProductsQueryKey() });
      await client.invalidateQueries({ queryKey: getListProductsQueryKey({ includeInactive: true }) });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch { setError('This product could not be saved. Please try again.'); }
  });
  return <FormProvider {...form}><form onSubmit={save} className="grid gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:grid-cols-[70px_minmax(0,1fr)_210px] md:p-6" data-testid={`form-product-${product.id}`}>
    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#e6e9df] text-[hsl(var(--primary))]">{product.category === 'window' ? <Frame size={26}/> : <DoorOpen size={26}/>}</div>
    <div className="min-w-0 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Product name</label><Controller name="name" control={form.control} rules={{ required: true }} render={({ field }) => <input {...field} className="field py-2 text-sm" data-testid={`input-product-name-${product.id}`}/>} /></div><div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Short badge</label><Controller name="badge" control={form.control} render={({ field }) => <input {...field} className="field py-2 text-sm" placeholder="Optional" data-testid={`input-product-badge-${product.id}`}/>} /></div></div>
      <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Description</label><Controller name="description" control={form.control} render={({ field }) => <textarea {...field} rows={2} className="field resize-y py-2 text-sm" data-testid={`input-product-description-${product.id}`}/>} /></div>
      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{product.category} · /{product.slug} · {product.features.join(' · ')}</p>
    </div>
    <div className="space-y-4">
      <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Starting price</label><div className="flex items-center gap-2"><span className="text-sm text-[hsl(var(--muted-foreground))]">$</span><Controller name="startingPrice" control={form.control} rules={{ required: true, min: 1 }} render={({ field }) => <input {...field} type="number" min={1} step="1" className="field py-2 text-sm" data-testid={`input-product-price-${product.id}`}/>} /></div></div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs"><Controller name="active" control={form.control} render={({ field }) => <label className="flex items-center gap-2"><input type="checkbox" checked={field.value} onChange={field.onChange} className="accent-[hsl(var(--primary))]" data-testid={`checkbox-product-active-${product.id}`}/> Active</label>}/><Controller name="featured" control={form.control} render={({ field }) => <label className="flex items-center gap-2"><input type="checkbox" checked={field.value} onChange={field.onChange} className="accent-[hsl(var(--primary))]" data-testid={`checkbox-product-featured-${product.id}`}/> Featured</label>}/></div>
      {error && <p role="alert" className="text-xs text-[hsl(var(--destructive))]" data-testid={`status-product-error-${product.id}`}>{error}</p>}
      <button type="submit" disabled={updateProduct.isPending} className="btn-primary w-full !rounded-lg !py-2.5 text-xs" data-testid={`button-save-product-${product.id}`}>{updateProduct.isPending ? 'Saving…' : saved ? <><Check size={14}/> Saved</> : 'Save product'}</button>
    </div>
  </form></FormProvider>;
}

function SettingsEditor({ initial }: { initial: BusinessSettings }) {
  const mutation = useUpdateBusinessSettings();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const form = useForm<SettingsValues>({ defaultValues: initial });
  const reset = form.reset;
  const isDirty = form.formState.isDirty;
  useEffect(() => { if (!isDirty) reset(initial); }, [initial, isDirty, reset]);
  const save = form.handleSubmit(async (values) => {
    setError('');
    try {
      const updated = await mutation.mutateAsync({ data: { ...values, installationPerUnit: Number(values.installationPerUnit), removalPerUnit: Number(values.removalPerUnit), estimateBufferPercent: Number(values.estimateBufferPercent) } });
      form.reset(updated);
      await client.invalidateQueries({ queryKey: getGetBusinessSettingsQueryKey() });
      await client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch { setError('Your settings could not be saved. Please try again.'); }
  });
  const fields: { name: keyof SettingsValues; label: string; type?: string }[] = [
    { name: 'businessName', label: 'Business name' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', type: 'email' },
    { name: 'serviceArea', label: 'Service area' }, { name: 'currency', label: 'Currency code' },
    { name: 'installationPerUnit', label: 'Installation per unit', type: 'number' }, { name: 'removalPerUnit', label: 'Removal per unit', type: 'number' },
    { name: 'estimateBufferPercent', label: 'Estimate buffer (%)', type: 'number' },
  ];
  return <FormProvider {...form}><form onSubmit={save} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-8" data-testid="form-business-settings">
    <div className="mb-7"><p className="eyebrow text-[hsl(var(--primary))]">Business details</p><h2 className="serif mt-2 text-2xl font-bold">How customers reach you</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">These details shape the estimate experience and public contact information.</p></div>
    <div className="grid gap-5 sm:grid-cols-2">{fields.map((item) => <div key={item.name}><label htmlFor={`setting-${item.name}`} className="mb-2 block text-sm font-bold">{item.label}</label><Controller name={item.name} control={form.control} render={({ field }) => <input {...field} id={`setting-${item.name}`} type={item.type || 'text'} min={item.type === 'number' ? 0 : undefined} step="1" className="field" value={field.value ?? ''} onChange={(event) => field.onChange(item.type === 'number' ? Number(event.target.value) : event.target.value)} data-testid={`input-setting-${item.name}`}/>} /></div>)}</div>
    {error && <p role="alert" className="mt-5 text-sm text-[hsl(var(--destructive))]" data-testid="status-settings-error">{error}</p>}
    <div className="mt-7 flex flex-col gap-4 border-t border-[hsl(var(--border))] pt-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><SlidersHorizontal size={17} className="shrink-0 text-[hsl(var(--primary))]"/> Estimate settings affect the preliminary ranges shown to customers.</div><button type="submit" disabled={mutation.isPending || !form.formState.isDirty} className="btn-primary" data-testid="button-save-settings">{mutation.isPending ? 'Saving…' : saved ? <><Check size={15}/> Settings saved</> : 'Save business settings'}</button></div>
  </form></FormProvider>;
}

export default function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [status, setStatus] = useState<'' | Quote['status']>('');
  const [search, setSearch] = useState('');
  const params = { ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const queryKey = getListQuotesQueryKey(params);
  const summary = useGetDashboardSummary({ query: { enabled: isLoaded && Boolean(isSignedIn), queryKey: getGetDashboardSummaryQueryKey() } });
  const quotes = useListQuotes(params, { query: { enabled: isLoaded && Boolean(isSignedIn), queryKey } });
  const products = useListProducts({ includeInactive: true }, { query: { enabled: isLoaded && Boolean(isSignedIn), queryKey: getListProductsQueryKey({ includeInactive: true }) } });
  const settings = useGetBusinessSettings({ query: { enabled: isLoaded && Boolean(isSignedIn), queryKey: getGetBusinessSettingsQueryKey() } });

  if (!isLoaded) return <div className="min-h-[100dvh] bg-[hsl(var(--background))] p-8"><div className="mx-auto max-w-7xl"><PageSkeleton/></div></div>;
  if (!isSignedIn) return <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5 py-10">
    <section className="w-full max-w-md rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5e9df] text-[hsl(var(--primary))]"><ShieldCheck size={26}/></div>
      <p className="eyebrow mt-6 text-[hsl(var(--primary))]">Team operations</p><h1 className="serif mt-2 text-3xl font-bold">Sign in to continue.</h1><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The Alder & Field dashboard is reserved for our team. Customer estimates are always available without an account.</p>
      <Link href="/sign-in" className="btn-primary mt-6 w-full" data-testid="link-admin-signin">Team sign in <ArrowRight size={16}/></Link><Link href="/" className="mt-5 inline-flex text-xs font-semibold text-[hsl(var(--muted-foreground))]" data-testid="link-admin-home">Return to public home</Link>
    </section>
  </main>;

  const tabs: { id: AdminTab; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17}/> }, { id: 'quotes', label: 'Quote pipeline', icon: <UsersRound size={17}/> },
    { id: 'catalog', label: 'Product catalog', icon: <PackageOpen size={17}/> }, { id: 'settings', label: 'Business settings', icon: <Settings2 size={17}/> },
  ];
  return <div className="min-h-[100dvh] bg-[#f4f2eb] text-[hsl(var(--foreground))] md:grid md:grid-cols-[250px_minmax(0,1fr)]">
    <aside className="bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] md:sticky md:top-0 md:flex md:h-[100dvh] md:flex-col">
      <div className="flex items-center justify-between px-5 py-5 md:block md:px-6 md:py-7">
        <Link href="/" className="flex items-center gap-3" data-testid="link-admin-brand"><img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-9 w-9"/><div><div className="serif font-extrabold">Alder & Field</div><div className="eyebrow text-[.54rem] text-white/50">Operations</div></div></Link>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10 md:mt-8" onClick={() => signOut({ redirectUrl: baseUrl() })} data-testid="button-sign-out"><LogOut size={14}/> Sign out</button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:py-4" aria-label="Dashboard sections">{tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`admin-nav flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold md:w-full ${tab === item.id ? 'bg-[hsl(var(--sidebar-accent))] text-white' : 'text-white/65'}`} aria-current={tab === item.id ? 'page' : undefined} data-testid={`button-tab-${item.id}`}>{item.icon}<span>{item.label}</span>{tab === item.id && <ChevronRight size={14} className="ml-auto hidden md:block"/>}</button>)}</nav>
      <div className="mt-auto hidden border-t border-white/15 px-6 py-5 md:block"><p className="text-xs font-semibold">Local projects, kept personal.</p><p className="mt-2 text-[10px] leading-4 text-white/50">Customer details stay within your team workspace.</p></div>
    </aside>
    <main className="min-w-0 px-4 py-6 md:px-8 md:py-9 lg:px-11">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-end"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Alder & Field / Operations</p><h1 className="serif mt-2 text-3xl font-bold tracking-tight md:text-4xl">{tabs.find((item) => item.id === tab)?.label}</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{tab === 'overview' ? 'Your day at a glance.' : tab === 'quotes' ? 'Keep every customer conversation moving.' : tab === 'catalog' ? 'Manage what homeowners can explore.' : 'Your storefront and estimate defaults.'}</p></div><Link href="/quote" className="btn-secondary !rounded-lg !py-2.5 text-xs" data-testid="link-admin-view-quote">Open estimate flow <ArrowUpRight size={15}/></Link></header>
      {tab === 'overview' && <section>
        {summary.isLoading ? <PageSkeleton/> : summary.isError ? <div role="alert" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7"><h2 className="serif text-xl font-bold">Dashboard totals couldn’t load.</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Your quote and catalog controls remain available.</p><button onClick={() => summary.refetch()} className="mt-4 text-sm font-bold underline" data-testid="button-retry-summary">Try again</button></div> : <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total leads" value={String(summary.data?.totalLeads ?? 0)} detail="All submitted quote requests" icon={<UsersRound size={18}/>}/>
            <Stat label="New to review" value={String(summary.data?.newLeads ?? 0)} detail="Ready for a first conversation" icon={<ArrowDownRight size={18}/>}/>
            <Stat label="Scheduled" value={String(summary.data?.scheduledLeads ?? 0)} detail="A next step is on the calendar" icon={<Check size={18}/>}/>
            <Stat label="Pipeline value" value={money(summary.data?.pipelineValue ?? 0, settings.data?.currency)} detail={`${summary.data?.wonLeads ?? 0} won projects`} icon={<ArrowUpRight size={18}/>}/>
          </div>
          <section className="mt-7 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7">
            <div className="mb-4 flex items-end justify-between"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Recently received</p><h2 className="serif mt-2 text-2xl font-bold">Customer requests</h2></div><button onClick={() => setTab('quotes')} className="inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))]" data-testid="button-view-all-quotes">View pipeline <ArrowRight size={14}/></button></div>
            {summary.data?.recentQuotes?.length ? summary.data.recentQuotes.map((quote) => <QuoteRow key={quote.id} quote={quote} currency={settings.data?.currency || 'USD'}/>) : <div className="rounded-xl bg-[hsl(var(--muted))] p-7 text-center" data-testid="empty-recent-quotes"><p className="serif text-xl font-bold">The next good project starts here.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">New customer requests will show up here as they arrive.</p></div>}
          </section>
        </>}
      </section>}
      {tab === 'quotes' && <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Customer follow-up</p><h2 className="serif mt-2 text-2xl font-bold">Quote pipeline</h2></div><div className="grid gap-3 sm:grid-cols-2"><label><span className="sr-only">Search quotes</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, postal code" className="field py-2.5 text-xs" data-testid="input-search-quotes"/></label><label><span className="sr-only">Filter by status</span><select value={status} onChange={(e) => setStatus(e.target.value as '' | Quote['status'])} className="field py-2.5 text-xs" data-testid="select-filter-status"><option value="">All statuses</option>{statusChoices.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label></div></div>
        {quotes.isLoading ? <div className="space-y-3"><div className="h-24 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/><div className="h-24 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/></div> : quotes.isError ? <div role="alert" className="rounded-xl bg-[hsl(var(--muted))] p-6"><p className="font-semibold">Quote requests couldn’t load.</p><button onClick={() => quotes.refetch()} className="mt-3 text-sm font-bold underline" data-testid="button-retry-quotes">Try again</button></div> : quotes.data?.length ? quotes.data.map((quote) => <QuoteRow key={quote.id} quote={quote} currency={settings.data?.currency || 'USD'}/>) : <div className="rounded-xl bg-[hsl(var(--muted))] p-8 text-center" data-testid="empty-quotes"><p className="serif text-xl font-bold">{search || status ? 'No matches found.' : 'Your pipeline is ready.'}</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{search || status ? 'Try a different search or status filter.' : 'Customer quote requests will appear here.'}</p></div>}
      </section>}
      {tab === 'catalog' && <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Storefront products</p><h2 className="serif mt-2 text-2xl font-bold">Products and starting prices</h2></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-2 text-xs font-semibold">{products.data?.length ?? 0} products</span></div>
        {products.isLoading ? <PageSkeleton/> : products.isError ? <div role="alert" className="rounded-xl bg-[hsl(var(--card))] p-6">Catalog couldn’t load. <button onClick={() => products.refetch()} className="font-bold underline" data-testid="button-retry-products-admin">Try again</button></div> : products.data?.length ? <div className="space-y-4">{products.data.map((product) => <ProductEditor key={product.id} product={product}/>)}</div> : <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center" data-testid="empty-catalog"><p className="serif text-xl font-bold">No catalog items yet.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Products will appear here when they’re available.</p></div>}
      </section>}
      {tab === 'settings' && <section>{settings.isLoading ? <PageSkeleton/> : settings.isError ? <div role="alert" className="rounded-xl bg-[hsl(var(--card))] p-6"><p className="font-semibold">Business settings couldn’t load.</p><button onClick={() => settings.refetch()} className="mt-3 text-sm font-bold underline" data-testid="button-retry-settings">Try again</button></div> : settings.data ? <SettingsEditor initial={settings.data}/> : null}</section>}
    </main>
  </div>;
}

function baseUrl() { return import.meta.env.BASE_URL || '/'; }
