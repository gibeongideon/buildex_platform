"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Form field primitives.

  `Field` wires label, hint, control and error together with the right aria
  attributes. Every form in the product uses it, which is what keeps
  keyboard and screen-reader behaviour consistent without each screen
  remembering to do it.
*/

const FieldContext = React.createContext<{
  id: string;
  errorId: string;
  hintId: string;
  hasError: boolean;
} | null>(null);

export function useFieldContext() {
  return React.useContext(FieldContext);
}

export function Field({
  children,
  error,
  className,
}: {
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  const id = React.useId();
  const value = React.useMemo(
    () => ({
      id,
      errorId: `${id}-error`,
      hintId: `${id}-hint`,
      hasError: Boolean(error),
    }),
    [id, error],
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("space-y-1.5", className)}>
        {children}
        {error ? (
          <p
            id={value.errorId}
            role="alert"
            className="flex items-start gap-1.5 text-xs text-danger"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  const field = useFieldContext();
  return (
    <LabelPrimitive.Root
      htmlFor={props.htmlFor ?? field?.id}
      className={cn(
        "block text-sm font-medium text-foreground",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  const field = useFieldContext();
  return (
    <p id={field?.hintId} className="text-xs text-muted-foreground">
      {children}
    </p>
  );
}

const controlClasses =
  "w-full rounded-md border bg-surface px-3 text-sm text-foreground placeholder:text-subtle-foreground transition-colors " +
  "border-border-strong hover:border-subtle-foreground " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  const field = useFieldContext();
  return (
    <input
      id={props.id ?? field?.id}
      aria-invalid={field?.hasError || undefined}
      aria-describedby={field?.hasError ? field.errorId : undefined}
      className={cn(controlClasses, "h-10", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const field = useFieldContext();
  return (
    <textarea
      id={props.id ?? field?.id}
      aria-invalid={field?.hasError || undefined}
      aria-describedby={field?.hasError ? field.errorId : undefined}
      className={cn(controlClasses, "min-h-24 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

/** Native select — lighter than a Radix listbox and correct on mobile. */
export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  const field = useFieldContext();
  return (
    <div className="relative">
      <select
        id={props.id ?? field?.id}
        aria-invalid={field?.hasError || undefined}
        aria-describedby={field?.hasError ? field.errorId : undefined}
        className={cn(
          controlClasses,
          "h-10 appearance-none pr-9",
          !props.value && !props.defaultValue ? "text-subtle-foreground" : "",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** Currency-prefixed numeric input, right-aligned with tabular numerals. */
export function MoneyInput({ className, ...props }: React.ComponentProps<"input">) {
  const field = useFieldContext();
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        KSh
      </span>
      <input
        id={props.id ?? field?.id}
        type="number"
        inputMode="decimal"
        aria-invalid={field?.hasError || undefined}
        aria-describedby={field?.hasError ? field.errorId : undefined}
        className={cn(
          controlClasses,
          "h-10 pl-12 text-right text-numeric [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        {...props}
      />
    </div>
  );
}
