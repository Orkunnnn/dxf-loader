// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import * as arrow from 'apache-arrow';
import type {DXFDocument, DXFEntity, DXFBlock, DXFTables} from '../types';
import type {ConvertOptions} from './convert-entities-to-features';
import {convertEntityToFeatures, shouldIncludeEntity} from './convert-entities-to-features';
import {extractCadParams} from './extract-cad-params';
import {aciToHex} from '../utils/dxf-color-table';

/** Output from DXF → Arrow conversion, grouped by geometry type */
export type DXFArrowTables = {
  points: arrow.Table;
  lines: arrow.Table;
  polygons: arrow.Table;
};

type GeometryGroup = 'points' | 'lines' | 'polygons';

type CollectedRow = {
  geometry: number[][];
  entityType: string;
  layer: string;
  color: string;
  colorIndex: number;
  handle: string | null;
  lineType: string | null;
  lineWeight: number | null;
  cadParams: string;
};

type CollectedGroups = {
  points: CollectedRow[];
  lines: CollectedRow[];
  polygons: CollectedRow[];
};

type CollectionContext = {
  blocks: Map<string, DXFBlock>;
  tables: DXFTables;
  options: ConvertOptions;
  groups: CollectedGroups;
};

const GEOARROW_POINT_ENCODING = 'geoarrow.point';
const GEOARROW_LINESTRING_ENCODING = 'geoarrow.linestring';
const GEOARROW_POLYGON_ENCODING = 'geoarrow.polygon';

/**
 * Convert a parsed DXF document to geometry-grouped Arrow tables with GeoArrow encoding.
 * Each table has: geometry (GeoArrow native), entity_type, layer, color, color_index,
 * handle, line_type, line_weight, cad_params (JSON).
 */
export function convertDXFDocumentToArrowTables(
  document: DXFDocument,
  options: ConvertOptions
): DXFArrowTables {
  const context: CollectionContext = {
    blocks: document.blocks,
    tables: document.tables,
    options,
    groups: {points: [], lines: [], polygons: []}
  };

  for (const entity of document.entities) {
    if (!shouldIncludeEntity(entity, document.tables, options)) {
      continue;
    }

    collectEntityRows(entity, context, 0);
  }

  return {
    points: buildPointTable(context.groups.points),
    lines: buildLineStringTable(context.groups.lines),
    polygons: buildPolygonTable(context.groups.polygons)
  };
}

/**
 * Collect rows for a single entity, recursively expanding INSERT references.
 */
function collectEntityRows(entity: DXFEntity, context: CollectionContext, depth: number): void {
  const {blocks, tables, options, groups} = context;
  const features = convertEntityToFeatures(entity, blocks, options, depth);
  const resolvedProps = resolveEntityProperties(entity, tables);

  for (const feature of features) {
    const geomType = feature.geometry?.type;
    if (!geomType) continue;

    const group = classifyGeometryType(geomType);
    if (!group) continue;

    // Use feature properties if available (INSERT expansion sets them),
    // otherwise use resolved entity properties
    const featureProps = feature.properties || {};
    const entityType =
      (featureProps.entityType as string) || resolvedProps.entityType || entity.type;
    const layer = (featureProps.layer as string) || resolvedProps.layer || entity.layer;
    const color = (featureProps.color as string) || resolvedProps.color;
    const colorIndex = (featureProps.colorIndex as number) ?? resolvedProps.colorIndex;
    const handle = (featureProps.handle as string) || resolvedProps.handle;
    const lineType = (featureProps.lineType as string) || resolvedProps.lineType;
    const lineWeight = (featureProps.lineWeight as number) ?? resolvedProps.lineWeight;

    const cadParams = JSON.stringify(extractCadParams(entity));
    const coords = extractCoordinates(feature.geometry);

    groups[group].push({
      geometry: coords,
      entityType,
      layer,
      color,
      colorIndex,
      handle,
      lineType,
      lineWeight,
      cadParams
    });
  }
}

function resolveEntityProperties(
  entity: DXFEntity,
  tables: DXFTables
): {
  entityType: string;
  layer: string;
  color: string;
  colorIndex: number;
  handle: string | null;
  lineType: string | null;
  lineWeight: number | null;
} {
  const layer = tables.layers.get(entity.layer);
  let colorIndex = entity.colorIndex;
  if (colorIndex === undefined || colorIndex === 256) {
    colorIndex = layer ? Math.abs(layer.colorIndex) : 7;
  }

  return {
    entityType: entity.type,
    layer: entity.layer,
    color: aciToHex(colorIndex),
    colorIndex,
    handle: entity.handle || null,
    lineType: entity.lineType || null,
    lineWeight: entity.lineWeight ?? null
  };
}

