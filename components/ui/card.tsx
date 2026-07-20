import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Decorative card shells.
 *
 * Adapted from the shadcn-style multi-variant card: the structure is the same,
 * but colours come from this project's CSS variables (--border, --muted, …)
 * instead of hardcoded zinc, so every variant themes correctly in light and
 * dark. Gradients use explicit linear-gradient() arbitrary values so they don't
 * depend on Tailwind's gradient utility naming.
 */

const cardVariants = cva("w-full relative", {
  variants: {
    variant: {
      default: "border rounded-lg border-[var(--border)] bg-[var(--surface)]",
      dots: "relative mx-auto w-full rounded-lg border border-dashed border-[var(--border-strong)] px-4 sm:px-6 md:px-8",
      gradient: "relative mx-auto w-full px-4 sm:px-6 md:px-8",
      plus: "border border-dashed border-[var(--border-strong)] relative",
      neubrutalism:
        "border-[0.5px] border-[var(--border-strong)] relative shadow-[4px_4px_0px_0px_var(--foreground)]",
      inner: "border-[0.5px] rounded-sm p-2 border-[var(--border)]",
      lifted:
        "border rounded-xl border-[var(--border-strong)] relative shadow-[0px_5px_0px_0px_var(--border-strong)] bg-[var(--surface-muted)]",
      corners: "border-2 rounded-md border-[var(--border)] relative",
    },
  },
  defaultVariants: { variant: "default" },
});

/** Hairline gradients built from theme variables. */
const LINE_H =
  "bg-[linear-gradient(to_right,transparent,var(--border-strong)_35%,var(--muted))]";
const LINE_H_REVERSE =
  "bg-[linear-gradient(to_left,transparent,var(--border-strong)_35%,var(--muted))]";
const LINE_V =
  "bg-[linear-gradient(to_top,transparent,var(--border-strong)_35%,var(--muted))]";

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  title?: string;
  description?: string;
  /** Override the inner padding. Grid cards usually want it tighter than p-6. */
  contentClassName?: string;
}

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = "CardContent";

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, title, description, children, contentClassName, ...props },
    ref
  ) => {
    const content = (
      <CardContent className={contentClassName}>
        {title && (
          <h3 className="mb-1 text-lg font-bold text-[var(--foreground)]">{title}</h3>
        )}
        {description && <p className="text-[var(--muted)]">{description}</p>}
        {children}
      </CardContent>
    );

    if (variant === "gradient") {
      return (
        <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props}>
          {/* Horizontal hairlines, inset from the top/bottom edges */}
          <div className={cn("absolute left-0 top-4 -z-0 h-px w-full sm:top-6 md:top-8", LINE_H_REVERSE)} />
          <div className={cn("absolute bottom-4 left-0 z-0 h-px w-full sm:bottom-6 md:bottom-8", LINE_H)} />
          {/* Vertical gradient borders */}
          <div className="relative w-full">
            <div className={cn("absolute inset-y-0 left-0 w-px", LINE_V)} />
            <div className={cn("absolute inset-y-0 right-0 w-px", LINE_V)} />
            <div className="relative z-20 mx-auto py-8">{content}</div>
          </div>
        </div>
      );
    }

    if (variant === "dots") {
      const dot =
        "size-1 rounded-full bg-[var(--accent)] outline outline-8 outline-[var(--background)] my-4 sm:my-6 md:my-8";
      return (
        <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props}>
          <div className="absolute left-0 top-4 -z-0 h-px w-full bg-[var(--border-strong)] sm:top-6 md:top-8" />
          <div className="absolute bottom-4 left-0 z-0 h-px w-full bg-[var(--border-strong)] sm:bottom-6 md:bottom-8" />
          <div className="relative w-full border-x border-[var(--border-strong)]">
            <div className="absolute z-0 grid h-full w-full items-center">
              <section className="absolute z-0 grid h-full w-full grid-cols-2 place-content-between">
                <div className={cn(dot, "-translate-x-[2.5px]")} />
                <div className={cn(dot, "translate-x-[2.5px] place-self-end")} />
                <div className={cn(dot, "-translate-x-[2.5px]")} />
                <div className={cn(dot, "translate-x-[2.5px] place-self-end")} />
              </section>
            </div>
            <div className="relative z-20 mx-auto py-8">{content}</div>
          </div>
        </div>
      );
    }

    if (variant === "inner") {
      return (
        <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props}>
          <div className="rounded-sm border border-[var(--border)] bg-[linear-gradient(to_bottom_right,var(--surface),var(--surface-muted))] shadow-[2px_0_8px_rgba(0,0,0,0.10)]">
            {content}
          </div>
        </div>
      );
    }

    const Decoration = () => {
      if (variant === "plus") {
        const plus = (pos: string) => (
          <svg
            key={pos}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            width={24}
            height={24}
            strokeWidth="1"
            stroke="currentColor"
            className={cn("absolute size-6 text-[var(--foreground)]", pos)}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
          </svg>
        );
        return (
          <>
            {plus("-top-3 -left-3")}
            {plus("-top-3 -right-3")}
            {plus("-bottom-3 -left-3")}
            {plus("-bottom-3 -right-3")}
          </>
        );
      }
      if (variant === "corners") {
        const corner = "absolute size-6 border-[var(--foreground)]";
        return (
          <>
            <div className={cn(corner, "-left-0.5 -top-0.5 rounded-tl-md border-l-2 border-t-2")} />
            <div className={cn(corner, "-right-0.5 -top-0.5 rounded-tr-md border-r-2 border-t-2")} />
            <div className={cn(corner, "-bottom-0.5 -left-0.5 rounded-bl-md border-b-2 border-l-2")} />
            <div className={cn(corner, "-bottom-0.5 -right-0.5 rounded-br-md border-b-2 border-r-2")} />
          </>
        );
      }
      return null;
    };

    return (
      <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props}>
        <Decoration />
        {content}
      </div>
    );
  }
);
Card.displayName = "Card";

export { Card, CardContent, cardVariants };
