import type { SVGProps } from "react";

export function HeartIcon({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      {...props}
    >
      <path d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.3 4.5 5.7 4A5 5 0 0 1 12 7.2 5 5 0 0 1 18.3 4c3.4.5 5.2 3.8 3.7 7.2-2.5 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  );
}

export function CommentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 14.5v-9Z" />
    </svg>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 12 20 4 15 20 11 13 4 12Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BookmarkIcon({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      {...props}
    >
      <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.2a.5.5 0 0 1-.77.42L12 16.5l-5.73 4.12a.5.5 0 0 1-.77-.42V4a.5.5 0 0 1 .5-.5Z" />
    </svg>
  );
}

export function MoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

export function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M15 5 8 12l7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M15 9l-2 6-4 2 2-6 4-2Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.25" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      {...props}
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeLinecap="round" />
      <path d="M16 4.3c1.6.5 2.75 2 2.75 3.7 0 1.7-1.15 3.2-2.75 3.7" strokeLinecap="round" />
      <path d="M14.5 13.6c2.9.7 5 3.2 5 6.4" strokeLinecap="round" />
    </svg>
  );
}

export function PersonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
    </svg>
  );
}

export function GemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.5 3h11L21 9l-9 12L3 9l3.5-6Z" />
    </svg>
  );
}

export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5l2.6 6.3 6.8.5-5.2 4.4 1.7 6.6L12 16.8l-5.9 3.5 1.7-6.6-5.2-4.4 6.8-.5L12 2.5Z" />
    </svg>
  );
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M6 10a6 6 0 1 1 12 0c0 3.4 1 5.3 1.6 6.2.2.3 0 .8-.4.8H4.8c-.4 0-.6-.5-.4-.8C5 15.3 6 13.4 6 10Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
    </svg>
  );
}

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.85-.08-1.66-.22-2.44H12v4.62h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.6H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.7 1c.13 1.06-.3 2.1-.94 2.86-.67.78-1.75 1.4-2.8 1.32-.15-1.03.35-2.1 1-2.83C14.68 1.5 15.78.94 16.7 1Zm3.3 16.8c-.44 1.02-.65 1.47-1.22 2.38-.8 1.27-1.92 2.85-3.32 2.86-1.24.02-1.56-.8-3.24-.8-1.68 0-2.04.78-3.27.82-1.36.05-2.4-1.37-3.2-2.63-2.2-3.42-2.43-7.43-1.08-9.57.96-1.52 2.48-2.41 3.9-2.41 1.45 0 2.36.83 3.56.83 1.16 0 1.87-.83 3.56-.83 1.27 0 2.61.7 3.57 1.9-3.14 1.72-2.63 6.2.74 7.45Z" />
    </svg>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" strokeLinecap="round" />
      <circle cx="16" cy="7" r="2.25" />
      <circle cx="7" cy="17" r="2.25" />
    </svg>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a.7.7 0 0 0-.9-.9A10 10 0 1 0 21.4 15.4a.7.7 0 0 0-.9-.9Z" />
    </svg>
  );
}

export function DeviceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" strokeLinecap="round" />
    </svg>
  );
}

export function CropIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M6 2v14a2 2 0 0 0 2 2h14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MusicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M9 18V5l11-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

export function TextToolIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M4 6h16M4 6v3M20 6v3M12 6v14M9 20h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScissorsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.5 8.5 20 20M20 4 8.5 15.5" strokeLinecap="round" />
    </svg>
  );
}

