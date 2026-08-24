"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0a0a0b",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: "0.9rem", color: "#a1a1aa" }}>
          Something went wrong loading REVV.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: "9999px",
            padding: "0.6rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            background: "rgb(255 255 255 / 0.08)",
            color: "#f4f4f5",
            border: "none",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
