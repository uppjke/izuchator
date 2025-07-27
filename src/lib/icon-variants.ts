import { cva } from "class-variance-authority"

export const iconVariants = cva(
  "flex-shrink-0 transition-transform duration-200",
  {
    variants: {
      size: {
        xs: "!h-3 !w-3",
        sm: "!h-4 !w-4",
        md: "!h-5 !w-5", 
        lg: "!h-6 !w-6",
        xl: "!h-8 !w-8",
        // Responsive variants for mobile/desktop
        responsive: "!h-4 !w-4 lg:!h-5 lg:!w-5",
        responsiveLg: "!h-5 !w-5 lg:!h-6 lg:!w-6"
      },
      interactive: {
        true: "group-hover:scale-110",
        false: ""
      }
    },
    defaultVariants: {
      size: "md",
      interactive: false,
    }
  }
)

// Утилита для получения размеров из variant
export const getIconSize = (size: IconSize) => {
  const sizeMap = {
    xs: { width: 12, height: 12 },
    sm: { width: 16, height: 16 },
    md: { width: 20, height: 20 },
    lg: { width: 24, height: 24 },
    xl: { width: 32, height: 32 },
    responsive: { width: 20, height: 20 }, // Используем большой размер для Image
    responsiveLg: { width: 24, height: 24 }
  }
  return sizeMap[size]
}

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "responsive" | "responsiveLg"
