import type { Feature, Polygon } from '@loaders.gl/schema';
import type { DXFSolidEntity } from '../types';
/**
 * Convert SOLID entity to Polygon.
 * DXF SOLID has a peculiar vertex order: 1, 2, 4, 3 (3rd and 4th are swapped).
 */
export declare function convertSolid(entity: DXFSolidEntity, include3D: boolean): Feature<Polygon>;
//# sourceMappingURL=convert-solid.d.ts.map