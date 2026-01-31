import type { DXFGroupPair, DXFEntity } from '../types';
/**
 * Parse the ENTITIES (or block entities) section into typed entity objects
 */
export declare function parseEntities(pairs: DXFGroupPair[]): DXFEntity[];
/**
 * Special version that also extracts VERTEX sub-entities for POLYLINE
 */
export declare function parseEntitiesWithVertices(pairs: DXFGroupPair[]): DXFEntity[];
//# sourceMappingURL=parse-dxf-entities.d.ts.map