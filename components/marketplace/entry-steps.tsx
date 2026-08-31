import * as React from "react";
import Link from "next/link";
import { ArrowRight, Search, Sparkles, UserPlus } from "lucide-react";

/*
  The three-step entry journey — Chapter 9 §9.3.

  CREATE YOUR ACCOUNT → CHOOSE YOUR MEMBERSHIP → SEARCH, CONNECT & SHOP.

  Shown only to visitors who are not signed in. A strip telling a returning
  customer to create an account is the most obvious kind of interface that has
  not been read by anyone using it, and it would push the actual catalogue
  further down the page for the people most likely to buy.

  The order deliberately does not match the chapter's numbering as a *funnel*:
  the copy below leads with searching being free, because §9.40 is explicit that
  ordinary discovery must not feel punitive, and a strip that reads
  "register, then pay, then you may search" says the opposite of the product.
*/

const STEPS = [
  {
    icon: Search,
    title: "Search, free",
    body: "Every listing, every price band and every verified supplier — no account needed.",
  },
  {
    icon: UserPlus,
    title: "Create your account",
    body: "Email, phone and where you build. That is what lets you ask suppliers for a price.",
  },
  {
    icon: Sparkles,
    title: "Choose your membership",
    body: "Stay on Build Free, or take member pricing, deeper information and more quotes at once.",
  },
];

export function EntrySteps({ signedIn }: { signedIn: boolean }) {
  if (signedIn) return null;

  return (
    <div className="border-t border-border pb-8 pt-6">
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-subtle-foreground text-numeric">
                    {index + 1}.
                  </span>{" "}
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        <Link
          href="/join"
          className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
        >
          Create your account
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}
