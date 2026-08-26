"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DetailRow } from "@/components/shared/format";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChipGroup,
  Separator,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { manufacturerRepo } from "@/lib/data";
import {
  PRODUCT_CATEGORIES,
  REGIONS,
  capacityBandLabel,
  type ProductCategory,
  type Region,
} from "@/lib/schemas/common";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/schemas/verification";
import { packageMeta } from "@/lib/schemas/subscription";
import { formatDate } from "@/lib/utils";
import { useCurrentManufacturer } from "../use-current-manufacturer";

/*
  Company settings.

  Split deliberately into what a manufacturer may change themselves and what it
  may not. Trading name, storefront copy, categories and regions are commercial
  choices — theirs. Registered name, BRS number and KRA PIN were verified
  against government registries, so changing them has to go back through
  Buildex Operations rather than being silently editable.
*/

const TEAM = [
  { name: "Grace Wanjiru", role: "Administrator", email: "grace@example.co.ke", status: "Active" },
  { name: "Peter Mwangi", role: "Sales", email: "peter@example.co.ke", status: "Active" },
  { name: "Anne Njoki", role: "Sales", email: "anne@example.co.ke", status: "Invited" },
];

export default function SettingsPage() {
  const { data, loading } = useCurrentManufacturer();
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const [tradingName, setTradingName] = React.useState<string | null>(null);
  const [tagline, setTagline] = React.useState<string | null>(null);
  const [about, setAbout] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<ProductCategory[] | null>(null);
  const [regions, setRegions] = React.useState<Region[] | null>(null);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Company settings" />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (!data) return null;

  const { manufacturer } = data;
  const { storefront } = manufacturer;

  // Derived from the record unless the user has edited the field this session.
  const nameValue = tradingName ?? manufacturer.tradingName;
  const taglineValue = tagline ?? storefront.tagline;
  const aboutValue = about ?? storefront.about;
  const categoriesValue = categories ?? (manufacturer.categories as ProductCategory[]);
  const regionsValue = regions ?? (manufacturer.distributionRegions as Region[]);

  const dirty =
    nameValue !== manufacturer.tradingName ||
    taglineValue !== storefront.tagline ||
    aboutValue !== storefront.about ||
    categoriesValue.join() !== manufacturer.categories.join() ||
    regionsValue.join() !== manufacturer.distributionRegions.join();

  async function save() {
    setSaving(true);
    try {
      await manufacturerRepo.update(manufacturer.id, {
        tradingName: nameValue,
        categories: categoriesValue,
        distributionRegions: regionsValue,
        storefront: { ...storefront, tagline: taglineValue, about: aboutValue },
      });
      setTradingName(null);
      setTagline(null);
      setAbout(null);
      setCategories(null);
      setRegions(null);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Company settings"
        description="Your public profile, trading terms and team."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Settings" },
        ]}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/marketplace/manufacturer/${manufacturer.id}`}>
              <ExternalLink aria-hidden="true" />
              View storefront
            </Link>
          </Button>
        }
      />

      {saved && !dirty ? (
        <Alert tone="success" className="mb-6" title="Settings saved">
          Your storefront has been updated.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Storefront</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                What hardware shops see on your page in the marketplace.
              </p>
            </CardHeader>
            <CardBody className="space-y-5">
              <Field>
                <Label>Trading name</Label>
                <Input
                  value={nameValue}
                  onChange={(event) => {
                    setTradingName(event.target.value);
                    setSaved(false);
                  }}
                />
                <FieldHint>
                  The name buyers see. Your registered legal name stays as verified.
                </FieldHint>
              </Field>

              <Field>
                <Label>Tagline</Label>
                <Input
                  value={taglineValue}
                  maxLength={120}
                  onChange={(event) => {
                    setTagline(event.target.value);
                    setSaved(false);
                  }}
                />
                <FieldHint>One line, under the store name. {120 - taglineValue.length} characters left.</FieldHint>
              </Field>

              <Field>
                <Label>About</Label>
                <Textarea
                  rows={5}
                  value={aboutValue}
                  maxLength={1200}
                  onChange={(event) => {
                    setAbout(event.target.value);
                    setSaved(false);
                  }}
                />
                <FieldHint>
                  What you make, how you dispatch, what makes you worth ordering from.
                </FieldHint>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What you manufacture</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Field>
                <Label>Product categories</Label>
                <FieldHint>
                  Hardware shops browse by category before they browse by price.
                </FieldHint>
                <div className="pt-1">
                  <ChipGroup
                    label="Product categories"
                    options={PRODUCT_CATEGORIES}
                    value={categoriesValue}
                    onChange={(next) => {
                      setCategories(next);
                      setSaved(false);
                    }}
                    columns={2}
                  />
                </div>
              </Field>

              <Separator />

              <Field>
                <Label>Distribution regions</Label>
                <div className="pt-1">
                  <ChipGroup
                    label="Distribution regions"
                    options={REGIONS}
                    value={regionsValue}
                    onChange={(next) => {
                      setRegions(next);
                      setSaved(false);
                    }}
                    columns={2}
                  />
                </div>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verified details</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Checked against government registries. Changes go through Buildex
                Operations.
              </p>
            </CardHeader>
            <CardBody>
              <dl className="divide-y divide-border">
                <DetailRow label="Registered legal name" value={manufacturer.legalName} />
                <DetailRow label="BRS number" value={manufacturer.brsNumber} />
                <DetailRow label="KRA PIN" value={manufacturer.kraPin} />
                <DetailRow label="Year established" value={manufacturer.yearEstablished} />
                <DetailRow label="Plant address" value={manufacturer.physicalAddress} />
                <DetailRow label="County" value={manufacturer.county} />
                <DetailRow
                  label="Production capacity"
                  value={capacityBandLabel(manufacturer.capacityBand)}
                />
                <DetailRow
                  label="Directors"
                  value={manufacturer.directors.map((d) => d.fullName).join(", ")}
                />
              </dl>
              <Button variant="secondary" size="sm" className="mt-4" asChild>
                <Link href="/connect/verification">Request a change</Link>
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <CardTitle>Team</CardTitle>
              <Button variant="secondary" size="sm">
                <Users aria-hidden="true" />
                Invite colleague
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="scroll-x">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="px-5 py-2.5 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Role
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {TEAM.map((member) => (
                      <tr key={member.email}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{member.role}</td>
                        <td className="px-5 py-3 text-right">
                          <StatusPill
                            tone={member.status === "Active" ? "success" : "info"}
                          >
                            {member.status}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="lg:sticky lg:top-8">
            <CardBody>
              {dirty ? (
                <>
                  <p className="text-sm font-semibold text-foreground">Unsaved changes</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your storefront updates as soon as you save.
                  </p>
                  <Button className="mt-3 w-full" loading={saving} onClick={save}>
                    Save changes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      setTradingName(null);
                      setTagline(null);
                      setAbout(null);
                      setCategories(null);
                      setRegions(null);
                    }}
                  >
                    Discard
                  </Button>
                </>
              ) : (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  Everything is saved.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="divide-y divide-border">
                <DetailRow
                  label="Verification"
                  value={
                    <StatusPill tone={STATUS_TONE[manufacturer.status]}>
                      {STATUS_LABELS[manufacturer.status]}
                    </StatusPill>
                  }
                />
                <DetailRow
                  label="Package"
                  value={
                    manufacturer.subscription
                      ? packageMeta(manufacturer.subscription.package).name
                      : "None"
                  }
                />
                <DetailRow
                  label="Renews"
                  value={
                    manufacturer.subscription?.renewsAt
                      ? formatDate(manufacturer.subscription.renewsAt)
                      : "—"
                  }
                />
                <DetailRow label="Contact" value={manufacturer.email} />
                <DetailRow label="Phone" value={manufacturer.phone} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trading record</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Response rate</dt>
                  <dd className="font-semibold text-foreground text-numeric">
                    {storefront.responseRatePercent}%
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Average reply</dt>
                  <dd className="font-semibold text-foreground">
                    {storefront.avgResponseHours}h
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Orders fulfilled</dt>
                  <dd className="font-semibold text-foreground text-numeric">
                    {storefront.ordersFulfilled.toLocaleString("en-KE")}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Shown on your storefront. Earned from actual trading — not editable.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settlement</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2">
                {storefront.paymentTerms.map((term) => (
                  <li key={term} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      className="mt-0.5 size-3.5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{term}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                {storefront.deliveryPolicy}
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
