"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { rankForScore, tierColorVar } from "@/lib/rating/rank";
import { DeleteCommentButton } from "@/features/feed/delete-comment-button";
import { CommentForm } from "@/features/feed/comment-form";
import { ReportButton } from "@/features/feed/report-button";
import { relativeTime } from "@/lib/format/relative-time";
import type { Comment } from "@/lib/db/comments";

export interface CommentWithAuthor extends Comment {
  authorUsername: string;
  /** Null when they haven't set one — falls back to @username. */
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  /** Highest ai_rating_score across the commenter's own vehicles' active
   * builds (see lib/rating/best-build-scores.ts) — null if they have no
   * rated build, in which case RankFrame renders no badge at all. */
  authorRatingScore: number | null;
}

export function CommentList({
  comments,
  postId,
  currentUserId,
  onCommentPosted,
}: {
  comments: CommentWithAuthor[];
  postId: string;
  currentUserId: string | null;
  /** The feed's comment sheet fetches its own comment list imperatively
   * (not via the page's normal server render), so posting or deleting a
   * comment there needs an explicit refresh — this is that hook. Unused
   * on /p/[postId], where the form-action's own implicit page refresh
   * already covers posting, and a delete there triggers the same. */
  onCommentPosted?: () => void;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  if (comments.length === 0) {
    return <p className="py-6 text-center text-[0.9375rem] text-muted">No comments yet. Start the conversation.</p>;
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
    <ul className="flex flex-col gap-5">
      {topLevel.map((comment) => {
        const replies = repliesByParent.get(comment.id) ?? [];
        const isReplying = replyingTo === comment.id;

        return (
          <li key={comment.id} className="flex flex-col gap-3">
            <CommentRow
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
              onDeleted={onCommentPosted}
              onReply={
                currentUserId
                  ? () => setReplyingTo(isReplying ? null : comment.id)
                  : undefined
              }
            />

            {replies.length > 0 && (
              <ul className="ml-[3.25rem] flex flex-col gap-4">
                {replies.map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    currentUserId={currentUserId}
                    onDeleted={onCommentPosted}
                  />
                ))}
              </ul>
            )}

            {isReplying && (
              <div className="ml-[3.25rem]">
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
}: {
  comment: CommentWithAuthor;
  postId: string;
  currentUserId: string | null;
  onReply?: () => void;
  onDeleted?: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Link href={`/u/${comment.authorUsername}`} className="flex-shrink-0">
        {comment.authorRatingScore != null ? (
          <ProgressRing
            value={comment.authorRatingScore / 100}
            size={40}
            stroke={2.5}
            color={tierColorVar(rankForScore(comment.authorRatingScore))}
          >
            <Avatar username={comment.authorUsername} avatarUrl={comment.authorAvatarUrl} className="h-[33px] w-[33px] text-xs" />
          </ProgressRing>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center">
            <Avatar username={comment.authorUsername} avatarUrl={comment.authorAvatarUrl} className="h-[34px] w-[34px] text-xs" />
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[0.9375rem] leading-snug">
          <Link href={`/u/${comment.authorUsername}`} className="font-semibold">
            {comment.authorDisplayName || comment.authorUsername}
          </Link>{" "}
          <span className="break-words">{comment.body}</span>
        </p>
        <div className="mt-1 flex items-center gap-3.5">
          <span className="text-[0.75rem] text-muted" suppressHydrationWarning>
            {relativeTime(comment.created_at)}
          </span>
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="text-[0.75rem] font-semibold text-muted hover:text-foreground"
            >
              Reply
            </button>
          )}
          {currentUserId === comment.author_id ? (
            <DeleteCommentButton
              commentId={comment.id}
              postId={postId}
              onDeleted={onDeleted}
            />
          ) : (
            currentUserId && <ReportButton targetType="comment" targetId={comment.id} />
          )}
        </div>
      </div>
    </div>
  );
}
