// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature} from '@loaders.gl/schema';
import type {DXFInsertEntity, DXFBlock, DXFPoint} from '../types';
import {applyInsertTransform} from '../utils/dxf-math';
import type {ConvertOptions} from './convert-entities-to-features';
import {convertEntityToFeatures} from './convert-entities-to-features';

export function convertInsert(
  entity: DXFInsertEntity,
  blocks: Map<string, DXFBlock>,
  options: ConvertOptions,
  depth: number
): Feature[] {
  if (depth >= options.maxBlockInsertionDepth) {
    return [];
  }

  const block = blocks.get(entity.blockName);
  if (!block) {
    return [];
  }

  const features: Feature[] = [];

  for (const blockEntity of block.entities) {
    const subFeatures = convertEntityToFeatures(blockEntity, blocks, options, depth + 1);

    for (const feature of subFeatures) {
      // Transform the geometry coordinates
      const transformed = transformFeatureGeometry(feature, {
        insertionPoint: entity.insertionPoint,
        basePoint: block.basePoint,
        scaleX: entity.scaleX,
        scaleY: entity.scaleY,
        scaleZ: entity.scaleZ,
        rotation: entity.rotation,
        include3D: options.include3D
      });
      features.push(transformed);
    }
  }

  return features;
}

type TransformParams = {
  insertionPoint: DXFPoint;
  basePoint: DXFPoint;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotation: number;
  include3D: boolean;
};

function transformFeatureGeometry(feature: Feature, params: TransformParams): Feature {
  const {insertionPoint, basePoint, scaleX, scaleY, scaleZ, rotation, include3D} = params;
  const geometry = feature.geometry;
  if (!geometry) {
    return feature;
  }

  const transformCoord = (coord: number[]): number[] => {
    const point: DXFPoint =
      coord.length > 2 ? [coord[0], coord[1], coord[2]] : [coord[0], coord[1]];
    const transformed = applyInsertTransform({
      point,
      insertionPoint,
      basePoint,
      scaleX,
      scaleY,
      scaleZ,
      rotationDeg: rotation
    });
    return include3D && transformed.length > 2
      ? [transformed[0], transformed[1], transformed[2]!]
      : [transformed[0], transformed[1]];
  };

  const transformedGeometry = transformGeometryCoordinates(geometry, transformCoord);

  return {
    ...feature,
    geometry: transformedGeometry,
    properties: {
      ...feature.properties,
      blockName: feature.properties?.blockName || undefined
    }
  };
}

function transformGeometryCoordinates(
  geometry: Feature['geometry'],
  transform: (coord: number[]) => number[]
): Feature['geometry'] {
  if (!geometry) {
    return geometry;
  }

  switch (geometry.type) {
    case 'Point':
      return {
        type: 'Point',
        coordinates: transform(geometry.coordinates as number[])
      };
    case 'LineString':
      return {
        type: 'LineString',
        coordinates: (geometry.coordinates as number[][]).map(transform)
      };
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: (geometry.coordinates as number[][][]).map((ring) => ring.map(transform))
      };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: (geometry.coordinates as number[][][][]).map((polygon) =>
          polygon.map((ring) => ring.map(transform))
        )
      };
    default:
      return geometry;
  }
}