export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M4 8a2 2 0 0 1 2-2h1.2a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.8 3.6h4.4a1 1 0 0 1 .83.55l.94 1.4A1 1 0 0 0 16.8 6H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function CameraFlipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M17 4 20 7l-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 7H8a5 5 0 0 0-5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 20 4 17l3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17h12a5 5 0 0 0 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      {...props}
    >
      <path d="M4 12.5 9.5 18 20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
      <circle cx="9" cy="6" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M12 16V4M12 4 7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <rect x="5" y="11" width="14" height="9" rx="2" strokeLinejoin="round" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GalleryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <rect x="3" y="5" width="14" height="14" rx="2.5" strokeLinejoin="round" />
      <circle cx="8" cy="10" r="1.4" fill="currentColor" stroke="none" />
      <path d="M3 16l4-4 3.5 3.5L14 12l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9v8a2 2 0 0 1-2 2h-8" strokeLinecap="round" />
    </svg>
  );
}

export function HashtagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path
        d="M9.5 4 7 20M17 4l-2.5 16M4 9h16M3 15h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TimerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9" strokeLinecap="round" />
      <path d="M9 2h6" strokeLinecap="round" />
    </svg>
  );
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeLinecap="round" />
    </svg>
  );
}

export function BrushIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path
        d="M9 15c-1.5-1.5-1.5-3 0-4.5l7-7c1-1 2.5-1 3.5 0s1 2.5 0 3.5l-7 7c-1.5 1.5-3 1.5-4.5 0Z"
        strokeLinejoin="round"
      />
      <path d="M9 15 4.5 19.5" strokeLinecap="round" />
      <circle cx="6" cy="18" r="2" />
    </svg>
  );
}

export function ShoppingBagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <path d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

export function SpeedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      {...props}
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13 16 9" strokeLinecap="round" />
      <path d="M8 13h.01M12 6h.01M16 13h.01" strokeLinecap="round" />
    </svg>
  );
}

// --- Modification-category icons — the automatic (no-upload-required)
// placeholder shown next to a mod until/unless the owner adds a real
// photo. Deliberately generic category glyphs, never claiming to depict
// the actual product. ---

export function WrenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 4.9L4 16.5V20h3.5l5.3-5.3a4 4 0 0 0 4.9-5.4l-2.8 2.8-2.1-2.1 2.9-2.8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WheelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v6M12 15v6M4.5 7.5l5.2 3M14.3 13.5l5.2 3M19.5 7.5l-5.2 3M9.7 13.5l-5.2 3" strokeLinecap="round" />
    </svg>
  );
}

export function ExhaustIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 9h9a4 4 0 0 1 4 4v0" strokeLinecap="round" />
      <ellipse cx="19" cy="15" rx="2.5" ry="4" />
      <path d="M3 7v4" strokeLinecap="round" />
    </svg>
  );
}

export function SuspensionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M12 2v3M12 19v3" strokeLinecap="round" />
      <path
        d="M12 5c-3 0-3 3 0 3s3 3 0 3-3 3 0 3-3 3 0 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TurboIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 12 8 8m4 4 4-4m-4 4-4 4m4-4 4 4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BrakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" strokeDasharray="2 3.2" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function EngineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="10" width="13" height="8" rx="1.5" />
      <path d="M6 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M9 4v3M16 13h3a2 2 0 0 1 2 2v3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 13.5h3M6.5 15.5h3" strokeLinecap="round" />
    </svg>
  );
}

export function TuningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" strokeLinecap="round" />
    </svg>
  );
}

export function SeatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M7 4h6a2 2 0 0 1 2 2v6H9a2 2 0 0 1-2-2V4Z"
        strokeLinejoin="round"
      />
      <path d="M7 12v4a2 2 0 0 0 2 2h8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 4v14M20 16v2a2 2 0 0 1-2 2h-1" strokeLinecap="round" />
    </svg>
  );
}

export function BodyKitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M3.5 15 5 9.5A2 2 0 0 1 6.9 8h10.2a2 2 0 0 1 1.9 1.5L20.5 15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 15h17v2.5a1 1 0 0 1-1 1H16M3.5 15v2.5a1 1 0 0 0 1 1H8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="15" r="1.8" />
      <circle cx="16.5" cy="15" r="1.8" />
      <path d="M8 11.5h8" strokeLinecap="round" />
    </svg>
  );
}

