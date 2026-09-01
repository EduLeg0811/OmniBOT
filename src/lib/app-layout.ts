export const CONTAINER_WIDTHS = ["5xl", "6xl", "7xl", "full"] as const;

export type ContainerWidth = (typeof CONTAINER_WIDTHS)[number];

export const CONTAINER_WIDTH_CONFIG: Record<ContainerWidth, { className: string; label: string }> =
  {
    "5xl": { className: "max-w-5xl", label: "5XL" },
    "6xl": { className: "max-w-6xl", label: "6XL" },
    "7xl": { className: "max-w-7xl", label: "7XL" },
    full: { className: "max-w-full", label: "Full" },
  };

export function nextContainerWidth(current: ContainerWidth): ContainerWidth {
  const currentIndex = CONTAINER_WIDTHS.indexOf(current);
  return CONTAINER_WIDTHS[(currentIndex + 1) % CONTAINER_WIDTHS.length]!;
}
