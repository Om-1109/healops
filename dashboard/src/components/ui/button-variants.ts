import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-smooth motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/92 hover:shadow-md hover:shadow-primary/20 motion-safe:hover:-translate-y-px motion-reduce:hover:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md motion-safe:hover:-translate-y-px motion-reduce:hover:translate-y-0",
        outline:
          "border border-input bg-background shadow-sm hover:border-primary/35 hover:bg-accent/50 hover:text-accent-foreground motion-safe:hover:-translate-y-px motion-reduce:hover:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-sm motion-safe:hover:-translate-y-px motion-reduce:hover:translate-y-0",
        ghost:
          "hover:bg-accent hover:text-accent-foreground motion-safe:hover:-translate-y-px motion-reduce:hover:translate-y-0",
        link: "text-primary underline-offset-4 hover:underline motion-safe:active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
