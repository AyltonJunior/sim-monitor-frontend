import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'running' | 'down'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
  
  const statusStyles = {
    online: "bg-green-100 text-green-800",
    offline: "bg-red-100 text-red-800",
    running: "bg-green-100 text-green-800",
    down: "bg-red-100 text-red-800"
  }

  return (
    <span className={cn(baseStyles, statusStyles[status], className)}>
      <span className={cn(
        "mr-1 h-2 w-2 rounded-full",
        status === 'online' || status === 'running' ? "bg-green-400" : "bg-red-400"
      )} />
      {status}
    </span>
  )
} 