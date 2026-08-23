export function Avatar({ username }: { username: string }) {
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-medium text-foreground">
      {username.charAt(0).toUpperCase()}
    </div>
  );
}
