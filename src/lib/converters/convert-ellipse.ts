// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, LineString, Polygon} from '@loaders.gl/schema';
import type {DXFEllipseEntity} from '../types';
import {tessellateEllipse} from '../utils/dxf-math';

export function convertEllipse(
  entity: DXFEllipseEntity,
  circleSegments: number,
  include3D: boolean
): Feature<LineString | Polygon> {
  const points = tessellateEllipse({
    center: entity.center,
    majorAxisEndPoint: entity.majorAxisEndPoint,
    ratio: entity.ratioMinorToMajor,
    startParam: entity.startParameter,
    endParam: entity.endParameter,
    segments: circleSegments
  });

  const coordinates = include3D ? points : points.map((p) => [p[0], p[1]]);

  // If full ellipse (start ~= 0 and end ~= 2*PI), return as Polygon
  const isFullEllipse =
    Math.abs(entity.startParameter) < 1e-6 && Math.abs(entity.endParameter - Math.PI * 2) < 1e-6;

  if (isFullEllipse) {
    // Ensure ring is closed
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push([...first]);
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      },
      properties: {}
    };
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates
    },
    properties: {}
  };
}
