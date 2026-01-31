import type { DXFGroupPair, DXFSections } from '../types';
/**
 * Tokenize DXF text into group code / value pairs
 */
export declare function tokenizeDXF(text: string): DXFGroupPair[];
/**
 * Split tokenized pairs into named sections
 */
export declare function parseSections(pairs: DXFGroupPair[]): DXFSections;
//# sourceMappingURL=parse-dxf-sections.d.ts.map