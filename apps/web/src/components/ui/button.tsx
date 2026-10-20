import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Botão do design system 2.0.
 * - Alvo de toque confortável (40px por padrão).
 * - Foco visível por anel (acessibilidade por teclado).
 * - Variante `ai` reservada para ações assistidas por IA.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,border-color,box-shadow,color,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--border-focus)]/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-ds-xs hover:bg-[var(--brand-700)] hover:shadow-ds-sm",
        destructive:
          "bg-destructive text-destructive-foreground shadow-ds-xs hover:brightness-95",
        outline:
          "border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] shadow-ds-xs hover:bg-[var(--surface-subtle)] hover:border-[var(--border-strong)]",
        secondary:
          "bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]",
        link: "text-[var(--text-brand)] underline-offset-4 hover:underline",
        ai:
          "bg-[image:var(--ai-gradient)] text-white dark:text-[#06140d] shadow-ds-xs hover:brightness-105",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-9 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-[15px] has-[>svg]:px-5",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
