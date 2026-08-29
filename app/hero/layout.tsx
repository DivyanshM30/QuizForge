/**
 * Layout override for /hero - strips the app shell (bg, padding, theme wrapper)
 * so the hero can own the full viewport with no interference.
 */
export default function HeroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
