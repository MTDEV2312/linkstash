const TagCardSkeleton = () => {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )}

export default TagCardSkeleton
