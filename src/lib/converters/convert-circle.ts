// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, Polygon} from '@loaders.gl/schema';
import type {DXFCircleEntity} from '../types';
import {tessellateCircle} from '../utils/dxf-math';

export function convertCircle(
  entity: DXFCircleEntity,
  circleSegments: number,
  include3D: boolean
): Feature<Polygon> {
  const ring = tessellateCircle(entity.center, entity.radius, circleSegments);
  const coordinates = include3D ? ring : ring.map((p) => [p[0], p[1]]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    },
    properties: {}
  };
}
