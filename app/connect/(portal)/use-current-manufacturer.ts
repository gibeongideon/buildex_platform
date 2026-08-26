"use client";

import { manufacturerRepo, onboardingRepo, productRepo, sessionRepo } from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";

/**
 * Whoever is "signed in" to the Connect portal.
 *
 * Resolution order: the manufacturer created by this browser's onboarding
 * draft, then the demo session, then a seeded fallback so the portal is
 * explorable without completing the wizard first. At cutover this becomes a
 * lookup against the authenticated user's organisation.
 */
const FALLBACK_MANUFACTURER_ID = "mfr_savannah";

export function useCurrentManufacturer() {
  return useQuery(async () => {
    const draft = await onboardingRepo.load();
    const session = await sessionRepo.get();
    const id = draft.manufacturerId ?? session.manufacturerId ?? FALLBACK_MANUFACTURER_ID;

    const manufacturer =
      (await manufacturerRepo.getById(id)) ??
      (await manufacturerRepo.getById(FALLBACK_MANUFACTURER_ID));

    if (!manufacturer) return null;

    const products = await productRepo.listByManufacturer(manufacturer.id);
    return { manufacturer, products, isDemoFallback: !draft.manufacturerId };
  }, []);
}
