"use client";

import { customerRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";

/*
  Who is signed in on the buying side.

  There is no authentication in this build, so this reads the demo session.
  Unlike `use-current-manufacturer.ts` there is deliberately **no fallback
  account**: a null customer means signed out, and the account screens have to
  say so and offer `/join` rather than quietly showing someone else's wallet.
  Guessing an identity is a defensible shortcut for a supplier portal reached
  only from onboarding; it is not one for a screen showing money.
*/
export function useCurrentCustomer() {
  return useQuery(() => customerRepo.current(), []);
}
