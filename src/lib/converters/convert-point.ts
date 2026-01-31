// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, Point} from '@loaders.gl/schema';
import type {DXFPointEntity} from '../types';

export function convertPoint(entity: DXFPointEntity, include3D: boolean): Feature<Point> {
  const coordinates =
    include3D && entity.position.length > 2
      ? [entity.position[0], entity.position[1], entity.position[2]!]
      : [entity.position[0], entity.position[1]];

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates
    },
    properties: {}
  };
}
