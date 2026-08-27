import type { Metadata } from "next";
import { AdminShell } from "./admin-shell";

/*
  The console's shell is a client component — it reads the pathname and holds
  the role switcher — and a client component cannot export metadata. So the
  layout itself stays on the server and does nothing but name the section and
  render the shell.

  Per-page titles are not set here. Every page under this route is a client
  component too, and the ones worth naming individually — a supplier, an
  application — need their record's name, which arrives with the backend.
*/

export const metadata: Metadata = {
  title: "Buildex Admin",
  description:
    "The internal console: verification, listings, enquiries, subscriptions and the procurement ledger.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
