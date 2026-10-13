import { useListProducts, useGetBusinessSettings, useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, DoorOpen, Frame, Menu, Phone, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { SignedOut } from '@clerk/clerk-react';

const productFallbacks = [
  { title: 'Windows that change the room', caption: 'Comfort, quiet, and a little more morning light.' },
  { title: 'An entry that feels like yours', caption: 'The first thing you see coming home should feel right.' },
];

function Header({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  return <header className="relative z-10 bg-[hsl(var(--background))]">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
      <Link href="/" className="flex items-center gap-3" data-testid="link-home">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-10 w-10" />
        <div><div className="serif text-[1.08rem] font-extrabold tracking-tight">{businessName}</div><div className="eyebrow text-[.56rem] text-[hsl(var(--muted-foreground))]">Windows · Doors · Installation</div></div>
      </Link>
      <nav className="hidden items-center gap-8 text-sm font-semibold text-[hsl(var(--foreground))] md:flex" aria-label="Main navigation">
        <a href="#work" className="hover:text-[hsl(var(--primary))]" data-testid="link-our-work">Our work</a>
        <a href="#approach" className="hover:text-[hsl(var(--primary))]" data-testid="link-our-approach">Our approach</a>
        <Link href="/quote" className="btn-primary !px-5 !py-3" data-testid="link-nav-quote">Get a project quote <ArrowRight size={15}/></Link>
        <SignedOut><Link href="/sign-in" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="link-sign-in">Team sign in</Link></SignedOut>
      </nav>
      <button type="button" className="rounded-full border border-[hsl(var(--border))] p-2 md:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-mobile-menu">{open ? <X size={19}/> : <Menu size={19}/>}</button>
    </div>
    {open && <nav className="absolute left-0 right-0 top-full border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-5 shadow-lg md:hidden" aria-label="Mobile navigation">
      <div className="flex flex-col gap-4"><a href="#work" onClick={() => setOpen(false)} data-testid="link-mobile-work">Our work</a><a href="#approach" onClick={() => setOpen(false)} data-testid="link-mobile-approach">Our approach</a><Link href="/quote" className="btn-primary w-full" onClick={() => setOpen(false)} data-testid="link-mobile-quote">Get a project quote <ArrowRight size={16}/></Link><SignedOut><Link href="/sign-in" onClick={() => setOpen(false)} data-testid="link-mobile-signin">Team sign in</Link></SignedOut></div>
    </nav>}
  </header>;
}

function Footer({ businessName, phone }: { businessName: string; phone: string }) {
  return <footer className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1fr_auto] md:items-end md:px-10">
      <div><div className="serif text-2xl font-bold">{businessName}</div><p className="mt-3 max-w-sm text-sm leading-6 opacity-75">Thoughtful window and door installation, from the first measure to the final sweep.</p></div>
      <div className="flex flex-wrap gap-6 text-sm"><Link href="/quote" className="underline-offset-4 hover:underline" data-testid="link-footer-quote">Request a quote</Link><SignedOut><Link href="/sign-in" className="underline-offset-4 hover:underline" data-testid="link-footer-sign-in">Team sign in</Link></SignedOut><a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2"><Phone size={15}/> {phone}</a></div>
      <div className="border-t border-white/20 pt-5 text-xs opacity-60 md:col-span-2">Local people. Clear numbers. A more comfortable home.</div>
    </div>
  </footer>;
}

export default function HomePage() {
  const products = useListProducts();
  const settings = useGetBusinessSettings();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const featured = products.data?.filter((item) => item.featured) ?? [];
  const businessName = settings.data?.businessName || 'Alder & Field';
  const phone = settings.data?.phone || '(555) 014-2080';
  return <main className="min-h-[100dvh]">
    <Header businessName={businessName}/>
    <section className="mx-auto max-w-7xl px-5 pb-12 pt-5 md:px-10 md:pb-20 md:pt-4">
      <div className="relative min-h-[600px] overflow-hidden rounded-[1.6rem] bg-[#d6d1c4] md:min-h-[680px]">
        <img src={`${import.meta.env.BASE_URL}hero-home.jpg`} alt="A craftsman home with a large new black-framed window" className="absolute inset-0 h-full w-full object-cover object-center"/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#202f2b]/90 via-[#202f2b]/60 to-transparent"/>
        <div className="relative flex min-h-[600px] max-w-2xl flex-col justify-center px-7 py-14 text-[#f9f5ec] md:min-h-[680px] md:px-16">
          <div className="eyebrow mb-6 flex items-center gap-3 text-[#d9b18d]"><span className="h-px w-8 bg-[#d9b18d]"/>A good home begins at the edges</div>
          <h1 className="serif max-w-[620px] text-[clamp(3.2rem,8vw,6.6rem)] font-semibold leading-[.94] tracking-[-.065em] reveal">Let the light<br/>in. Keep the<br/><em className="font-medium text-[#dbb68f]">good parts.</em></h1>
          <p className="mt-7 max-w-md text-base leading-7 text-white/80 md:text-lg md:leading-8 reveal-delay">Beautifully fitted windows and entry doors, installed by people who take the time to get it right.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/quote" className="btn-primary !bg-[#f2e7d5] !text-[#253a34] hover:!bg-white" data-testid="link-hero-quote">Get a personal project quote <ArrowRight size={16}/></Link>
            <a href="#approach" className="btn-secondary !border-white/40 !text-white hover:!bg-white/10" data-testid="link-hero-approach">How we work <ChevronRight size={16}/></a>
          </div>
          <div className="mt-12 flex items-center gap-3 text-xs text-white/75"><ShieldCheck size={17} className="text-[#dbb68f]"/> Clear scope. Upfront pricing. No pressure.</div>
        </div>
        <div className="absolute bottom-7 right-8 hidden text-right text-[10px] uppercase tracking-[.22em] text-white/70 lg:block">Alder & Field / Home 01</div>
      </div>
    </section>

    <section id="approach" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[.8fr_1.2fr] md:px-10 md:py-24">
      <div><p className="eyebrow text-[hsl(var(--primary))]">The Alder & Field difference</p><h2 className="serif mt-5 max-w-sm text-4xl font-semibold leading-[1.06] tracking-tight md:text-5xl">Good work starts with a good conversation.</h2></div>
      <div className="grid gap-8 sm:grid-cols-2">
        {[{ icon: <Sparkles/>, title: 'A considered recommendation', text: 'We listen to what the room needs, then help you compare options that make sense for your home.' },{ icon: <Frame/>, title: 'A fit worth getting right', text: 'Careful measuring and a tidy installation protect the character of your home and the comfort inside it.' }].map((item) => <article key={item.title} className="border-t border-[hsl(var(--border))] pt-5">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">{item.icon}</div><h3 className="serif text-xl font-bold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.text}</p>
        </article>)}
      </div>
    </section>

    <section id="work" className="bg-[#e9e5da] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow text-[hsl(var(--primary))]">Made for the way you live</p><h2 className="serif mt-3 text-4xl font-semibold tracking-tight">A better view of home.</h2></div><Link href="/quote" className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-products-quote">Explore your options <ArrowUpRight size={16}/></Link></div>
        {products.isLoading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-[#dcd7cc]"/><div className="h-72 animate-pulse rounded-2xl bg-[#dcd7cc]"/></div> : products.isError ? <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-7" role="alert"><p className="font-semibold">Our collection is taking a moment to load.</p><button className="mt-4 text-sm font-bold underline" onClick={() => products.refetch()} data-testid="button-retry-products">Try again</button></div> : products.data?.length ? <div className="grid gap-5 md:grid-cols-2">{products.data.map((item, index) => <article key={item.id} data-testid={`card-product-${item.id}`} className={`group relative min-h-[350px] overflow-hidden rounded-2xl bg-[hsl(var(--primary))] p-7 text-white md:p-9 ${index === 0 ? 'md:min-h-[420px]' : 'md:mt-12 md:min-h-[380px]'}`}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"/> : <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#7f9787,#354a42)]"><div className="flex h-44 w-36 items-center justify-center border border-white/40"><div className="h-full w-2/3 border-x border-white/50"/><div className="absolute h-px w-36 bg-white/50"/></div></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#182a25]/90 via-[#182a25]/20 to-transparent"/>
          <div className="relative flex h-full min-h-[300px] flex-col justify-end"><div className="eyebrow mb-2 text-[#e0c19c]">{item.badge || (item.category === 'window' ? 'Windows' : 'Entry doors')}</div><h3 className="serif max-w-md text-3xl font-semibold">{item.name}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-white/75">{item.description}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm text-white/80">Projects from <strong className="text-white">${item.startingPrice.toLocaleString()}</strong></span><Link href="/quote" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2e7d5] text-[#263b34]" aria-label={`Get a quote for ${item.name}`} data-testid={`link-product-quote-${item.id}`}><ArrowUpRight size={20}/></Link></div></div>
        </article>)}</div> : <div className="grid gap-5 md:grid-cols-2">{productFallbacks.map((item, i) => <article key={item.title} className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-8 ${i ? 'md:mt-12' : ''}`}><div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">{i === 0 ? <Frame/> : <DoorOpen/>}</div><h3 className="serif text-2xl font-bold">{item.title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.caption}</p><Link href="/quote" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]" data-testid={`link-category-${i}`}>Talk through your project <ArrowRight size={15}/></Link></article>)}</div>}
        {health.isError && <div className="mt-5 text-xs text-[hsl(var(--muted-foreground))]" aria-live="polite" data-testid="status-product-health">Having trouble connecting? Our team is still happy to help by phone.</div>}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
      <div className="grid items-center gap-12 rounded-[1.5rem] bg-[#d8dfd6] p-7 md:grid-cols-[.9fr_1.1fr] md:p-14">
        <div><p className="eyebrow text-[hsl(var(--primary))]">The right start</p><h2 className="serif mt-4 text-4xl font-semibold leading-tight md:text-5xl">Your home.<br/>Your call.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">Get a clear preliminary range based on what you’re considering. Then, if it feels right, we’ll put together a personal quote around your home and your plans.</p><Link href="/quote" className="btn-primary mt-7" data-testid="link-estimate-cta">Build your estimate <ArrowRight size={16}/></Link></div>
        <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl bg-[#b8c5b7] p-8">
          <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full border border-white/35"/><div className="absolute -right-3 -top-7 h-56 w-56 rounded-full border border-white/30"/>
          <div className="relative w-full max-w-[390px] border-[10px] border-[#31463f] bg-[#e8e5d8] p-3 shadow-[0_24px_50px_rgba(42,59,50,.2)]"><div className="grid aspect-[1.55] grid-cols-2 gap-2 bg-[#31463f] p-2"><div className="bg-gradient-to-br from-[#dde6db] to-[#91a99a]"/><div className="bg-gradient-to-br from-[#e7dfca] to-[#aab8a3]"/></div></div>
          <div className="absolute bottom-5 left-5 rounded-full bg-[#f8f4eb] px-4 py-2 text-xs font-semibold text-[#304b43]"><Check size={14} className="mr-1 inline"/> No pressure, ever</div>
        </div>
      </div>
    </section>
    <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-10">
        <div><p className="eyebrow text-[hsl(var(--muted-foreground))]">A neighborly kind of service</p><p className="serif mt-2 text-2xl font-bold">People who answer the phone. Installers who leave it tidy.</p></div>
        <Link href="/quote" className="btn-secondary" data-testid="link-bottom-quote">Let's talk about your project <ArrowRight size={16}/></Link>
      </div>
    </section>
    <Footer businessName={businessName} phone={phone}/>
  </main>;
}
