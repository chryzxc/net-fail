import { cn } from "@/lib/utils";
import { FailedRequest } from "@/types";

interface RequestListProps {
  requests: FailedRequest[];
  selectedRequest: FailedRequest | null;
  onSelect: (req: FailedRequest) => void;
  getSimilarRequests: (req: FailedRequest) => FailedRequest[];
}

export function RequestList({
  requests,
  selectedRequest,
  onSelect,
  getSimilarRequests,
}: RequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-sm text-gray-500">No failed requests captured</div>
    );
  }
  return (
    <ul className="space-y-2 max-h-[320px] overflow-auto pr-2 mt-4">
      {requests.map((r) => (
        <li
          key={r.id}
          role="button"
          tabIndex={0}
          className={cn(
            "p-2 bg-white border rounded-lg shadow-sm transition",
            selectedRequest?.id === r.id &&
              "ring-2 ring-purple-400/70 border-purple-500/70"
          )}
          onClick={() => onSelect(r)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onSelect(r);
              event.preventDefault();
            }
          }}
        >
          <div className="flex flex-row justify-between text-xs text-gray-500 mb-2">
            <div>{r.method}</div>
            <div className="text-[11px]">
              {new Date(r.timestamp).toLocaleString()}
            </div>
          </div>
          <div className="text-xs font-mono text-gray-700 break-all">
            {r.url}
          </div>
          {r.error && <p className="text-xs mt-2 text-red-600">{r.error}</p>}
          <p className="text-orange-500">
            Similar requests: {getSimilarRequests(r).length}
          </p>
        </li>
      ))}
    </ul>
  );
}
