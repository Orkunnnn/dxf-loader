// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {
  DXFGroupPair,
  DXFEntity,
  DXFPoint,
  DXFPolylineVertex,
  DXFHatchBoundaryPath,
  DXFHatchEdge
} from '../types';

/**
 * Parse the ENTITIES (or block entities) section into typed entity objects
 */
export function parseEntities(pairs: DXFGroupPair[]): DXFEntity[] {
  const entities: DXFEntity[] = [];
  let currentType: string | null = null;
  let currentPairs: DXFGroupPair[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];

    if (pair.code === 0) {
      if (currentType) {
        const entity = buildEntity(currentType, currentPairs);
        if (entity) {
          entities.push(entity);
        }
      }

      if (pair.value === 'VERTEX' || pair.value === 'SEQEND') {
        // VERTEX and SEQEND are sub-entities of POLYLINE, handled during POLYLINE parsing
        // But if we encounter them outside, we still need to consume them
        currentType = pair.value;
        currentPairs = [];
      } else {
        currentType = pair.value;
        currentPairs = [];
      }
      continue;
    }

    currentPairs.push(pair);
  }

  // Handle last entity
  if (currentType) {
    const entity = buildEntity(currentType, currentPairs);
    if (entity) {
      entities.push(entity);
    }
  }

  return entities;
}

/**
 * Special version that also extracts VERTEX sub-entities for POLYLINE
 */
export function parseEntitiesWithVertices(pairs: DXFGroupPair[]): DXFEntity[] {
  const entities: DXFEntity[] = [];

  let i = 0;
  while (i < pairs.length) {
    // Find next entity start (code 0)
    if (pairs[i].code !== 0) {
      i++;
      continue;
    }

    const entityType = pairs[i].value;
    i++;

    // Collect pairs until next code 0
    const entityPairs: DXFGroupPair[] = [];

    if (entityType === 'POLYLINE') {
      // Collect POLYLINE header pairs
      while (i < pairs.length && pairs[i].code !== 0) {
        entityPairs.push(pairs[i]);
        i++;
      }

      // Now collect VERTEX sub-entities
      const vertices: DXFPolylineVertex[] = [];
      while (i < pairs.length) {
        if (pairs[i].code === 0 && pairs[i].value === 'VERTEX') {
          i++;
          const vertexPairs: DXFGroupPair[] = [];
          while (i < pairs.length && pairs[i].code !== 0) {
            vertexPairs.push(pairs[i]);
            i++;
          }
          vertices.push(parseVertexPairs(vertexPairs));
        } else if (pairs[i].code === 0 && pairs[i].value === 'SEQEND') {
          i++;
          // Skip SEQEND pairs
          while (i < pairs.length && pairs[i].code !== 0) {
            i++;
          }
          break;
        } else {
          break;
        }
      }

      const entity = buildPolylineEntity(entityPairs, vertices);
      if (entity) {
        entities.push(entity);
      }
    } else {
      while (i < pairs.length && pairs[i].code !== 0) {
        entityPairs.push(pairs[i]);
        i++;
      }

      const entity = buildEntity(entityType, entityPairs);
      if (entity) {
        entities.push(entity);
      }
    }
  }

  return entities;
}

function parseVertexPairs(pairs: DXFGroupPair[]): DXFPolylineVertex {
  let x = 0;
  let y = 0;
  let z: number | undefined;
  let bulge = 0;

  for (const pair of pairs) {
    switch (pair.code) {
      case 10:
        x = parseFloat(pair.value);
        break;
      case 20:
        y = parseFloat(pair.value);
        break;
      case 30:
        z = parseFloat(pair.value);
        break;
      case 42:
        bulge = parseFloat(pair.value);
        break;
    }
  }

  return {x, y, z, bulge};
}

function buildPolylineEntity(
  pairs: DXFGroupPair[],
  vertices: DXFPolylineVertex[]
): DXFEntity | null {
  const base = parseBaseProperties(pairs);
  let flags = 0;

  for (const pair of pairs) {
    if (pair.code === 70) {
      flags = parseInt(pair.value, 10);
    }
  }

  return {
    ...base,
    type: 'POLYLINE' as const,
    vertices,
    closed: (flags & 1) !== 0
  };
}

