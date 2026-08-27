import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  The trail back up.

  Extracted from `PageHeader` because the marketplace does not use `PageHeader`
  — its pages carry their own heading treatment — and so eight of them had
  hand-rolled this same `<nav><ol>` markup. Two of those had already drifted on
  the separator and the hover state.

  `PageHeader` now renders this too, so there is one definition rather than a
  ninth.
*/

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-2", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight
                className="size-3 text-subtle-foreground"
                aria-hidden="true"
              />
            ) : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="rounded hover:text-foreground hover:underline"
              >
                {crumb.label}
              </Link>
            ) : (
              // The current page: present for orientation, not a link to itself.
              <span className="text-foreground" aria-current="page">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
