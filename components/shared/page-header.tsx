import * as React from "react";
import { Breadcrumbs, type Crumb } from "@/components/shared/breadcrumbs";
import { cn } from "@/lib/utils";

/*
  The standard heading block for the portal and the console: trail, title,
  description, actions.

  The marketplace deliberately does not use this — its pages carry their own
  heading treatment — but it does use `Breadcrumbs`, which is why that lives in
  its own module rather than inline here.
*/

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
