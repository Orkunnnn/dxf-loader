// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, LineString} from '@loaders.gl/schema';
import type {DXFArcEntity} from '../types';
import {tessellateArc} from '../utils/dxf-math';

export function convertArc(
  entity: DXFArcEntity,
  circleSegments: number,
  include3D: boolean
): Feature<LineString> {
  const points = tessellateArc(
    entity.center,
    entity.radius,
    entity.startAngle,
    entity.endAngle,
    circleSegments
  );
  const coordinates = include3D ? points : points.map((p) => [p[0], p[1]]);

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates
    },
    properties: {}
  };
}
