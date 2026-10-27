"""Export the marts of ec-analytics-platform to the sample files in data/sample.

Usage (after `make build` in ec-analytics-platform):

    pip install duckdb
    python scripts/export_sample.py ../ec-analytics-platform/dbt/ec_analytics.duckdb

The output is the same data the BigQuery data source reads, in a compact form:

- daily_channel_sales.json: marts.mart_daily_channel_sales, one row per day x channel
- customer_rfm_cells.json:  marts.mart_customer_rfm, aggregated per R score x F score

All data in ec-analytics-platform is synthetic, so the exported files are too.
"""

import json
import sys
from pathlib import Path

import duckdb

OUT = Path(__file__).resolve().parent.parent / "data" / "sample"

DAILY_COLUMNS = [
    "day_offset",
    "channel_index",
    "orders",
    "completed_orders",
    "cancelled_orders",
    "returned_orders",
    "net_revenue",
    "gross_margin",
]


def export_daily(con: duckdb.DuckDBPyConnection) -> int:
    start = con.execute("select min(ordered_on) from marts.mart_daily_channel_sales").fetchone()[0]
    channels = [r[0] for r in con.execute(
        "select distinct channel from marts.mart_daily_channel_sales order by channel"
    ).fetchall()]
    rows = con.execute(
        """
        select
            date_diff('day', ?, ordered_on)::integer,
            channel,
            orders::integer, completed_orders::integer, cancelled_orders::integer,
            returned_orders::integer, net_revenue::bigint, gross_margin::bigint
        from marts.mart_daily_channel_sales
        order by ordered_on, channel
        """,
        [start],
    ).fetchall()
    payload = {
        "source": "ec-analytics-platform: marts.mart_daily_channel_sales (synthetic data)",
        "start_date": start.isoformat(),
        "channels": channels,
        "columns": DAILY_COLUMNS,
        "rows": [[r[0], channels.index(r[1]), *r[2:]] for r in rows],
    }
    write(OUT / "daily_channel_sales.json", payload)
    return len(rows)


def export_rfm(con: duckdb.DuckDBPyConnection) -> int:
    cur = con.execute(
        """
        select
            r_score::integer                       as r_score,
            f_score::integer                       as f_score,
            segment,
            count(*)::integer                      as customers,
            sum(monetary)::bigint                  as monetary,
            round(avg(recency_days), 1)::double    as avg_recency_days
        from marts.mart_customer_rfm
        group by r_score, f_score, segment
        order by r_score, f_score, segment
        """
    )
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    payload = {
        "source": "ec-analytics-platform: marts.mart_customer_rfm grouped by r_score, f_score (synthetic data)",
        "rows": rows,
    }
    write(OUT / "customer_rfm_cells.json", payload)
    return len(rows)


def write(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")


def main(db_path: str) -> None:
    con = duckdb.connect(db_path, read_only=True)
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"daily_channel_sales.json: {export_daily(con)} rows")
    print(f"customer_rfm_cells.json: {export_rfm(con)} rows")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/export_sample.py <path to ec_analytics.duckdb>")
    main(sys.argv[1])
