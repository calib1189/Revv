"use client";

import { useState } from "react";
import type { ReactionSummary } from "@/lib/reactions";
import { CommentReactions } from "@/features/reactions/comment-reactions";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { rankForScore, tierColorVar } from "@/lib/rating/rank";
import { DeleteCommentButton } from "@/features/feed/delete-comment-button";
import { CommentForm } from "@/features/feed/comment-form";
import { ReportButton } from "@/features/feed/report-button";
import { CommentIcon } from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { relativeTime } from "@/lib/format/relative-time";
import type { Comment } from "@/lib/db/comments";

export interface CommentWithAuthor extends Comment {
  authorUsername: string;
  /** Null when they haven't set one — falls back to @username. */
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  authorIsVerified: boolean;
  /** Highest ai_rating_score across the commenter's own vehicles' active
   * builds (see lib/rating/best-build-scores.ts) — null if they have no
   * rated build, in which case no ring is drawn. */
  authorRatingScore: number | null;
  /** Everyone's reactions, and the viewer's own. */
  reactions: ReactionSummary;
}

/** Replies shown under a comment before the rest fold behind "View more". */
const VISIBLE_REPLIES = 2;

export function CommentList({
  comments,
  postId,
  currentUserId,
  onCommentPosted,
  onReplyRequested,
}: {
  comments: CommentWithAuthor[];
  postId: string;
  currentUserId: string | null;
  /** The feed's comment sheet fetches its own comment list imperatively
   * (not via the page's normal server render), so posting or deleting a
   * comment there needs an explicit refresh — this is that hook. */
  onCommentPosted?: () => void;
  /** When set, Reply hands the comment to the caller (the feed's sheet
   * moves its single bottom input into reply mode) instead of opening an
   * inline form under the comment, which is what /p/[postId] uses. */
  onReplyRequested?: (comment: CommentWithAuthor) => void;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.06] text-muted">
          <CommentIcon className="h-6 w-6" />
        </span>
        <p className="text-[0.9375rem] font-semibold text-foreground">No comments yet</p>
        <p className="text-[0.8125rem] text-muted">Be the first to say something.</p>
      </div>
    );
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, CommentWithAuthor[]>();
  for (const comment of comments) {
    if (!comment.parent_id) continue;
    const siblings = repliesByParent.get(comment.parent_id) ?? [];
    siblings.push(comment);
    repliesByParent.set(comment.parent_id, siblings);
  }

  return (
    <ul className="flex flex-col gap-6">
      {topLevel.map((comment) => {
        const replies = repliesByParent.get(comment.id) ?? [];
        const isReplying = replyingTo === comment.id;
        const showAll = expanded.has(comment.id);
        const visibleReplies = showAll ? replies : replies.slice(0, VISIBLE_REPLIES);
        const hidden = replies.length - visibleReplies.length;

        return (
          <li key={comment.id} className="animate-rise-in flex flex-col gap-3.5">
            <CommentRow
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
              onDeleted={onCommentPosted}
              onReply={
                currentUserId
                  ? () =>
                      onReplyRequested
                        ? onReplyRequested(comment)
                        : setReplyingTo(isReplying ? null : comment.id)
                  : undefined
              }
            />

            {visibleReplies.length > 0 && (
              <ul className="ml-12 flex flex-col gap-3.5">
                {visibleReplies.map((reply) => (
                  <li key={reply.id}>
                    <CommentRow
                      comment={reply}
                      postId={postId}
                      currentUserId={currentUserId}
                      onDeleted={onCommentPosted}
                      compact
                    />
                  </li>
                ))}
              </ul>
            )}

            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((s) => new Set(s).add(comment.id))}
                className="ml-12 flex items-center gap-2 text-[0.8125rem] font-semibold text-muted hover:text-foreground"
              >
                <span className="h-px w-6 bg-border" />
                View {hidden} more {hidden === 1 ? "reply" : "replies"}
              </button>
            )}

            {isReplying && !onReplyRequested && (
              <div className="ml-12">
                <CommentForm
                  postId={postId}
                  parentId={comment.id}
                  autoFocus
                  onPosted={() => {
                    setReplyingTo(null);
                    onCommentPosted?.();
                  }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CommentRow({
  comment,
  postId,
  currentUserId,
  onReply,
  onDeleted,
  compact = false,
}: {
  comment: CommentWithAuthor;
  postId: string;
  currentUserId: string | null;
  onReply?: () => void;
  onDeleted?: () => void;
  compact?: boolean;
}) {
  const size = compact ? 28 : 36;
  const inner = compact ? "h-[23px] w-[23px] text-[0.625rem]" : "h-[30px] w-[30px] text-xs";
  const bare = compact ? "h-7 w-7 text-[0.625rem]" : "h-9 w-9 text-xs";

  return (
    <div className="flex items-start gap-3">
      <Link href={`/u/${comment.authorUsername}`} className="flex-shrink-0">
        {comment.authorRatingScore != null ? (
          <ProgressRing
            value={comment.authorRatingScore / 100}
            size={size}
            stroke={2}
            color={tierColorVar(rankForScore(comment.authorRatingScore))}
          >
            <Avatar username={comment.authorUsername} avatarUrl={comment.authorAvatarUrl} className={inner} />
          </ProgressRing>
        ) : (
          <Avatar username={comment.authorUsername} avatarUrl={comment.authorAvatarUrl} className={bare} />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[0.8125rem]">
          <Link
            href={`/u/${comment.authorUsername}`}
            className="flex min-w-0 items-center gap-1 font-semibold text-muted hover:text-foreground"
          >
            <span className="truncate">{comment.authorDisplayName || comment.authorUsername}</span>
            {comment.authorIsVerified && <VerifiedBadge className="h-[13px] w-[13px]" />}
          </Link>
          <span className="flex-shrink-0 text-muted/70" suppressHydrationWarning>
            {relativeTime(comment.created_at)}
          </span>
        </p>
        <p className="mt-0.5 whitespace-pre-line break-words text-[0.9375rem] leading-snug text-foreground">
          {comment.body}
        </p>
        <div className="mt-1.5 flex items-center gap-4 text-[0.8125rem] font-semibold text-muted">
          {onReply && (
            <button type="button" onClick={onReply} className="hover:text-foreground">
              Reply
            </button>
          )}
          {currentUserId === comment.author_id ? (
            <DeleteCommentButton commentId={comment.id} postId={postId} onDeleted={onDeleted} />
          ) : (
            currentUserId && <ReportButton targetType="comment" targetId={comment.id} />
          )}
          <CommentReactions commentId={comment.id} initial={comment.reactions} canReact={Boolean(currentUserId)} />
        </div>
      </div>
    </div>
  );
}
