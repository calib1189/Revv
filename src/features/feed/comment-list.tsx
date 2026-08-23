import { Avatar } from "@/features/feed/avatar";
import { DeleteCommentButton } from "@/features/feed/delete-comment-button";
import { relativeTime } from "@/lib/format/relative-time";
import type { Comment } from "@/lib/db/comments";

export interface CommentWithAuthor extends Comment {
  authorUsername: string;
}

export function CommentList({
  comments,
  postId,
  currentUserId,
}: {
  comments: CommentWithAuthor[];
  postId: string;
  currentUserId: string | null;
}) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted">No comments yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3">
          <Avatar username={comment.authorUsername} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">@{comment.authorUsername}</span>{" "}
              {comment.body}
            </p>
            <div className="mt-0.5 flex items-center gap-3">
              <span className="text-xs text-muted">
                {relativeTime(comment.created_at)}
              </span>
              {currentUserId === comment.author_id && (
                <DeleteCommentButton commentId={comment.id} postId={postId} />
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
