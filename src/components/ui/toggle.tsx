"use client";

/** An iOS switch: a pill track that turns green when on, with a white
 * knob that slides across on the iOS curve. */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name — the visible row label usually sits beside it. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] flex-shrink-0 rounded-full transition-colors duration-300 ease-[var(--ease-ios)] disabled:opacity-50 ${
        checked ? "bg-success" : "bg-[var(--segment-track)]"
      }`}
    >
      <span
        className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)] transition-transform duration-300 ease-[var(--ease-ios)] ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
