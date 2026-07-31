import type { ElementType, ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

/**
 * Reproduces the theme's boxed container: full width up to 1810px with a
 * 20px gutter on each side.
 */
export default function Container({
  children,
  className = "",
  as: Tag = "div",
}: ContainerProps) {
  return <Tag className={`container-boxed ${className}`.trim()}>{children}</Tag>;
}
