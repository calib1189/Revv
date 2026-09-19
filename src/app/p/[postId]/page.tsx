import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getPostById } from "@/lib/db/posts";
import { getProfileByUserId, getProfilesByIds } from "@/lib/db/profiles";
import { getVehicleById } from "@/lib/db/vehicles";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { getLikeCount, getLikedPostIds } from "@/lib/db/likes";
import { getSavedPostIds } from "@/lib/db/saves";
import { getViewCount, recordPostView } from "@/lib/db/post-views";
import { listCommentsByPost } from "@/lib/db/comments";
import { getBestRatingScoresByOwnerIds } from "@/lib/rating/best-build-scores";
import { getSoundById, publicSoundUrl } from "@/lib/db/sounds";
import { Avatar } from "@/features/feed/avatar";
import { CaptionText } from "@/features/feed/caption-text";
import { EyeIcon, MusicIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { VideoPlayer } from "@/features/feed/video-player";
import { PostPhotoView } from "@/features/feed/post-photo-view";
import { PostSoundPlayer } from "@/features/feed/post-sound-player";
import { listHotspotsForMedia } from "@/lib/db/hotspots";
import { getActiveBuild } from "@/lib/db/builds";
import { listBuildParts } from "@/lib/db/build-parts";
import { getPartsByIds } from "@/lib/db/parts";
import { LikeButton } from "@/features/feed/like-button";
import { SaveButton } from "@/features/feed/save-button";
import { CommentList } from "@/features/feed/comment-list";
import { CommentForm } from "@/features/feed/comment-form";
import { DeletePostButton } from "@/features/feed/delete-post-button";
import { ReportButton } from "@/features/feed/report-button";
import { relativeTime } from "@/lib/format/relative-time";
import { SectionTitle } from "@/components/ui/grouped-list";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();

  const [post, user] = await Promise.all([
    getPostById(supabase, postId),
    getCurrentUser(),
  ]);
  if (!post) notFound();

  const [author, vehicle, postMedia, likeCount, comments, sound] = await Promise.all([
    getProfileByUserId(supabase, post.author_id),
    post.vehicle_id ? getVehicleById(supabase, post.vehicle_id) : null,
    listPostMediaForPosts(supabase, [post.id]),
    getLikeCount(supabase, post.id),
    listCommentsByPost(supabase, post.id),
    post.sound_id ? getSoundById(supabase, post.sound_id) : null,
  ]);
  // Only a photo post actually needs the audio played here — a video's
  // own native track plays unchanged (same split as swipe-slide.tsx).
  // The attribution chip below still shows for either post type.
  const soundUrl = sound && post.post_type === "photo" ? publicSoundUrl(supabase, sound.storage_path) : null;

  if (user) {
    try {
      await recordPostView(supabase, post.id, user.id);
    } catch {
      // best-effort only
    }
  }
  const viewCount = await getViewCount(supabase, post.id);

  const commentAuthorIds = [...new Set(comments.map((c) => c.author_id))];

  const [likedIds, savedIds, commentAuthors, commentAuthorScores] = await Promise.all([
    user ? getLikedPostIds(supabase, user.id, [post.id]) : Promise.resolve(new Set<string>()),
    user ? getSavedPostIds(supabase, user.id, [post.id]) : Promise.resolve(new Set<string>()),
    getProfilesByIds(supabase, commentAuthorIds),
    getBestRatingScoresByOwnerIds(supabase, commentAuthorIds),
  ]);

  const commentAuthorById = new Map(commentAuthors.map((p) => [p.id, p]));
  const commentAuthorAvatarIds = commentAuthors
    .map((p) => p.avatar_media_id)
    .filter((id): id is string => Boolean(id));
  const commentAuthorAvatarMedia = await getMediaByIds(supabase, commentAuthorAvatarIds);
  const commentAvatarUrlByMediaId = new Map(
    commentAuthorAvatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  const commentsWithAuthor = comments.map((c) => {
    const authorProfile = commentAuthorById.get(c.author_id);
    return {
      ...c,
      authorUsername: authorProfile?.username ?? "unknown",
      authorDisplayName: authorProfile?.display_name ?? null,
      authorAvatarUrl: authorProfile?.avatar_media_id
        ? (commentAvatarUrlByMediaId.get(authorProfile.avatar_media_id) ?? null)
        : null,
      authorRatingScore: commentAuthorScores.get(c.author_id) ?? null,
    };
  });

  const isOwner = user?.id === post.author_id;
  const vehicleTitle = vehicle
    ? vehicle.nickname || `${vehicle.make} ${vehicle.model}`
    : null;

  const mediaIds = postMedia.map((pm) => pm.media_id);
  const [hotspots, activeBuild] = await Promise.all([
    post.post_type === "photo"
      ? listHotspotsForMedia(supabase, mediaIds)
      : Promise.resolve([]),
    vehicle ? getActiveBuild(supabase, vehicle.id) : Promise.resolve(null),
  ]);

  const buildParts = activeBuild
    ? await listBuildParts(supabase, activeBuild.id)
    : [];
  const buildPartById = new Map(buildParts.map((bp) => [bp.id, bp]));
  const linkedParts = await getPartsByIds(
    supabase,
    buildParts.map((bp) => bp.part_id).filter((id): id is string => Boolean(id)),
  );
  const partById = new Map(linkedParts.map((p) => [p.id, p]));

  const photosWithHotspots = postMedia.map((pm) => ({
    mediaId: pm.media_id,
    url: publicMediaUrl(supabase, pm.media.storage_path),
    hotspots: hotspots
      .filter((h) => h.media_id === pm.media_id)
      .map((h) => {
        const buildPart = buildPartById.get(h.build_part_id);
        if (!buildPart) return null;
        return {
          id: h.id,
          x: h.x,
          y: h.y,
          buildPart,
          linkedPart: buildPart.part_id ? (partById.get(buildPart.part_id) ?? null) : null,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null),
  }));

  const authorAvatarMedia = author?.avatar_media_id
    ? await getMediaByIds(supabase, [author.avatar_media_id]).catch(() => [])
    : [];
  const authorAvatarUrl = authorAvatarMedia[0]
    ? publicMediaUrl(supabase, authorAvatarMedia[0].storage_path)
    : null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="glass-raised elev-2 overflow-hidden rounded-[28px]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/u/${author?.username ?? "unknown"}`} className="flex-shrink-0">
            <Avatar
              username={author?.username ?? "unknown"}
              avatarUrl={authorAvatarUrl}
              className="h-10 w-10 text-sm"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/u/${author?.username ?? "unknown"}`}
              className="block truncate text-[0.9375rem] font-semibold"
            >
              {author?.display_name || author?.username || "unknown"}
            </Link>
            {vehicleTitle && (
              <Link
                href={`/garage/${vehicle!.id}`}
                className="block truncate text-[0.8125rem] text-muted hover:text-foreground"
              >
                {vehicleTitle}
              </Link>
            )}
            {sound && (
              <Link
                href={`/sounds/${sound.id}`}
                className="flex items-center gap-1 truncate text-[0.8125rem] text-muted hover:text-foreground"
              >
                <MusicIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{sound.title}</span>
              </Link>
            )}
          </div>
          <span className="flex-shrink-0 text-[0.8125rem] text-muted" suppressHydrationWarning>
            {relativeTime(post.created_at)}
          </span>
        </div>

        {post.post_type === "video" && postMedia[0] ? (
          <VideoPlayer
            url={publicMediaUrl(supabase, postMedia[0].media.storage_path)}
            width={postMedia[0].media.width}
            height={postMedia[0].media.height}
          />
        ) : (
          <div className="relative">
            {soundUrl && <PostSoundPlayer url={soundUrl} />}
            <PostPhotoView
              postId={post.id}
              photos={photosWithHotspots}
              isOwner={isOwner}
              canTag={isOwner && Boolean(vehicle)}
              availableParts={buildParts}
            />
          </div>
        )}

        <div className="flex items-center gap-4 px-4 pt-3.5">
          <LikeButton
            postId={post.id}
            initialLiked={likedIds.has(post.id)}
            initialCount={likeCount}
            isAuthenticated={Boolean(user)}
          />
          <span className="flex items-center gap-1 text-[0.875rem] text-muted">
            <EyeIcon className="h-4 w-4" />
            <span className="numeral">{formatCompactNumber(viewCount)}</span>
          </span>
          <div className="flex-1" />
          <SaveButton
            postId={post.id}
            initialSaved={savedIds.has(post.id)}
            isAuthenticated={Boolean(user)}
          />
        </div>

        {post.caption && (
          <div className="px-4 pb-4 pt-2 text-[0.9375rem] leading-relaxed">
            <span className="font-semibold">{author?.username}</span>{" "}
            <CaptionText text={post.caption} className="inline" />
          </div>
        )}
        {!post.caption && <div className="pb-4" />}

        {(isOwner || user) && (
          <div className="flex items-center border-t border-border px-4 py-3">
            {isOwner ? (
              <DeletePostButton postId={post.id} />
            ) : (
              <ReportButton targetType="post" targetId={post.id} />
            )}
          </div>
        )}
      </div>

      <section className="mt-8">
        <SectionTitle action={comments.length > 0 ? <span className="numeral">{comments.length}</span> : undefined}>
          Comments
        </SectionTitle>
        <div className="glass-raised elev-1 rounded-[22px] p-4">
          <CommentList
            comments={commentsWithAuthor}
            postId={post.id}
            currentUserId={user?.id ?? null}
          />
          <div className="mt-4 border-t border-border pt-4">
            {user ? (
              <CommentForm postId={post.id} />
            ) : (
              <p className="text-center text-[0.9375rem] text-muted">
                <Link href={`/login?next=/p/${post.id}`} className="font-semibold text-accent">
                  Log in
                </Link>{" "}
                to comment.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
