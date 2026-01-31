// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { tokenizeDXF, parseSections } from './parsers/parse-dxf-sections';
import { parseHeader } from './parsers/parse-dxf-header';
import { parseTables } from './parsers/parse-dxf-tables';
import { parseBlocks } from './parsers/parse-dxf-blocks';
import { parseEntitiesWithVertices } from './parsers/parse-dxf-entities';
import { convertEntitiesToFeatures } from './converters/convert-entities-to-features';
/**
 * Parse DXF text content and return GeoJSON features
 */
export function parseDXF(text, options = {}) {
    // Stage 1: Tokenize
    const pairs = tokenizeDXF(text);
    // Stage 2: Split into sections
    const sections = parseSections(pairs);
    // Stage 3: Parse each section
    // Header is parsed but not yet surfaced in output; retained for future use
    void parseHeader(sections.header);
    const tables = parseTables(sections.tables);
    const blocks = parseBlocks(sections.blocks);
    const entities = parseEntitiesWithVertices(sections.entities);
    // Stage 4: Convert to GeoJSON features
    const convertOptions = {
        circleSegments: options.circleSegments ?? 72,
        splineSegmentsPerSpan: options.splineSegmentsPerSpan ?? 20,
        inlineBlockReferences: options.inlineBlockReferences ?? true,
        maxBlockInsertionDepth: options.maxBlockInsertionDepth ?? 8,
        entityTypes: options.entityTypes,
        layers: options.layers,
        includeInvisible: options.includeInvisible ?? false,
        includeFrozenLayers: options.includeFrozenLayers ?? false,
        include3D: options.include3D ?? true
    };
    return convertEntitiesToFeatures(entities, tables, blocks, convertOptions);
}
//# sourceMappingURL=parse-dxf.js.map