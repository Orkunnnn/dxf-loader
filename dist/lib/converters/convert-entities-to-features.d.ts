import type { Feature } from '@loaders.gl/schema';
import type { DXFEntity, DXFBlock, DXFTables } from '../types';
export type ConvertOptions = {
    circleSegments: number;
    splineSegmentsPerSpan: number;
    inlineBlockReferences: boolean;
    maxBlockInsertionDepth: number;
    entityTypes?: string[];
    layers?: string[];
    includeInvisible: boolean;
    includeFrozenLayers: boolean;
    include3D: boolean;
};
/**
 * Convert parsed DXF entities to GeoJSON features
 */
export declare function convertEntitiesToFeatures(entities: DXFEntity[], tables: DXFTables, blocks: Map<string, DXFBlock>, options: ConvertOptions): Feature[];
/**
 * Convert a single entity to GeoJSON features.
 * Exported for use by INSERT converter for recursive block expansion.
 */
export declare function convertEntityToFeatures(entity: DXFEntity, blocks: Map<string, DXFBlock>, options: ConvertOptions, depth: number): Feature[];
//# sourceMappingURL=convert-entities-to-features.d.ts.map