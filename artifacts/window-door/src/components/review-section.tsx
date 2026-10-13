import { Check, Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListReviewsQueryKey, useCreateReview, useListReviews, type Review } from '@workspace/api-client-react';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return <div className="flex gap-1 text-[#d9a760]">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} className={i < rating ? 'fill-current' : 'text-[hsl(var(--muted-foreground))]'}/>)}</div>;
}

export function ReviewSection() {
  const queryClient = useQueryClient();
  const reviews = useListReviews({ query: { queryKey: getListReviewsQueryKey() } });
  const createReview = useCreateReview({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() }); } } });
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !comment.trim() || createReview.isPending) return;
    setError('');
    setSubmitted(false);
    try {
      await createReview.mutateAsync({ data: { name: name.trim(), rating, comment: comment.trim() } });
      setName('');
      setComment('');
      setRating(5);
      setHover(0);
      setSubmitted(true);
    } catch {
      setError('We couldn’t post your review. Try again in a moment.');
    }
  };

  return <section id="reviews" className="mx-auto max-w-full px-5 py-16 md:px-10 md:py-24">
    <div className="grid gap-10 lg:grid-cols-[1fr_1.9fr] lg:gap-16">
      <div>
        <p className="eyebrow text-[hsl(var(--primary))]">Word of mouth</p>
        <h2 className="serif mt-3 text-4xl font-semibold tracking-tight md:text-5xl">The light got in.</h2>
        <p className="mt-4 max-w-sm text-sm leading-7 text-[hsl(var(--muted-foreground))]">Clients tell it better than we can. If your windows or doors made a difference, share the experience.</p>
        <form onSubmit={submit} className="mt-8 rounded-2xl bg-[hsl(var(--secondary))] p-6 md:p-7" data-testid="form-review-submit">
          <div className="mb-5">
            <p className="mb-2 text-sm font-bold">Your rating</p>
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, i) => <button key={i + 1} type="button" aria-label={`Rate ${i + 1} star${i ? 's' : ''}`} onMouseEnter={() => setHover(i + 1)} onMouseLeave={() => setHover(0)} onClick={() => setRating(i + 1)} className={(hover || rating) >= i + 1 ? 'fill-current text-[#d9a760]' : 'text-[hsl(var(--muted-foreground))]'} data-testid={`star-rating-${i + 1}`}><Star size={22}/></button>)}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={120} required className="field" data-testid="input-review-name"/>
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold">Your experience</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="What did we install, and how did it turn out?" maxLength={1200} required className="field resize-none" data-testid="input-review-comment"></textarea>
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-[hsl(var(--destructive))]" data-testid="status-review-error">{error}</p>}
          {submitted && <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-[hsl(var(--primary))]" data-testid="status-review-success"><Check size={14}/> Thanks! Your review is live.</p>}
          <button type="submit" disabled={createReview.isPending} className="btn-primary mt-5 w-full" data-testid="button-review-submit">{createReview.isPending ? 'Posting…' : 'Post review'}</button>
        </form>
      </div>
      <div>
        {reviews.isLoading ? <div className="grid gap-4 sm:grid-cols-2"><div className="h-44 animate-pulse rounded-2xl bg-[hsl(var(--muted))]"/><div className="h-44 animate-pulse rounded-2xl bg-[hsl(var(--muted))]"/></div> : reviews.isError ? <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7" role="alert"><p className="font-semibold">Reviews are taking a moment to load.</p><button className="mt-3 text-sm font-bold underline" onClick={() => reviews.refetch()} data-testid="button-retry-reviews">Try again</button></div> : reviews.data?.length ? <ul className="grid gap-4 sm:grid-cols-2">{reviews.data.map((review: Review) => <li key={review.id} data-testid={`card-review-${review.id}`} className="flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm"><Stars rating={review.rating}/><blockquote className="mt-4 flex-1 text-sm leading-6 text-[hsl(var(--foreground))]">“{review.comment}”</blockquote><figcaption className="mt-5 border-t border-[hsl(var(--border))] pt-4"><p className="text-sm font-bold">{review.name}</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{formatDate(review.createdAt)}</p></figcaption></li>)}</ul> : <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] text-center" data-testid="empty-reviews"><div className="p-8"><p className="serif text-xl font-bold">No reviews yet.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Be the first to tell the neighborhood.</p></div></div>}
      </div>
    </div>
  </section>;
}