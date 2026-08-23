export function Avatar({
  username,
  className = "h-8 w-8 text-sm",
}: {
  username: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-surface-raised font-medium text-foreground ${className}`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
