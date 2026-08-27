"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Ban,
  Building2,
  CreditCard,
  ExternalLink,
  FileText,
  Megaphone,
  MessageSquare,
  Package,
  RotateCcw,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Currency, DetailRow, Num, Pct } from "@/components/shared/format";
import { ProductThumb } from "@/components/shared/product-thumb";
import { VerificationTracker } from "@/components/shared/verification-tracker";
import {
  ActivityRow,
  ActivityRowSkeleton,
} from "@/components/admin/activity-row";
import { RecordPanel, RecordTabs } from "@/components/admin/record-tabs";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-state";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusPill,
  type Tone,
} from "@/components/ui/primitives";
import {
  activityRepo,
  campaignRepo,
  enquiryRepo,
  manufacturerRepo,
  productRepo,
} from "@/lib/data";
import { useQuery } from "@/lib/data/hooks";
import { capacityBandLabel, regionForCounty } from "@/lib/schemas/common";
import { documentTypeMeta, isDocumentExpired } from "@/lib/schemas/document";
import {
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_STATUS_TONE,
  enquiryValue,
} from "@/lib/schemas/enquiry";
import { formatLeadTime, priceRange, type Product } from "@/lib/schemas/product";
import { CAMPAIGN_STATUS_TONE, conversionRate } from "@/lib/schemas/campaign";
import { packageMeta, packagePrice } from "@/lib/schemas/subscription";
import {
  STATUS_LABELS,
  STATUS_TONE,
  canListProducts,
  canTransact,
  deriveStatus,
  type ManufacturerStatus,
} from "@/lib/schemas/verification";
import { cn, formatDate, formatRelative } from "@/lib/utils";

/*
  One manufacturer, everything about them.

  This is the page an account manager opens before a call: what they sell, who
  is asking, what they are spending, whether they are answering, and where their
  application stands. The verification queue answers "should they be on the
  platform"; this answers "how are they doing on it".
*/

