// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Feature} from '@loaders.gl/schema';
import type {DXFDocument} from './types';
import {tokenizeDXF, parseSections} from './parsers/parse-dxf-sections';
import {parseHeader} from './parsers/parse-dxf-header';
import {parseTables} from './parsers/parse-dxf-tables';
import {parseBlocks} from './parsers/parse-dxf-blocks';
import {parseEntitiesWithVertices} from './parsers/parse-dxf-entities';
import {convertEntitiesToFeatures} from './converters/convert-entities-to-features';
import type {ConvertOptions} from './converters/convert-entities-to-features';

export type ParseDXFOptions = {
  shape?: string;
  circleSegments?: number;
  splineSegmentsPerSpan?: number;
  inlineBlockReferences?: boolean;
  maxBlockInsertionDepth?: number;
  entityTypes?: string[];
  layers?: string[];
  includeInvisible?: boolean;
  includeFrozenLayers?: boolean;
  include3D?: boolean;
};

/**
 * Parse DXF text content and return GeoJSON features
 */
export function parseDXF(text: string, options: ParseDXFOptions = {}): Feature[] {
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
  const convertOptions: ConvertOptions = {
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

/**
 * Parse DXF text content and return the full DXFDocument structure.
 * This preserves all parsed data (header, tables, blocks, entities)
 * without converting to GeoJSON.
 */
export function parseDXFDocument(text: string): DXFDocument {
  const pairs = tokenizeDXF(text);
  const sections = parseSections(pairs);
  const header = parseHeader(sections.header);
  const tables = parseTables(sections.tables);
  const blocks = parseBlocks(sections.blocks);
  const entities = parseEntitiesWithVertices(sections.entities);
  return {header, tables, blocks, entities};
}
