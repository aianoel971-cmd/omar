import { useEffect, useId, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBusinessSettingsQueryKey, getGetDashboardSummaryQueryKey, getListAdminReviewsQueryKey, getListProductsQueryKey, getListQuotesQueryKey,
  useCreateProduct, useDeleteReview, useGetBusinessSettings, useGetDashboardSummary, useListAdminReviews, useListProducts, useListQuotes, useUpdateBusinessSettings, useUpdateProduct, useUpdateQuote, useUpdateReview, useUploadImage,
} from '@workspace/api-client-react';
import type { BusinessSettings, Product, Quote, Review } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronRight, Eye, EyeOff, ImagePlus, LayoutDashboard, LogOut, PackageOpen, Settings2, ShieldCheck, SlidersHorizontal, Star, Trash2, Upload, UsersRound } from 'lucide-react';
import { adminLogin, adminMe, clearAdminToken } from '@/lib/admin-auth';

type AdminTab = 'overview' | 'quotes' | 'catalog' | 'reviews' | 'settings';
type ProductValues = { name: string; description: string; startingPrice: number; active: boolean; featured: boolean; badge: string; imageUrl: string };
type NewProductValues = { name: string; category: Product['category']; description: string; startingPrice: number; active: boolean; featured: boolean; badge: string; features: string; imageUrl: string };
const emptyNewProduct: NewProductValues = { name: '', category: 'window', description: '', startingPrice: 0, active: true, featured: false, badge: '', features: '', imageUrl: '' };
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

function ImageUploadField({ value, onChange, testId }: { value: string; onChange: (url: string) => void; testId: string }) {
  const upload = useUploadImage();
  const [error, setError] = useState('');
  const inputId = useId();
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB.'); return; }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read-failed'));
        reader.readAsDataURL(file);
      });
      const result = await upload.mutateAsync({ data: { dataUrl } });
      onChange(result.url);
    } catch { setError('Upload failed. Please try another image.'); }
  };
  return <div>
    <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--muted))]">
      {value ? <img src={value} alt="" className="h-full w-full object-cover"/> : <ImagePlus size={22} className="text-[hsl(var(--muted-foreground))]"/>}
    </div>
    <label htmlFor={inputId} className={`mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold ${upload.isPending ? 'opacity-60' : 'hover:border-[hsl(var(--primary))]/40'}`}>{upload.isPending ? 'Uploading…' : <><Upload size={13}/> Upload image</>}</label>
    <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={pick} disabled={upload.isPending} data-testid={testId}/>
    {value && <button type="button" onClick={() => onChange('')} className="mt-2 block w-full text-center text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Use no image</button>}
    {error && <p role="alert" className="mt-2 text-[11px] text-[hsl(var(--destructive))]">{error}</p>}
  </div>;
}

