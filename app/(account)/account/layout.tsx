import type { Metadata } from "next";
import { AccountShell } from "./account-shell";

export const metadata: Metadata = {
  title: "My account",
  description:
    "Your Buildex Connect account: membership, wallet, quotations, orders and Trust Profile.",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
