import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"

type SchTextType =
  | "pin_number"
  | "reference_designator"
  | "manufacturer_number"
  | "net_label"

export const getSchMmFontSize = (textType: SchTextType) => {
  return textType === "pin_number" ? 0.15 : 0.18
}

export const getSchScreenFontSize = (
  transform: Matrix,
  textType: SchTextType,
) => {
  return Math.abs(transform.a) * getSchMmFontSize(textType)
}