function ProductEditor({ product }: { product: Product }) {
  const updateProduct = useUpdateProduct();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const form = useForm<ProductValues>({ defaultValues: { name: product.name, description: product.description, startingPrice: product.startingPrice, active: product.active, featured: product.featured, badge: product.badge || '', imageUrl: product.imageUrl || '' } });
  const imageUrl = form.watch('imageUrl');
  const save = form.handleSubmit(async (values) => {
    setError('');
    try {
      await updateProduct.mutateAsync({ productId: product.id, data: { name: values.name.trim(), description: values.description.trim(), startingPrice: Number(values.startingPrice), active: values.active, featured: values.featured, badge: values.badge.trim() || null, imageUrl: values.imageUrl.trim() || null } });
      await client.invalidateQueries({ queryKey: getListProductsQueryKey() });
      await client.invalidateQueries({ queryKey: getListProductsQueryKey({ includeInactive: true }) });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch { setError('This product could not be saved. Please try again.'); }
  });
  return <FormProvider {...form}><form onSubmit={save} className="grid gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:grid-cols-[150px_minmax(0,1fr)_210px] md:p-6" data-testid={`form-product-${product.id}`}>
    <ImageUploadField value={imageUrl} onChange={(url) => form.setValue('imageUrl', url, { shouldDirty: true })} testId={`input-product-image-${product.id}`}/>
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

function AddProductForm() {
  const client = useQueryClient();
  const create = useCreateProduct();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const form = useForm<NewProductValues>({ defaultValues: emptyNewProduct });
  const imageUrl = form.watch('imageUrl');
  const submit = form.handleSubmit(async (values) => {
    setError('');
    try {
      await create.mutateAsync({ data: {
        name: values.name.trim(),
        category: values.category,
        description: values.description.trim(),
        startingPrice: Number(values.startingPrice),
        imageUrl: values.imageUrl.trim() || null,
        badge: values.badge.trim() || null,
        active: values.active,
        featured: values.featured,
        features: values.features.split(',').map((item) => item.trim()).filter(Boolean),
      } });
      await client.invalidateQueries({ queryKey: getListProductsQueryKey() });
      await client.invalidateQueries({ queryKey: getListProductsQueryKey({ includeInactive: true }) });
      form.reset(emptyNewProduct);
      setOpen(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    } catch { setError('This product could not be added. Please try again.'); }
  });
  return <div className="mb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={() => setOpen((current) => !current)} className={open ? 'btn-secondary !rounded-lg !py-2.5 text-xs' : 'btn-primary !rounded-lg !py-2.5 text-xs'} data-testid="button-toggle-add-product">{open ? 'Close' : <><ImagePlus size={14}/> Add product</>}</button>
      {saved && <p className="flex items-center gap-1 text-sm font-semibold text-[hsl(var(--primary))]" data-testid="status-add-product-success"><Check size={14}/> Product added to the catalog.</p>}
    </div>
    {open && <FormProvider {...form}><form onSubmit={submit} className="mt-4 grid gap-5 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:grid-cols-[150px_minmax(0,1fr)_230px] md:p-6" data-testid="form-add-product">
      <ImageUploadField value={form.watch('imageUrl')} onChange={(url) => form.setValue('imageUrl', url, { shouldDirty: true })} testId="input-new-product-image"/>
      <div className="min-w-0 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Product name</label><Controller name="name" control={form.control} rules={{ required: true, minLength: 2 }} render={({ field }) => <input {...field} className="field py-2 text-sm" placeholder="e.g. Bay Window" data-testid="input-new-product-name"/>} /></div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Category</label><Controller name="category" control={form.control} render={({ field }) => <select {...field} className="field py-2 text-sm" data-testid="select-new-product-category"><option value="window">Window</option><option value="door">Door</option></select>} /></div>
        </div>
        <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Description</label><Controller name="description" control={form.control} rules={{ required: true }} render={({ field }) => <textarea {...field} rows={2} className="field resize-y py-2 text-sm" data-testid="input-new-product-description"/>} /></div>
        <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Features (comma separated)</label><Controller name="features" control={form.control} render={({ field }) => <input {...field} className="field py-2 text-sm" placeholder="Tempered glass, Low-E coating" data-testid="input-new-product-features"/>} /></div>
      </div>
      <div className="space-y-4">
        <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Starting price</label><div className="flex items-center gap-2"><span className="text-sm text-[hsl(var(--muted-foreground))]">$</span><Controller name="startingPrice" control={form.control} rules={{ required: true, min: 1 }} render={({ field }) => <input {...field} type="number" min={1} step="1" className="field py-2 text-sm" data-testid="input-new-product-price"/>} /></div></div>
        <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider">Short badge</label><Controller name="badge" control={form.control} render={({ field }) => <input {...field} className="field py-2 text-sm" placeholder="Optional" data-testid="input-new-product-badge"/>} /></div>
        <div className="flex gap-4 text-xs"><Controller name="active" control={form.control} render={({ field }) => <label className="flex items-center gap-2"><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="accent-[hsl(var(--primary))]" data-testid="input-new-product-active"/> Active</label>} /><Controller name="featured" control={form.control} render={({ field }) => <label className="flex items-center gap-2"><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="accent-[hsl(var(--primary))]" data-testid="input-new-product-featured"/> Featured</label>} /></div>
        {error && <p role="alert" className="text-xs text-[hsl(var(--destructive))]" data-testid="status-add-product-error">{error}</p>}
        <button type="submit" disabled={form.formState.isSubmitting} className="btn-primary w-full !rounded-lg !py-2.5 text-xs" data-testid="button-create-product">{form.formState.isSubmitting ? 'Adding…' : 'Add product'}</button>
      </div>
    </form></FormProvider>}
  </div>;
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

function StarRating({ rating }: { rating: number }) {
  return <div className="flex gap-0.5 text-[#d9a760]" data-testid="star-rating">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < rating ? 'fill-current' : 'text-[hsl(var(--muted-foreground))]'}/>)}</div>;
}

function ReviewsPanel() {
  const client = useQueryClient();
  const reviews = useListAdminReviews({ query: { queryKey: getListAdminReviewsQueryKey() } });
  const update = useUpdateReview({ mutation: { onSuccess: () => client.invalidateQueries({ queryKey: getListAdminReviewsQueryKey() }) } });
  const remove = useDeleteReview({ mutation: { onSuccess: () => client.invalidateQueries({ queryKey: getListAdminReviewsQueryKey() }) } });
  const [error, setError] = useState('');
  const toggleApproved = async (id: string, approved: boolean) => {
    setError('');
    try { await update.mutateAsync({ reviewId: id, data: { approved: !approved } }); }
    catch { setError('That review could not be updated. Please try again.'); }
  };
  const deleteReview = async (id: string) => {
    setError('');
    try { await remove.mutateAsync({ reviewId: id }); }
    catch { setError('That review could not be deleted. Please try again.'); }
  };
  return <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Customer word of mouth</p><h2 className="serif mt-2 text-2xl font-bold">Reviews</h2></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-2 text-xs font-semibold">{reviews.data?.length ?? 0} total</span></div>
    {error && <p role="alert" className="mb-4 text-sm text-[hsl(var(--destructive))]" data-testid="status-reviews-error">{error}</p>}
    {reviews.isLoading ? <div className="space-y-3"><div className="h-28 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/><div className="h-28 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/></div> : reviews.isError ? <div role="alert" className="rounded-xl bg-[hsl(var(--muted))] p-6"><p className="font-semibold">Reviews couldn’t load. Sign in again, or try again.</p><button onClick={() => reviews.refetch()} className="mt-3 text-sm font-bold underline" data-testid="button-retry-reviews-admin">Try again</button></div> : reviews.data?.length ? <ul className="divide-y divide-[hsl(var(--border))]">{reviews.data.map((review: Review) => <li key={review.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" data-testid={`card-review-admin-${review.id}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="serif font-bold">{review.name}</h3><StarRating rating={review.rating}/><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${review.approved ? 'bg-[#dbe8dc] text-[#365843]' : 'bg-[#f3e5d5] text-[#80552e]'}`} data-testid={`status-review-${review.id}`}>{review.approved ? 'Published' : 'Hidden'}</span></div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{new Date(review.createdAt).toLocaleDateString()}</p>
        <p className="mt-3 text-sm leading-6">“{review.comment}”</p>
      </div>
      <div className="flex shrink-0 gap-2 sm:justify-end">
        <button type="button" onClick={() => toggleApproved(review.id, review.approved)} disabled={update.isPending} className={review.approved ? 'inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))]' : 'btn-primary !rounded-lg !px-3 !py-2 text-xs'} data-testid={`button-review-${review.approved ? 'hide' : 'publish'}-${review.id}`}>{review.approved ? <><EyeOff size={13}/> Hide</> : <><Eye size={13}/> Publish</>}</button>
        <button type="button" onClick={() => deleteReview(review.id)} disabled={remove.isPending} aria-label={`Delete ${review.name}'s review`} className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--destructive))]/30 px-3 py-2 font-bold text-[hsl(var(--destructive))]" data-testid={`button-review-delete-${review.id}`}><Trash2 size={13}/></button>
      </div>
    </li>)}</ul> : <div className="rounded-xl bg-[hsl(var(--muted))] p-8 text-center" data-testid="empty-reviews-admin"><p className="serif text-xl font-bold">No reviews yet.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Client reviews will appear here when they’re posted on the site.</p></div>}
  </section>;
}

