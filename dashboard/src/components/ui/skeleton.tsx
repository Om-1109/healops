import * as React from "react"

import { cn } from "@/lib/utils"

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/** Subtle shimmer placeholder for loading states. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-muted/35 via-muted/55 to-muted/35 bg-[length:220%_100%] motion-safe:animate-skeleton-shimmer",
        "motion-reduce:animate-pulse motion-reduce:bg-muted/50",
        className,
      )}
      aria-hidden
      {...props}
    />
  )
}
