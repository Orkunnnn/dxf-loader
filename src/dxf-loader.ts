// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {LoaderWithParser, LoaderOptions} from '@loaders.gl/loader-utils';
import type {GeoJSONTable, ObjectRowTable} from '@loaders.gl/schema';
import {parseDXF} from './lib/parse-dxf';

// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';

export type DXFLoaderOptions = LoaderOptions & {
  dxf?: {
    /** Output format */
    shape?: 'geojson-table' | 'object-row-table';
    /** Number of segments for circle/arc tessellation */
    circleSegments?: number;
    /** Number of interpolation points per spline span */
    splineSegmentsPerSpan?: number;
    /** Whether to expand INSERT entities into block geometry */
    inlineBlockReferences?: boolean;
    /** Maximum recursion depth for nested block insertions */
    maxBlockInsertionDepth?: number;
    /** Filter: only include these entity types */
    entityTypes?: string[];
    /** Filter: only include entities from these layers */
    layers?: string[];
    /** Whether to include invisible entities */
    includeInvisible?: boolean;
    /** Whether to include entities from frozen layers */
    includeFrozenLayers?: boolean;
    /** Whether to include Z coordinates */
    include3D?: boolean;
  };
};

/**
 * Loader for DXF (AutoCAD Drawing Exchange Format)
 */
export const DXFLoader = {
  dataType: null as unknown as ObjectRowTable | GeoJSONTable,
  batchType: null as never,

  name: 'DXF (AutoCAD)',
  id: 'dxf',
  module: 'dxf',
  version: VERSION,
  worker: true,
  extensions: ['dxf'],
  mimeTypes: ['application/dxf', 'application/x-dxf', 'image/vnd.dxf'],
  category: 'geometry',
  text: true,
  parse: async (arrayBuffer: ArrayBuffer, options?: DXFLoaderOptions) =>
    parseTextSync(new TextDecoder().decode(arrayBuffer), options),
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
} as const satisfies LoaderWithParser<ObjectRowTable | GeoJSONTable, never, DXFLoaderOptions>;

function parseTextSync(text: string, options?: DXFLoaderOptions): ObjectRowTable | GeoJSONTable {
  const dxfOptions = {...DXFLoader.options.dxf, ...options?.dxf};
  const features = parseDXF(text, dxfOptions);

  switch (dxfOptions.shape) {
    case 'geojson-table': {
      const table: GeoJSONTable = {
        shape: 'geojson-table',
        type: 'FeatureCollection',
        features
      };
      return table;
    }
    case 'object-row-table': {
      const table: ObjectRowTable = {
        shape: 'object-row-table',
        data: features
      };
      return table;
    }
    default:
      throw new Error(`DXFLoader: Unsupported shape "${dxfOptions.shape}"`);
  }
}
