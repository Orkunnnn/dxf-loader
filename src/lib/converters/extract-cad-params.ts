// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {DXFEntity} from '../types';

/**
 * Extract parametric CAD data from a DXF entity as a JSON-serializable object.
 * This preserves the original geometric definition (center, radius, control points, etc.)
 * that is lost during tessellation to GeoJSON.
 */
export function extractCadParams(entity: DXFEntity): Record<string, unknown> {
  switch (entity.type) {
    case 'CIRCLE':
      return {type: 'CIRCLE', center: entity.center, radius: entity.radius};
    case 'ARC':
      return {
        type: 'ARC',
        center: entity.center,
        radius: entity.radius,
        startAngle: entity.startAngle,
        endAngle: entity.endAngle
      };
    case 'LINE':
      return {type: 'LINE', startPoint: entity.startPoint, endPoint: entity.endPoint};
    case 'ELLIPSE':
      return {
        type: 'ELLIPSE',
        center: entity.center,
        majorAxisEndPoint: entity.majorAxisEndPoint,
        ratioMinorToMajor: entity.ratioMinorToMajor,
        startParameter: entity.startParameter,
        endParameter: entity.endParameter
      };
    case 'SPLINE':
      return {
        type: 'SPLINE',
        degree: entity.degree,
        closed: entity.closed,
        controlPoints: entity.controlPoints,
        fitPoints: entity.fitPoints,
        knots: entity.knots,
        weights: entity.weights
      };
    case 'LWPOLYLINE':
    case 'POLYLINE':
      return {type: entity.type, vertices: entity.vertices, closed: entity.closed};
    case 'TEXT':
    case 'MTEXT':
      return {
        type: entity.type,
        insertionPoint: entity.insertionPoint,
        height: entity.height,
        text: entity.text,
        rotation: entity.rotation
      };
    case 'POINT':
      return {type: 'POINT', position: entity.position};
    case 'INSERT':
      return {
        type: 'INSERT',
        blockName: entity.blockName,
        insertionPoint: entity.insertionPoint,
        scaleX: entity.scaleX,
        scaleY: entity.scaleY,
        scaleZ: entity.scaleZ,
        rotation: entity.rotation
      };
    case '3DFACE':
    case 'SOLID':
      return {type: entity.type, vertices: entity.vertices};
    case 'HATCH':
      return {
        type: 'HATCH',
        patternName: entity.patternName,
        solid: entity.solid,
        boundaryPaths: entity.boundaryPaths
      };
    case 'DIMENSION':
      return {
        type: 'DIMENSION',
        definitionPoint: entity.definitionPoint,
        middleOfText: entity.middleOfText,
        dimensionType: entity.dimensionType
      };
    default:
      return {type: (entity as DXFEntity).type};
  }
}
