// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, Polygon, MultiPolygon} from '@loaders.gl/schema';
import type {DXFHatchEntity, DXFHatchBoundaryPath, DXFHatchEdge} from '../types';
import {tessellateArcRadians} from '../utils/dxf-math';

export function convertHatch(
  entity: DXFHatchEntity,
  circleSegments: number,
  include3D: boolean
): Feature<Polygon | MultiPolygon> {
  const polygons: number[][][] = [];

  for (const path of entity.boundaryPaths) {
    const ring = convertBoundaryPath(path, circleSegments, include3D);
    if (ring.length > 0) {
      // Ensure ring is closed
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }
      polygons.push(ring);
    }
  }

  if (polygons.length === 0) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[]]
      },
      properties: {}
    };
  }

  if (polygons.length === 1) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygons[0]]
      },
      properties: {}
    };
  }

  // Multiple boundary paths - create MultiPolygon
  return {
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: polygons.map((ring) => [ring])
    },
    properties: {}
  };
}

function convertBoundaryPath(
  path: DXFHatchBoundaryPath,
  circleSegments: number,
  include3D: boolean
): number[][] {
  if (path.type === 'polyline' && path.vertices) {
    return path.vertices.map((v) =>
      include3D && v.z !== undefined ? [v.x, v.y, v.z] : [v.x, v.y]
    );
  }

  if (path.type === 'edges' && path.edges) {
    return convertEdgesToRing(path.edges, circleSegments, include3D);
  }

  return [];
}

function convertEdgesToRing(
  edges: DXFHatchEdge[],
  circleSegments: number,
  _include3D: boolean
): number[][] {
  const ring: number[][] = [];

  for (const edge of edges) {
    switch (edge.type) {
      case 'line':
        ring.push([edge.startPoint[0], edge.startPoint[1]]);
        break;
      case 'arc': {
        const arcPoints = tessellateArcRadians({
          center: edge.center,
          radius: edge.radius,
          startAngle: (edge.startAngle * Math.PI) / 180,
          endAngle: (edge.endAngle * Math.PI) / 180,
          counterClockwise: edge.counterClockwise,
          segments: circleSegments
        });
        for (const point of arcPoints) {
          ring.push([point[0], point[1]]);
        }
        break;
      }
      case 'ellipse': {
        // Simplified: treat as arc with average radius
        const majorLength = Math.sqrt(
          edge.majorAxisEndPoint[0] ** 2 + edge.majorAxisEndPoint[1] ** 2
        );
        const averageRadius = (majorLength * (1 + edge.ratioMinorToMajor)) / 2;
        const arcPoints = tessellateArcRadians({
          center: edge.center,
          radius: averageRadius,
          startAngle: edge.startAngle,
          endAngle: edge.endAngle,
          counterClockwise: edge.counterClockwise,
          segments: circleSegments
        });
        for (const point of arcPoints) {
          ring.push([point[0], point[1]]);
        }
        break;
      }
    }
  }

  return ring;
}
