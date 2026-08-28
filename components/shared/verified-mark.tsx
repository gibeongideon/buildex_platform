import * as React from "react";
import { cn } from "@/lib/utils";

/*
  The Buildex verification mark.

  This replaces a stock outline check icon in the platform's semantic green.
  Two problems with that: green is the colour this interface uses for *state*,
  so a credential read as a status chip; and an outline icon at 14px reads as UI
  chrome rather than as something issued. A verification mark has to look like a
  mark — struck, not drawn.

  So: a scalloped seal, filled, with the check knocked out of it. The silhouette
  survives at 14px because it is solid rather than stroked, and the scallops
  make it legible as a seal at a glance even when the wordmark is clipped. The
  gold ring appears from `md` up, where there is room for it to read as a ring
  rather than a smudge — it is the brand accent, and it is what makes the thing
  look pressed rather than printed.

  Colours come from --brand and --brand-fg, which invert together, so the mark
  works on both themes without a second definition: light gives blue-on-white,
  dark gives a lifted brand tint with the check knocked back to deep blue.

  Two levels, because the platform genuinely has two. `approved` has cleared all
  five checks including a physical site visit. `conditionally_approved` may list
  products but may not take orders, and until now carried no mark at all — its
  listings were on the marketplace looking exactly like an unverified stranger's.
  Giving it a visibly lesser mark says more than silence did.
*/

/** 12 soft scallops on a 24px grid. Generated, not hand-tuned. */
const SEAL_PATH =
  "M12.00 2.20 Q15.00 0.80 16.90 3.51 Q20.20 3.80 20.49 7.10 Q23.20 9.00 21.80 12.00 " +
  "Q23.20 15.00 20.49 16.90 Q20.20 20.20 16.90 20.49 Q15.00 23.20 12.00 21.80 " +
  "Q9.00 23.20 7.10 20.49 Q3.80 20.20 3.51 16.90 Q0.80 15.00 2.20 12.00 " +
  "Q0.80 9.00 3.51 7.10 Q3.80 3.80 7.10 3.51 Q9.00 0.80 12.00 2.20 Z";

const CHECK_PATH = "M7.6 12.3 L10.6 15.3 L16.5 9.2";

export type VerifiedLevel = "verified" | "conditional";

const SIZES = {
  sm: { box: "size-4", ring: false },
  md: { box: "size-5", ring: true },
  lg: { box: "size-7", ring: true },
} as const;

const WORDING: Record<VerifiedLevel, { label: string; title: string }> = {
  verified: {
    label: "Verified",
    title:
      "All five checks cleared, including a physical site visit by the Buildex field team.",
  },
  conditional: {
    label: "Part verified",
    title:
      "Cleared to list products with a check still open. This supplier cannot take orders until it clears.",
  },
};

export function VerifiedMark({
  level = "verified",
  size = "sm",
  subject,
  onDark = false,
  className,
}: {
  level?: VerifiedLevel;
  size?: keyof typeof SIZES;
  /**
   * What is being marked, e.g. "supplier". Set it where the mark stands alone
   * beside a name and there is no wordmark to read; the level supplies the rest
   * of the announcement, so a part-verified supplier can never be announced as
   * a verified one. Left unset inside `VerifiedBadge`, which labels itself.
   */
  subject?: string;
  /**
   * For the storefront's brand band. The seal strikes in white with the check
   * knocked back to brand blue — the same relationship as on light, inverted,
   * rather than the theme's lifted brand tint which goes muddy on the band.
   */
  onDark?: boolean;
  className?: string;
}) {
  const { box, ring } = SIZES[size];
  const full = level === "verified";
  const sealFill = onDark ? "fill-white" : "fill-brand";
  const checkStroke = onDark ? "stroke-brand" : "stroke-brand-foreground";

  return (
    <svg
      viewBox="0 0 24 24"
      role={subject ? "img" : undefined}
      aria-hidden={subject ? undefined : true}
      focusable="false"
      className={cn(box, "shrink-0", full ? "text-brand" : "text-warning", className)}
    >
      {subject ? (
        <title>{`${WORDING[level].label} ${subject} — ${WORDING[level].title}`}</title>
      ) : null}
      {/*
        The conditional mark is the same silhouette, unfilled and in warning —
        so the two can never be confused at a glance, but the shape still says
        "this supplier has been through the process".
      */}
      <path
        d={SEAL_PATH}
        className={full ? sealFill : "fill-none stroke-warning"}
        strokeWidth={full ? 0 : 1.6}
      />
      {ring && full ? (
        <circle
          cx="12"
          cy="12"
          r="8.4"
          className="fill-none stroke-primary"
          strokeWidth="0.9"
          opacity="0.85"
        />
      ) : null}
      <path
        d={CHECK_PATH}
        className={full ? checkStroke : "stroke-warning"}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * The mark with its wordmark — what goes in a card's trust line.
 *
 * `title` carries what the mark actually attests to. A trust badge that cannot
 * say what it checked is decoration.
 */
export function VerifiedBadge({
  level = "verified",
  size = "sm",
  subject = "supplier",
  className,
}: {
  level?: VerifiedLevel;
  size?: keyof typeof SIZES;
  /** Named in the accessible label, so a screen reader hears what was verified. */
  subject?: string;
  className?: string;
}) {
  const { label, title } = WORDING[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        level === "verified" ? "text-brand" : "text-warning",
        className,
      )}
      title={title}
    >
      <VerifiedMark level={level} size={size} />
      <span className="font-bold tracking-tight">{label}</span>
      <span className="sr-only">{` ${subject}. ${title}`}</span>
    </span>
  );
}

/** The level a manufacturer's status earns, or null where it earns none. */
export function verifiedLevel(status: string): VerifiedLevel | null {
  if (status === "approved") return "verified";
  if (status === "conditionally_approved") return "conditional";
  return null;
}
