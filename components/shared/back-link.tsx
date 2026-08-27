import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  One step back up — the record pages and the two marketplace forms all reach
  their parent list this way.

  Distinct from `Breadcrumbs` on purpose. Six pages had hand-rolled this inside
  `<nav aria-label="Breadcrumb">`, which is not true: a single link back is not
  a trail, and a landmark announcing "Breadcrumb" that holds one item misleads
  anyone navigating by landmark. The link keeps its appearance; the false
  landmark is gone.

  `tone="onDark"` is for the manufacturer storefront, whose hero sits on the
  brand block.
*/

export function BackLink({
  href,
  children,
  tone = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "default" | "onDark";
  className?: string;
}) {
  return (
    <div className={className}>
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm",
          tone === "onDark"
            ? "text-white/70 transition-colors hover:text-white"
            : "text-muted-foreground hover:text-foreground hover:underline",
        )}
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {children}
      </Link>
    </div>
  );
}
