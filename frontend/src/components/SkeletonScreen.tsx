function SkeletonLine({ width = '100%', height = '1rem', className = '' }: { width?: string; height?: string; className?: string }) {
  return (
    <div
      className={`rounded bg-[var(--bg-tertiary)] animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonScreen() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8 select-none">
      {/* Title skeleton */}
      <div className="mb-8">
        <SkeletonLine width="40%" height="2.25rem" />
      </div>

      {/* Block skeletons */}
      <div className="space-y-4 max-w-3xl">
        <SkeletonLine width="100%" />
        <SkeletonLine width="92%" />
        <SkeletonLine width="85%" />

        {/* Heading skeleton */}
        <div className="pt-4">
          <SkeletonLine width="55%" height="1.75rem" />
        </div>

        <SkeletonLine width="100%" />
        <SkeletonLine width="78%" />
        <SkeletonLine width="88%" />

        {/* Code block skeleton */}
        <div className="pt-2">
          <div className="rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 space-y-2">
            <SkeletonLine width="60%" height="0.75rem" />
            <SkeletonLine width="80%" height="0.75rem" />
            <SkeletonLine width="45%" height="0.75rem" />
          </div>
        </div>

        <SkeletonLine width="95%" />
        <SkeletonLine width="70%" />
      </div>
    </div>
  );
}
