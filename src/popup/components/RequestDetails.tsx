import { Button } from "@/components/ui/button";
import { IFailedRequest } from "../App";
import { HeaderList } from "./HeaderList";

interface RequestDetailsProps {
  request: IFailedRequest;
  onClose: () => void;
}

export function RequestDetails({ request, onClose }: RequestDetailsProps) {
  return (
    <div className="mt-4 rounded-2xl border bg-white/90 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Request detail</p>
          <p className="text-xs text-gray-500 truncate max-w-[320px]">
            {request.url}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase text-gray-400">Request headers</p>
          <div className="mt-2 rounded-lg bg-gray-50 p-3">
            <HeaderList headers={request.requestHeaders} />
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase text-gray-400">
            Response headers
          </p>
          <div className="mt-2 rounded-lg bg-gray-50 p-3">
            <HeaderList headers={request.responseHeaders} />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-1 text-[11px] text-gray-600">
        <p>
          <span className="font-semibold text-gray-800">Status:</span>{" "}
          {request.statusCode ?? "network/error"}
        </p>
        <p>
          <span className="font-semibold text-gray-800">Method:</span>{" "}
          {request.method || "UNKNOWN"}
        </p>
        <p>
          <span className="font-semibold text-gray-800">Captured:</span>{" "}
          {new Date(request.timestamp).toLocaleString()}
        </p>
        {request.error && (
          <p className="text-xs text-red-600">{request.error}</p>
        )}
      </div>
    </div>
  );
}
