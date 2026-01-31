import type { Feature } from '@loaders.gl/schema';
import type { DXFInsertEntity, DXFBlock } from '../types';
import type { ConvertOptions } from './convert-entities-to-features';
export declare function convertInsert(entity: DXFInsertEntity, blocks: Map<string, DXFBlock>, options: ConvertOptions, depth: number): Feature[];
//# sourceMappingURL=convert-insert.d.ts.map