// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
export function convertPoint(entity, include3D) {
    const coordinates = include3D && entity.position.length > 2
        ? [entity.position[0], entity.position[1], entity.position[2]]
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
//# sourceMappingURL=convert-point.js.map