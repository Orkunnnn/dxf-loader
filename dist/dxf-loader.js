// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { parseDXF } from './lib/parse-dxf';
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
/**
 * Loader for DXF (AutoCAD Drawing Exchange Format)
 */
export const DXFLoader = {
    dataType: null,
    batchType: null,
    name: 'DXF (AutoCAD)',
    id: 'dxf',
    module: 'dxf',
    version: VERSION,
    worker: true,
    extensions: ['dxf'],
    mimeTypes: ['application/dxf', 'application/x-dxf', 'image/vnd.dxf'],
    category: 'geometry',
    text: true,
    parse: async (arrayBuffer, options) => parseTextSync(new TextDecoder().decode(arrayBuffer), options),
    parseTextSync,
    options: {
        dxf: {
            shape: 'geojson-table',
            circleSegments: 72,
            splineSegmentsPerSpan: 20,
            inlineBlockReferences: true,
            maxBlockInsertionDepth: 8,
            entityTypes: undefined,
            layers: undefined,
            includeInvisible: false,
            includeFrozenLayers: false,
            include3D: true
        }
    }
};
function parseTextSync(text, options) {
    const dxfOptions = { ...DXFLoader.options.dxf, ...options?.dxf };
    const features = parseDXF(text, dxfOptions);
    switch (dxfOptions.shape) {
        case 'geojson-table': {
            const table = {
                shape: 'geojson-table',
                type: 'FeatureCollection',
                features
            };
            return table;
        }
        case 'object-row-table': {
            const table = {
                shape: 'object-row-table',
                data: features
            };
            return table;
        }
        default:
            throw new Error(`DXFLoader: Unsupported shape "${dxfOptions.shape}"`);
    }
}
//# sourceMappingURL=dxf-loader.js.map