export function SpeakerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="8.5" r="2.2" />
      <circle cx="12" cy="15.5" r="3.2" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PaintIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="7" y="10" width="7" height="11" rx="1.5" />
      <path d="M10.5 10V6a2 2 0 0 1 2-2h1.5" strokeLinecap="round" />
      <circle cx="15.5" cy="4" r="1.1" fill="currentColor" stroke="none" />
      <path d="M16.5 8.5 19 7M17.5 12l2.5-.3M16 15.5l2 1.7" strokeLinecap="round" />
    </svg>
  );
}

export function GrilleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M4 9.5h16M4 12.5h16M4 15.5h16" strokeLinecap="round" />
    </svg>
  );
}

export function HoodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 17 6 7.5A2 2 0 0 1 8 6h8a2 2 0 0 1 2 1.5L20 17" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6v11M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function BumperIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="9" width="18" height="6" rx="3" />
      <circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FenderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 18a9 9 0 0 1 18 0" strokeLinecap="round" />
      <path d="M3 18h18" strokeLinecap="round" />
      <circle cx="12" cy="18" r="3.5" />
    </svg>
  );
}

export function SpoilerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 8h16" strokeLinecap="round" />
      <path d="M7 8v6M17 8v6" strokeLinecap="round" />
      <path d="M4 14h16" strokeLinecap="round" />
    </svg>
  );
}

export function MirrorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M9 12a5 5 0 0 1 5-5h1a3 3 0 0 1 3 3v1a5 5 0 0 1-5 5H9Z" strokeLinejoin="round" />
      <path d="M9 14 5 18" strokeLinecap="round" />
    </svg>
  );
}

export function HeadlightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 9a2 2 0 0 1 2-2h5l6 5-6 5H6a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
      <path d="M17.5 12h3M15.5 8l2.8-1.8M15.5 16l2.8 1.8" strokeLinecap="round" />
    </svg>
  );
}

export function TintIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 5 4 12M14 5 4 17.5M20 8.5 10.5 19M20 14.5 15.5 19" strokeLinecap="round" />
    </svg>
  );
}

export function RoofIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 15a9 6 0 0 1 18 0" strokeLinecap="round" />
      <rect x="9" y="9.5" width="6" height="3.2" rx="1" />
    </svg>
  );
}

export function TrunkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 10 6 4h12l2 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
      <path d="M10 13h4" strokeLinecap="round" />
    </svg>
  );
}

export function DoorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 3v18" strokeLinecap="round" />
      <path d="M14 11h2" strokeLinecap="round" />
    </svg>
  );
}

export function DecalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 16.5 21 6.5M3 20.5 19 10.5" strokeLinecap="round" />
    </svg>
  );
}

export function TireIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 3v2.3M12 18.7V21M21 12h-2.3M5.3 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FuelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="5" y="8" width="10" height="12" rx="1.5" />
      <path d="M8 8V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 11h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 1-3 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RadiatorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <path d="M8.3 4v16M11.6 4v16M14.9 4v16" strokeLinecap="round" />
    </svg>
  );
}

export function TransmissionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BatteryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="8" width="16" height="10" rx="1.5" />
      <path d="M8 8V6M16 8V6" strokeLinecap="round" />
      <path d="M12 11v4M10 13h4" strokeLinecap="round" />
    </svg>
  );
}

export function GaugeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13 16 9" strokeLinecap="round" />
      <path d="M7 13h.01M12 6h.01M17 13h.01" strokeLinecap="round" />
    </svg>
  );
}

export function SteeringWheelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 14.5V21M6.2 9.3l3.6 2M17.8 9.3l-3.6 2" strokeLinecap="round" />
    </svg>
  );
}

export function ShiftKnobIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v9M8 20h8" strokeLinecap="round" />
    </svg>
  );
}