const PRODUCT_STATUS_META: Record<Product["status"], { label: string; tone: Tone }> = {
  active: { label: "Live", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  out_of_stock: { label: "Out of stock", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
};

export default function AdminManufacturerRecordPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: manufacturer, loading, error, refetch } = useQuery(
    () => manufacturerRepo.getById(id),
    [id],
  );
  const { data: products } = useQuery(() => productRepo.listByManufacturer(id), [id]);
  const { data: enquiries } = useQuery(() => enquiryRepo.list({ manufacturerId: id }), [id]);
  const { data: campaigns } = useQuery(() => campaignRepo.listByManufacturer(id), [id]);
  const { data: events } = useQuery(
    () => activityRepo.list({ manufacturerId: id, limit: 40 }),
    [id],
  );

  const [tab, setTab] = React.useState("overview");
  const [busy, setBusy] = React.useState(false);

  if (loading && !manufacturer) {
    return (
      <>
        <PageHeader title="Manufacturer" />
        <Skeleton className="h-96" />
      </>
    );
  }

  if (!manufacturer) {
    return (
      <>
        <PageHeader title="Manufacturer" />
        <Card>
          <CardBody className="p-0">
            <EmptyState
              icon={<Store className="size-5" />}
              title="Manufacturer not found"
              description="It may have been removed from the prototype data."
              action={
                <Button asChild>
                  <Link href="/admin/manufacturers">Back to the directory</Link>
                </Button>
              }
            />

        <QueryError error={error} onRetry={refetch} />
          </CardBody>
        </Card>
      </>
    );
  }

  const catalogue = products ?? [];
  const inbox = enquiries ?? [];
  const ads = campaigns ?? [];
  const live = catalogue.filter((p) => p.status === "active");
  const drafts = catalogue.filter((p) => p.status === "draft");
  const unanswered = inbox.filter((e) => e.status === "new");
  const answered = inbox.filter((e) => e.status !== "new");

  const inFlight = inbox.reduce((sum, e) => {
    const product = catalogue.find((p) => p.id === e.productId);
    const fallback = product ? priceRange(product.priceBands).min : 0;
    return sum + enquiryValue(e, fallback);
  }, 0);

  const spend = ads.reduce((sum, c) => sum + c.spentKsh, 0);
  const shareholding = manufacturer.directors.reduce(
    (sum, d) => sum + d.ownershipPercent,
    0,
  );
  const sub = manufacturer.subscription;
  const suspended = manufacturer.status === "suspended";

  async function setStatus(next: ManufacturerStatus) {
    setBusy(true);
    try {
      await manufacturerRepo.update(id, { status: next });
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "catalogue", label: "Catalogue", count: catalogue.length },
    { key: "enquiries", label: "Enquiries", count: inbox.length },
    { key: "campaigns", label: "Campaigns", count: ads.length },
    { key: "verification", label: "Verification" },
    // No count: the feed is capped at 40, so a number here would read as "this
    // supplier has exactly 40 events" whenever they have more.
    { key: "activity", label: "Activity" },
  ];

  return (
    <>
      <PageHeader
        title={manufacturer.tradingName}
        description={`${manufacturer.legalName} · ${manufacturer.county}, ${regionForCounty(manufacturer.county)}`}
        breadcrumbs={[
          { label: "Buildex Admin", href: "/admin" },
          { label: "Manufacturers", href: "/admin/manufacturers" },
          { label: manufacturer.tradingName },
        ]}
        actions={
          <>
            <StatusPill tone={STATUS_TONE[manufacturer.status]}>
              {STATUS_LABELS[manufacturer.status]}
            </StatusPill>
            {canListProducts(manufacturer.status) ? (
              <Button variant="secondary" asChild>
                <Link href={`/marketplace/manufacturer/${manufacturer.id}`}>
                  <ExternalLink aria-hidden="true" />
                  Storefront
                </Link>
              </Button>
            ) : (
              <Button variant="secondary" asChild>
                <Link href={`/admin/verification/${manufacturer.id}`}>
                  <ShieldCheck aria-hidden="true" />
                  Review application
                </Link>
              </Button>
            )}
            {suspended ? (
              <Button
                onClick={() => setStatus(deriveStatus(manufacturer.checks))}
                disabled={busy}
              >
                <RotateCcw aria-hidden="true" />
                Reinstate
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => setStatus("suspended")}
                disabled={busy}
              >
                <Ban aria-hidden="true" />
                Suspend
              </Button>
            )}
          </>
        }
      />

      <nav aria-label="Back" className="mb-4">
        <Link
          href="/admin/manufacturers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Manufacturer directory
        </Link>
      </nav>

      {suspended ? (
        <Alert tone="danger" className="mb-6" title="This supplier is suspended">
          Their storefront returns not-found and their listings have left the marketplace.
          Reinstating recomputes status from the check pipeline, so a previously verified
          supplier comes back verified.
        </Alert>
      ) : !canTransact(manufacturer.status) && canListProducts(manufacturer.status) ? (
        <Alert tone="warning" className="mb-6" title="Listing allowed, transacting held">
          A site visit is outstanding. Hardware shops can see the catalogue and enquire,
          but orders stay disabled until the plant has been seen.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live listings"
          tone="success"
          value={live.length}
          hint={drafts.length ? `${drafts.length} in draft` : "Nothing in draft"}
          icon={<Package className="size-4" />}
        />
        <StatCard
          label="Enquiries received"
          tone="info"
          value={inbox.length}
          hint={unanswered.length ? `${unanswered.length} unanswered` : "All answered"}
          icon={<MessageSquare className="size-4" />}
        />
        <StatCard
          label="Value enquired"
          tone="info"
          value={<Currency value={inFlight} />}
          hint="Quoted price, or lowest band"
          icon={<CreditCard className="size-4" />}
        />
        <StatCard
          label="Campaign spend"
          tone="info"
          value={<Currency value={spend} />}
          hint={`${ads.filter((c) => c.status === "active").length} active`}
          icon={<Megaphone className="size-4" />}
        />
      </div>

      <div className="mt-6">
        <RecordTabs
          tabs={tabs}
          active={tab}
          onChange={setTab}
          label="Manufacturer record sections"
          idPrefix="mfr"
        />

        <RecordPanel tabKey="overview" active={tab} idPrefix="mfr">
          <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-brand" aria-hidden="true" />
                  Company
                </CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="divide-y divide-border">
                  <DetailRow label="Registered legal name" value={manufacturer.legalName} />
                  <DetailRow label="BRS number" value={manufacturer.brsNumber} />
                  <DetailRow label="KRA PIN" value={manufacturer.kraPin} />
                  <DetailRow label="Year established" value={manufacturer.yearEstablished} />
                  <DetailRow
                    label="Production capacity"
                    value={capacityBandLabel(manufacturer.capacityBand)}
                  />
                  <DetailRow label="Address" value={manufacturer.physicalAddress} />
                  <DetailRow label="Categories" value={manufacturer.categories.join(", ")} />
                  <DetailRow
                    label="Distribution"
                    value={manufacturer.distributionRegions.join(", ")}
                  />
                </dl>
              </CardBody>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-4 text-brand" aria-hidden="true" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <dl className="divide-y divide-border">
                    <DetailRow label="Contact" value={manufacturer.contactName} />
                    <DetailRow label="Email" value={manufacturer.email} />
                    <DetailRow
                      label="Phone"
                      value={`${manufacturer.phone}${manufacturer.phoneVerified ? " · verified" : " · unverified"}`}
                    />
                    <DetailRow
                      label="Website"
                      value={manufacturer.website || "Not provided"}
                    />
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="size-4 text-brand" aria-hidden="true" />
                    Subscription
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {sub ? (
                    <dl className="divide-y divide-border">
                      <DetailRow label="Package" value={packageMeta(sub.package).name} />
                      <DetailRow
                        label="Billing"
                        value={sub.billingCycle === "annual" ? "Annual" : "Monthly"}
                      />
                      <DetailRow
                        label="Price"
                        value={
                          packagePrice(sub.package, sub.billingCycle) === 0
                            ? "No charge"
                            : `KSh ${packagePrice(sub.package, sub.billingCycle).toLocaleString("en-KE")} / ${sub.billingCycle === "annual" ? "year" : "month"}`
                        }
                      />
                      <DetailRow label="Started" value={formatDate(sub.startedAt)} />
                      <DetailRow
                        label="Renews"
                        value={sub.renewsAt ? formatDate(sub.renewsAt) : "Never"}
                      />
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No package taken yet.{" "}
                      <Link
                        href="/admin/subscriptions"
                        className="text-brand hover:underline"
                      >
                        Set one from Subscriptions
                      </Link>
                      .
                    </p>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="size-4 text-brand" aria-hidden="true" />
                  Storefront as buyers see it
                </CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm font-medium text-foreground">
                  {manufacturer.storefront.tagline}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {manufacturer.storefront.about}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Response rate</p>
                    <p className="text-base font-semibold text-numeric text-foreground">
                      <Pct value={manufacturer.storefront.responseRatePercent} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Advertised response</p>
                    <p className="text-base font-semibold text-numeric text-foreground">
                      {manufacturer.storefront.avgResponseHours
                        ? `${manufacturer.storefront.avgResponseHours}h`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Orders fulfilled</p>
                    <p className="text-base font-semibold text-numeric text-foreground">
                      <Num value={manufacturer.storefront.ordersFulfilled} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Certifications</p>
                    <p className="text-base font-semibold text-foreground">
                      {manufacturer.storefront.certifications.length || "None"}
                    </p>
                  </div>
                </div>
                {manufacturer.storefront.certifications.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {manufacturer.storefront.certifications.map((c) => (
                      <StatusPill key={c} tone="info">
                        {c}
                      </StatusPill>
                    ))}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </RecordPanel>

        <RecordPanel tabKey="catalogue" active={tab} idPrefix="mfr">
          <Card>
            <CardBody className="p-0">
              {catalogue.length === 0 ? (
                <EmptyState
                  icon={<Package className="size-5" />}
                  title="No listings yet"
                  description="This supplier has not built a catalogue."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {catalogue.map((product) => {
                    const range = priceRange(product.priceBands);
                    const meta = PRODUCT_STATUS_META[product.status];
                    return (
                      <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                        <ProductThumb
                          productId={product.id}
                          category={product.category}
                          className="size-11 shrink-0 rounded-md border border-border"
                          iconClassName="size-4"
                          sizes="44px"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground text-numeric">
                            {product.sku} · {product.category} · MOQ{" "}
                            <Num value={product.moq} /> {product.unit}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm text-foreground">
                            <Currency value={range.min} />
                            {range.max !== range.min ? (
                              <>
                                <span aria-hidden="true">–</span>
                                <Currency value={range.max} hideSymbol />
                              </>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatLeadTime(product.leadTimeDays)}
                          </p>
                        </div>
                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </RecordPanel>

        <RecordPanel tabKey="enquiries" active={tab} idPrefix="mfr">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Unanswered"
          tone="warning" value={unanswered.length} />
            <StatCard
              label="Answer rate"
          tone="success"
              value={<Pct value={inbox.length ? (answered.length / inbox.length) * 100 : 0} />}
            />
            <StatCard
              label="They advertise"
          tone="neutral"
              value={
                manufacturer.storefront.avgResponseHours
                  ? `${manufacturer.storefront.avgResponseHours}h`
                  : "—"
              }
              hint="Their own stated response time"
            />
          </div>
          <Card className="mt-4">
            <CardBody className="p-0">
              {inbox.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="size-5" />}
                  title="No enquiries yet"
                  description="Nothing has come in for this supplier."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {inbox.map((enquiry) => (
                    <li key={enquiry.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={ENQUIRY_STATUS_TONE[enquiry.status]}>
                              {ENQUIRY_STATUS_LABELS[enquiry.status]}
                            </StatusPill>
                            <p className="text-sm font-medium text-foreground">
                              {enquiry.shopName}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {enquiry.county}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            <Num value={enquiry.quantity} /> {enquiry.unit}
                            {enquiry.quantity === 1 ? "" : "s"} of {enquiry.productName}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          <p>{formatRelative(enquiry.createdAt)}</p>
                          {enquiry.respondedAt ? (
                            <p className="text-success">
                              answered {formatRelative(enquiry.respondedAt)}
                            </p>
                          ) : (
                            <p className="text-warning">not answered</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </RecordPanel>

        <RecordPanel tabKey="campaigns" active={tab} idPrefix="mfr">
          <Card>
            <CardBody className="p-0">
              {ads.length === 0 ? (
                <EmptyState
                  icon={<Megaphone className="size-5" />}
                  title="No campaigns"
                  description="Regional targeting needs a Premium or VIP package."
                  action={
                    <Button variant="secondary" asChild>
                      <Link href="/admin/subscriptions">Review their package</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {ads.map((campaign) => (
                    <li key={campaign.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={CAMPAIGN_STATUS_TONE[campaign.status]}>
                              {campaign.status}
                            </StatusPill>
                            <p className="text-sm font-medium text-foreground">
                              {campaign.name}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {campaign.regions.join(", ")} · started{" "}
                            {formatRelative(campaign.startsAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground text-numeric">
                          <p className="text-sm text-foreground">
                            <Currency value={campaign.spentKsh} /> spent
                          </p>
                          <p>
                            <Num value={campaign.metrics.enquiries} /> enquiries ·{" "}
                            <Pct value={conversionRate(campaign.metrics)} /> conversion
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </RecordPanel>

        <RecordPanel tabKey="verification" active={tab} idPrefix="mfr">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-4 text-brand" aria-hidden="true" />
                    Directors ({manufacturer.directors.length})
                  </CardTitle>
                  <StatusPill tone={Math.round(shareholding) === 100 ? "success" : "danger"}>
                    {shareholding}% declared
                  </StatusPill>
                </CardHeader>
                <CardBody className="p-0">
                  <ul className="divide-y divide-border">
                    {manufacturer.directors.map((director) => (
                      <li
                        key={director.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {director.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground text-numeric">
                            {director.role} · ID {director.nationalId}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm text-numeric text-foreground">
                          {director.ownershipPercent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-4 text-brand" aria-hidden="true" />
                    KYB documents ({manufacturer.documents.length})
                  </CardTitle>
                </CardHeader>
                <CardBody className="p-0">
                  <ul className="divide-y divide-border">
                    {manufacturer.documents.map((doc) => {
                      const expired = isDocumentExpired(doc);
                      return (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {documentTypeMeta(doc.type).label}
                            </p>
                            <p className="text-xs text-muted-foreground text-numeric">
                              {doc.fileName} · uploaded {formatRelative(doc.uploadedAt)}
                            </p>
                          </div>
                          <StatusPill
                            tone={
                              expired || doc.status === "rejected"
                                ? "danger"
                                : doc.status === "accepted"
                                  ? "success"
                                  : "neutral"
                            }
                          >
                            {expired ? "Expired" : doc.status}
                          </StatusPill>
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <Card>
                <CardHeader>
                  <CardTitle>Check pipeline</CardTitle>
                </CardHeader>
                <CardBody>
                  <VerificationTracker checks={manufacturer.checks} />
                </CardBody>
              </Card>
              <Button className="w-full" asChild>
                <Link href={`/admin/verification/${manufacturer.id}`}>
                  <ShieldCheck aria-hidden="true" />
                  Open the reviewer
                </Link>
              </Button>
            </div>
          </div>
        </RecordPanel>

        <RecordPanel tabKey="activity" active={tab} idPrefix="mfr">
          <Card>
            <CardBody className="p-0">
              {!events ? (
                <ul className="divide-y divide-border">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <ActivityRowSkeleton key={i} />
                  ))}
                </ul>
              ) : events.length === 0 ? (
                <EmptyState
                  icon={<Activity className="size-5" />}
                  title="No recorded activity"
                  description="Nothing has happened on this record yet."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {events.map((event) => (
                    <ActivityRow key={event.id} event={event} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <p className={cn("mt-3 text-xs text-muted-foreground")}>
            Derived from the timestamps on this manufacturer&apos;s own records, so it
            cannot disagree with them.
          </p>
        </RecordPanel>
      </div>
    </>
  );
}
