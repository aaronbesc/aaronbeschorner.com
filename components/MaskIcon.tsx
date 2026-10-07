// Paints a single-color icon in the current text color, so hover, focus and
// theme can recolor it with plain text-* utilities.
export default function MaskIcon({
  src,
  className = "",
  stretch = false,
}: {
  src: string;
  className?: string;
  /** Fill the box exactly instead of keeping the icon's proportions. */
  stretch?: boolean;
}) {
  const mask = `url(${src}) center / ${stretch ? "100% 100%" : "contain"} no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ mask, WebkitMask: mask }}
    />
  );
}
