// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
/**
 * Convert DIMENSION entity to features.
 * Returns a LineString for the dimension line and a Point for the text position.
 */
export function convertDimension(entity, include3D) {
    const features = [];
    const toCoord = (point) => include3D && point.length > 2 ? [point[0], point[1], point[2]] : [point[0], point[1]];
    // Dimension line
    const lineCoords = [toCoord(entity.definitionPoint)];
    if (entity.linearPoint) {
        lineCoords.push(toCoord(entity.linearPoint));
    }
    if (lineCoords.length >= 2) {
        const lineFeature = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: lineCoords
            },
            properties: {
                entityType: 'DIMENSION',
                dimensionType: entity.dimensionType,
                text: entity.text
            }
        };
        features.push(lineFeature);
    }
    // Text position
    const textFeature = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: toCoord(entity.middleOfText)
        },
        properties: {
            entityType: 'DIMENSION',
            dimensionType: entity.dimensionType,
            text: entity.text
        }
    };
    features.push(textFeature);
    return features;
}
//# sourceMappingURL=convert-dimension.js.map