function buildEntity(type: string, pairs: DXFGroupPair[]): DXFEntity | null {
  switch (type) {
    case 'LINE':
      return parseLine(pairs);
    case 'POINT':
      return parsePoint(pairs);
    case 'CIRCLE':
      return parseCircle(pairs);
    case 'ARC':
      return parseArc(pairs);
    case 'ELLIPSE':
      return parseEllipse(pairs);
    case 'LWPOLYLINE':
      return parseLWPolyline(pairs);
    case 'SPLINE':
      return parseSpline(pairs);
    case 'TEXT':
      return parseText(pairs);
    case 'MTEXT':
      return parseMText(pairs);
    case 'INSERT':
      return parseInsert(pairs);
    case '3DFACE':
      return parse3DFace(pairs);
    case 'SOLID':
      return parseSolid(pairs);
    case 'HATCH':
      return parseHatch(pairs);
    case 'DIMENSION':
      return parseDimension(pairs);
    default:
      return null;
  }
}

function parseBaseProperties(pairs: DXFGroupPair[]): {
  handle?: string;
  layer: string;
  colorIndex?: number;
  lineType?: string;
  lineWeight?: number;
  visible: boolean;
} {
  let handle: string | undefined;
  let layer = '0';
  let colorIndex: number | undefined;
  let lineType: string | undefined;
  let lineWeight: number | undefined;
  let visible = true;

  for (const pair of pairs) {
    switch (pair.code) {
      case 5:
        handle = pair.value;
        break;
      case 8:
        layer = pair.value;
        break;
      case 6:
        lineType = pair.value;
        break;
      case 62:
        colorIndex = parseInt(pair.value, 10);
        break;
      case 370:
        lineWeight = parseInt(pair.value, 10);
        break;
      case 60:
        visible = parseInt(pair.value, 10) === 0;
        break;
    }
  }

  return {handle, layer, colorIndex, lineType, lineWeight, visible};
}

function readPoint(pairs: DXFGroupPair[], xCode: number): DXFPoint {
  let x = 0;
  let y = 0;
  let z: number | undefined;

  for (const pair of pairs) {
    if (pair.code === xCode) {
      x = parseFloat(pair.value);
    } else if (pair.code === xCode + 10) {
      y = parseFloat(pair.value);
    } else if (pair.code === xCode + 20) {
      z = parseFloat(pair.value);
    }
  }

  return z !== undefined && z !== 0 ? [x, y, z] : [x, y];
}

function parseLine(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  return {
    ...base,
    type: 'LINE' as const,
    startPoint: readPoint(pairs, 10),
    endPoint: readPoint(pairs, 11)
  };
}

function parsePoint(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  return {
    ...base,
    type: 'POINT' as const,
    position: readPoint(pairs, 10)
  };
}

function parseCircle(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let radius = 0;

  for (const pair of pairs) {
    if (pair.code === 40) {
      radius = parseFloat(pair.value);
    }
  }

  return {
    ...base,
    type: 'CIRCLE' as const,
    center: readPoint(pairs, 10),
    radius
  };
}

function parseArc(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let radius = 0;
  let startAngle = 0;
  let endAngle = 360;

  for (const pair of pairs) {
    switch (pair.code) {
      case 40:
        radius = parseFloat(pair.value);
        break;
      case 50:
        startAngle = parseFloat(pair.value);
        break;
      case 51:
        endAngle = parseFloat(pair.value);
        break;
    }
  }

  return {
    ...base,
    type: 'ARC' as const,
    center: readPoint(pairs, 10),
    radius,
    startAngle,
    endAngle
  };
}

function parseEllipse(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let ratioMinorToMajor = 1;
  let startParameter = 0;
  let endParameter = Math.PI * 2;

  for (const pair of pairs) {
    switch (pair.code) {
      case 40:
        ratioMinorToMajor = parseFloat(pair.value);
        break;
      case 41:
        startParameter = parseFloat(pair.value);
        break;
      case 42:
        endParameter = parseFloat(pair.value);
        break;
    }
  }

  return {
    ...base,
    type: 'ELLIPSE' as const,
    center: readPoint(pairs, 10),
    majorAxisEndPoint: readPoint(pairs, 11),
    ratioMinorToMajor,
    startParameter,
    endParameter
  };
}

