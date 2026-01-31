// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

/** A group code / value pair from a DXF file */
export type DXFGroupPair = {
  code: number;
  value: string;
};

/** Parsed DXF sections */
export type DXFSections = {
  header: DXFGroupPair[];
  tables: DXFGroupPair[];
  blocks: DXFGroupPair[];
  entities: DXFGroupPair[];
};

/** DXF header variables */
export type DXFHeader = {
  version?: string;
  insertionUnits?: number;
  extMin?: [number, number, number];
  extMax?: [number, number, number];
};

/** DXF layer definition */
export type DXFLayer = {
  name: string;
  colorIndex: number;
  flags: number;
  lineType?: string;
  frozen: boolean;
  off: boolean;
};

/** DXF line type definition */
export type DXFLineType = {
  name: string;
  description: string;
  elements: number[];
};

/** DXF text style definition */
export type DXFStyle = {
  name: string;
  fontName: string;
  height: number;
};

/** DXF tables section result */
export type DXFTables = {
  layers: Map<string, DXFLayer>;
  lineTypes: Map<string, DXFLineType>;
  styles: Map<string, DXFStyle>;
};

/** A 2D or 3D point */
export type DXFPoint = [number, number] | [number, number, number];

/** Common properties on all DXF entities */
export type DXFEntityBase = {
  type: string;
  handle?: string;
  layer: string;
  colorIndex?: number;
  lineType?: string;
  lineWeight?: number;
  visible: boolean;
};

/** LINE entity */
export type DXFLineEntity = DXFEntityBase & {
  type: 'LINE';
  startPoint: DXFPoint;
  endPoint: DXFPoint;
};

/** POINT entity */
export type DXFPointEntity = DXFEntityBase & {
  type: 'POINT';
  position: DXFPoint;
};

/** CIRCLE entity */
export type DXFCircleEntity = DXFEntityBase & {
  type: 'CIRCLE';
  center: DXFPoint;
  radius: number;
};

/** ARC entity */
export type DXFArcEntity = DXFEntityBase & {
  type: 'ARC';
  center: DXFPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
};

/** ELLIPSE entity */
export type DXFEllipseEntity = DXFEntityBase & {
  type: 'ELLIPSE';
  center: DXFPoint;
  majorAxisEndPoint: DXFPoint;
  ratioMinorToMajor: number;
  startParameter: number;
  endParameter: number;
};

/** LWPOLYLINE vertex with optional bulge */
export type DXFPolylineVertex = {
  x: number;
  y: number;
  z?: number;
  bulge: number;
};

/** LWPOLYLINE entity */
export type DXFLWPolylineEntity = DXFEntityBase & {
  type: 'LWPOLYLINE';
  vertices: DXFPolylineVertex[];
  closed: boolean;
  elevation?: number;
};

/** POLYLINE entity (2D/3D) */
export type DXFPolylineEntity = DXFEntityBase & {
  type: 'POLYLINE';
  vertices: DXFPolylineVertex[];
  closed: boolean;
};

/** SPLINE entity */
export type DXFSplineEntity = DXFEntityBase & {
  type: 'SPLINE';
  degree: number;
  closed: boolean;
  controlPoints: DXFPoint[];
  fitPoints: DXFPoint[];
  knots: number[];
  weights: number[];
};

/** TEXT entity */
export type DXFTextEntity = DXFEntityBase & {
  type: 'TEXT';
  insertionPoint: DXFPoint;
  height: number;
  text: string;
  rotation: number;
  style?: string;
};

/** MTEXT entity */
export type DXFMTextEntity = DXFEntityBase & {
  type: 'MTEXT';
  insertionPoint: DXFPoint;
  height: number;
  text: string;
  rotation: number;
  width: number;
  style?: string;
};

/** INSERT entity (block reference) */
export type DXFInsertEntity = DXFEntityBase & {
  type: 'INSERT';
  blockName: string;
  insertionPoint: DXFPoint;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotation: number;
};

/** 3DFACE entity */
export type DXF3DFaceEntity = DXFEntityBase & {
  type: '3DFACE';
  vertices: [DXFPoint, DXFPoint, DXFPoint] | [DXFPoint, DXFPoint, DXFPoint, DXFPoint];
};

/** SOLID entity */
export type DXFSolidEntity = DXFEntityBase & {
  type: 'SOLID';
  vertices: [DXFPoint, DXFPoint, DXFPoint] | [DXFPoint, DXFPoint, DXFPoint, DXFPoint];
};

/** HATCH boundary path edge */
export type DXFHatchEdge =
  | {type: 'line'; startPoint: DXFPoint; endPoint: DXFPoint}
  | {
      type: 'arc';
      center: DXFPoint;
      radius: number;
      startAngle: number;
      endAngle: number;
      counterClockwise: boolean;
    }
  | {
      type: 'ellipse';
      center: DXFPoint;
      majorAxisEndPoint: DXFPoint;
      ratioMinorToMajor: number;
      startAngle: number;
      endAngle: number;
      counterClockwise: boolean;
    };

/** HATCH boundary path */
export type DXFHatchBoundaryPath = {
  type: 'polyline' | 'edges';
  vertices?: DXFPolylineVertex[];
  closed?: boolean;
  edges?: DXFHatchEdge[];
};

/** HATCH entity */
export type DXFHatchEntity = DXFEntityBase & {
  type: 'HATCH';
  patternName: string;
  solid: boolean;
  boundaryPaths: DXFHatchBoundaryPath[];
};

/** DIMENSION entity */
export type DXFDimensionEntity = DXFEntityBase & {
  type: 'DIMENSION';
  definitionPoint: DXFPoint;
  middleOfText: DXFPoint;
  insertionPoint?: DXFPoint;
  dimensionType: number;
  text?: string;
  linearPoint?: DXFPoint;
};

/** Union of all DXF entity types */
export type DXFEntity =
  | DXFLineEntity
  | DXFPointEntity
  | DXFCircleEntity
  | DXFArcEntity
  | DXFEllipseEntity
  | DXFLWPolylineEntity
  | DXFPolylineEntity
  | DXFSplineEntity
  | DXFTextEntity
  | DXFMTextEntity
  | DXFInsertEntity
  | DXF3DFaceEntity
  | DXFSolidEntity
  | DXFHatchEntity
  | DXFDimensionEntity;

/** A DXF block definition */
export type DXFBlock = {
  name: string;
  basePoint: DXFPoint;
  entities: DXFEntity[];
};

/** Full parsed DXF document */
export type DXFDocument = {
  header: DXFHeader;
  tables: DXFTables;
  blocks: Map<string, DXFBlock>;
  entities: DXFEntity[];
};
