// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
export function convert3DFace(entity, include3D) {
    const ring = entity.vertices.map((v) => include3D && v.length > 2 ? [v[0], v[1], v[2]] : [v[0], v[1]]);
    // Close the ring
    const first = ring[0];
    ring.push([...first]);
    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [ring]
        },
        properties: {}
    };
}
//# sourceMappingURL=convert-3dface.js.map