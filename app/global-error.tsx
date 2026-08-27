"use client";

import { ErrorPanel } from "@/components/shared/error-panel";
import "./globals.css";

/*
  The last resort: a failure in the root layout itself.

  This one replaces <html> and <body>, so it cannot rely on anything the root
  layout sets up — the theme script has not run, and the font variables are not
  on <html>. It therefore imports the stylesheet directly and accepts the default
  light palette rather than trying to reproduce that setup, which is exactly the
  code that just failed.
*/

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ErrorPanel
          error={error}
          reset={reset}
          title="Buildex Connect could not start"
        />
      </body>
    </html>
  );
}
