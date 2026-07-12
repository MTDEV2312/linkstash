const LinkCardSkeleton = ({ viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className="card">
        <div className="p-4">
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              <div className="flex gap-2 mt-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card animate-pulse">
      <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
    </div>
  )
}

export default LinkCardSkeleton