export function RollCageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14h16M8 20V14M16 20V14" strokeLinecap="round" />
    </svg>
  );
}

// --- Exterior body ---

export function WindshieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 16 6 6a2 2 0 0 1 2-1.6h8A2 2 0 0 1 18 6l2 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16h16M12 16V9" strokeLinecap="round" />
    </svg>
  );
}

export function WindowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="6" y="4" width="12" height="16" rx="1.5" />
      <path d="M12 8v3M10 9.5l2-2 2 2M12 16v3M10 17.5l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WindowNetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M4 8.5h16M4 12h16M4 15.5h16M8.5 5v14M13 5v14M17.5 5v14" strokeLinecap="round" />
    </svg>
  );
}

export function AntennaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 16c2-8 6-12 8-12s2 6 2 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16h12" strokeLinecap="round" />
    </svg>
  );
}

export function BadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3Z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LicensePlateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <path d="M6.5 12h11" strokeLinecap="round" strokeDasharray="2.2 2.2" />
    </svg>
  );
}

export function WiperIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="6" cy="19" r="1.3" />
      <path d="M6 19 17 5" strokeLinecap="round" />
      <path d="M13 9.5 20 8" strokeLinecap="round" />
    </svg>
  );
}

export function FuelDoorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 6V3M9.5 3h5" strokeLinecap="round" />
      <circle cx="12" cy="13" r="2.3" />
    </svg>
  );
}

export function TowHitchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 15h10" strokeLinecap="round" />
      <circle cx="15.5" cy="15" r="2.5" />
      <path d="M13 20h9" strokeLinecap="round" />
    </svg>
  );
}

export function BullBarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 16a9 5 0 0 1 18 0" strokeLinecap="round" />
      <path d="M4 10v6M20 10v6M4 8l4 8M20 8l-4 8" strokeLinecap="round" />
    </svg>
  );
}

export function WinchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="9" width="8" height="7" rx="1.5" />
      <circle cx="8" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 12.5h8" strokeLinecap="round" />
      <circle cx="20.5" cy="12.5" r="1.2" />
    </svg>
  );
}

export function SnorkelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M8 21V9a3 3 0 0 1 3-3h1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10.5" y="3" width="5" height="4.5" rx="1" />
      <path d="M6 21h4" strokeLinecap="round" />
    </svg>
  );
}

export function RunningBoardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M2 17h20" strokeLinecap="round" />
      <path d="M4 17v-2.5a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 0 1 1.5 1.5V17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LadderRackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 6v14M20 6v14" strokeLinecap="round" />
      <path d="M4 9h16M4 13h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function RoofRackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 15a9 6 0 0 1 18 0" strokeLinecap="round" />
      <path d="M5 9h14M5 9v2M19 9v2M9 6v3M15 6v3" strokeLinecap="round" />
    </svg>
  );
}

export function TonneauCoverIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 18V11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 18h18M7 9V6M12 9V6M17 9V6" strokeLinecap="round" />
    </svg>
  );
}

export function BedlinerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 8h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" strokeLinejoin="round" />
      <path d="M4 8 6 4h12l2 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 12h2M11 12h2M15 12h2M7 15.5h2M11 15.5h2M15 15.5h2" strokeLinecap="round" />
    </svg>
  );
}

export function SplitterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M2 12h20" strokeLinecap="round" />
      <path d="M4 12V9.5A1.5 1.5 0 0 1 5.5 8h13A1.5 1.5 0 0 1 20 9.5V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DiffuserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 8h18" strokeLinecap="round" />
      <path d="M5 8l2 8M9 8l1.3 8M15 8l-1.3 8M19 8l-2 8" strokeLinecap="round" />
    </svg>
  );
}

export function SideSkirtIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 14a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 14v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16Z" />
    </svg>
  );
}

