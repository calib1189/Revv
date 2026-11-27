"use client";

import { useActionState, type ComponentType, type SVGProps } from "react";
import { updateLinksAction, type UpdateLinksState } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { GlobeIcon, InstagramIcon, SnapchatIcon, TikTokIcon, YouTubeIcon } from "@/components/ui/icons";

const initialState: UpdateLinksState = { error: null, field: null, saved: false };

interface Field {
  name: "instagram" | "tiktok" | "youtube" | "snapchat" | "website";
  label: string;
  placeholder: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  initial: string | null;
}

export interface EditLinksInitial {
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  snapchat: string | null;
  website: string | null;
}

/** Your socials and website, shown as icons on your profile. Each is
 * optional; paste a profile link or type the username, either works. */
export function EditLinksForm({ initial }: { initial: EditLinksInitial }) {
  const [state, formAction, isPending] = useActionState(updateLinksAction, initialState);

  const fields: Field[] = [
    { name: "instagram", label: "Instagram", placeholder: "username", Icon: InstagramIcon, initial: initial.instagram },
    { name: "tiktok", label: "TikTok", placeholder: "username", Icon: TikTokIcon, initial: initial.tiktok },
    { name: "youtube", label: "YouTube", placeholder: "channel handle", Icon: YouTubeIcon, initial: initial.youtube },
    { name: "snapchat", label: "Snapchat", placeholder: "username", Icon: SnapchatIcon, initial: initial.snapchat },
    { name: "website", label: "Website", placeholder: "yoursite.com", Icon: GlobeIcon, initial: initial.website },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <p className="text-[0.9375rem] font-semibold">Links</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted">
          Shown on your profile. Type a username or paste a link.
        </p>
      </div>
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      {state.saved && !state.error && <Callout>Links saved. They show on your profile now.</Callout>}
      {fields.map(({ name, label, placeholder, Icon, initial: value }) => (
        <label key={name} className="relative block">
          <span className="sr-only">{label}</span>
          <Icon
            aria-hidden
            className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${
              state.field === name ? "text-danger" : "text-muted"
            }`}
          />
          <Input
            name={name}
            defaultValue={value ? (name === "website" ? value.replace(/^https:\/\//, "") : `@${value}`) : ""}
            placeholder={`${label} ${placeholder}`}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode={name === "website" ? "url" : "text"}
            aria-invalid={state.field === name || undefined}
            className={`pl-11 ${state.field === name ? "border-danger/60" : ""}`}
          />
        </label>
      ))}
      <Button type="submit" disabled={isPending} className="h-12 w-full font-semibold">
        {isPending ? "Saving…" : "Save Links"}
      </Button>
    </form>
  );
}
