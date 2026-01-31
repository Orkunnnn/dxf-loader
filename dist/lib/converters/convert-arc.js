// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { tessellateArc } from '../utils/dxf-math';
export function convertArc(entity, circleSegments, include3D) {
    const points = tessellateArc(entity.center, entity.radius, entity.startAngle, entity.endAngle, circleSegments);
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
//# sourceMappingURL=convert-arc.js.map