function parseLWPolyline(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  const vertices: DXFPolylineVertex[] = [];
  let flags = 0;
  let elevation: number | undefined;

  // LWPOLYLINE stores vertices inline using repeated code 10/20 pairs
  let currentVertex: DXFPolylineVertex | null = null;

  for (const pair of pairs) {
    switch (pair.code) {
      case 70:
        flags = parseInt(pair.value, 10);
        break;
      case 38:
        elevation = parseFloat(pair.value);
        break;
      case 10:
        // Start of new vertex
        if (currentVertex) {
          vertices.push(currentVertex);
        }
        currentVertex = {x: parseFloat(pair.value), y: 0, bulge: 0};
        break;
      case 20:
        if (currentVertex) {
          currentVertex.y = parseFloat(pair.value);
        }
        break;
      case 42:
        if (currentVertex) {
          currentVertex.bulge = parseFloat(pair.value);
        }
        break;
    }
  }

  if (currentVertex) {
    vertices.push(currentVertex);
  }

  return {
    ...base,
    type: 'LWPOLYLINE' as const,
    vertices,
    closed: (flags & 1) !== 0,
    elevation
  };
}

function parseSpline(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let degree = 3;
  let flags = 0;
  const controlPoints: DXFPoint[] = [];
  const fitPoints: DXFPoint[] = [];
  const knots: number[] = [];
  const weights: number[] = [];

  // Spline data uses multiple repeated groups
  let controlX: number | null = null;
  let controlY: number | null = null;
  let fitX: number | null = null;
  let fitY: number | null = null;

  for (const pair of pairs) {
    switch (pair.code) {
      case 71:
        degree = parseInt(pair.value, 10);
        break;
      case 70:
        flags = parseInt(pair.value, 10);
        break;
      case 10:
        if (controlX !== null && controlY !== null) {
          controlPoints.push([controlX, controlY]);
        }
        controlX = parseFloat(pair.value);
        controlY = null;
        break;
      case 20:
        controlY = parseFloat(pair.value);
        break;
      case 30:
        if (controlX !== null && controlY !== null) {
          controlPoints.push([controlX, controlY, parseFloat(pair.value)]);
          controlX = null;
          controlY = null;
        }
        break;
      case 11:
        if (fitX !== null && fitY !== null) {
          fitPoints.push([fitX, fitY]);
        }
        fitX = parseFloat(pair.value);
        fitY = null;
        break;
      case 21:
        fitY = parseFloat(pair.value);
        break;
      case 31:
        if (fitX !== null && fitY !== null) {
          fitPoints.push([fitX, fitY, parseFloat(pair.value)]);
          fitX = null;
          fitY = null;
        }
        break;
      case 40:
        knots.push(parseFloat(pair.value));
        break;
      case 41:
        weights.push(parseFloat(pair.value));
        break;
    }
  }

  // Flush remaining control point
  if (controlX !== null && controlY !== null) {
    controlPoints.push([controlX, controlY]);
  }
  // Flush remaining fit point
  if (fitX !== null && fitY !== null) {
    fitPoints.push([fitX, fitY]);
  }

  return {
    ...base,
    type: 'SPLINE' as const,
    degree,
    closed: (flags & 1) !== 0,
    controlPoints,
    fitPoints,
    knots,
    weights
  };
}

function parseText(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let height = 1;
  let text = '';
  let rotation = 0;
  let style: string | undefined;

  for (const pair of pairs) {
    switch (pair.code) {
      case 40:
        height = parseFloat(pair.value);
        break;
      case 1:
        text = pair.value;
        break;
      case 50:
        rotation = parseFloat(pair.value);
        break;
      case 7:
        style = pair.value;
        break;
    }
  }

  return {
    ...base,
    type: 'TEXT' as const,
    insertionPoint: readPoint(pairs, 10),
    height,
    text,
    rotation,
    style
  };
}

function parseMText(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let height = 1;
  let text = '';
  let rotation = 0;
  let width = 0;
  let style: string | undefined;

  for (const pair of pairs) {
    switch (pair.code) {
      case 40:
        height = parseFloat(pair.value);
        break;
      case 1:
        text += pair.value;
        break;
      case 3:
        // Additional text chunks (code 3 precedes code 1 for long text)
        text += pair.value;
        break;
      case 50:
        rotation = parseFloat(pair.value);
        break;
      case 41:
        width = parseFloat(pair.value);
        break;
      case 7:
        style = pair.value;
        break;
    }
  }

  return {
    ...base,
    type: 'MTEXT' as const,
    insertionPoint: readPoint(pairs, 10),
    height,
    text,
    rotation,
    width,
    style
  };
}

