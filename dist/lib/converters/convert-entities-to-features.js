// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { aciToHex } from '../utils/dxf-color-table';
import { convertLine } from './convert-line';
import { convertPoint } from './convert-point';
import { convertCircle } from './convert-circle';
import { convertArc } from './convert-arc';
import { convertPolyline } from './convert-polyline';
import { convertEllipse } from './convert-ellipse';
import { convertSpline } from './convert-spline';
import { convertText } from './convert-text';
import { convertInsert } from './convert-insert';
import { convert3DFace } from './convert-3dface';
import { convertSolid } from './convert-solid';
import { convertHatch } from './convert-hatch';
import { convertDimension } from './convert-dimension';
/**
 * Convert parsed DXF entities to GeoJSON features
 */
export function convertEntitiesToFeatures(entities, tables, blocks, options) {
    const features = [];
    for (const entity of entities) {
        if (!shouldIncludeEntity(entity, tables, options)) {
            continue;
        }
        const entityFeatures = convertEntityToFeatures(entity, blocks, options, 0);
        for (const feature of entityFeatures) {
            addEntityProperties(feature, entity, tables);
            features.push(feature);
        }
    }
    return features;
}
/**
 * Convert a single entity to GeoJSON features.
 * Exported for use by INSERT converter for recursive block expansion.
 */
export function convertEntityToFeatures(entity, blocks, options, depth) {
    switch (entity.type) {
        case 'LINE':
            return [convertLine(entity, options.include3D)];
        case 'POINT':
            return [convertPoint(entity, options.include3D)];
        case 'CIRCLE':
            return [convertCircle(entity, options.circleSegments, options.include3D)];
        case 'ARC':
            return [convertArc(entity, options.circleSegments, options.include3D)];
        case 'ELLIPSE':
            return [convertEllipse(entity, options.circleSegments, options.include3D)];
        case 'LWPOLYLINE':
            return [convertPolyline(entity, options.circleSegments, options.include3D)];
        case 'POLYLINE':
            return [convertPolyline(entity, options.circleSegments, options.include3D)];
        case 'SPLINE':
            return [convertSpline(entity, options.splineSegmentsPerSpan, options.include3D)];
        case 'TEXT':
        case 'MTEXT':
            return [convertText(entity, options.include3D)];
        case 'INSERT':
            if (options.inlineBlockReferences) {
                return convertInsert(entity, blocks, options, depth);
            }
            return [];
        case '3DFACE':
            return [convert3DFace(entity, options.include3D)];
        case 'SOLID':
            return [convertSolid(entity, options.include3D)];
        case 'HATCH':
            return [convertHatch(entity, options.circleSegments, options.include3D)];
        case 'DIMENSION':
            return convertDimension(entity, options.include3D);
        default:
            return [];
    }
}
function shouldIncludeEntity(entity, tables, options) {
    // Filter by entity type
    if (options.entityTypes && options.entityTypes.length > 0) {
        if (!options.entityTypes.includes(entity.type)) {
            return false;
        }
    }
    // Filter by layer
    if (options.layers && options.layers.length > 0) {
        if (!options.layers.includes(entity.layer)) {
            return false;
        }
    }
    // Filter invisible entities
    if (!options.includeInvisible && !entity.visible) {
        return false;
    }
    // Filter frozen layers
    if (!options.includeFrozenLayers) {
        const layer = tables.layers.get(entity.layer);
        if (layer && layer.frozen) {
            return false;
        }
    }
    return true;
}
function addEntityProperties(feature, entity, tables) {
    const layer = tables.layers.get(entity.layer);
    // Resolve color: entity color takes precedence, then layer color
    let colorIndex = entity.colorIndex;
    if (colorIndex === undefined || colorIndex === 256) {
        // BYLAYER
        colorIndex = layer ? Math.abs(layer.colorIndex) : 7;
    }
    const properties = feature.properties || {};
    properties.layer = entity.layer;
    properties.entityType = entity.type;
    properties.color = aciToHex(colorIndex);
    properties.colorIndex = colorIndex;
    if (entity.handle) {
        properties.handle = entity.handle;
    }
    if (entity.lineType) {
        properties.lineType = entity.lineType;
    }
    if (entity.lineWeight !== undefined) {
        properties.lineWeight = entity.lineWeight;
    }
    feature.properties = properties;
}
//# sourceMappingURL=convert-entities-to-features.js.map