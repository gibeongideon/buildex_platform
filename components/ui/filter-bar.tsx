import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/*
  The toolbar that sits on a list card: search on the left, filters after it,
  and how many rows survived them on the right.

  Eleven pages had copied this. They agreed on everything structural and
  differed only in placeholder text, the search field's width and which selects
  followed — which is exactly the split between props and `children` here.

  `admin/activity` deliberately does not use this: its filters are a labelled
  grid, not a toolbar row, because a period and an actor type need saying out
  loud in a way a placeholder cannot.
*/

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /**
   * Announced to screen readers, because a placeholder is not a label.
   * Omit it only where a visible `<label htmlFor>` already names the field —
   * `admin/activity` is the one such case.
   */
  label?: string;
  id?: string;
  /** Width goes here, not on the input: the input is `w-full` by default. */
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 pl-8"
      />
    </div>
  );
}

export function FilterBar({
  search,
  shown,
  total,
  children,
  className,
}: {
  search: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    /** Tailwind width for the search field from `sm` up. */
    width?: string;
  };
  /** Rows after filtering. */
  shown: number;
  /** Rows before it — the pair is what tells you a filter is doing something. */
  total: number;
  /** The selects and toggles for this list. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <SearchField
        value={search.value}
        onChange={search.onChange}
        placeholder={search.placeholder}
        label={search.label}
        className={search.width ?? "sm:w-72"}
      />
      {children}
      <p className="whitespace-nowrap text-sm text-muted-foreground text-numeric sm:ml-auto">
        {shown} of {total}
      </p>
    </div>
  );
}
