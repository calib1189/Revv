import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** An iOS-style grouped form: a titled card whose rows are label-left,
 * field-right, separated by inset hairlines — the way Contacts and
 * Settings lay out editable fields. Use FormField / FormSelect /
 * FormTextarea as the rows. */
export function FormGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      {title && <h2 className="mb-2 px-4 text-[0.8125rem] font-medium uppercase tracking-wide text-muted">{title}</h2>}
      <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:left-4 [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
        {children}
      </div>
      {footer && <p className="mt-2 px-4 text-[0.8125rem] leading-snug text-muted">{footer}</p>}
    </section>
  );
}

const fieldClass =
  "min-w-0 flex-1 bg-transparent py-3 text-foreground placeholder:text-muted/70 focus:outline-none";

export function FormField({
  label,
  id,
  ...props
}: { label: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label htmlFor={id} className="relative flex min-h-[50px] items-center gap-3 px-4 focus-within:bg-foreground/[0.03]">
      <span className="w-[6.5rem] flex-shrink-0 text-[0.9375rem]">{label}</span>
      <input id={id} className={fieldClass} {...props} />
    </label>
  );
}

export function FormSelect({
  label,
  id,
  children,
  ...props
}: { label: string; id: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label htmlFor={id} className="relative flex min-h-[50px] items-center gap-3 px-4">
      <span className="w-[6.5rem] flex-shrink-0 text-[0.9375rem]">{label}</span>
      <select id={id} className={`${fieldClass} appearance-none text-accent`} {...props}>
        {children}
      </select>
    </label>
  );
}

export function FormTextarea({
  id,
  ...props
}: { id: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="relative px-4">
      <textarea
        id={id}
        className="w-full resize-none bg-transparent py-3 text-foreground placeholder:text-muted/70 focus:outline-none"
        {...props}
      />
    </div>
  );
}
