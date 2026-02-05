'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

function CardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)} {...props}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

function ProgramCardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-3', className)} {...props}>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

function AchievementSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border bg-card p-4', className)} {...props}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}

function ChartSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)} {...props}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function TableRowSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)} {...props}>
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/6" />
    </div>
  )
}

export { Skeleton, CardSkeleton, ProgramCardSkeleton, AchievementSkeleton, ChartSkeleton, TableRowSkeleton }
