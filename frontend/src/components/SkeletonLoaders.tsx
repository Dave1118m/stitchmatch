import React from 'react';

export function TailorCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700/60 animate-pulse space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="space-y-2 py-1">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-md" />
            <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3.5 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="h-3.5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-100 dark:border-gray-700/60 animate-pulse space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded-md" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded-md" />
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-3 p-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-md" />
            <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RequestDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700/60 space-y-4">
        <div className="h-7 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700/60 space-y-4">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
      </div>
    </div>
  );
}
