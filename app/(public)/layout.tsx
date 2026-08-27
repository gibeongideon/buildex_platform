import Link from "next/link";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme";
import { Button } from "@/components/ui/button";

const FOOTER_SECTIONS = [
  {
    title: "Buildex Interiors",
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
      { label: "Marketplace", href: "/marketplace" },
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-brand-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="rounded-md">
            {/* The descriptor must stay readable, so the mark shrinks instead. */}
            <Wordmark size="sm" className="sm:hidden" />
            <Wordmark className="hidden sm:inline-flex" />
          </Link>
          <nav aria-label="Main" className="ml-auto mr-1 hidden items-center gap-1 md:flex">
            <Link
              href="/marketplace"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Marketplace
            </Link>
            <Link
              href="/manufacturers"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              For manufacturers
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden lg:inline-flex" />
            <Button variant="secondary" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/connect/dashboard">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/connect/onboarding/account">
                <span className="sm:hidden">Sell</span>
                <span className="hidden sm:inline">Start selling</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      {/*
        The guideline's 70/20/10 blue/yellow/white ratio is about brand
        expression, so the public site's footer is a blue ground. The portals
        stay light, where data legibility outranks brand dominance.
      */}
      <footer className="on-brand">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              {/*
                The platform is Buildex Connect; Interiors is one of the three
                businesses inside it, and the legal entity in the copyright line
                below. This used to hand-copy the lockup and had drifted to the
                wrong one — it now renders the shared component, which cannot.
              */}
              <Wordmark product="connect" reversed />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
                Product supply, financing and the manufacturer marketplace for Kenya&apos;s
                construction material market.
              </p>
              <p className="mt-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Building Better Lives
              </p>
            </div>
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-sm font-semibold text-white">{section.title}</p>
                <ul className="mt-3 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="rounded text-sm text-white/70 transition-colors hover:text-white hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/60">
              © {new Date().getFullYear()} Buildex Interiors Co. Ltd. Nairobi, Kenya.
            </p>
            <p className="text-xs text-white/50">
              Prototype build — mock data only, no live services connected.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
