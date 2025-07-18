import { z } from "zod";

/** TLDraw palette tokens you currently support */
const ColorToken = z.enum([
  "blue",
  "red",
  "green",
  "purple",
  "orange",
  "black",
  "gray",
  "none",
]);

export const AiActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("addShape"),
      shape: z.enum(["rectangle", "ellipse", "diamond", "star"]),
      label: z.string().optional(),

      // NEW optional styling & geometry
      color: ColorToken.optional(), // stroke
      fill: ColorToken.optional(), // fill
      w: z.number().int().positive().optional(),
      h: z.number().int().positive().optional(),

      // NEW absolute or relative position
      x: z.number().optional(), // page-coordinates
      y: z.number().optional(), // page-coordinates
      position:
        z
          .enum(["center", "topLeft", "topRight", "bottomLeft", "bottomRight"])
          .optional(),
    })
    .strict(),

  /* ------------------------------------------------------------------ */
  /*  addText – place a text element on the canvas                      */
  /* ------------------------------------------------------------------ */

  z
    .object({
      action: z.literal("addText"),

      // Required text content
      text: z.string().min(1),

      // Optional styling & geometry
      color: ColorToken.optional(),
      size: z.enum(["s", "m", "l", "xl"]).optional(),
      align: z.enum(["start", "middle", "end"]).optional(),

      // Absolute or relative position
      x: z.number().optional(),
      y: z.number().optional(),
      position: z
        .enum(["center", "topLeft", "topRight", "bottomLeft", "bottomRight"])
        .optional(),
    })
    .strict(),

  z
    .object({
      action: z.literal("layout"),
      kind: z.enum(["flow", "grid", "timeline"]),
    })
    .strict(),

  z
    .object({
      action: z.literal("group"),
      selector: z.string().optional(),
    })
    .strict(),

  z
    .object({
      action: z.literal('createDiagram'),
      prompt: z.string().min(5),
    })
    .strict(),
]);

export type AiAction = z.infer<typeof AiActionSchema>;
