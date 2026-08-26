import Link from "next/link";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme";
import { Button } from "@/components/ui/button";

const FOOTER_SECTIONS = [
  {
    title: "Buildex",
    links: [
      { label: "Product supply", href: "/" },
      { label: "For hardware shops", href: "/" },
    ],
  },
  {
    title: "Buildex Capital",
    links: [
      { label: "Stock financing", href: "/" },
      { label: "Wallet & collections", href: "/" },
    ],
  },
  {
    title: "Buildex Connect",
    links: [
      { label: "For manufacturers", href: "/manufacturers" },
      { label: "Packages", href: "/manufacturers#packages" },
      { label: "Start onboarding", href: "/connect/onboarding/account" },
    ],
  },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="rounded-md">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button variant="secondary" size="sm" asChild>
              <Link href="/connect/dashboard">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/manufacturers">For manufacturers</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Wordmark />
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Product supply, financing and the manufacturer marketplace for Kenya&apos;s
                construction material market.
              </p>
            </div>
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <ul className="mt-3 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Buildex. Nairobi, Kenya.
            </p>
            <p className="text-xs text-subtle-foreground">
              Prototype build — mock data only, no live services connected.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
