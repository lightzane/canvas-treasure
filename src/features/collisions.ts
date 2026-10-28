import type { Position } from "@/features/sprite";

export interface Rect {
  position: Position;
  width: number;
  height: number;
}

export function isColliding(a: Rect, b: Rect) {
  return (
    a.position.x < b.position.x + b.width &&
    a.position.x + a.width > b.position.x &&
    a.position.y < b.position.y + b.height &&
    a.position.y + a.height > b.position.y
  );
}

export function getOverlapArea(a: Rect, b: Rect): number {
  const overlap = getOverlapRect(a, b);
  return overlap ? overlap.width * overlap.height : 0;
}

function getOverlapRect(a: Rect, b: Rect): Rect | null {
  // Find x2 and y2 points of the two rectangle
  // +---x2
  // | a |
  // +---y2
  const edgesA = {
    x2: a.position.x + a.width,
    y2: a.position.y + a.height,
  };
  const edgesB = {
    x2: b.position.x + b.width,
    y2: b.position.y + b.height,
  };

  // Find edges that intersects
  //
  //   x --- increase to right -->
  //   y
  //   |   a.position.(x&y) -->  +------------------2   <-- edgesA.x2
  //   |                         |        a         |
  //   v                         |            1-----+----+   <-- edgesB.x2
  //                             |            |     |    |
  //             edgesA.y2 -->   3------------+-----+    |
  //                                          |       b  |
  //                          edgesB.y2 -->   +----------+

  //                                    label 1 (x)
  //                                       v
  const left = Math.max(a.position.x, b.position.x);

  //                                    label 1 (y)
  //                                       v
  const top = Math.max(a.position.y, b.position.y);

  //                    label 2 (x)
  //                        v
  const right = Math.min(edgesA.x2, edgesB.x2);

  //                    label 3 (y)
  //                        v
  const bottom = Math.min(edgesA.y2, edgesB.y2);

  // Get sizes of the intersecting rect
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return null; // no overlap on at least one axis
  }

  return {
    position: { x: left, y: top },
    width,
    height,
  } satisfies Rect;
}