export function CanardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 16h6l3-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 16h6l-3-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HoodVentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 17 6 8a2 2 0 0 1 2-1.5h8A2 2 0 0 1 18 8l2 9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="9" width="6" height="3" rx="1" />
      <path d="M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function QuarterPanelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 18V9a2 2 0 0 1 2-2h6l7 5v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 18h17" strokeLinecap="round" />
      <circle cx="16" cy="18" r="2.5" />
    </svg>
  );
}

export function RockerPanelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="14" width="18" height="3" rx="1" />
      <path d="M3 11h18" strokeLinecap="round" strokeDasharray="1 3" />
    </svg>
  );
}

export function ConvertibleTopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 16a9 7 0 0 1 18 0" strokeLinecap="round" />
      <path d="M6 16a6 5 0 0 1 12 0" strokeLinecap="round" />
      <path d="M3 16h18" strokeLinecap="round" />
    </svg>
  );
}

export function SkidPlateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 9h18l-2 8H5Z" strokeLinejoin="round" />
      <path d="M7 13h10" strokeLinecap="round" />
    </svg>
  );
}

// --- Lighting ---

export function FogLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="6" />
      <path d="M3 8h3M3 12h2M3 16h3M18 8h3M19 12h2M18 16h3" strokeLinecap="round" />
    </svg>
  );
}

export function TailLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M6 5h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6Z" strokeLinejoin="round" />
      <path d="M8 9h4M8 12h4M8 15h4" strokeLinecap="round" />
    </svg>
  );
}

export function UnderglowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 17a9 3 0 0 0 18 0" strokeLinecap="round" />
      <path d="M4 17h1M7 17h1M10 17h1M13 17h1M16 17h1M19 17h1" strokeLinecap="round" />
    </svg>
  );
}

export function LightBarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="10" width="18" height="4" rx="2" />
      <path d="M6 10V8M10 10V8M14 10V8M18 10V8" strokeLinecap="round" />
    </svg>
  );
}

export function TurnSignalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 12h8M11 12l-4-4m4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="12" r="3" strokeDasharray="1.5 2" />
    </svg>
  );
}

export function AmbientLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 18c2-6 5-10 8-10s6 4 8 10" strokeLinecap="round" />
      <path d="M6 18h12" strokeLinecap="round" strokeDasharray="1.2 2" />
    </svg>
  );
}

// --- Wheels, tires & brakes ---

export function WheelSpacerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8V4M12 20v-4M8 12H4M20 12h-4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" strokeDasharray="1 3" />
    </svg>
  );
}

export function LugNutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M12 3.5 19 8v8l-7 4.5-7-4.5V8Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

export function CenterCapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5v2M12 17v2M5 12h2M17 12h2" strokeLinecap="round" />
    </svg>
  );
}

export function BrakeCaliperIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M7 5h7a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7Z" strokeLinejoin="round" />
      <path d="M7 9h6M7 13h6" strokeLinecap="round" />
      <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BrakeRotorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" strokeDasharray="0.5 2.3" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function BrakePadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="5" y="9" width="14" height="6" rx="1.5" />
      <path d="M8 9V7a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrakeLineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 6c4 0 2 6 6 6s2 6 6 6" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TpmsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 13V8" strokeLinecap="round" />
      <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M9 4.5h6" strokeLinecap="round" />
    </svg>
  );
}

// --- Suspension & chassis ---

export function LiftKitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M6 20V10M18 20V10" strokeLinecap="round" />
      <path d="M4 10h4M16 10h4" strokeLinecap="round" />
      <path d="M6 4l3 3M18 4l-3 3" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}

export function AirSuspensionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M8 20V13a4 4 0 0 1 8 0v7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16h8M8 18h8" strokeLinecap="round" />
    </svg>
  );
}

export function SwayBarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 6h9" strokeLinecap="round" />
      <path d="M12 6a4 4 0 0 0 4 4h5" strokeLinecap="round" />
      <circle cx="3" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="21" cy="10" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StrutBraceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M5 16 12 6l7 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SubframeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M3 12h18M8 8v8M16 8v8" strokeLinecap="round" />
    </svg>
  );
}

