interface HeaderListProps {
  headers?: Array<{ name?: string; value?: string }>;
}

export function HeaderList({ headers }: HeaderListProps) {
  if (!headers || headers.length === 0) {
    return (
      <p className="text-[11px] text-gray-400">Headers not captured yet.</p>
    );
  }
  return (
    <ul className="space-y-1 text-[11px] text-gray-600">
      {headers.map((header, index) => (
        <li
          key={`${header?.name ?? "header"}-${index}`}
          className="flex justify-between gap-4"
        >
          <span className="font-medium text-gray-700">
            {header?.name || "Unnamed"}
          </span>
          <span className="text-right text-gray-500">
            {header?.value || "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
