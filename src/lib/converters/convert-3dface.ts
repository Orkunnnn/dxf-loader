// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, Polygon} from '@loaders.gl/schema';
import type {DXF3DFaceEntity} from '../types';

export function convert3DFace(entity: DXF3DFaceEntity, include3D: boolean): Feature<Polygon> {
  const ring: number[][] = entity.vertices.map((v) =>
    include3D && v.length > 2 ? [v[0], v[1], v[2]!] : [v[0], v[1]]
  );

  // Close the ring
  const first = ring[0];
  ring.push([...first]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring]
    },
    properties: {}
  };
}
