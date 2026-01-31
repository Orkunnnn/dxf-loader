import type { Feature, LineString, Polygon } from '@loaders.gl/schema';
import type { DXFLWPolylineEntity, DXFPolylineEntity } from '../types';
export declare function convertPolyline(entity: DXFLWPolylineEntity | DXFPolylineEntity, circleSegments: number, include3D: boolean): Feature<LineString | Polygon>;
//# sourceMappingURL=convert-polyline.d.ts.map