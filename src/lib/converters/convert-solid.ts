// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, Polygon} from '@loaders.gl/schema';
import type {DXFSolidEntity} from '../types';

/**
 * Convert SOLID entity to Polygon.
 * DXF SOLID has a peculiar vertex order: 1, 2, 4, 3 (3rd and 4th are swapped).
 */
export function convertSolid(entity: DXFSolidEntity, include3D: boolean): Feature<Polygon> {
  const toCoord = (v: number[]): number[] =>
    include3D && v.length > 2 ? [v[0], v[1], v[2]] : [v[0], v[1]];

  const vertices = entity.vertices;
  let ring: number[][];

  if (vertices.length === 4) {
    // DXF SOLID vertex order is 1, 2, 4, 3 -- swap 3rd and 4th to get correct polygon
    ring = [
      toCoord(vertices[0]),
      toCoord(vertices[1]),
      toCoord(vertices[3]),
      toCoord(vertices[2]),
      toCoord(vertices[0]) // close ring
    ];
  } else {
    ring = vertices.map(toCoord);
    ring.push(toCoord(vertices[0])); // close ring
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring]
    },
    properties: {}
  };
}
