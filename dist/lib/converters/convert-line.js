// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
export function convertLine(entity, include3D) {
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
function pointToCoord(point, include3D) {
    if (include3D && point.length > 2) {
        return [point[0], point[1], point[2]];
    }
    return [point[0], point[1]];
}
//# sourceMappingURL=convert-line.js.map