import type { Feature, Polygon, MultiPolygon } from '@loaders.gl/schema';
import type { DXFHatchEntity } from '../types';
export declare function convertHatch(entity: DXFHatchEntity, circleSegments: number, include3D: boolean): Feature<Polygon | MultiPolygon>;
//# sourceMappingURL=convert-hatch.d.ts.map