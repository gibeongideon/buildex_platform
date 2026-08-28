"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  StatusPill,
} from "@/components/ui/primitives";
import { Currency } from "@/components/shared/format";
import { productRepo } from "@/lib/data";
import {
  IMPORT_COLUMNS,
  importTemplateCsv,
  parseProductImport,
  type ImportResult,
} from "@/lib/rules/product-import";
import { MAIN_PRODUCT_LIMIT, mainSlotsRemaining } from "@/lib/rules/catalogue";
import { priceRange } from "@/lib/schemas/product";
import { canListProducts } from "@/lib/schemas/verification";
import { useCurrentManufacturer } from "../../use-current-manufacturer";

/*
  Bulk catalogue import.

  Nothing is written until the supplier has seen exactly what will be written.
  The file is parsed in the browser, every row is validated against the same
  schema the single-product form uses, and the result is shown as two lists:
  what will import, and what will not and why, by line number.

  Excel is read by asking for a CSV. Parsing .xlsx in the browser means a
  megabyte of spreadsheet library for a format every version of Excel, Numbers
  and Sheets exports to CSV in two clicks — so the page says so plainly rather
  than accepting a file it will silently fail on.
*/

const ACCEPTED = ".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain";

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CatalogueImportPage() {
  const { data, loading, refetch } = useCurrentManufacturer();
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [spreadsheetFile, setSpreadsheetFile] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [imported, setImported] = React.useState<number | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Import products" />
        <Card>
          <CardBody>Loading your catalogue…</CardBody>
        </Card>
      </>
    );
  }
  if (!data) return null;

  const { manufacturer, products } = data;
  const slotsLeft = mainSlotsRemaining(products);
  const canPublish = canListProducts(manufacturer.status);

  const mainsInFile = result?.drafts.filter((d) => d.isMainProduct).length ?? 0;
  const overMainCap = mainsInFile > slotsLeft;

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImported(null);
    setFailure(null);
    setFileName(file.name);

    // A real .xlsx is a zip; there is nothing useful to read as text.
    if (/\.(xlsx|xls|numbers|ods)$/i.test(file.name)) {
      setSpreadsheetFile(true);
      setResult(null);
      return;
    }

    setSpreadsheetFile(false);
    setResult(parseProductImport(await file.text()));
  }

  async function commit() {
    if (!result || result.drafts.length === 0) return;
    setImporting(true);
    setFailure(null);
    try {
      await productRepo.createMany(
        result.drafts.map((draft) => ({
          ...draft,
          manufacturerId: manufacturer.id,
          imageUrls: [],
          // Same rule as the single form: nothing publishes before the supplier
          // is cleared to sell.
          status: canPublish ? ("active" as const) : ("draft" as const),
        })),
      );
      setImported(result.drafts.length);
      setResult(null);
      setFileName("");
      refetch();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The import did not complete.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Import products"
        description="Upload a price list instead of typing it in. Every row is checked against the same rules as the product form before anything is saved."
        breadcrumbs={[
          { label: "Connect", href: "/connect/dashboard" },
          { label: "Catalogue", href: "/connect/catalogue" },
          { label: "Import" },
        ]}
        actions={
          <Button
            variant="secondary"
            onClick={() => download("buildex-product-template.csv", importTemplateCsv())}
          >
            <Download aria-hidden="true" />
            Download template
          </Button>
        }
      />

      {imported !== null ? (
        <Alert
          tone="success"
          className="mb-6"
          title={`${imported} ${imported === 1 ? "product" : "products"} imported`}
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/connect/catalogue">Open the catalogue</Link>
            </Button>
          }
        >
          {canPublish
            ? "They are live on the marketplace now."
            : "They are saved as drafts and publish automatically once your verification clears."}
        </Alert>
      ) : null}

      {failure ? (
        <Alert tone="danger" className="mb-6" title="Nothing was imported">
          {failure} The whole file is applied at once, so your catalogue is unchanged.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose a file</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-muted px-4 py-8 text-center transition-colors hover:border-brand">
                <Upload className="size-6 text-brand" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">
                  {fileName || "Choose a CSV file"}
                </span>
                <span className="text-xs text-muted-foreground">
                  CSV or tab-separated. Exported from Excel, Sheets or Numbers.
                </span>
                <input
                  type="file"
                  accept={ACCEPTED}
                  className="sr-only"
                  onChange={onFile}
                />
              </label>

              {spreadsheetFile ? (
                <Alert tone="warning" title="Save it as CSV first">
                  <p>
                    {fileName} is a spreadsheet file, which we cannot read directly. In
                    Excel, Sheets or Numbers choose <strong>File → Save as</strong> (or
                    Export) and pick <strong>CSV</strong>, then upload that.
                  </p>
                </Alert>
              ) : null}

              {result ? (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={result.drafts.length > 0 ? "success" : "neutral"}>
                    {result.drafts.length} ready
                  </StatusPill>
                  {result.errors.length > 0 ? (
                    <StatusPill tone="danger">
                      {result.errors.length}{" "}
                      {result.errors.length === 1 ? "problem" : "problems"}
                    </StatusPill>
                  ) : null}
                  <span className="text-xs text-muted-foreground text-numeric">
                    {result.totalRows} rows read
                  </span>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {result && result.errors.length > 0 ? (
            <Card className="border-danger/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-danger" aria-hidden="true" />
                  Rows that need fixing
                </CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <DataTable
                  minWidth="min-w-[34rem]"
                  columns={[
                    { label: "Line", align: "right", className: "px-4 py-2.5" },
                    { label: "Column", className: "px-3 py-2.5" },
                    { label: "What is wrong", className: "px-4 py-2.5" },
                  ]}
                >
                  {result.errors.map((error, index) => (
                    <tr key={`${error.line}-${index}`} className="align-top">
                      <td className="px-4 py-2.5 text-right text-numeric text-muted-foreground">
                        {error.line}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {error.column ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{error.message}</td>
                    </tr>
                  ))}
                </DataTable>
              </CardBody>
            </Card>
          ) : null}

          {result && result.drafts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  Ready to import
                </CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <DataTable
                  minWidth="min-w-[44rem]"
                  columns={[
                    { label: "Product", className: "px-4 py-2.5" },
                    { label: "Category", className: "px-3 py-2.5" },
                    { label: "SKU", className: "px-3 py-2.5" },
                    { label: "From", align: "right", className: "px-3 py-2.5" },
                    { label: "MOQ", align: "right", className: "px-3 py-2.5" },
                    { label: "Main", className: "px-4 py-2.5" },
                  ]}
                >
                  {result.drafts.map((draft) => (
                    <tr key={draft.sku} className="align-middle">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {draft.name}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {draft.category}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-numeric">
                        {draft.sku}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Currency value={priceRange(draft.priceBands).min} />
                      </td>
                      <td className="px-3 py-2.5 text-right text-numeric text-muted-foreground">
                        {draft.moq}
                      </td>
                      <td className="px-4 py-2.5">
                        {draft.isMainProduct ? (
                          <StatusPill tone="info">Main</StatusPill>
                        ) : (
                          <span className="text-subtle-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </CardBody>
            </Card>
          ) : null}

          {result && result.drafts.length > 0 ? (
            <div className="space-y-3">
              {overMainCap ? (
                <Alert tone="warning" title="Too many main products">
                  The file marks {mainsInFile}{" "}
                  {mainsInFile === 1 ? "row as a main product" : "rows as main products"},
                  and you have {slotsLeft} of {MAIN_PRODUCT_LIMIT}{" "}
                  {slotsLeft === 1 ? "slot" : "slots"} free. Change the{" "}
                  <strong>main product</strong> column to <strong>no</strong> on the
                  extras, or unmark some in your catalogue first.
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {result.errors.length > 0
                    ? `${result.errors.length} row${result.errors.length === 1 ? "" : "s"} will be skipped.`
                    : "Every row passed."}
                </p>
                <Button onClick={commit} loading={importing} disabled={overMainCap}>
                  <FileSpreadsheet aria-hidden="true" />
                  Import {result.drafts.length}{" "}
                  {result.drafts.length === 1 ? "product" : "products"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Columns</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {IMPORT_COLUMNS.map((column) => (
                <div key={column.key}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    {column.header}
                    {column.required ? (
                      <span className="text-danger" aria-label="required">
                        *
                      </span>
                    ) : (
                      <span className="text-[10px] font-normal uppercase tracking-wide text-subtle-foreground">
                        optional
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {column.hint}
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Price bands are written the way a trade price list already reads:{" "}
              <span className="text-foreground text-numeric">
                50-199:760 | 200+:735
              </span>
              . They must cover every quantity without a gap and step down as quantity
              rises — the same rule the product form applies.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