export function BushingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="7" strokeDasharray="2 1.4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function BallJointIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M12 12.5V20M9 20h6" strokeLinecap="round" />
    </svg>
  );
}

export function TieRodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="4" cy="12" r="1.8" />
      <path d="M6 12h9" strokeLinecap="round" />
      <path d="M15 9h4v6h-4Z" strokeLinejoin="round" />
    </svg>
  );
}

// --- Engine & drivetrain ---

export function IntakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 6h6l2 6-2 6H4Z" strokeLinejoin="round" />
      <path d="M12 12h8" strokeLinecap="round" />
    </svg>
  );
}

export function ThrottleBodyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="6" />
      <path d="M8 8l8 8M12 6v12" strokeLinecap="round" />
    </svg>
  );
}

export function CamshaftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M2 12h20" strokeLinecap="round" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M6 9.5v-2M12 9.5v-2M18 9.5v-2" strokeLinecap="round" />
    </svg>
  );
}

export function ValveCoverIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="9" width="16" height="9" rx="2" />
      <path d="M7 9V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13h2M14 13h2" strokeLinecap="round" />
    </svg>
  );
}

export function HeaderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M5 6v3M9 6v3M13 6v3M17 6v3" strokeLinecap="round" />
      <path d="M5 9a2 2 0 0 0 2 2h6a2 2 0 0 1 2 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9a2 2 0 0 0 2 2m4-2a2 2 0 0 1-2 2" strokeLinecap="round" />
      <ellipse cx="18" cy="16" rx="2.2" ry="3.5" />
    </svg>
  );
}

export function OilPanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 8h16l-2 9H6Z" strokeLinejoin="round" />
      <path d="M10 17v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OilFilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M8 4h8l1 4-1 12H8L7 8Z" strokeLinejoin="round" />
      <path d="M7.5 8h9" strokeLinecap="round" />
    </svg>
  );
}

export function SparkPlugIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M10 3h4v5h-4Z" strokeLinejoin="round" />
      <path d="M9 8h6l-1 6h-4Z" strokeLinejoin="round" />
      <path d="M11 14v4M9 21h6M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

export function IgnitionCoilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="8" y="3" width="8" height="12" rx="1.5" />
      <path d="M9 6h6M9 9h6M9 12h6" strokeLinecap="round" />
      <path d="M12 15v6" strokeLinecap="round" />
    </svg>
  );
}

export function TimingBeltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="7" cy="12" r="3.5" />
      <circle cx="17" cy="12" r="2.2" />
      <path d="M7 8.5c3 0 3 7 0 7M17 9.8c-2 0-2 4.4 0 4.4" strokeLinecap="round" />
    </svg>
  );
}

export function DriveBeltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="12" cy="17" r="2.5" />
      <path d="M8 7h8M7.3 8.8 10.5 15M16.7 8.8 13.5 15" strokeLinecap="round" />
    </svg>
  );
}

export function AlternatorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="7" />
      <path d="M13 8 9.5 13h2.5l-1 4 4-5.5H12.5L13 8Z" strokeLinejoin="round" />
    </svg>
  );
}

export function StarterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="9" width="10" height="6" rx="2" />
      <circle cx="18" cy="12" r="3" />
      <path d="M18 9.5v1M18 13.5v1M15.5 12h1M19.5 12h1" strokeLinecap="round" />
    </svg>
  );
}

