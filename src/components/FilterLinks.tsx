import Link from "next/link";

interface Option {
  value: string | undefined;
  label: string;
}

interface Props {
  label: string;
  param: string;
  current: string | undefined;
  options: Option[];
  /** other query parameters to keep */
  keep: Record<string, string | undefined>;
  basePath?: string;
}

/** Filters are plain links, so every view has a shareable URL and works without client JS. */
export function FilterLinks({ label, param, current, options, keep, basePath = "/" }: Props) {
  return (
    <nav className="filters" aria-label={label}>
      <span className="filters-label">{label}</span>
      {options.map((o) => {
        const query = new URLSearchParams();
        for (const [k, v] of Object.entries({ ...keep, [param]: o.value })) if (v) query.set(k, v);
        const href = query.size ? `${basePath}?${query}` : basePath;
        const active = o.value === current;
        return (
          <Link key={o.label} href={href} className={active ? "chip active" : "chip"} aria-current={active ? "page" : undefined}>
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
