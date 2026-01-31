// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { evaluateBSpline } from '../utils/dxf-math';
export function convertSpline(entity, splineSegmentsPerSpan, include3D) {
    let coordinates;
    if (entity.controlPoints.length > 0) {
        const numSpans = Math.max(1, entity.controlPoints.length - entity.degree);
        const numPoints = numSpans * splineSegmentsPerSpan + 1;
        const points = evaluateBSpline(entity.degree, entity.controlPoints, entity.knots, entity.weights, numPoints);
        coordinates = points.map((p) => include3D && p.length > 2 ? [p[0], p[1], p[2]] : [p[0], p[1]]);
    }
    else if (entity.fitPoints.length > 0) {
        // Fall back to fit points as a polyline
        coordinates = entity.fitPoints.map((p) => include3D && p.length > 2 ? [p[0], p[1], p[2]] : [p[0], p[1]]);
    }
    else {
        coordinates = [];
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
//# sourceMappingURL=convert-spline.js.map