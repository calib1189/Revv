"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Avatar } from "@/features/feed/avatar";
import { ReportButton } from "@/features/feed/report-button";
import { deleteShopReviewAction, replyToShopReviewAction, saveShopReviewAction } from "@/features/shops/review-actions";
import type { ReviewEntry } from "@/lib/shops/compose-reviews";
import {
  MAX_OWNER_REPLY,
  MAX_REVIEW_BODY,
  MAX_REVIEW_SERVICE,
  type ReviewSummary,
  type StarCount,
} from "@/lib/shops/reviews";
import { relativeTime } from "@/lib/format/relative-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarIcon } from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";

const STAR_COLOR = "#f0cd6e";
const BEEN_HERE_SHOWN = 7;

export interface ReviewViewer {
  id: string;
  isOwner: boolean;
  garage: { id: string; title: string }[];
}

function Stars({ value, className = "h-3.5 w-3.5" }: { value: number; className?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={className} style={{ color: n <= Math.round(value) ? STAR_COLOR : "var(--border)" }} />
      ))}
    </span>
  );
}

/** SORZA's own reviews of a shop, plus the "been here" row of everyone
 * who's reviewed it. Reads composed rows from the page; writes through
 * review-actions.ts. */
export function ShopReviews({
  placeId,
  shopName,
  summary,
  reviews,
  viewer,
  services,
  loginHref,
}: {
  placeId: string;
  shopName: string;
  summary: ReviewSummary;
  reviews: ReviewEntry[];
  viewer: ReviewViewer | null;
  /** The owner's services, offered as quick picks for "what you got done". */
  services: string[];
  loginHref: string;
}) {
  const own = viewer ? reviews.find((r) => r.authorId === viewer.id) : undefined;
  const [isWriting, setIsWriting] = useState(false);
  const others = reviews.filter((r) => r.authorId !== viewer?.id);
  const canReview = viewer !== null && !viewer.isOwner;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <h2 className="text-[1.25rem] font-bold tracking-[-0.01em]">Reviews</h2>
        {summary.count > 0 && (
          <span className="text-[0.8125rem] text-muted">
            {summary.count} on SORZA
          </span>
        )}
      </div>

      {summary.count > 0 && summary.average !== null && (
        <div className="glass-raised elev-1 mb-4 flex items-center gap-5 rounded-[22px] p-5">
          <div className="flex-shrink-0 text-center">
            <p className="numeral text-[2.75rem] font-bold leading-none tracking-[-0.03em]">{summary.average.toFixed(1)}</p>
            <div className="mt-2 flex justify-center">
              <Stars value={summary.average} />
            </div>
          </div>
          <ul className="flex min-w-0 flex-1 flex-col gap-1">
            {([5, 4, 3, 2, 1] as StarCount[]).map((star) => (
              <li key={star} className="flex items-center gap-2 text-[0.75rem] text-muted">
                <span className="numeral w-2 text-right">{star}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(summary.distribution[star] / summary.count) * 100}%`,
                      background: STAR_COLOR,
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviews.length > 0 && <BeenHere reviews={reviews} />}

      {canReview &&
        (isWriting ? (
          <ReviewForm
            placeId={placeId}
            shopName={shopName}
            garage={viewer.garage}
            services={services}
            existing={own}
            onDone={() => setIsWriting(false)}
          />
        ) : (
          !own && (
            <Button type="button" onClick={() => setIsWriting(true)} className="mb-4 h-11 w-full text-[0.9375rem] font-semibold">
              Write a review
            </Button>
          )
        ))}

      {!viewer && (
        <Link
          href={loginHref}
          className="pressable mb-4 flex h-11 w-full items-center justify-center rounded-full bg-foreground/[0.08] text-[0.9375rem] font-semibold"
        >
          Log in to write a review
        </Link>
      )}

      {reviews.length === 0 ? (
        !isWriting && (
          <p className="glass-raised elev-1 rounded-[22px] px-5 py-6 text-center text-[0.875rem] leading-relaxed text-muted">
            No reviews on SORZA yet.
            {canReview ? " Been here? Be the first to say how it went." : ""}
          </p>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {own && !isWriting && (
            <ReviewCard
              review={own}
              placeId={placeId}
              viewer={viewer}
              isOwn
              onEdit={() => setIsWriting(true)}
            />
          )}
          {others.map((review) => (
            <ReviewCard key={review.id} review={review} placeId={placeId} viewer={viewer} isOwn={false} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BeenHere({ reviews }: { reviews: ReviewEntry[] }) {
  const shown = reviews.slice(0, BEEN_HERE_SHOWN);
  const extra = reviews.length - shown.length;
  return (
    <div className="mb-4 flex items-center gap-3 px-1">
      <div className="flex -space-x-2.5">
        {shown.map((r) => (
          <Link key={r.id} href={`/u/${r.username}`} className="rounded-full ring-2 ring-background" title={`@${r.username}`}>
            <Avatar username={r.username} avatarUrl={r.avatarUrl} className="h-9 w-9 text-sm" />
          </Link>
        ))}
        {extra > 0 && (
          <span className="numeral flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-[0.75rem] font-semibold ring-2 ring-background">
            +{extra}
          </span>
        )}
      </div>
      <p className="min-w-0 text-[0.8125rem] text-muted">
        {reviews.length === 1 ? "1 person has" : `${reviews.length} people have`} been here
      </p>
    </div>
  );
}

function ReviewCard({
  review,
  placeId,
  viewer,
  isOwn,
  onEdit,
}: {
  review: ReviewEntry;
  placeId: string;
  viewer: ReviewViewer | null;
  isOwn: boolean;
  onEdit?: () => void;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [reply, setReply] = useState(review.ownerReply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm("Delete your review?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteShopReviewAction({ reviewId: review.id, placeId });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleReply() {
    setError(null);
    startTransition(async () => {
      const result = await replyToShopReviewAction({ reviewId: review.id, placeId, reply });
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsReplying(false);
      router.refresh();
    });
  }

  return (
    <li className="glass-raised elev-1 rounded-[22px] p-4">
      <div className="flex items-start gap-3">
        <Link href={`/u/${review.username}`} className="flex-shrink-0">
          <Avatar username={review.username} avatarUrl={review.avatarUrl} className="h-10 w-10 text-sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/u/${review.username}`} className="truncate text-[0.9375rem] font-semibold">
              @{review.username}
            </Link>
            {review.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
            {isOwn && (
              <span className="rounded-full bg-foreground/[0.08] px-2 py-0.5 text-[0.6875rem] font-semibold text-muted">
                You
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted">
            <Stars value={review.rating} className="h-3 w-3" />
            <span>
              {relativeTime(review.createdAt)}
              {review.edited ? " · edited" : ""}
            </span>
          </div>
        </div>
      </div>

      {(review.service || review.vehicleTitle) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {review.service && (
            <span className="rounded-full bg-accent/12 px-3 py-1 text-[0.75rem] font-semibold text-accent">
              {review.service}
            </span>
          )}
          {review.vehicleTitle && review.vehicleId && (
            <Link
              href={`/garage/${review.vehicleId}`}
              className="flex min-w-0 items-center gap-2 rounded-full bg-foreground/[0.06] py-1 pl-1 pr-3 text-[0.75rem] font-medium"
            >
              {review.carPhotoUrl ? (
                <span className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full">
                  <Image src={review.carPhotoUrl} alt="" fill sizes="48px" className="object-cover" />
                </span>
              ) : (
                <span className="h-6 w-6 flex-shrink-0 rounded-full bg-foreground/10" />
              )}
              <span className="truncate">{review.vehicleTitle}</span>
              {review.carScore !== null && (
                <span className="numeral flex-shrink-0 text-muted">{review.carScore.toFixed(2)}</span>
              )}
            </Link>
          )}
        </div>
      )}

      {review.body && (
        <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed">{review.body}</p>
      )}

      {review.ownerReply && !isReplying && (
        <div className="mt-3 rounded-[16px] bg-foreground/[0.05] px-4 py-3">
          <p className="text-[0.75rem] font-semibold text-muted">Reply from the shop</p>
          <p className="mt-1 whitespace-pre-line text-[0.875rem] leading-relaxed">{review.ownerReply}</p>
        </div>
      )}

      {isReplying && (
        <div className="mt-3 flex flex-col gap-2">
          <Textarea
            rows={3}
            maxLength={MAX_OWNER_REPLY}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Thank them, or answer what they said"
            aria-label="Your reply"
          />
          <div className="flex gap-2">
            <Button type="button" disabled={isPending} onClick={handleReply} className="h-9 px-4 py-0 text-[0.8125rem] font-semibold">
              {isPending ? "Saving…" : "Post reply"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                setIsReplying(false);
                setReply(review.ownerReply ?? "");
              }}
              className="h-9 px-4 py-0 text-[0.8125rem] font-semibold"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-[0.8125rem]">
        {viewer?.isOwner && !isReplying && (
          <button type="button" onClick={() => setIsReplying(true)} className="font-semibold text-accent">
            {review.ownerReply ? "Edit reply" : "Reply"}
          </button>
        )}
        {isOwn && (
          <>
            <button type="button" onClick={onEdit} className="font-semibold text-accent">
              Edit
            </button>
            <button type="button" onClick={handleDelete} disabled={isPending} className="text-muted">
              Delete
            </button>
          </>
        )}
        {viewer && !isOwn && (
          <div className="ml-auto text-muted">
            <ReportButton targetType="shop_review" targetId={review.id} />
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-[0.8125rem] text-danger">{error}</p>}
    </li>
  );
}

function ReviewForm({
  placeId,
  shopName,
  garage,
  services,
  existing,
  onDone,
}: {
  placeId: string;
  shopName: string;
  garage: { id: string; title: string }[];
  services: string[];
  existing?: ReviewEntry;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [service, setService] = useState(existing?.service ?? "");
  const [vehicleId, setVehicleId] = useState(existing?.vehicleId ?? garage[0]?.id ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveShopReviewAction({
        placeId,
        rating,
        service,
        body,
        vehicleId: vehicleId || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-raised elev-1 mb-4 flex flex-col gap-5 rounded-[22px] p-5">
      <div>
        <p className="text-[1.0625rem] font-semibold">{existing ? "Edit your review" : `Review ${shopName}`}</p>
        <div className="mt-3 flex gap-1.5" role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => setRating(n)}
              className="rounded-full p-1"
            >
              <StarIcon className="h-8 w-8" style={{ color: n <= rating ? STAR_COLOR : "var(--border)" }} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="review-service">What did you get done?</Label>
        {services.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {services.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setService(service === s ? "" : s)}
                className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ${
                  service === s ? "bg-accent text-accent-foreground" : "bg-foreground/[0.08]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <Input
          id="review-service"
          value={service}
          maxLength={MAX_REVIEW_SERVICE}
          onChange={(e) => setService(e.target.value)}
          placeholder="Tint, exhaust, oil change…"
        />
      </div>

      {garage.length > 0 && (
        <div>
          <Label htmlFor="review-car">Which car?</Label>
          <select
            id="review-car"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="glass-inset w-full rounded-[14px] px-4 py-3 text-foreground transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
          >
            {garage.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
            <option value="">Don&apos;t show a car</option>
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="review-body">Your review</Label>
        <Textarea
          id="review-body"
          rows={4}
          maxLength={MAX_REVIEW_BODY}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="How was the work, the price, the turnaround?"
        />
      </div>

      {error && <p className="text-[0.8125rem] text-danger">{error}</p>}

      <div className="flex gap-2.5">
        <Button type="submit" disabled={isPending || rating === 0} className="h-11 flex-1 text-[0.9375rem] font-semibold">
          {isPending ? "Posting…" : existing ? "Save review" : "Post review"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={onDone} className="h-11 px-5 text-[0.9375rem] font-semibold">
          Cancel
        </Button>
      </div>
    </form>
  );
}
