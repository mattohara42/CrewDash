// A hatchet oar blade, shaft on the left, drawn in a 120 x 30 box. Shared by the
// header's SVG and the share image's canvas.
export const BLADE_VIEWBOX = "0 0 120 30";
export const SHAFT = "M0,13.5H62V16.5H0Z";
export const BLADE = "M60,11 L72,5 Q108,1 118,7 L118,23 Q108,29 72,25 L60,19 Z";
// The tip band: the outer part of the blade.
export const TIP = "M100,2.6 Q110,2.4 118,7 L118,23 Q110,27.6 100,27.4 Z";

// Blade designs, drawn from a pattern and two colors rather than copied from anywhere.
// Most clubs' blades are one of these patterns. Each layer is clipped to BLADE.
export const PATTERNS = [
  "plain",
  "tips",
  "band",
  "stripes",
  "chevron",
  "halves",
  "quarters",
  "spots",
] as const;
export type BladePattern = (typeof PATTERNS)[number];

export const PATTERN_LABELS: Record<BladePattern, string> = {
  plain: "Plain",
  tips: "Tips",
  band: "Band across",
  stripes: "Two stripes across",
  chevron: "Chevron",
  halves: "Halves (top and bottom)",
  quarters: "Quarters",
  spots: "Spots",
};

export interface BladeDesign {
  pattern: BladePattern;
  // The blade's main color.
  base: string;
  // The pattern's color.
  accent: string;
}

const spot = (x: number, y: number) => `M${x - 3.5},${y} a3.5,3.5 0 1,0 7,0 a3.5,3.5 0 1,0 -7,0 Z`;

// The accent-colored shapes for each pattern, in the same 120 x 30 box.
const ACCENT: Record<BladePattern, string> = {
  plain: "",
  tips: TIP,
  band: "M84,0H94V30H84Z",
  stripes: "M78,0H84V30H78Z M92,0H98V30H92Z",
  chevron: "M64,0H78L96,15L78,30H64L82,15Z",
  halves: "M60,0H120V15H60Z",
  quarters: "M60,0H89V15H60Z M89,15H120V30H89Z",
  spots: [spot(76, 15), spot(90, 9), spot(90, 21), spot(104, 15)].join(" "),
};

/** The accent path for a design, or "" for a plain blade. */
export function accentPath(pattern: BladePattern): string {
  return ACCENT[pattern];
}
