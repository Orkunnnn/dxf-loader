// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { applyInsertTransform } from '../utils/dxf-math';
import { convertEntityToFeatures } from './convert-entities-to-features';
export function convertInsert(entity, blocks, options, depth) {
    if (depth >= options.maxBlockInsertionDepth) {
        return [];
    }
    const block = blocks.get(entity.blockName);
    if (!block) {
        return [];
    }
    const features = [];
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
function transformFeatureGeometry(feature, params) {
    const { insertionPoint, basePoint, scaleX, scaleY, scaleZ, rotation, include3D } = params;
    const geometry = feature.geometry;
    if (!geometry) {
        return feature;
    }
    const transformCoord = (coord) => {
        const point = coord.length > 2 ? [coord[0], coord[1], coord[2]] : [coord[0], coord[1]];
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
            ? [transformed[0], transformed[1], transformed[2]]
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
function transformGeometryCoordinates(geometry, transform) {
    if (!geometry) {
        return geometry;
    }
    switch (geometry.type) {
        case 'Point':
            return {
                type: 'Point',
                coordinates: transform(geometry.coordinates)
            };
        case 'LineString':
            return {
                type: 'LineString',
                coordinates: geometry.coordinates.map(transform)
            };
        case 'Polygon':
            return {
                type: 'Polygon',
                coordinates: geometry.coordinates.map((ring) => ring.map(transform))
            };
        case 'MultiPolygon':
            return {
                type: 'MultiPolygon',
                coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map(transform)))
            };
        default:
            return geometry;
    }
}
//# sourceMappingURL=convert-insert.js.map