export function DifferentialIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="5" />
      <path d="M2 12h5M17 12h5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TransferCaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="6" y="6" width="8" height="8" rx="1.5" />
      <path d="M14 8h4v8h-4M2 8v8h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClutchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="7" />
      <path
        d="M12 5.5v3M12 15.5v3M5.5 12h3M15.5 12h3M7.4 7.4l2 2M14.6 14.6l2 2M16.6 7.4l-2 2M9.4 14.6l-2 2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NitrousIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="9" y="6" width="6" height="15" rx="3" />
      <path d="M10.5 6V4a1.5 1.5 0 0 1 1.5-1.5h0A1.5 1.5 0 0 1 13.5 4v2" strokeLinecap="round" />
      <path d="M9 11h6" strokeLinecap="round" />
    </svg>
  );
}

export function FuelPumpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="6" y="10" width="8" height="9" rx="1.5" />
      <path d="M10 10V7a2 2 0 0 1 4 0" strokeLinecap="round" />
      <path d="M14 12h2a2 2 0 0 1 2 2v3a1.3 1.3 0 0 0 2.6 0v-5l-2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WastegateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 6V3M12 21v-3" strokeLinecap="round" />
      <path d="M9 9l6 6" strokeLinecap="round" />
    </svg>
  );
}

export function BovIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M6 14a6 6 0 0 1 12 0" strokeLinecap="round" />
      <rect x="10" y="14" width="4" height="7" rx="1" />
      <path d="M4 17.5 6 14M20 17.5 18 14" strokeLinecap="round" />
    </svg>
  );
}

// --- Cooling ---

export function FanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="1.8" />
      <path
        d="M12 10.2c0-3-2-5-4.5-4.5C6 6.3 6.8 9 9.3 10.5M13.8 10.2c0-3 2-5 4.5-4.5C19.8 6.3 19 9 16.5 10.5M12 13.8c0 3-2 5-4.5 4.5C6 17.7 6.8 15 9.3 13.5M13.8 13.8c0 3 2 5 4.5 4.5 1.5-.3.7-3-1.8-4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThermostatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="16" r="3.5" />
      <path d="M12 12.5V5a1.5 1.5 0 0 0-3 0v7.5" strokeLinecap="round" />
    </svg>
  );
}

export function OilCoolerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="7" width="16" height="10" rx="1.5" />
      <path d="M7 7v10M11 7v10M15 7v10" strokeLinecap="round" strokeDasharray="1 2" />
    </svg>
  );
}

// --- Electrical & tech ---

export function FuseBoxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="7" y="7" width="3" height="5" rx="1" />
      <rect x="14" y="7" width="3" height="5" rx="1" />
      <path d="M7 15.5h10" strokeLinecap="round" />
    </svg>
  );
}

export function DashCamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="6" y="8" width="12" height="8" rx="2" />
      <circle cx="12" cy="12" r="2.3" />
      <path d="M9 8V6.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackupCameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h7l3 2v8l-3 2H6a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
      <path d="M16 10l4-2v8l-4-2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function NavIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M12 8 9.5 15l2.5-1.5L14.5 15Z" strokeLinejoin="round" />
    </svg>
  );
}

export function HeadUnitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <rect x="5.5" y="9.5" width="7" height="5" rx="1" />
      <circle cx="17" cy="10.5" r="1.3" />
      <circle cx="17" cy="14" r="1.3" />
    </svg>
  );
}

export function SubwooferBoxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 6h12l4 4v8H4Z" strokeLinejoin="round" />
      <circle cx="10" cy="14" r="3.5" />
      <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AlarmIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M12 2 5 5v6c0 5 3 8.5 7 10 4-1.5 7-5 7-10V5Z" strokeLinejoin="round" />
      <path d="M13 7 10 12h2.5L11 17l4.5-6H13Z" strokeLinejoin="round" />
    </svg>
  );
}

export function RemoteStartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <circle cx="12" cy="17" r="1.6" />
      <path d="M12 6.5v4" strokeLinecap="round" />
      <path d="M9.5 8a3 3 0 1 0 5 0" strokeLinecap="round" />
    </svg>
  );
}

export function ShiftLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="9" width="16" height="6" rx="3" />
      <circle cx="8" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

