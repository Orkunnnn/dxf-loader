import type { Feature } from '@loaders.gl/schema';
import type { DXFDimensionEntity } from '../types';
/**
 * Convert DIMENSION entity to features.
 * Returns a LineString for the dimension line and a Point for the text position.
 */
export declare function convertDimension(entity: DXFDimensionEntity, include3D: boolean): Feature[];
//# sourceMappingURL=convert-dimension.d.ts.map