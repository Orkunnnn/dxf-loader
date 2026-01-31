// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {DXFPoint, DXFPolylineVertex} from '../types';

/**
 * Convert a bulge value between two points to interpolated arc points.
 * Bulge = tan(included_angle / 4). Positive = counterclockwise arc.
 */
export function bulgeToArcPoints(
  p1: DXFPolylineVertex,
  p2: DXFPolylineVertex,
  bulge: number,
  segments: number
): number[][] {
  if (Math.abs(bulge) < 1e-10) {
    return [];
  }

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chordLength = Math.sqrt(dx * dx + dy * dy);

  if (chordLength < 1e-10) {
    return [];
  }

  const sagitta = (bulge * chordLength) / 2;
  const radius = Math.abs(
    ((chordLength / 2) * (chordLength / 2) + sagitta * sagitta) / (2 * sagitta)
  );
  const includedAngle = Math.atan(bulge) * 4;

  // Midpoint of chord
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  // Perpendicular direction from chord to arc center
  const perpX = -(p2.y - p1.y) / chordLength;
  const perpY = (p2.x - p1.x) / chordLength;

  // Distance from midpoint to center
  const distToCenter = radius - Math.abs(sagitta);
  const sign = bulge > 0 ? 1 : -1;

  const centerX = midX + sign * distToCenter * perpX;
  const centerY = midY + sign * distToCenter * perpY;

  // Start and end angles from center
  const startAngle = Math.atan2(p1.y - centerY, p1.x - centerX);
  const endAngle = Math.atan2(p2.y - centerY, p2.x - centerX);

  // Number of segments for this arc
  const arcSegments = Math.max(2, Math.ceil((Math.abs(includedAngle) / (Math.PI * 2)) * segments));

  const points: number[][] = [];
  for (let i = 1; i < arcSegments; i++) {
    const t = i / arcSegments;
    let angle: number;
    if (bulge > 0) {
      angle = startAngle + normalizeAngle(endAngle - startAngle) * t;
    } else {
      angle = startAngle - normalizeAngle(startAngle - endAngle) * t;
    }
    points.push([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
  }

  return points;
}

function normalizeAngle(angle: number): number {
  while (angle < 0) {
    angle += Math.PI * 2;
  }
  while (angle > Math.PI * 2) {
    angle -= Math.PI * 2;
  }
  return angle;
}

/**
 * Tessellate a circle into a polygon ring
 */
export function tessellateCircle(center: DXFPoint, radius: number, segments: number): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const point = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    if (center.length > 2 && center[2] !== undefined) {
      point.push(center[2]);
    }
    ring.push(point);
  }
  return ring;
}

/**
 * Tessellate an arc into a point sequence
 * Angles are in degrees (DXF convention)
 */
export function tessellateArc(
  center: DXFPoint,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
  segments: number
): number[][] {
  const startAngle = (startAngleDeg * Math.PI) / 180;
  let endAngle = (endAngleDeg * Math.PI) / 180;

  // Ensure counterclockwise sweep
  if (endAngle <= startAngle) {
    endAngle += Math.PI * 2;
  }

  const sweep = endAngle - startAngle;
  const arcSegments = Math.max(2, Math.ceil((sweep / (Math.PI * 2)) * segments));

  const points: number[][] = [];
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = startAngle + sweep * t;
    const point = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    if (center.length > 2 && center[2] !== undefined) {
      point.push(center[2]);
    }
    points.push(point);
  }

  return points;
}

export type ArcRadiansOptions = {
  center: DXFPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterClockwise: boolean;
  segments: number;
};

/**
 * Tessellate an arc using radian angles
 */
export function tessellateArcRadians(options: ArcRadiansOptions): number[][] {
  const {center, radius, startAngle, endAngle, counterClockwise, segments} = options;
  let sweep: number;
  if (counterClockwise) {
    sweep = endAngle - startAngle;
    if (sweep <= 0) {
      sweep += Math.PI * 2;
    }
  } else {
    sweep = startAngle - endAngle;
    if (sweep <= 0) {
      sweep += Math.PI * 2;
    }
    sweep = -sweep;
  }

  const arcSegments = Math.max(2, Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * segments));

  const points: number[][] = [];
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = startAngle + sweep * t;
    const point = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    if (center.length > 2 && center[2] !== undefined) {
      point.push(center[2]);
    }
    points.push(point);
  }

  return points;
}

export type EllipseOptions = {
  center: DXFPoint;
  majorAxisEndPoint: DXFPoint;
  ratio: number;
  startParam: number;
  endParam: number;
  segments: number;
};

/**
 * Tessellate an ellipse
 */