function classifyGeometryType(geomType: string): GeometryGroup | null {
  switch (geomType) {
    case 'Point':
      return 'points';
    case 'LineString':
      return 'lines';
    case 'Polygon':
      return 'polygons';
    case 'MultiPolygon':
      return 'polygons';
    default:
      return null;
  }
}

/**
 * Extract coordinates from GeoJSON geometry into a flat array structure.
 * Point → [[x, y]] (single coord)
 * LineString → [[x, y], [x, y], ...]
 * Polygon → [[x, y], [x, y], ...] per ring (first ring for simplicity)
 * MultiPolygon → first polygon's first ring
 */
function extractCoordinates(geometry: any): number[][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'LineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates; // Array of rings
    case 'MultiPolygon':
      return geometry.coordinates; // Array of polygons (each is array of rings)
    default:
      return [];
  }
}

// --- Arrow table builders ---

function buildPropertyVectors(rows: CollectedRow[]): Record<string, arrow.Vector> {
  const entityTypes: string[] = [];
  const layers: string[] = [];
  const colors: string[] = [];
  const colorIndices: (number | null)[] = [];
  const handles: (string | null)[] = [];
  const lineTypes: (string | null)[] = [];
  const lineWeights: (number | null)[] = [];
  const cadParamsArr: string[] = [];

  for (const row of rows) {
    entityTypes.push(row.entityType);
    layers.push(row.layer);
    colors.push(row.color);
    colorIndices.push(row.colorIndex);
    handles.push(row.handle);
    lineTypes.push(row.lineType);
    lineWeights.push(row.lineWeight);
    cadParamsArr.push(row.cadParams);
  }

  return {
    entity_type: arrow.vectorFromArray(entityTypes, new arrow.Utf8()),
    layer: arrow.vectorFromArray(layers, new arrow.Utf8()),
    color: arrow.vectorFromArray(colors, new arrow.Utf8()),
    color_index: arrow.vectorFromArray(colorIndices, new arrow.Int32()),
    handle: arrow.vectorFromArray(handles, new arrow.Utf8()),
    line_type: arrow.vectorFromArray(lineTypes, new arrow.Utf8()),
    line_weight: arrow.vectorFromArray(lineWeights, new arrow.Float64()),
    cad_params: arrow.vectorFromArray(cadParamsArr, new arrow.Utf8())
  };
}

/**
 * Build a Point table using GeoArrow native encoding:
 * geometry column = FixedSizeList<Float64>[2] with ARROW:extension:name = geoarrow.point
 */
function buildPointTable(rows: CollectedRow[]): arrow.Table {
  if (rows.length === 0) {
    return buildEmptyTable(GEOARROW_POINT_ENCODING);
  }

  // Determine dimensionality from data
  const dim = rows[0].geometry[0]?.length >= 3 ? 3 : 2;

  // Build interleaved coordinate buffer
  const coordValues = new Float64Array(rows.length * dim);
  for (let i = 0; i < rows.length; i++) {
    const coord = rows[i].geometry[0] || [];
    for (let d = 0; d < dim; d++) {
      coordValues[i * dim + d] = coord[d] || 0;
    }
  }

  const geometryVector = buildPointVector(coordValues, rows.length, dim);
  const properties = buildPropertyVectors(rows);

  return new arrow.Table({geometry: geometryVector, ...properties});
}

/**
 * Build a LineString table using GeoArrow native encoding:
 * geometry column = List<FixedSizeList<Float64>[2]>
 * with ARROW:extension:name = geoarrow.linestring
 */
function buildLineStringTable(rows: CollectedRow[]): arrow.Table {
  if (rows.length === 0) {
    return buildEmptyTable(GEOARROW_LINESTRING_ENCODING);
  }

  const dim = detectDimensionality(rows);

  // Flatten all coordinates and build offsets
  const allCoords: number[] = [];
  const offsets = new Int32Array(rows.length + 1);
  offsets[0] = 0;

  for (let i = 0; i < rows.length; i++) {
    const coords = rows[i].geometry; // number[][]
    for (const coord of coords) {
      for (let d = 0; d < dim; d++) {
        allCoords.push(coord[d] || 0);
      }
    }
    offsets[i + 1] = offsets[i] + coords.length;
  }

  const coordValues = new Float64Array(allCoords);
  const geometryVector = buildLineStringVector(coordValues, offsets, rows.length, dim);
  const properties = buildPropertyVectors(rows);

  return new arrow.Table({geometry: geometryVector, ...properties});
}

/**
 * Build a Polygon table using GeoArrow native encoding:
 * geometry column = List<List<FixedSizeList<Float64>[2]>>
 * with ARROW:extension:name = geoarrow.polygon
 */
