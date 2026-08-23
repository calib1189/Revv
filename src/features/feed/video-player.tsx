export function VideoPlayer({
  url,
  width,
  height,
}: {
  url: string;
  width: number | null;
  height: number | null;
}) {
  const aspectRatio = width && height ? `${width} / ${height}` : "9 / 16";

  return (
    <div
      className="mx-auto max-h-[80vh] w-full bg-black"
      style={{ aspectRatio }}
    >
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
