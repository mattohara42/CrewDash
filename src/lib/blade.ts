// A hatchet oar blade, shaft on the left, drawn in a 120 x 30 box. Shared by the
// header's SVG and the share image's canvas.
export const BLADE_VIEWBOX = "0 0 120 30";
export const SHAFT = "M0,13.5H62V16.5H0Z";
export const BLADE = "M60,11 L72,5 Q108,1 118,7 L118,23 Q108,29 72,25 L60,19 Z";
// The tip band: the outer part of the blade.
export const TIP = "M100,2.6 Q110,2.4 118,7 L118,23 Q110,27.6 100,27.4 Z";

// Blade designs, drawn from shapes and colors rather than copied from anywhere. A design
// is a base color with up to three shapes layered on it, each in its own color. Most
// clubs' blades are one to three of these shapes. Each shape is clipped to BLADE.
export const SHAPES = [
  "tips",
  "band",
  "stripes",
  "chevron",
  "chevron-tip",
  "chevron-edge",
  "chevron-notch",
  "halves",
  "quarters",
  "diagonal",
  "diagonal-line",
  "diagonal-line-2",
  "thin-shaft",
  "thin-middle",
  "thin-tip",
  "thin-tip-2",
  "spots",
] as const;
export type BladeShape = (typeof SHAPES)[number];

export const SHAPE_LABELS: Record<BladeShape, string> = {
  tips: "Tip",
  band: "Band across",
  stripes: "Two stripes across",
  chevron: "Chevron",
  "chevron-tip": "Chevron tip",
  "chevron-edge": "Chevron tip edging",
  "chevron-notch": "Notched tip",
  halves: "Top half",
  quarters: "Quarters",
  diagonal: "Diagonal half",
  "diagonal-line": "Line along the diagonal",
  "diagonal-line-2": "Second line along the diagonal",
  "thin-shaft": "Thin stripe by the shaft",
  "thin-middle": "Thin stripe in the middle",
  "thin-tip": "Thin stripe by the tip",
  "thin-tip-2": "Second thin stripe by the tip",
  spots: "Spots",
};

export const MAX_LAYERS = 3;

export interface BladeLayer {
  shape: BladeShape;
  color: string;
}

export interface BladeDesign {
  // The blade's main color.
  base: string;
  // Drawn in order, so later layers sit on top.
  layers: BladeLayer[];
}

const spot = (x: number, y: number) => `M${x - 3.5},${y} a3.5,3.5 0 1,0 7,0 a3.5,3.5 0 1,0 -7,0 Z`;

// Each shape in the same 120 x 30 box.
const PATHS: Record<BladeShape, string> = {
  tips: TIP,
  band: "M84,0H94V30H84Z",
  stripes: "M78,0H84V30H78Z M92,0H98V30H92Z",
  chevron: "M64,0H78L96,15L78,30H64L82,15Z",
  "chevron-tip": "M104,0L88,15L104,30H120V0Z",
  "chevron-edge": "M99,0L83,15L99,30H104L88,15L104,0Z",
  "chevron-notch": "M96,0H120V30H96L112,15Z",
  halves: "M60,0H120V15H60Z",
  quarters: "M60,0H89V15H60Z M89,15H120V30H89Z",
  diagonal: "M60,30L120,0V30Z",
  "diagonal-line": "M57,30L117,0H122L62,30Z",
  "diagonal-line-2": "M47,30L107,0H112L52,30Z",
  "thin-shaft": "M70,0H73V30H70Z",
  "thin-middle": "M87,0H90V30H87Z",
  "thin-tip": "M103,0H106V30H103Z",
  "thin-tip-2": "M106,0H109V30H106Z",
  spots: [spot(76, 15), spot(90, 9), spot(90, 21), spot(104, 15)].join(" "),
};

export function shapePath(shape: BladeShape): string {
  return PATHS[shape];
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A checked design, or null. Also reads the older form, one pattern with a base and an
 * accent color, where "plain" meant no pattern.
 */
export function parseDesign(value: unknown): BladeDesign | null {
  const v = value as { base?: unknown; layers?: unknown; pattern?: unknown; accent?: unknown };
  if (!v || typeof v.base !== "string" || !HEX.test(v.base)) return null;
  let layers: unknown = v.layers;
  if (layers === undefined && typeof v.pattern === "string") {
    layers = v.pattern === "plain" ? [] : [{ shape: v.pattern, color: v.accent }];
  }
  if (!Array.isArray(layers) || layers.length > MAX_LAYERS) return null;
  const checked: BladeLayer[] = [];
  for (const layer of layers as Partial<BladeLayer>[]) {
    if (!SHAPES.includes(layer?.shape as BladeShape)) return null;
    if (typeof layer.color !== "string" || !HEX.test(layer.color)) return null;
    checked.push({ shape: layer.shape as BladeShape, color: layer.color });
  }
  return { base: v.base, layers: checked };
}

/**
 * A blade editor's fields in a design's shape, for parseDesign to check. Fields are named
 * from a prefix: "<prefix>Base", then "<prefix>Shape0" and "<prefix>Color0" for each
 * layer. A layer with no shape picked is left out.
 */
export function designFromForm(field: (name: string) => string, prefix: string): unknown {
  const layers = [];
  for (let i = 0; i < MAX_LAYERS; i++) {
    const shape = field(`${prefix}Shape${i}`);
    if (shape) layers.push({ shape, color: field(`${prefix}Color${i}`) });
  }
  return { base: field(`${prefix}Base`), layers };
}