function buildPolygonTable(rows: CollectedRow[]): arrow.Table {
  if (rows.length === 0) {
    return buildEmptyTable(GEOARROW_POLYGON_ENCODING);
  }

  const dim = detectPolygonDimensionality(rows);

  // Polygons: each row.geometry is either:
  // - For Polygon: ring[], where ring = coord[]
  // - For MultiPolygon: polygon[], where polygon = ring[]
  // We flatten MultiPolygons to individual polygons during collection,
  // but the GeoJSON converter may produce Polygon or MultiPolygon.
  // For simplicity, we store as geoarrow.polygon and handle MultiPolygon
  // by taking the first polygon.

  const allCoords: number[] = [];
  const ringOffsets: number[] = [0]; // offsets into coords for each ring
  const polygonOffsets = new Int32Array(rows.length + 1); // offsets into rings for each polygon
  polygonOffsets[0] = 0;

  let totalCoordCount = 0;
  let totalRingCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const geom = rows[i].geometry;
    // Detect if this is Polygon (array of rings) or MultiPolygon (array of polygons)
    const rings = detectAndExtractRings(geom);

    for (const ring of rings) {
      for (const coord of ring) {
        for (let d = 0; d < dim; d++) {
          allCoords.push(coord[d] || 0);
        }
        totalCoordCount++;
      }
      totalRingCount++;
      ringOffsets.push(totalCoordCount);
    }

    polygonOffsets[i + 1] = totalRingCount;
  }

  const coordValues = new Float64Array(allCoords);
  const ringOffsetsArray = new Int32Array(ringOffsets);
  const geometryVector = buildPolygonVector(
    coordValues,
    ringOffsetsArray,
    polygonOffsets,
    rows.length,
    dim
  );
  const properties = buildPropertyVectors(rows);

  return new arrow.Table({geometry: geometryVector, ...properties});
}

/**
 * Detect if geometry data represents Polygon rings or MultiPolygon.
 * Polygon: [[coord, coord, ...], [coord, coord, ...]]  (array of rings, each ring is coords)
 * MultiPolygon: [[[coord, coord], [coord, coord]], ...]  (array of polygons)
 *
 * We detect by checking nesting depth: if geom[0][0] is a number, it's ring coords.
 * If geom[0][0] is an array, it's either rings of coords or polygons of rings.
 */
function detectAndExtractRings(geom: number[][]): number[][][] {
  if (geom.length === 0) return [[]];

  const first = geom[0];
  if (typeof first[0] === 'number') {
    // This is a single ring (array of coords), wrap in array
    // Actually this shouldn't happen for Polygon - Polygon coords are ring[]
    // where ring = coord[], so geom[0] should be a ring (array of coords)
    // and geom[0][0] should be a coord (array of numbers)
    // But if we got flat coords somehow, wrap them
    return [geom as unknown as number[][]];
  }

  // geom[0] is an array - check if it's a coord or a ring
  if (Array.isArray(first[0]) && typeof (first[0] as any)[0] === 'number') {
    // geom is array of rings, each ring is array of coords
    return geom as unknown as number[][][];
  }

  if (Array.isArray(first[0]) && Array.isArray((first[0] as any)[0])) {
    // MultiPolygon: geom is array of polygons, take first polygon
    return (geom as unknown as number[][][][])[0] || [[]];
  }

  // Fallback: treat as single ring
  return [geom as unknown as number[][]];
}

function detectDimensionality(rows: CollectedRow[]): number {
  for (const row of rows) {
    for (const coord of row.geometry) {
      if (coord && coord.length >= 3) return 3;
    }
  }
  return 2;
}

function detectPolygonDimensionality(rows: CollectedRow[]): number {
  for (const row of rows) {
    const geom = row.geometry;
    if (geom.length === 0) continue;
    const first = geom[0];
    if (typeof first[0] === 'number') {
      // Coords directly
      if (first.length >= 3) return 3;
    } else if (Array.isArray(first[0])) {
      // Ring of coords
      const coord = (first as unknown as number[][])[0];
      if (coord && coord.length >= 3) return 3;
    }
  }
  return 2;
}

// --- Low-level GeoArrow vector builders ---
// Uses arrow.Data constructor: (type, offset, length, nullCount, buffers, children, dictionary)
// This avoids the strict TypeScript overload constraints of makeData.

function makeCoordData(coordValues: Float64Array, length: number): arrow.Data {
  const floatType = new arrow.Float64();
  return new arrow.Data(floatType, 0, length, 0, [undefined, coordValues, undefined]);
}

