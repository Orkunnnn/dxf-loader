import type { DXFPoint, DXFPolylineVertex } from '../types';
/**
 * Convert a bulge value between two points to interpolated arc points.
 * Bulge = tan(included_angle / 4). Positive = counterclockwise arc.
 */
export declare function bulgeToArcPoints(p1: DXFPolylineVertex, p2: DXFPolylineVertex, bulge: number, segments: number): number[][];
/**
 * Tessellate a circle into a polygon ring
 */
export declare function tessellateCircle(center: DXFPoint, radius: number, segments: number): number[][];
/**
 * Tessellate an arc into a point sequence
 * Angles are in degrees (DXF convention)
 */
export declare function tessellateArc(center: DXFPoint, radius: number, startAngleDeg: number, endAngleDeg: number, segments: number): number[][];
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
export declare function tessellateArcRadians(options: ArcRadiansOptions): number[][];
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
export declare function tessellateEllipse(options: EllipseOptions): number[][];
/**
 * Evaluate a B-spline at parameter t using De Boor's algorithm
 */
export declare function evaluateBSpline(degree: number, controlPoints: DXFPoint[], knots: number[], weights: number[], numPoints: number): DXFPoint[];
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
export declare function applyInsertTransform(options: InsertTransformOptions): DXFPoint;
//# sourceMappingURL=dxf-math.d.ts.map