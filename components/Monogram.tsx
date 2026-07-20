/** Compact stand-in for a listing's visual in dense rows and tables. */
export function Monogram({
  title,
  className = "h-12 w-12 text-lg",
}: {
  title: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] font-semibold text-[var(--muted)] ${className}`}
    >
      {title.slice(0, 1).toUpperCase()}
    </span>
  );
}
