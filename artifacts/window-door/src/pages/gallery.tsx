import { useGetBusinessSettings } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Footer, Header } from './home';

const galleryShots = [
  { src: 'gallery-1.jpg', alt: 'Newly installed replacement windows', tall: true },
  { src: 'gallery-2.jpg', alt: 'Finished window installation' },
  { src: 'gallery-3.jpg', alt: 'Exterior view of installed windows' },
  { src: 'gallery-4.jpg', alt: 'Replacement window detail' },
  { src: 'gallery-5.jpg', alt: 'A completed installation up close' },
  { src: 'gallery-6.jpg', alt: 'Freshly fitted window frame' },
  { src: 'gallery-7.jpg', alt: 'Window replacement project' },
  { src: 'gallery-8.jpg', alt: 'Installed windows in place' },
  { src: 'gallery-9.jpg', alt: 'Another finished installation' },
];

export default function GalleryPage() {
  const settings = useGetBusinessSettings();
  const [open, setOpen] = useState<number | null>(null);
  const businessName = settings.data?.businessName || 'LopezXconstruction';
  const phone = settings.data?.phone || '(555) 014-2080';
  const selected = open !== null ? galleryShots[open] : null;
  const close = () => setOpen(null);
  const prev = (current: number) => setOpen((current + galleryShots.length - 1) % galleryShots.length);
  const next = (current: number) => setOpen((current + 1) % galleryShots.length);
  return <main className="min-h-[100dvh]">
    <Header businessName={businessName}/>
    <section className="mx-auto max-w-full px-5 py-16 md:px-10 md:py-20">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow text-[hsl(var(--primary))]">Recent installations</p><h1 className="serif mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Our work.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">A closer look at some of the homes we've had the pleasure to help since the first measure.</p></div><Link href="/quote" className="btn-primary" data-testid="link-gallery-quote">Start your project <ArrowRight size={16}/></Link></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {galleryShots.map((shot, i) => <figure key={shot.src} role="button" tabIndex={0} aria-label={`View ${shot.alt}`} onClick={() => setOpen(i)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen(i); } }} className={`group relative cursor-zoom-in overflow-hidden rounded-2xl bg-[#e9e5da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))] ${shot.tall ? 'min-h-[420px] sm:row-span-2' : 'aspect-[4/3]'}`} data-testid={`gallery-item-${shot.src}`}>
          <img src={`${import.meta.env.BASE_URL}gallery/${shot.src}`} alt={shot.alt} loading={i < 6 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"/>
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"><span className="flex items-center gap-2 rounded-full bg-[#f8f4eb] px-4 py-1.5 text-xs font-semibold text-[#304b43]">View <ChevronRight size={14}/></span></div>
        </figure>)}
      </div>
    </section>
    <Dialog open={open !== null} onOpenChange={(isOpen) => { if (!isOpen) close(); }}>
      <DialogContent className="max-w-[min(1120px,94vw)] border-0 bg-[#141a17]/95 p-0 text-white shadow-none sm:rounded-2xl" data-testid="gallery-lightbox">
        <div className="relative flex min-h-[240px] items-center justify-center">
          {selected && <img src={`${import.meta.env.BASE_URL}gallery/${selected.src}`} alt={selected.alt} className="max-h-[82vh] w-auto max-w-full object-contain"/>}
          <button type="button" onClick={() => prev(open as number)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#f8f4eb]/90 text-[#304b43] shadow-md transition-transform hover:scale-105" data-testid="button-gallery-prev"><ChevronLeft size={20}/></button>
          <button type="button" onClick={() => next(open as number)} aria-label="Next photo" className="absolute right-16 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#f8f4eb]/90 text-[#304b43] shadow-md transition-transform hover:scale-105 md:right-3" data-testid="button-gallery-next"><ChevronRight size={20}/></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70">{selected && `${open !== null ? open + 1 : ''} / ${galleryShots.length} · ${selected.alt}`}</div>
        </div>
        <DialogTitle className="sr-only">{selected?.alt || 'Gallery photo'}</DialogTitle>
        <DialogDescription className="sr-only">Full-size view of {selected?.alt || 'gallery photo'}</DialogDescription>
      </DialogContent>
    </Dialog>
    <Footer businessName={businessName} phone={phone}/>
  </main>;
}