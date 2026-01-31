// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { tessellateCircle } from '../utils/dxf-math';
export function convertCircle(entity, circleSegments, include3D) {
    const ring = tessellateCircle(entity.center, entity.radius, circleSegments);
    const coordinates = include3D ? ring : ring.map((p) => [p[0], p[1]]);
    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
        },
        properties: {}
    };
}
//# sourceMappingURL=convert-circle.js.map