function parseInsert(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let blockName = '';
  let scaleX = 1;
  let scaleY = 1;
  let scaleZ = 1;
  let rotation = 0;

  for (const pair of pairs) {
    switch (pair.code) {
      case 2:
        blockName = pair.value;
        break;
      case 41:
        scaleX = parseFloat(pair.value);
        break;
      case 42:
        scaleY = parseFloat(pair.value);
        break;
      case 43:
        scaleZ = parseFloat(pair.value);
        break;
      case 50:
        rotation = parseFloat(pair.value);
        break;
    }
  }

  return {
    ...base,
    type: 'INSERT' as const,
    blockName,
    insertionPoint: readPoint(pairs, 10),
    scaleX,
    scaleY,
    scaleZ,
    rotation
  };
}

function parse3DFace(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  const points: number[][] = [[], [], [], []];

  for (const pair of pairs) {
    const code = pair.code;
    const value = parseFloat(pair.value);

    if (code >= 10 && code <= 13) {
      points[code - 10][0] = value;
    } else if (code >= 20 && code <= 23) {
      points[code - 20][1] = value;
    } else if (code >= 30 && code <= 33) {
      points[code - 30][2] = value;
    }
  }

  const vertices = points
    .filter((p) => p.length > 0)
    .map((p): DXFPoint => (p[2] !== undefined ? [p[0], p[1], p[2]] : [p[0], p[1]]));

  return {
    ...base,
    type: '3DFACE' as const,
    vertices: vertices as [DXFPoint, DXFPoint, DXFPoint] | [DXFPoint, DXFPoint, DXFPoint, DXFPoint]
  };
}

function parseSolid(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  const points: number[][] = [[], [], [], []];

  for (const pair of pairs) {
    const code = pair.code;
    const value = parseFloat(pair.value);

    if (code >= 10 && code <= 13) {
      points[code - 10][0] = value;
    } else if (code >= 20 && code <= 23) {
      points[code - 20][1] = value;
    } else if (code >= 30 && code <= 33) {
      points[code - 30][2] = value;
    }
  }

  const vertices = points
    .filter((p) => p.length > 0)
    .map((p): DXFPoint => (p[2] !== undefined ? [p[0], p[1], p[2]] : [p[0], p[1]]));

  return {
    ...base,
    type: 'SOLID' as const,
    vertices: vertices as [DXFPoint, DXFPoint, DXFPoint] | [DXFPoint, DXFPoint, DXFPoint, DXFPoint]
  };
}

