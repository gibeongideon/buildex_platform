import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
  404. Reached by a mistyped URL, or by a link to a record that no longer exists
  after the demo data was reset.

  Offers the three entry points rather than only "go home", because this
  prototype has three audiences and the home page is only the right destination
  for one of them.
*/

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Compass className="size-6" aria-hidden="true" />
      </span>

      <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
        This page does not exist
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The address may be mistyped, or it may point at a record that was cleared when the
        demo data was last reset.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/">
            <Home aria-hidden="true" />
            Home
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/marketplace">Marketplace</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/admin">Buildex Admin</Link>
        </Button>
      </div>
    </div>
  );
}
