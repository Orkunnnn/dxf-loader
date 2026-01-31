// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature, Point} from '@loaders.gl/schema';
import type {DXFTextEntity, DXFMTextEntity} from '../types';

export function convertText(
  entity: DXFTextEntity | DXFMTextEntity,
  include3D: boolean
): Feature<Point> {
  const point = entity.insertionPoint;
  const coordinates =
    include3D && point.length > 2 ? [point[0], point[1], point[2]!] : [point[0], point[1]];

  const properties: Record<string, unknown> = {
    text: stripMTextFormatting(entity.text),
    textHeight: entity.height,
    textRotation: entity.rotation
  };

  if (entity.style) {
    properties.textStyle = entity.style;
  }

  if (entity.type === 'MTEXT') {
    properties.textWidth = entity.width;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates
    },
    properties
  };
}

/**
 * Strip MTEXT formatting codes (e.g., {\fArial;...}, \P, etc.)
 */
function stripMTextFormatting(text: string): string {
  // Remove \P (newline)
  let result = text.replace(/\\P/gi, '\n');
  // Remove formatting blocks like {\fArial|...;text}
  result = result.replace(/\{\\[^;]*;([^}]*)}/g, '$1');
  // Remove remaining backslash codes
  result = result.replace(/\\[A-Za-z][^;]*;/g, '');
  // Remove curly braces
  result = result.replace(/[{}]/g, '');
  return result;
}