// --- Interior ---

export function FloorMatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <rect x="8" y="7" width="8" height="10" rx="1" strokeDasharray="1.5 1.8" />
    </svg>
  );
}

export function PedalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M9 20V10a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="19" width="10" height="2.2" rx="1" />
      <rect x="13" y="13" width="4" height="8" rx="1.3" />
    </svg>
  );
}

export function HeadlinerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 12a9 5 0 0 1 18 0" strokeLinecap="round" />
      <path d="M6 12a6 3.3 0 0 1 12 0" strokeLinecap="round" strokeDasharray="1.3 1.8" />
    </svg>
  );
}

export function ConsoleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M5 20V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8.5" y="10" width="7" height="3.5" rx="1" />
      <circle cx="12" cy="17" r="1.6" />
    </svg>
  );
}

export function SunVisorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="6" width="16" height="4" rx="1.5" />
      <path d="M8 10v4M16 10v4" strokeLinecap="round" />
    </svg>
  );
}

export function CupHolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M8 9h8l-1 11H9Z" strokeLinejoin="round" />
      <ellipse cx="12" cy="9" rx="4" ry="1.5" />
    </svg>
  );
}

export function FireExtinguisherIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="9" y="8" width="6" height="13" rx="2" />
      <path d="M12 8V6M10 6h4" strokeLinecap="round" />
      <path d="M9 11H6.5A1.5 1.5 0 0 0 5 12.5" strokeLinecap="round" />
    </svg>
  );
}

export function KillSwitchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 7v5" strokeLinecap="round" />
      <path d="M8.5 8.5a6 6 0 1 0 7 0" strokeLinecap="round" />
    </svg>
  );
}

export function HarnessIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="17" r="2.2" />
      <path d="M12 15 6 4M12 15l6-11M9 4h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Verified-account marker. The scalloped seal shape (not a plain
 * circle) is two identical rounded squares, the second rotated 45°
 * about the same center — same construction real verified badges use,
 * since a square's 4-fold symmetry plus a 45°-offset copy gives 8 evenly
 * spaced points with no hand-plotted (and easy to get subtly lopsided)
 * star geometry. Solid fill takes `currentColor` (wrap it in
 * text-accent), the checkmark is var(--accent-foreground) so it keeps
 * contrast against the fill in both light and dark theme, same as an
 * accent-colored button's own text. */
export function VerifiedBadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="4.75" y="4.75" width="14.5" height="14.5" rx="3.2" fill="currentColor" />
      <rect
        x="4.75"
        y="4.75"
        width="14.5"
        height="14.5"
        rx="3.2"
        fill="currentColor"
        transform="rotate(45 12 12)"
      />
      <path
        d="M7.3 12.5 10.4 15.6 17 8.6"
        fill="none"
        stroke="var(--accent-foreground)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VolumeIcon({
  muted,
  ...props
}: SVGProps<SVGSVGElement> & { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 9.5v5h3.5l5 4V5.5l-5 4H4Z" strokeLinejoin="round" />
      {muted ? (
        <path d="M16 9.5 21 15M21 9.5 16 15" strokeLinecap="round" />
      ) : (
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.3 6a9 9 0 0 1 0 12" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function ArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 19V6M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 5v13M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PointerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M6 3.5 18 13l-5.2.8L15 20l-2.8 1.2-2.4-6.2L6 18V3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  );
}

export function RotateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M4 12a8 8 0 1 1 2.5 5.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 17v-4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StickerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10.5h.01M15.5 10.5h.01" strokeLinecap="round" />
      <path d="M8 14.5c1 1.2 2.4 1.8 4 1.8s3-.6 4-1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M9.5 14.5 14.5 9.5M8 16.5l-2 2a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5-.5M16 7.5l2-2a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 .5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 7.5 16.5 10.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path
        d="M14 5h5v5M19 5l-8 8M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
