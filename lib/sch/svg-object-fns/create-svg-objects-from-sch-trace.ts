import type { SchematicTrace } from "circuit-json"
import type { SvgObject } from "lib/svg-object"
import { colorMap } from "lib/utils/colors"
import { getSchStrokeSize } from "lib/utils/get-sch-stroke-size"
import { applyToPoint, type Matrix } from "transformation-matrix"

export function createSchematicTrace(
  trace: SchematicTrace,
  transform: Matrix,
): SvgObject[] {
  const edges = trace.edges
  if (edges.length === 0) return []
  const svgObjects: SvgObject[] = []

  let currentPath = ""
  const paths: SvgObject[] = []

  let colors = [
    "rgb(255,0,0)",
    "rgb(0,255,0)",
    "rgb(0,0,255)",
    "rgb(255,255,0)",
    "rgb(255, 0, 255)",
    "rgb(0, 255,255)",
  ]
  let colorIndex = -1

  function addPath() {
    paths.push({
      name: "path",
      type: "element",
      attributes: {
        class: "trace",
        d: currentPath,
        stroke: colors[colorIndex++ % colors.length],
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform) * (1 + colorIndex / 2)}px`,
        "stroke-linecap": "round",
        opacity: "0.5",
      },
      value: "",
      children: [],
    })
  }

  // Process edges into an SVG path
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    const edge = edges[edgeIndex]!

    if (edge.is_crossing) continue

    // Transform the points using the matrix
    const [screenFromX, screenFromY] = applyToPoint(transform, [
      edge.from.x,
      edge.from.y,
    ])
    const [screenToX, screenToY] = applyToPoint(transform, [
      edge.to.x,
      edge.to.y,
    ])

    // Regular straight line for non-crossing traces
    // if (edgeIndex === 0 || edges[edgeIndex - 1]?.is_crossing) {
    addPath()
    currentPath = `M ${screenFromX} ${screenFromY} L ${screenToX} ${screenToY}`
    // } else {
    //   currentPath += ` L ${screenToX} ${screenToY}`
    // }
  }

  if (currentPath) addPath()

  // Process wire crossings with little "hops" or arcs
  for (const edge of edges) {
    if (!edge.is_crossing) continue

    // Transform the points using the matrix
    const [screenFromX, screenFromY] = applyToPoint(transform, [
      edge.from.x,
      edge.from.y,
    ])
    const [screenToX, screenToY] = applyToPoint(transform, [
      edge.to.x,
      edge.to.y,
    ])
    // For crossing traces, create a small arc/hop
    const midX = (screenFromX + screenToX) / 2
    const midY = (screenFromY + screenToY) / 2

    // Calculate perpendicular offset for the arc
    const dx = screenToX - screenFromX
    const dy = screenToY - screenFromY
    const len = Math.sqrt(dx * dx + dy * dy)
    const hopHeight = len * 0.7

    // Perpendicular vector
    const perpX = (-dy / len) * hopHeight
    const perpY = (dx / len) * hopHeight

    // Control point for the quadratic curve
    const controlX = midX + perpX
    const controlY = midY - Math.abs(perpY)

    // Arc Shadow
    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d: `M ${screenFromX} ${screenFromY} Q ${controlX} ${controlY} ${screenToX} ${screenToY}`,
        stroke: colorMap.schematic.background,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform) + 1.5}px`,
        "stroke-linecap": "round",
      },
      value: "",
      children: [],
    })
    svgObjects.push({
      name: "path",
      type: "element",
      attributes: {
        d: `M ${screenFromX} ${screenFromY} Q ${controlX} ${controlY} ${screenToX} ${screenToY}`,
        stroke: colorMap.schematic.wire,
        fill: "none",
        "stroke-width": `${getSchStrokeSize(transform)}px`,
        "stroke-linecap": "round",
      },
      value: "",
      children: [],
    })
  }

  // Add junction circles
  if (trace.junctions) {
    for (const junction of trace.junctions) {
      const [screenX, screenY] = applyToPoint(transform, [
        junction.x,
        junction.y,
      ])
      svgObjects.push({
        name: "circle",
        type: "element",
        attributes: {
          cx: screenX.toString(),
          cy: screenY.toString(),
          r: (Math.abs(transform.a) * 0.03).toString(),
          fill: colorMap.schematic.junction,
        },
        value: "",
        children: [],
      })
    }
  }

  svgObjects.push(...paths)

  return svgObjects
}
