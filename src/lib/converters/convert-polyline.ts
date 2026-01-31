// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, LineString, Polygon} from '@loaders.gl/schema';
import type {DXFLWPolylineEntity, DXFPolylineEntity} from '../types';
import {bulgeToArcPoints} from '../utils/dxf-math';

export function convertPolyline(
  entity: DXFLWPolylineEntity | DXFPolylineEntity,
  circleSegments: number,
  include3D: boolean
): Feature<LineString | Polygon> {
  const vertices = entity.vertices;
  const coords: number[][] = [];

  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    const coord =
      include3D && vertex.z !== undefined ? [vertex.x, vertex.y, vertex.z] : [vertex.x, vertex.y];
    coords.push(coord);

    // Handle bulge (arc segments between this vertex and next)
    if (Math.abs(vertex.bulge) > 1e-10) {
      const nextIndex = (i + 1) % vertices.length;
      if (nextIndex !== i) {
        const nextVertex = vertices[nextIndex];
        const arcPoints = bulgeToArcPoints(vertex, nextVertex, vertex.bulge, circleSegments);
        for (const arcPoint of arcPoints) {
          coords.push(include3D && vertex.z !== undefined ? [...arcPoint, vertex.z] : arcPoint);
        }
      }
    }
  }

  if (entity.closed && coords.length > 0) {
    // Close the ring
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      },
      properties: {}
    };
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coords
    },
    properties: {}
  };
}
