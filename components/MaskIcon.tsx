// Paints a single-color icon in the current text color, so hover and focus
// states can recolor it with plain text-* utilities.
export default function MaskIcon({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ mask, WebkitMask: mask }}
    />
  );
}