function makePointData(coordData: arrow.Data, length: number, dim: number): arrow.Data {
  const coordField = new arrow.Field('xy', new arrow.Float64());
  const pointType = new arrow.FixedSizeList(dim, coordField);
  return new arrow.Data(pointType, 0, length, 0, undefined, [coordData]);
}

function makeListOfData(
  childData: arrow.Data,
  offsets: Int32Array,
  length: number,
  childField: arrow.Field
): arrow.Data {
  const listType = new arrow.List(childField);
  return new arrow.Data(listType, 0, length, 0, [offsets, undefined, undefined], [childData]);
}

function buildPointVector(coordValues: Float64Array, numPoints: number, dim: number): arrow.Vector {
  const coordData = makeCoordData(coordValues, numPoints * dim);
  const pointData = makePointData(coordData, numPoints, dim);
  return arrow.makeVector(pointData);
}

function buildLineStringVector(
  coordValues: Float64Array,
  offsets: Int32Array,
  numLineStrings: number,
  dim: number
): arrow.Vector {
  const totalCoords = offsets[numLineStrings];
  const coordField = new arrow.Field('xy', new arrow.Float64());
  const pointType = new arrow.FixedSizeList(dim, coordField);
  const pointField = new arrow.Field('vertices', pointType);

  const coordData = makeCoordData(coordValues, totalCoords * dim);
  const pointData = makePointData(coordData, totalCoords, dim);
  const lineStringData = makeListOfData(pointData, offsets, numLineStrings, pointField);

  return arrow.makeVector(lineStringData);
}

function buildPolygonVector(
  coordValues: Float64Array,
  ringOffsets: Int32Array,
  polygonOffsets: Int32Array,
  numPolygons: number,
  dim: number
): arrow.Vector {
  const totalCoords = ringOffsets[ringOffsets.length - 1];
  const totalRings = polygonOffsets[numPolygons];
  const coordField = new arrow.Field('xy', new arrow.Float64());
  const pointType = new arrow.FixedSizeList(dim, coordField);
  const pointField = new arrow.Field('vertices', pointType);
  const ringType = new arrow.List(pointField);
  const ringField = new arrow.Field('rings', ringType);

  const coordData = makeCoordData(coordValues, totalCoords * dim);
  const pointData = makePointData(coordData, totalCoords, dim);
  const ringData = makeListOfData(pointData, ringOffsets, totalRings, pointField);
  const polygonData = makeListOfData(ringData, polygonOffsets, numPolygons, ringField);

  return arrow.makeVector(polygonData);
}

function buildEmptyTable(encoding: string): arrow.Table {
  const entityTypes = arrow.vectorFromArray([] as string[], new arrow.Utf8());
  const layers = arrow.vectorFromArray([] as string[], new arrow.Utf8());
  const colors = arrow.vectorFromArray([] as string[], new arrow.Utf8());
  const colorIndices = arrow.vectorFromArray([] as (number | null)[], new arrow.Int32());
  const handles = arrow.vectorFromArray([] as (string | null)[], new arrow.Utf8());
  const lineTypes = arrow.vectorFromArray([] as (string | null)[], new arrow.Utf8());
  const lineWeights = arrow.vectorFromArray([] as (number | null)[], new arrow.Float64());
  const cadParams = arrow.vectorFromArray([] as string[], new arrow.Utf8());

  const coordField = new arrow.Field('xy', new arrow.Float64());
  const pointType = new arrow.FixedSizeList(2, coordField);

  let geometryVector: arrow.Vector;

  const emptyCoordData = makeCoordData(new Float64Array(0), 0);
  const emptyPointData = makePointData(emptyCoordData, 0, 2);

  if (encoding === GEOARROW_POINT_ENCODING) {
    geometryVector = arrow.makeVector(emptyPointData);
  } else if (encoding === GEOARROW_LINESTRING_ENCODING) {
    const vertexField = new arrow.Field('vertices', pointType);
    const emptyLineStringData = makeListOfData(emptyPointData, new Int32Array([0]), 0, vertexField);
    geometryVector = arrow.makeVector(emptyLineStringData);
  } else {
    const vertexField = new arrow.Field('vertices', pointType);
    const ringType = new arrow.List(vertexField);
    const ringField = new arrow.Field('rings', ringType);
    const emptyRingData = makeListOfData(emptyPointData, new Int32Array([0]), 0, vertexField);
    const emptyPolygonData = makeListOfData(emptyRingData, new Int32Array([0]), 0, ringField);
    geometryVector = arrow.makeVector(emptyPolygonData);
  }

  return new arrow.Table({
    geometry: geometryVector,
    entity_type: entityTypes,
    layer: layers,
    color: colors,
    color_index: colorIndices,
    handle: handles,
    line_type: lineTypes,
    line_weight: lineWeights,
    cad_params: cadParams
  });
}