export default function AdminPage() {
  const [session, setSession] = useState<'loading' | 'authed' | 'anon'>('loading');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [status, setStatus] = useState<'' | Quote['status']>('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let cancelled = false;
    adminMe().then((authed) => { if (!cancelled) setSession(authed ? 'authed' : 'anon'); });
    return () => { cancelled = true; };
  }, []);
  const logout = () => { clearAdminToken(); setSession('anon'); setTab('overview'); };
  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password || submitting) return;
    setSubmitting(true);
    setLoginError('');
    try {
      await adminLogin(username.trim(), password);
      setPassword('');
      setSession('authed');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };
  const authed = session === 'authed';
  const params = { ...(status ? { status } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const queryKey = getListQuotesQueryKey(params);
  const summary = useGetDashboardSummary({ query: { enabled: authed, queryKey: getGetDashboardSummaryQueryKey() } });
  const quotes = useListQuotes(params, { query: { enabled: authed, queryKey } });
  const products = useListProducts({ includeInactive: true }, { query: { enabled: authed, queryKey: getListProductsQueryKey({ includeInactive: true }) } });
  const settings = useGetBusinessSettings({ query: { enabled: authed, queryKey: getGetBusinessSettingsQueryKey() } });

  if (session === 'loading') return <div className="min-h-[100dvh] bg-[hsl(var(--background))] p-8"><div className="mx-auto max-w-full"><PageSkeleton/></div></div>;
  if (session === 'anon') return <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5 py-10">
    <section className="w-full max-w-md rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5e9df] text-[hsl(var(--primary))]"><ShieldCheck size={26}/></div>
      <p className="eyebrow mt-6 text-center text-[hsl(var(--primary))]">Team operations</p><h1 className="serif mt-2 text-center text-3xl font-bold">Admin sign in</h1><p className="mt-3 text-center text-sm leading-6 text-[hsl(var(--muted-foreground))]">The LopezXconstruction dashboard is reserved for our team. Customer estimates stay public.</p>
      <form onSubmit={submitLogin} className="mt-7 flex flex-col gap-4" data-testid="form-admin-login">
        <label className="block"><span className="mb-2 block text-sm font-bold">Username</span><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="field" data-testid="input-admin-username"/></label>
        <label className="block"><span className="mb-2 block text-sm font-bold">Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="field" data-testid="input-admin-password"/></label>
        {loginError && <p role="alert" className="text-sm text-[hsl(var(--destructive))]" data-testid="status-admin-login-error">{loginError}</p>}
        <button type="submit" disabled={submitting} className="btn-primary mt-1 w-full" data-testid="button-admin-login">{submitting ? 'Signing in…' : <>Sign in <ArrowRight size={16}/></>}</button>
      </form>
      <Link href="/" className="mt-6 inline-flex w-full justify-center text-xs font-semibold text-[hsl(var(--muted-foreground))]" data-testid="link-admin-home">Return to public home</Link>
    </section>
  </main>;

  const tabs: { id: AdminTab; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17}/> }, { id: 'quotes', label: 'Quote pipeline', icon: <UsersRound size={17}/> },
    { id: 'catalog', label: 'Product catalog', icon: <PackageOpen size={17}/> }, { id: 'reviews', label: 'Reviews', icon: <Star size={17}/> },
    { id: 'settings', label: 'Business settings', icon: <Settings2 size={17}/> },
  ];
  return <div className="min-h-[100dvh] bg-[#f4f2eb] text-[hsl(var(--foreground))] md:grid md:grid-cols-[250px_minmax(0,1fr)]">
    <aside className="bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] md:sticky md:top-0 md:flex md:h-[100dvh] md:flex-col">
      <div className="flex items-center justify-between px-5 py-5 md:block md:px-6 md:py-7">
        <Link href="/" className="flex items-center gap-3" data-testid="link-admin-brand"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-14 w-14"/><div><div className="serif font-extrabold">LopezXconstruction</div><div className="eyebrow text-[.54rem] text-white/50">Operations</div></div></Link>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10 md:mt-8" onClick={logout} data-testid="button-sign-out"><LogOut size={14}/> Sign out</button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:py-4" aria-label="Dashboard sections">{tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`admin-nav flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold md:w-full ${tab === item.id ? 'bg-[hsl(var(--sidebar-accent))] text-white' : 'text-white/65'}`} aria-current={tab === item.id ? 'page' : undefined} data-testid={`button-tab-${item.id}`}>{item.icon}<span>{item.label}</span>{tab === item.id && <ChevronRight size={14} className="ml-auto hidden md:block"/>}</button>)}</nav>
      <div className="mt-auto hidden border-t border-white/15 px-6 py-5 md:block"><p className="text-xs font-semibold">Local projects, kept personal.</p><p className="mt-2 text-[10px] leading-4 text-white/50">Customer details stay within your team workspace.</p></div>
    </aside>
    <main className="min-w-0 px-4 py-6 md:px-8 md:py-9 lg:px-11">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-end"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">LopezXconstruction / Operations</p><h1 className="serif mt-2 text-3xl font-bold tracking-tight md:text-4xl">{tabs.find((item) => item.id === tab)?.label}</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{tab === 'overview' ? 'Your day at a glance.' : tab === 'quotes' ? 'Keep every customer conversation moving.' : tab === 'catalog' ? 'Manage what homeowners can explore.' : tab === 'reviews' ? 'Curate what future customers read.' : 'Your storefront and estimate defaults.'}</p></div><Link href="/quote" className="btn-secondary !rounded-lg !py-2.5 text-xs" data-testid="link-admin-view-quote">Open estimate flow <ArrowUpRight size={15}/></Link></header>
      {tab === 'overview' && <section>
        {summary.isLoading ? <PageSkeleton/> : summary.isError ? <div role="alert" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7"><h2 className="serif text-xl font-bold">Dashboard access could not be verified.</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Sign in again, or retry if this was just a temporary connection issue.</p><button onClick={() => summary.refetch()} className="mt-4 text-sm font-bold underline" data-testid="button-retry-summary">Try again</button></div> : <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total leads" value={String(summary.data?.totalLeads ?? 0)} detail="All submitted quote requests" icon={<UsersRound size={18}/>}/>
            <Stat label="New to review" value={String(summary.data?.newLeads ?? 0)} detail="Ready for a first conversation" icon={<ArrowDownRight size={18}/>}/>
            <Stat label="Scheduled" value={String(summary.data?.scheduledLeads ?? 0)} detail="A next step is on the calendar" icon={<Check size={18}/>}/>
            <Stat label="Pipeline value" value={money(summary.data?.pipelineValue ?? 0, settings.data?.currency)} detail={`${summary.data?.wonLeads ?? 0} won projects`} icon={<ArrowUpRight size={18}/>}/>
          </div>
          <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[{ id: 'quotes' as AdminTab, icon: <UsersRound size={18}/>, title: 'Quote pipeline', text: `${summary.data?.newLeads ?? 0} new to review` }, { id: 'catalog' as AdminTab, icon: <PackageOpen size={18}/>, title: 'Product catalog', text: `${products.data?.length ?? 0} products visible` }, { id: 'reviews' as AdminTab, icon: <Star size={18}/>, title: 'Reviews', text: 'Moderate client feedback' }, { id: 'settings' as AdminTab, icon: <Settings2 size={18}/>, title: 'Business settings', text: 'Storefront + estimate defaults' }].map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left transition-colors hover:border-[hsl(var(--primary))]/40" data-testid={`button-quick-${item.id}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6e9df] text-[hsl(var(--primary))]">{item.icon}</span><span><span className="block text-sm font-bold">{item.title}</span><span className="mt-0.5 block text-xs text-[hsl(var(--muted-foreground))]">{item.text}</span></span><ChevronRight size={15} className="ml-auto text-[hsl(var(--muted-foreground))]"/></button>)}
          </section>
          <section className="mt-7 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7">
            <div className="mb-4 flex items-end justify-between"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Recently received</p><h2 className="serif mt-2 text-2xl font-bold">Customer requests</h2></div><button onClick={() => setTab('quotes')} className="inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))]" data-testid="button-view-all-quotes">View pipeline <ArrowRight size={14}/></button></div>
            {summary.data?.recentQuotes?.length ? summary.data.recentQuotes.map((quote) => <QuoteRow key={quote.id} quote={quote} currency={settings.data?.currency || 'USD'}/>) : <div className="rounded-xl bg-[hsl(var(--muted))] p-7 text-center" data-testid="empty-recent-quotes"><p className="serif text-xl font-bold">The next good project starts here.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">New customer requests will show up here as they arrive.</p></div>}
          </section>
        </>}
      </section>}
      {tab === 'quotes' && <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Customer follow-up</p><h2 className="serif mt-2 text-2xl font-bold">Quote pipeline</h2></div><div className="grid gap-3 sm:grid-cols-2"><label><span className="sr-only">Search quotes</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, postal code" className="field py-2.5 text-xs" data-testid="input-search-quotes"/></label><label><span className="sr-only">Filter by status</span><select value={status} onChange={(e) => setStatus(e.target.value as '' | Quote['status'])} className="field py-2.5 text-xs" data-testid="select-filter-status"><option value="">All statuses</option>{statusChoices.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label></div></div>
        {quotes.isLoading ? <div className="space-y-3"><div className="h-24 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/><div className="h-24 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/></div> : quotes.isError ? <div role="alert" className="rounded-xl bg-[hsl(var(--muted))] p-6"><p className="font-semibold">Quote requests couldn’t load. Sign in again, or try again.</p><button onClick={() => quotes.refetch()} className="mt-3 text-sm font-bold underline" data-testid="button-retry-quotes">Try again</button></div> : quotes.data?.length ? quotes.data.map((quote) => <QuoteRow key={quote.id} quote={quote} currency={settings.data?.currency || 'USD'}/>) : <div className="rounded-xl bg-[hsl(var(--muted))] p-8 text-center" data-testid="empty-quotes"><p className="serif text-xl font-bold">{search || status ? 'No matches found.' : 'Your pipeline is ready.'}</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{search || status ? 'Try a different search or status filter.' : 'Customer quote requests will appear here.'}</p></div>}
      </section>}
      {tab === 'catalog' && <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow text-[hsl(var(--muted-foreground))]">Storefront products</p><h2 className="serif mt-2 text-2xl font-bold">Products and starting prices</h2></div><span className="rounded-full bg-[hsl(var(--muted))] px-3 py-2 text-xs font-semibold">{products.data?.length ?? 0} products</span></div>
        <AddProductForm/>
        {products.isLoading ? <PageSkeleton/> : products.isError ? <div role="alert" className="rounded-xl bg-[hsl(var(--card))] p-6">Catalog couldn’t load. Sign in again, or try again. <button onClick={() => products.refetch()} className="font-bold underline" data-testid="button-retry-products-admin">Try again</button></div> : products.data?.length ? <div className="space-y-4">{products.data.map((product) => <ProductEditor key={product.id} product={product}/>)}</div> : <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center" data-testid="empty-catalog"><p className="serif text-xl font-bold">No catalog items yet.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Products will appear here when they’re available.</p></div>}
      </section>}
      {tab === 'reviews' && <ReviewsPanel/>}
      {tab === 'settings' && <section>{settings.isLoading ? <PageSkeleton/> : settings.isError ? <div role="alert" className="rounded-xl bg-[hsl(var(--card))] p-6"><p className="font-semibold">Business settings couldn't load. Sign in again, or try again.</p><button onClick={() => settings.refetch()} className="mt-3 text-sm font-bold underline" data-testid="button-retry-settings">Try again</button></div> : settings.data ? <SettingsEditor initial={settings.data}/> : null}</section>}
    </main>
  </div>;
}
