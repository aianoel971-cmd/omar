import { Link } from 'wouter';
import { ArrowLeft, DoorOpen } from 'lucide-react';

export default function NotFound() {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] px-5 py-12">
    <section className="w-full max-w-xl text-center">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="mx-auto h-20 w-20"/>
      <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><DoorOpen size={29}/></div>
      <p className="eyebrow mt-7 text-[hsl(var(--muted-foreground))]">LopezXconstruction / Not found</p>
      <h1 className="serif mt-3 text-4xl font-semibold tracking-tight md:text-5xl">This isn’t the<br/>right doorway.</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">The page may have moved, or the address may be incomplete. Let’s get you back to a good place.</p>
      <Link href="/" className="btn-primary mt-7" data-testid="link-not-found-home"><ArrowLeft size={16}/> Back to home</Link>
    </section>
  </main>;
}
