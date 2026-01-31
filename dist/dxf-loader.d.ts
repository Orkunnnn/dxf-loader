import type { LoaderOptions } from '@loaders.gl/loader-utils';
import type { GeoJSONTable, ObjectRowTable } from '@loaders.gl/schema';
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
export declare const DXFLoader: {
    readonly dataType: ObjectRowTable | GeoJSONTable;
    readonly batchType: never;
    readonly name: "DXF (AutoCAD)";
    readonly id: "dxf";
    readonly module: "dxf";
    readonly version: any;
    readonly worker: true;
    readonly extensions: ["dxf"];
    readonly mimeTypes: ["application/dxf", "application/x-dxf", "image/vnd.dxf"];
    readonly category: "geometry";
    readonly text: true;
    readonly parse: (arrayBuffer: ArrayBuffer, options?: DXFLoaderOptions) => Promise<ObjectRowTable | GeoJSONTable>;
    readonly parseTextSync: typeof parseTextSync;
    readonly options: {
        readonly dxf: {
            readonly shape: "geojson-table";
            readonly circleSegments: 72;
            readonly splineSegmentsPerSpan: 20;
            readonly inlineBlockReferences: true;
            readonly maxBlockInsertionDepth: 8;
            readonly entityTypes: undefined;
            readonly layers: undefined;
            readonly includeInvisible: false;
            readonly includeFrozenLayers: false;
            readonly include3D: true;
        };
    };
};
declare function parseTextSync(text: string, options?: DXFLoaderOptions): ObjectRowTable | GeoJSONTable;
export {};
//# sourceMappingURL=dxf-loader.d.ts.map