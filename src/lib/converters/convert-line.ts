// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, LineString} from '@loaders.gl/schema';
import type {DXFLineEntity} from '../types';

export function convertLine(entity: DXFLineEntity, include3D: boolean): Feature<LineString> {
  const coordinates = [
    pointToCoord(entity.startPoint, include3D),
    pointToCoord(entity.endPoint, include3D)
  ];

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates
    },
    properties: {}
  };
}

function pointToCoord(point: number[], include3D: boolean): number[] {
  if (include3D && point.length > 2) {
    return [point[0], point[1], point[2]];
  }
  return [point[0], point[1]];
}
