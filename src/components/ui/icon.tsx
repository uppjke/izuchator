import { forwardRef } from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { iconVariants, type IconSize } from "@/lib/icon-variants"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: LucideIcon
  size?: IconSize
  interactive?: boolean
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, size = "md", interactive = false, className, ...props }, ref) => {
    return (
      <IconComponent
        ref={ref}
        className={cn(iconVariants({ size, interactive }), className)}
        {...props}
      />
    )
  }
)

Icon.displayName = "Icon"
