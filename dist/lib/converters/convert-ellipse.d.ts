import type { Feature, LineString, Polygon } from '@loaders.gl/schema';
import type { DXFEllipseEntity } from '../types';
export declare function convertEllipse(entity: DXFEllipseEntity, circleSegments: number, include3D: boolean): Feature<LineString | Polygon>;
//# sourceMappingURL=convert-ellipse.d.ts.map