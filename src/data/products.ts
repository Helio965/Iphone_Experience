/**
 * Product copy, finishes and specifications.
 *
 * Figures come from Apple's published iPhone 18 Pro Max tech specs and
 * launch coverage of iPhone Duo (MacRumors, GSMArena). See `SOURCES`.
 */

export type ModelId = "proMax" | "duo";

export const MODEL_IDS: readonly ModelId[] = ["proMax", "duo"];

export interface Finish {
  id: string;
  name: string;
  /** Frame / unibody metal colour used by the 3D scene. */
  metal: string;
  /** Back glass colour used by the 3D scene. */
  glass: string;
  /** Swatch colour for the picker. */
  swatch: string;
}

export interface Product {
  id: ModelId;
  name: string;
  shortName: string;
  tagline: string;
  intro: string;
  price: string;
  material: string;
  finishes: Finish[];
}

export const PRODUCTS: Record<ModelId, Product> = {
  proMax: {
    id: "proMax",
    name: "iPhone 18 Pro Max",
    shortName: "18 Pro Max",
    tagline: "Pro Max Power.",
    intro: "A20 Pro, a variable-aperture 48MP Fusion camera and a vapor chamber three times larger, inside an aluminum unibody.",
    price: "From $1,299",
    material: "Aluminum unibody",
    finishes: [
      { id: "black", name: "Black", metal: "#2b2c30", glass: "#202125", swatch: "#2c2d31" },
      { id: "silver", name: "Silver", metal: "#d9d8d4", glass: "#ecebe7", swatch: "#e4e3df" },
      { id: "glacier", name: "Glacier", metal: "#9fb6c9", glass: "#c4d4e0", swatch: "#b5c8d6" },
      { id: "burgundy", name: "Burgundy", metal: "#4f1822", glass: "#5d1f2b", swatch: "#6a2333" },
    ],
  },
  duo: {
    id: "duo",
    name: "iPhone Duo",
    shortName: "Duo",
    tagline: "Duo Innovation.",
    intro: "A 5.4-inch iPhone that opens into a 7.6-inch canvas just 5.2 mm thin, hinged in grade 5 titanium.",
    price: "From $1,999",
    material: "Grade 5 titanium",
    finishes: [
      { id: "star-white", name: "Star White", metal: "#d7d3cb", glass: "#efede7", swatch: "#eeebe4" },
      { id: "night-sky", name: "Night Sky", metal: "#2a3446", glass: "#1d2738", swatch: "#253247" },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Pinned sequence copy                                                        */
/* -------------------------------------------------------------------------- */

export type ChapterKey = "inside" | "surface" | "routes" | "air" | "eye" | "chip";

export interface ChapterCopy {
  key: ChapterKey;
  index: string;
  label: string;
  title: string;
  body: Record<ModelId, string>;
}

export const CHAPTERS: ChapterCopy[] = [
  {
    key: "inside",
    index: "01",
    label: "Main study",
    title: "Inside the object.",
    body: {
      proMax: "One aluminum unibody, 8.75 mm thin. Keep scrolling and every layer comes apart in the order it was built.",
      duo: "Closed, a 5.4-inch iPhone. Open, a 7.6-inch canvas. Two displays, one fold, and every layer inside it.",
    },
  },
  {
    key: "surface",
    index: "02",
    label: "Housing",
    title: "First surface. Zero noise.",
    body: {
      proMax: "The unibody lifts away: aluminum, a full-width camera plateau and a Ceramic Shield back, finished as one part. Ceramic Shield 2 seals the front.",
      duo: "Mirror-polished grade 5 titanium over a recycled aluminum frame. The hinge alone holds more than 100 components and carbon fiber support plates.",
    },
  },
  {
    key: "routes",
    index: "03",
    label: "Logic board",
    title: "A city of routes.",
    body: {
      proMax: "Two stacked boards and an interposer carry power and data between A20 Pro, the C2 modem and the N1 wireless chip.",
      duo: "A stacked board tucked into the camera half routes power and data between A20 Pro, 12GB of memory and the C2 modem.",
    },
  },
  {
    key: "air",
    index: "04",
    label: "Thermal + power",
    title: "Weight, routed into air.",
    body: {
      proMax: "A vapor chamber with three times the surface area pulls heat off A20 Pro for up to 40% better sustained performance. The battery grows into the space eSIM freed: up to 45 hours of video.",
      duo: "Batteries in both halves keep the weight balanced across the hinge, while a vapor chamber spreads heat through the frame. Up to 44 hours of video on the outer display.",
    },
  },
  {
    key: "eye",
    index: "05",
    label: "Camera",
    title: "The eye, assembled.",
    body: {
      proMax: "A 48MP Fusion Main camera with Apple's first variable aperture: six laser-cut blades step from ƒ/1.48 to ƒ/4.0, with second-generation sensor-shift OIS.",
      duo: "A 48MP Fusion Main at ƒ/1.6 and a 48MP Ultra Wide in a slim camera plateau. Duo Preview shows your subject the shot on the outer display.",
    },
  },
  {
    key: "chip",
    index: "06",
    label: "Silicon",
    title: "Silicon, stacked.",
    body: {
      proMax: "A20 Pro on a 2 nm process: 6-core CPU, 7-core GPU with Neural Accelerators and a dual 16-core Neural Engine. The die sits beside its memory, M-series style, so heat leaves faster.",
      duo: "The same A20 Pro: up to 20% faster CPU and 40% faster graphics than A19 Pro, under a cooling stack built for sustained work on a 7.6-inch display.",
    },
  },
];

/* -------------------------------------------------------------------------- */
/* 3D-anchored callouts                                                        */
/* -------------------------------------------------------------------------- */

export interface Callout {
  id: string;
  models: ModelId[];
  /** Anchor id exposed by the 3D scene. */
  anchor: string;
  title: string;
  detail: Record<ModelId, string>;
  /** Fade in over [0]→[1], out over [2]→[3] (stage progress). */
  window: [number, number, number, number];
  /** Which side of the anchor the label sits on. */
  side: "left" | "right";
  /** Show the live aperture value instead of the static detail. */
  live?: "aperture";
}

export const CALLOUTS: Callout[] = [
  {
    id: "outer",
    models: ["duo"],
    anchor: "outerDisplay",
    title: "5.4″ outer display",
    detail: { proMax: "", duo: "2034 × 1398 · 460 ppi · ProMotion" },
    window: [0.085, 0.1, 0.12, 0.135],
    side: "right",
  },
  {
    id: "main-lens",
    models: ["proMax"],
    anchor: "mainLens",
    title: "48MP Fusion Main",
    detail: { proMax: "Variable aperture ƒ/1.48 – ƒ/4.0", duo: "" },
    window: [0.07, 0.085, 0.12, 0.14],
    side: "left",
  },
  {
    id: "inner",
    models: ["duo"],
    anchor: "innerDisplay",
    title: "7.6″ inner display",
    detail: { proMax: "", duo: "2670 × 1878 · 430 ppi · folds flat, crease minimized" },
    window: [0.165, 0.18, 0.205, 0.225],
    side: "right",
  },
  {
    id: "unibody",
    models: ["proMax"],
    anchor: "shell",
    title: "Aluminum unibody",
    detail: { proMax: "Ceramic Shield back · Ceramic Shield 2 front", duo: "" },
    window: [0.225, 0.245, 0.29, 0.31],
    side: "right",
  },
  {
    id: "hinge",
    models: ["duo"],
    anchor: "hinge",
    title: "Titanium hinge",
    detail: { proMax: "", duo: "100+ components · carbon fiber plates" },
    window: [0.27, 0.29, 0.355, 0.375],
    side: "right",
  },
  {
    id: "frame",
    models: ["duo"],
    anchor: "frame",
    title: "Grade 5 titanium",
    detail: { proMax: "", duo: "Mirror-polished enclosure" },
    window: [0.225, 0.245, 0.29, 0.31],
    side: "right",
  },
  {
    id: "routes-chip",
    models: ["proMax", "duo"],
    anchor: "chip",
    title: "A20 Pro",
    detail: { proMax: "2 nm · 6-core CPU · 7-core GPU", duo: "2 nm · 6-core CPU · 7-core GPU" },
    window: [0.43, 0.455, 0.52, 0.545],
    side: "right",
  },
  {
    id: "vapor",
    models: ["proMax", "duo"],
    anchor: "vapor",
    title: "Vapor chamber",
    detail: { proMax: "3× the surface area · +40% sustained", duo: "Heat spread through the frame" },
    window: [0.59, 0.61, 0.68, 0.7],
    side: "right",
  },
  {
    id: "battery",
    models: ["proMax", "duo"],
    anchor: "battery",
    title: "Battery",
    detail: { proMax: "Up to 45 hrs video playback", duo: "Up to 44 hrs video (outer display)" },
    window: [0.6, 0.62, 0.68, 0.7],
    side: "left",
  },
  {
    id: "iris",
    models: ["proMax", "duo"],
    anchor: "iris",
    title: "Aperture",
    detail: { proMax: "", duo: "Fixed ƒ/1.6" },
    window: [0.775, 0.79, 0.845, 0.86],
    side: "right",
    live: "aperture",
  },
  {
    id: "sensor",
    models: ["proMax", "duo"],
    anchor: "sensor",
    title: "48MP Fusion sensor",
    detail: { proMax: "2nd-gen sensor-shift OIS", duo: "Sensor-shift OIS" },
    window: [0.765, 0.78, 0.845, 0.86],
    side: "right",
  },
  {
    id: "die",
    models: ["proMax", "duo"],
    anchor: "die",
    title: "A20 Pro die",
    detail: { proMax: "Memory beside the die", duo: "Memory beside the die" },
    window: [0.915, 0.935, 0.985, 1.01],
    side: "left",
  },
  {
    id: "cooling",
    models: ["proMax", "duo"],
    anchor: "cooling",
    title: "Advanced cooling stack",
    detail: { proMax: "Vapor chamber · graphite · TIM", duo: "Vapor chamber · graphite · TIM" },
    window: [0.92, 0.94, 0.985, 1.01],
    side: "right",
  },
];

/* -------------------------------------------------------------------------- */
/* Comparison table                                                            */
/* -------------------------------------------------------------------------- */

export interface SpecRow {
  label: string;
  values: Record<ModelId, string>;
}

export interface SpecGroup {
  title: string;
  rows: SpecRow[];
}

export const SPEC_GROUPS: SpecGroup[] = [
  {
    title: "Design",
    rows: [
      {
        label: "Enclosure",
        values: {
          proMax: "Aluminum unibody, Ceramic Shield back",
          duo: "Mirror-polished grade 5 titanium over a recycled aluminum frame",
        },
      },
      {
        label: "Front",
        values: { proMax: "Ceramic Shield 2", duo: "Ceramic Shield 2 outside, custom polymer cover inside" },
      },
      {
        label: "Size (H × W × D)",
        values: {
          proMax: "163.4 × 78.0 × 8.75 mm",
          duo: "Open 117.8 × 164.6 × 5.2 mm\nClosed 117.8 × 84.1 × 11.3 mm",
        },
      },
      { label: "Weight", values: { proMax: "249 g", duo: "254 g" } },
      { label: "Finishes", values: { proMax: "Black, Silver, Glacier, Burgundy", duo: "Star White, Night Sky" } },
      { label: "Water & dust", values: { proMax: "IP68, up to 6 m for 30 min", duo: "IP68" } },
    ],
  },
  {
    title: "Display",
    rows: [
      {
        label: "Panel",
        values: {
          proMax: "6.9″ Super Retina XDR OLED\n2868 × 1320 at 460 ppi",
          duo: "7.6″ inner OLED, 2670 × 1878 at 430 ppi\n5.4″ outer OLED, 2034 × 1398 at 460 ppi",
        },
      },
      { label: "Refresh rate", values: { proMax: "ProMotion up to 120Hz", duo: "ProMotion up to 120Hz on both displays" } },
      {
        label: "Brightness",
        values: { proMax: "1600 nits HDR · 3000 nits outdoor", duo: "1600 nits HDR · 3000 nits outdoor" },
      },
    ],
  },
  {
    title: "Chip",
    rows: [
      { label: "SoC", values: { proMax: "A20 Pro, 2 nm", duo: "A20 Pro, 2 nm" } },
      { label: "CPU", values: { proMax: "6-core (2 performance, 4 efficiency)", duo: "6-core (2 performance, 4 efficiency)" } },
      { label: "GPU", values: { proMax: "7-core with Neural Accelerators", duo: "7-core with Neural Accelerators" } },
      { label: "Neural Engine", values: { proMax: "Dual 16-core", duo: "Dual 16-core" } },
      { label: "Cooling", values: { proMax: "Vapor chamber, 3× the surface area", duo: "Vapor chamber" } },
    ],
  },
  {
    title: "Camera",
    rows: [
      {
        label: "Main",
        values: {
          proMax: "48MP Fusion, 24 mm, ƒ/1.48–ƒ/4.0 variable aperture",
          duo: "48MP Fusion, 26 mm, ƒ/1.6",
        },
      },
      { label: "Ultra Wide", values: { proMax: "48MP, 13 mm, ƒ/2.2", duo: "48MP, 13 mm, ƒ/2.2" } },
      { label: "Telephoto", values: { proMax: "48MP 4× tetraprism, 100 mm, ƒ/2.8", duo: "—" } },
      { label: "Zoom range", values: { proMax: "16× optical-quality", duo: "2× optical-quality" } },
      {
        label: "Front",
        values: { proMax: "18MP Center Stage, ƒ/1.9", duo: "12MP outer camera\nUnder-display camera inside" },
      },
      {
        label: "Video",
        values: { proMax: "4K120 Dolby Vision · ProRes RAW · Apple Log 2", duo: "4K120 Dolby Vision · Cinematic 4K60" },
      },
    ],
  },
  {
    title: "Power",
    rows: [
      {
        label: "Video playback",
        values: { proMax: "Up to 45 hours", duo: "Up to 44 hours outer · 31 hours inner" },
      },
      {
        label: "Fast charge",
        values: { proMax: "50% in about 15 min (60W)", duo: "50% in about 20 min (60W)" },
      },
      { label: "Wireless", values: { proMax: "MagSafe and Qi2, up to 25W", duo: "MagSafe and Qi2, up to 25W" } },
    ],
  },
  {
    title: "Connectivity & security",
    rows: [
      { label: "Wireless chip", values: { proMax: "N1 · Wi-Fi 7 · Bluetooth 6", duo: "N1 · Wi-Fi 7 · Bluetooth 6" } },
      { label: "Connector", values: { proMax: "USB-C, USB 3 up to 10Gb/s", duo: "USB-C, up to 10Gb/s" } },
      { label: "Unlock", values: { proMax: "Face ID", duo: "Touch ID in the side button" } },
      { label: "Controls", values: { proMax: "Action button · Camera Control", duo: "Camera Control" } },
    ],
  },
];

export const SOURCES = [
  { label: "Apple Support: iPhone 18 Pro Max tech specs", href: "https://support.apple.com/en-us/148591" },
  { label: "Apple (AU): iPhone 18 Pro", href: "https://www.apple.com/au/iphone-18-pro/" },
  { label: "MacRumors: iPhone Duo roundup", href: "https://www.macrumors.com/roundup/iphone-duo/" },
  { label: "GSMArena: Apple iPhone Duo", href: "https://www.gsmarena.com/apple_iphone_duo_fold-13804.php" },
  {
    label: "Android Headlines: iPhone 18 Pro launch",
    href: "https://www.androidheadlines.com/2026/09/apple-unveils-iphone-18-pro-max-variable-aperture-a20-pro-specs-price.html",
  },
];
