interface InsightsPanelProps {
  insights: any;
  statusInsights: any;
  similarityGroups: any[];
}

export function InsightsPanel({
  insights,
  statusInsights,
  similarityGroups,
}: InsightsPanelProps) {
  return (
    <div className="mt-6 space-y-4">
      {/* Top failed URLs */}
      <div className="rounded-2xl border bg-white/80 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Top failed URLs</p>
            <p className="text-xs text-gray-500">
              {insights.totalRequests} captures · grouped by URL
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {insights.topUrls.map(
            ([label, count]: [string, number], idx: number) => {
              const maxCount = insights.topUrls[0]?.[1] || 1;
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1 gap-12">
                    <span className="text-xs font-medium text-gray-600 truncate">
                      {label}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      {count}
                    </span>
                  </div>
                  <div className="relative flex-1 h-2 rounded-full bg-gray-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-purple-500"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
      {/* Status code groups */}
      <div className="rounded-2xl border bg-white/90 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Status code groups</p>
            <p className="text-xs text-gray-500">
              {statusInsights.total} captures · grouped by status family
            </p>
          </div>
          <span className="text-xs text-gray-400">
            Max {statusInsights.maxCount}
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {statusInsights.groups.map((group: any) => {
            const width = (group.count / statusInsights.maxCount) * 100;
            const percent = statusInsights.total
              ? Math.round((group.count / statusInsights.total) * 100)
              : 0;
            return (
              <div key={group.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="font-medium text-gray-700">
                      {group.label}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-700">
                    {group.count}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${width}%`, backgroundColor: group.color }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase text-gray-400">
                  <span>{group.description}</span>
                  <span>{percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Time distribution */}
      <div className="rounded-2xl border bg-white/90 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            Time distribution (last 8 buckets)
          </p>
          <span className="text-xs text-gray-400">
            {insights.timeSeries.length} buckets
          </span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {insights.timeSeries.map((point: any) => (
            <div
              key={point.bucket}
              className="flex flex-col items-center gap-1"
            >
              <div className="relative h-24 w-full overflow-hidden rounded-xl bg-gray-100">
                <div
                  className="absolute inset-x-2 bottom-0 rounded-xl bg-indigo-500"
                  style={{
                    height: `${(point.total / insights.maxBucketTotal) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[11px] uppercase text-gray-500">
                {new Date(point.bucket).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-xs font-semibold text-gray-700">
                {point.total}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Similarity clusters */}
      <div className="rounded-2xl border bg-white/90 p-4 shadow-lg">
        <p className="text-sm font-semibold">Similarity clusters</p>
        <p className="text-xs text-gray-500">Grouped by URL + referrer</p>
        <div className="mt-3 space-y-3">
          {similarityGroups.length === 0 ? (
            <p className="text-xs text-gray-400">No similar captures yet.</p>
          ) : (
            similarityGroups.map((group) => (
              <div
                key={`${group.url}-${group.referrer}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 text-[11px]">
                  <p className="truncate font-medium text-gray-700">
                    {group.url}
                  </p>
                  <p className="truncate text-gray-400">
                    Referrer: {group.referrer}
                  </p>
                </div>
                <span className="text-sm font-semibold text-purple-600">
                  {group.count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
