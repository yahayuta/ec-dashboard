import "server-only";
import type { DataSource } from "../types";
import { withCache } from "./cache";
import { createSampleSource } from "./sample";

const CACHE_TTL_MS = 10 * 60 * 1000;

let cached: Promise<DataSource> | null = null;

async function create(): Promise<DataSource> {
  const kind = process.env.DATA_SOURCE ?? "sample";
  if (kind === "sample") return createSampleSource();
  if (kind === "bigquery") {
    const projectId = process.env.BQ_PROJECT_ID;
    if (!projectId) throw new Error("DATA_SOURCE=bigquery needs BQ_PROJECT_ID");
    const [{ BigQuery }, { createBigQuerySource }] = await Promise.all([
      import("@google-cloud/bigquery"),
      import("./bigquery"),
    ]);
    const location = process.env.BQ_LOCATION;
    const source = createBigQuerySource(
      { projectId, dataset: process.env.BQ_DATASET ?? "marts", location },
      new BigQuery({ projectId, location }),
    );
    return withCache(source, CACHE_TTL_MS);
  }
  throw new Error(`Unknown DATA_SOURCE: ${kind} (use "sample" or "bigquery")`);
}

export function getDataSource(): Promise<DataSource> {
  cached ??= create().catch((e: unknown) => {
    cached = null;
    throw e;
  });
  return cached;
}
