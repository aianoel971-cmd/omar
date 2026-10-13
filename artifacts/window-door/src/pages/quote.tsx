import { useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useCalculateEstimate, useCreateQuote, useListProducts, getListQuotesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Estimate, Product } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';

type QuoteValues = {
  productId: string;
  quantity: number;
  includeInstallation: boolean;
  includeRemoval: boolean;
  projectType: 'window' | 'door' | 'both';
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  timeframe: 'asap' | 'oneToThreeMonths' | 'threeToSixMonths' | 'planning';
  notes: string;
};

function dollars(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: currency || 'CAD', maximumFractionDigits: 0 }).format(amount); }
  catch { return `${currency} ${Math.round(amount).toLocaleString()}`; }
}

function ProductChoice({ products }: { products: Product[] }) {
  return <Controller name="productId" rules={{ required: 'Choose a product to continue.' }} render={({ field, fieldState }) => <div>
    <label className="mb-2 block text-sm font-bold" htmlFor="product-choice">What are you thinking about?</label>
    <select {...field} id="product-choice" className="field" data-testid="select-product">
      <option value="" disabled>Select a window or door</option>
      {products.map((item) => <option key={item.id} value={item.id}>{item.name} · from ${item.startingPrice.toLocaleString()}</option>)}
    </select>
    {fieldState.error && <p role="alert" className="mt-1 text-xs text-[hsl(var(--destructive))]">{fieldState.error.message}</p>}
  </div>}/>;
}

