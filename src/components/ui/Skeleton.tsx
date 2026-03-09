export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card animate-pulse" role="status" aria-label="Loading content">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-200 rounded mb-2"
          style={{ width: `${60 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading table">
      {/* Header */}
      <div className="flex gap-4 mb-3">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-4 bg-gray-300 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 mb-2">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 bg-gray-200 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
