import type { Feature } from '@loaders.gl/schema';
export type ParseDXFOptions = {
    shape?: string;
    circleSegments?: number;
    splineSegmentsPerSpan?: number;
    inlineBlockReferences?: boolean;
    maxBlockInsertionDepth?: number;
    entityTypes?: string[];
    layers?: string[];
    includeInvisible?: boolean;
    includeFrozenLayers?: boolean;
    include3D?: boolean;
};
/**
 * Parse DXF text content and return GeoJSON features
 */
export declare function parseDXF(text: string, options?: ParseDXFOptions): Feature[];
//# sourceMappingURL=parse-dxf.d.ts.map