export default function QuotePage() {
  const productsQuery = useListProducts();
  const calculate = useCalculateEstimate();
  const createQuote = useCreateQuote();
  const queryClient = useQueryClient();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimatedSignature, setEstimatedSignature] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const form = useForm<QuoteValues>({
    defaultValues: { productId: '', quantity: 1, includeInstallation: true, includeRemoval: false, projectType: 'window', name: '', email: '', phone: '', postalCode: '', timeframe: 'planning', notes: '' },
    mode: 'onTouched',
  });
  const { watch, setValue, handleSubmit, control, register, getValues, formState: { errors } } = form;
  const watched = watch();
  const signature = useMemo(() => [watched.productId, watched.quantity, watched.includeInstallation, watched.includeRemoval].join('|'), [watched.productId, watched.quantity, watched.includeInstallation, watched.includeRemoval]);
  const estimateIsCurrent = Boolean(estimate && estimatedSignature === signature);

  useEffect(() => {
    const first = productsQuery.data?.[0];
    if (first && !getValues('productId')) setValue('productId', first.id);
  }, [productsQuery.data, getValues, setValue]);

  const getEstimate = async () => {
    setSubmitError('');
    const current = getValues();
    if (!current.productId) {
      setSubmitError('Choose a product before calculating your estimate.');
      return;
    }
    try {
      const result = await calculate.mutateAsync({ data: { productId: current.productId, quantity: Number(current.quantity), includeInstallation: current.includeInstallation, includeRemoval: current.includeRemoval } });
      setEstimate(result);
      setEstimatedSignature([current.productId, current.quantity, current.includeInstallation, current.includeRemoval].join('|'));
    } catch {
      setSubmitError('We couldn’t calculate that just now. Please try again.');
    }
  };

  const onSubmit = async (values: QuoteValues) => {
    setSubmitError('');
    if (!estimateIsCurrent) {
      setSubmitError('Please refresh your estimate before sending your request.');
      return;
    }
    try {
      await createQuote.mutateAsync({ data: {
        name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), postalCode: values.postalCode.trim(),
        projectType: values.projectType, productId: values.productId, quantity: Number(values.quantity), timeframe: values.timeframe,
        includeInstallation: values.includeInstallation, includeRemoval: values.includeRemoval, ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
      } });
      await queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      setSuccess(true);
    } catch {
      setSubmitError('Your request didn’t go through. Please check your details and try again.');
    }
  };

  if (success) return <main className="min-h-[100dvh] bg-[hsl(var(--background))] px-5 py-10">
    <div className="mx-auto max-w-xl rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 text-center shadow-sm md:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#dce5db] text-[hsl(var(--primary))]"><CheckCircle2 size={31}/></div>
      <p className="eyebrow mt-7 text-[hsl(var(--primary))]">Request received</p><h1 className="serif mt-3 text-4xl font-semibold">We’ll be in touch.</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-[hsl(var(--muted-foreground))]">Thanks for inviting us into your project. A member of our local team will follow up to learn more and arrange the next step.</p>
      {estimate && <div className="mt-7 rounded-xl bg-[hsl(var(--muted))] p-5"><span className="text-xs text-[hsl(var(--muted-foreground))]">Your preliminary range</span><p className="serif mt-1 text-2xl font-bold">{dollars(estimate.low, estimate.currency)} – {dollars(estimate.high, estimate.currency)}</p></div>}
      <Link href="/" className="btn-primary mt-8" data-testid="link-success-home">Back to Alder & Field <ArrowRight size={16}/></Link>
    </div>
  </main>;

  return <main className="min-h-[100dvh] bg-[hsl(var(--background))]">
    <header className="border-b border-[hsl(var(--border))]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
      <Link href="/" className="flex items-center gap-3" data-testid="link-quote-home"><img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-9 w-9"/><span className="serif font-extrabold">Alder & Field</span></Link>
      <span className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:block">A thoughtful quote, no obligation</span>
    </div></header>
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-8 md:grid-cols-[minmax(0,1fr)_340px] md:px-10 md:py-12">
      <div>
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]" data-testid="link-back-home"><ArrowLeft size={15}/> Back to home</Link>
        <p className="eyebrow text-[hsl(var(--primary))]">Your project, your way</p><h1 className="serif mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Start with a range.<br/><span className="text-[hsl(var(--muted-foreground))]">Finish with the right fit.</span></h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">Share a few details for a preliminary estimate. If you’d like to take it further, our local team will follow up with a personal project quote.</p>
        {productsQuery.isLoading ? <div className="mt-10 space-y-4" aria-label="Loading products"><div className="h-12 animate-pulse rounded-lg bg-[hsl(var(--muted))]"/><div className="h-28 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/><div className="h-56 animate-pulse rounded-xl bg-[hsl(var(--muted))]"/></div> : productsQuery.isError ? <div className="mt-8 rounded-xl border border-[hsl(var(--border))] p-6" role="alert"><p className="font-semibold">We couldn’t load the product list.</p><button className="mt-3 text-sm font-bold underline" onClick={() => productsQuery.refetch()} data-testid="button-retry-quote-products">Try again</button></div> : !productsQuery.data?.length ? <div className="mt-8 rounded-xl border border-[hsl(var(--border))] p-6" data-testid="empty-products"><p className="font-semibold">There are no products available to estimate right now.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Please check back shortly or contact our team directly.</p></div> :
        <FormProvider {...form}><form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-7">
          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7">
            <div className="mb-6 flex items-start gap-4"><span className="serif text-2xl text-[hsl(var(--accent))]">01</span><div><h2 className="serif text-xl font-bold">Tell us what you’re looking at</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">A few basics to shape your estimate.</p></div></div>
            <ProductChoice products={productsQuery.data ?? []}/>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="quantity" className="mb-2 block text-sm font-bold">How many units?</label><input id="quantity" type="number" min={1} max={100} className="field" data-testid="input-quantity" {...register('quantity', { required: 'Add a quantity.', valueAsNumber: true, min: { value: 1, message: 'Choose at least one.' }, max: { value: 100, message: 'For larger projects, contact us directly.' } })}/>{errors.quantity && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.quantity.message}</p>}</div>
              <div><label htmlFor="project-type" className="mb-2 block text-sm font-bold">Project type</label><select id="project-type" className="field" data-testid="select-project-type" {...register('projectType')}><option value="window">Windows</option><option value="door">Entry door</option><option value="both">Windows and doors</option></select></div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Controller name="includeInstallation" control={control} render={({ field }) => <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4"><input type="checkbox" checked={field.value} onChange={field.onChange} className="mt-1 accent-[hsl(var(--primary))]" data-testid="checkbox-installation"/><span><strong className="block text-sm">Include installation</strong><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">Our team handles the fitting and finishing.</span></span></label>}/>
              <Controller name="includeRemoval" control={control} render={({ field }) => <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4"><input type="checkbox" checked={field.value} onChange={field.onChange} className="mt-1 accent-[hsl(var(--primary))]" data-testid="checkbox-removal"/><span><strong className="block text-sm">Remove existing units</strong><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">We’ll take away the old windows or door.</span></span></label>}/>
            </div>
            <button type="button" onClick={getEstimate} disabled={calculate.isPending} className="btn-primary mt-6 w-full sm:w-auto" data-testid="button-calculate-estimate">{calculate.isPending ? <><LoaderCircle className="animate-spin" size={16}/> Calculating…</> : <>Show my preliminary range <ArrowRight size={16}/></>}</button>
            {estimateIsCurrent && estimate && <div className="mt-5 rounded-xl bg-[#e7ece4] p-5 md:flex md:items-center md:justify-between" aria-live="polite" data-testid="estimate-range"><div><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Preliminary project range · {estimate.quantity} {estimate.quantity === 1 ? 'unit' : 'units'}</span><p className="serif mt-1 text-2xl font-bold">{dollars(estimate.low, estimate.currency)} – {dollars(estimate.high, estimate.currency)}</p></div><p className="mt-3 max-w-xs text-xs leading-5 text-[hsl(var(--muted-foreground))] md:mt-0">Your final quote is tailored after we understand the home, measurements, and finish details.</p></div>}
          </section>
          <section className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7 ${estimateIsCurrent ? '' : 'opacity-75'}`}>
            <div className="mb-6 flex items-start gap-4"><span className="serif text-2xl text-[hsl(var(--accent))]">02</span><div><h2 className="serif text-xl font-bold">Where can we reach you?</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">We’ll use this only to follow up about your project.</p></div></div>
            <fieldset disabled={!estimateIsCurrent || createQuote.isPending} className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="name" className="mb-2 block text-sm font-bold">Your name</label><input id="name" autoComplete="name" className="field" data-testid="input-name" {...register('name', { required: 'Please enter your name.', minLength: { value: 2, message: 'Please enter at least 2 characters.' } })}/>{errors.name && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.name.message}</p>}</div>
              <div><label htmlFor="email" className="mb-2 block text-sm font-bold">Email address</label><input id="email" type="email" autoComplete="email" className="field" data-testid="input-email" {...register('email', { required: 'Please enter your email.', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' } })}/>{errors.email && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.email.message}</p>}</div>
              <div><label htmlFor="phone" className="mb-2 block text-sm font-bold">Phone</label><input id="phone" type="tel" autoComplete="tel" className="field" data-testid="input-phone" {...register('phone', { required: 'Please enter your phone number.', minLength: { value: 7, message: 'Enter a complete phone number.' } })}/>{errors.phone && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.phone.message}</p>}</div>
              <div><label htmlFor="postal-code" className="mb-2 block text-sm font-bold">Postal code</label><input id="postal-code" autoComplete="postal-code" className="field" data-testid="input-postal-code" {...register('postalCode', { required: 'Please add your postal code.', minLength: { value: 3, message: 'Enter a valid postal code.' } })}/>{errors.postalCode && <p className="mt-1 text-xs text-[hsl(var(--destructive))]">{errors.postalCode.message}</p>}</div>
              <div className="sm:col-span-2"><label htmlFor="timeframe" className="mb-2 block text-sm font-bold">When are you hoping to get started?</label><select id="timeframe" className="field" data-testid="select-timeframe" {...register('timeframe')}><option value="asap">As soon as possible</option><option value="oneToThreeMonths">In 1–3 months</option><option value="threeToSixMonths">In 3–6 months</option><option value="planning">Just planning for now</option></select></div>
              <div className="sm:col-span-2"><label htmlFor="notes" className="mb-2 block text-sm font-bold">Anything else we should know? <span className="font-normal text-[hsl(var(--muted-foreground))]">Optional</span></label><textarea id="notes" rows={3} maxLength={2000} className="field resize-y" placeholder="A room, a rough idea, a question on your mind…" data-testid="input-notes" {...register('notes')}/></div>
            </fieldset>
            {submitError && <p role="alert" className="mt-4 rounded-lg bg-[#f6e7e2] px-4 py-3 text-sm text-[#843a32]" data-testid="status-quote-error">{submitError}</p>}
            <button type="submit" disabled={!estimateIsCurrent || createQuote.isPending} className="btn-primary mt-6 w-full sm:w-auto" data-testid="button-submit-quote">{createQuote.isPending ? <><LoaderCircle className="animate-spin" size={16}/> Sending your request…</> : <>Request my personal quote <ArrowRight size={16}/></>}</button>
            {!estimateIsCurrent && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Calculate a preliminary range above to continue.</p>}
          </section>
        </form></FormProvider>}
      </div>
      <aside className="h-fit rounded-2xl bg-[#e8e4da] p-6 md:sticky md:top-6 md:p-7">
        <div className="eyebrow text-[hsl(var(--primary))]">Straightforward from here</div><h2 className="serif mt-3 text-2xl font-bold">A little clarity goes a long way.</h2>
        <ol className="mt-6 space-y-5">{[{n:'01',t:'Get your starting range',d:'A preliminary guide based on the products and options you choose.'},{n:'02',t:'Talk it through',d:'We’ll learn about your home, measurements, and what matters to you.'},{n:'03',t:'Choose with confidence',d:'You’ll receive clear pricing before deciding what comes next.'}].map((item) => <li key={item.n} className="flex gap-4"><span className="serif text-lg font-bold text-[hsl(var(--accent))]">{item.n}</span><div><h3 className="text-sm font-bold">{item.t}</h3><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.d}</p></div></li>)}</ol>
        <div className="mt-7 border-t border-[hsl(var(--border))] pt-5"><div className="flex gap-3"><ShieldCheck size={19} className="shrink-0 text-[hsl(var(--primary))]"/><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your range is a starting point, not a commitment. We’ll confirm every detail with you.</p></div></div>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]" data-testid="link-quote-home-bottom"><Check size={14}/> No pressure. Just good advice.</Link>
      </aside>
    </div>
    <footer className="border-t border-[hsl(var(--border))] px-5 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">Alder & Field · Thoughtful work, close to home.</footer>
  </main>;
}