export function tessellateEllipse(options: EllipseOptions): number[][] {
  const {center, majorAxisEndPoint, ratio, startParam, endParam, segments} = options;
  const majorX = majorAxisEndPoint[0];
  const majorY = majorAxisEndPoint[1];
  const majorLength = Math.sqrt(majorX * majorX + majorY * majorY);
  const minorLength = majorLength * ratio;
  const rotation = Math.atan2(majorY, majorX);

  let sweep = endParam - startParam;
  if (sweep <= 0) {
    sweep += Math.PI * 2;
  }

  const arcSegments = Math.max(2, Math.ceil((sweep / (Math.PI * 2)) * segments));

  const points: number[][] = [];
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const param = startParam + sweep * t;

    // Point on unrotated ellipse
    const ex = majorLength * Math.cos(param);
    const ey = minorLength * Math.sin(param);

    // Rotate and translate
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const point = [center[0] + ex * cosR - ey * sinR, center[1] + ex * sinR + ey * cosR];
    if (center.length > 2 && center[2] !== undefined) {
      point.push(center[2]);
    }
    points.push(point);
  }

  return points;
}

/**
 * Evaluate a B-spline at parameter t using De Boor's algorithm
 */
export function evaluateBSpline(
  degree: number,
  controlPoints: DXFPoint[],
  knots: number[],
  weights: number[],
  numPoints: number
): DXFPoint[] {
  if (controlPoints.length === 0) {
    return [];
  }

  if (knots.length === 0) {
    // Generate uniform knot vector
    const n = controlPoints.length;
    const knotCount = n + degree + 1;
    knots = [];
    for (let i = 0; i < knotCount; i++) {
      if (i <= degree) {
        knots.push(0);
      } else if (i >= knotCount - degree - 1) {
        knots.push(1);
      } else {
        knots.push((i - degree) / (knotCount - 2 * degree - 1));
      }
    }
  }

  const hasWeights = weights.length === controlPoints.length;
  const tMin = knots[degree];
  const tMax = knots[knots.length - degree - 1];

  const result: DXFPoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = tMin + (i / (numPoints - 1)) * (tMax - tMin);
    const point = deBoor(degree, controlPoints, knots, hasWeights ? weights : null, t);
    result.push(point);
  }

  return result;
}

function deBoor(
  degree: number,
  controlPoints: DXFPoint[],
  knots: number[],
  weights: number[] | null,
  t: number
): DXFPoint {
  const n = controlPoints.length;

  // Find knot span
  let span = degree;
  for (let i = degree; i < n; i++) {
    if (t >= knots[i] && t < knots[i + 1]) {
      span = i;
      break;
    }
  }
  // Handle edge case at end
  if (t >= knots[n]) {
    span = n - 1;
  }

  // Initialize with control points in the affected range
  const dim = controlPoints[0].length;
  const d: number[][] = [];
  for (let j = 0; j <= degree; j++) {
    const idx = span - degree + j;
    const cp = controlPoints[Math.max(0, Math.min(idx, n - 1))];
    const w = weights ? weights[Math.max(0, Math.min(idx, n - 1))] : 1;
    const point: number[] = [];
    for (let k = 0; k < dim; k++) {
      point.push(cp[k] * w);
    }
    point.push(w);
    d.push(point);
  }

  // De Boor recursion
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const idx = span - degree + j;
      const knotLeft = knots[idx];
      const knotRight = knots[idx + degree - r + 1];
      const denom = knotRight - knotLeft;
      const alpha = denom > 1e-10 ? (t - knotLeft) / denom : 0;

      for (let k = 0; k <= dim; k++) {
        d[j][k] = (1 - alpha) * d[j - 1][k] + alpha * d[j][k];
      }
    }
  }

  // Divide by weight for rational B-spline (NURBS)
  const w = d[degree][dim];
  const result: number[] = [];
  for (let k = 0; k < dim; k++) {
    result.push(w > 1e-10 ? d[degree][k] / w : d[degree][k]);
  }

  return result as DXFPoint;
}

export type InsertTransformOptions = {
  point: DXFPoint;
  insertionPoint: DXFPoint;
  basePoint: DXFPoint;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotationDeg: number;
};

/**
 * Apply INSERT entity transformation (scale, rotation, translation) to a point
 */
export function applyInsertTransform(options: InsertTransformOptions): DXFPoint {
  const {point, insertionPoint, basePoint, scaleX, scaleY, scaleZ, rotationDeg} = options;
  const rotation = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  // Translate relative to base point
  let x = (point[0] - basePoint[0]) * scaleX;
  let y = (point[1] - basePoint[1]) * scaleY;

  // Rotate
  const rx = x * cosR - y * sinR;
  const ry = x * sinR + y * cosR;

  // Translate to insertion point
  x = rx + insertionPoint[0];
  y = ry + insertionPoint[1];

  if (point.length > 2) {
    const z = ((point[2] || 0) - (basePoint[2] || 0)) * scaleZ + (insertionPoint[2] || 0);
    return [x, y, z];
  }

  return [x, y];
}