function parseHatch(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let patternName = '';
  let solid = false;
  const boundaryPaths: DXFHatchBoundaryPath[] = [];

  let numberOfPaths = 0;
  let currentPathIndex = -1;
  let pathType = 0;
  let currentEdges: DXFHatchEdge[] = [];
  let polylineVertices: DXFPolylineVertex[] = [];

  let phase: 'header' | 'path' | 'edges' = 'header';
  let edgeType = 0;
  let edgeData: Record<number, number> = {};

  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
    const pair = pairs[pairIndex];

    if (phase === 'header') {
      switch (pair.code) {
        case 2:
          patternName = pair.value;
          break;
        case 70:
          solid = parseInt(pair.value, 10) === 1;
          break;
        case 91:
          numberOfPaths = parseInt(pair.value, 10);
          if (numberOfPaths > 0) {
            phase = 'path';
          }
          break;
      }
      continue;
    }

    if (phase === 'path') {
      if (pair.code === 92) {
        // Flush previous path
        if (currentPathIndex >= 0) {
          flushBoundaryPath(boundaryPaths, pathType, polylineVertices, currentEdges);
        }
        currentPathIndex++;
        pathType = parseInt(pair.value, 10);
        currentEdges = [];
        polylineVertices = [];

        if ((pathType & 2) !== 0) {
          // Polyline boundary path
          phase = 'path';
        } else {
          phase = 'edges';
        }
        continue;
      }

      // Polyline boundary path vertex data
      if (pair.code === 10) {
        polylineVertices.push({x: parseFloat(pair.value), y: 0, bulge: 0});
      } else if (pair.code === 20 && polylineVertices.length > 0) {
        polylineVertices[polylineVertices.length - 1].y = parseFloat(pair.value);
      } else if (pair.code === 42 && polylineVertices.length > 0) {
        polylineVertices[polylineVertices.length - 1].bulge = parseFloat(pair.value);
      }
    }

    if (phase === 'edges') {
      if (pair.code === 72) {
        // Edge type
        if (Object.keys(edgeData).length > 0) {
          const edge = buildEdge(edgeType, edgeData);
          if (edge) {
            currentEdges.push(edge);
          }
        }
        edgeType = parseInt(pair.value, 10);
        edgeData = {};
        continue;
      }

      if (pair.code === 92) {
        // Start of new boundary path
        if (Object.keys(edgeData).length > 0) {
          const edge = buildEdge(edgeType, edgeData);
          if (edge) {
            currentEdges.push(edge);
          }
          edgeData = {};
        }
        flushBoundaryPath(boundaryPaths, pathType, polylineVertices, currentEdges);

        currentPathIndex++;
        pathType = parseInt(pair.value, 10);
        currentEdges = [];
        polylineVertices = [];

        if ((pathType & 2) !== 0) {
          phase = 'path';
        }
        continue;
      }

      // Collect edge data by code
      edgeData[pair.code] = parseFloat(pair.value);
    }
  }

  // Flush last edge and path
  if (Object.keys(edgeData).length > 0) {
    const edge = buildEdge(edgeType, edgeData);
    if (edge) {
      currentEdges.push(edge);
    }
  }
  if (currentPathIndex >= 0) {
    flushBoundaryPath(boundaryPaths, pathType, polylineVertices, currentEdges);
  }

  return {
    ...base,
    type: 'HATCH' as const,
    patternName,
    solid,
    boundaryPaths
  };
}

function flushBoundaryPath(
  paths: DXFHatchBoundaryPath[],
  pathType: number,
  vertices: DXFPolylineVertex[],
  edges: DXFHatchEdge[]
): void {
  if ((pathType & 2) !== 0 && vertices.length > 0) {
    paths.push({type: 'polyline', vertices, closed: true});
  } else if (edges.length > 0) {
    paths.push({type: 'edges', edges});
  }
}

function buildEdge(edgeType: number, data: Record<number, number>): DXFHatchEdge | null {
  switch (edgeType) {
    case 1:
      // Line edge
      return {
        type: 'line',
        startPoint: [data[10] || 0, data[20] || 0],
        endPoint: [data[11] || 0, data[21] || 0]
      };
    case 2:
      // Arc edge
      return {
        type: 'arc',
        center: [data[10] || 0, data[20] || 0],
        radius: data[40] || 0,
        startAngle: data[50] || 0,
        endAngle: data[51] || 0,
        counterClockwise: (data[73] || 0) !== 0
      };
    case 3:
      // Ellipse edge
      return {
        type: 'ellipse',
        center: [data[10] || 0, data[20] || 0],
        majorAxisEndPoint: [data[11] || 0, data[21] || 0],
        ratioMinorToMajor: data[40] || 1,
        startAngle: data[50] || 0,
        endAngle: data[51] || Math.PI * 2,
        counterClockwise: (data[73] || 0) !== 0
      };
    default:
      return null;
  }
}

function parseDimension(pairs: DXFGroupPair[]): DXFEntity {
  const base = parseBaseProperties(pairs);
  let dimensionType = 0;
  let text: string | undefined;

  for (const pair of pairs) {
    switch (pair.code) {
      case 70:
        dimensionType = parseInt(pair.value, 10);
        break;
      case 1:
        text = pair.value;
        break;
    }
  }

  return {
    ...base,
    type: 'DIMENSION' as const,
    definitionPoint: readPoint(pairs, 10),
    middleOfText: readPoint(pairs, 11),
    dimensionType,
    text,
    linearPoint: hasCode(pairs, 13) ? readPoint(pairs, 13) : undefined
  };
}

function hasCode(pairs: DXFGroupPair[], code: number): boolean {
  return pairs.some((p) => p.code === code);
}
