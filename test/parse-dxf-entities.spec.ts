// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import test from 'tape-promise/tape';
import {parseEntitiesWithVertices} from '@loaders.gl/dxf/lib/parsers/parse-dxf-entities';
import {tokenizeDXF, parseSections} from '@loaders.gl/dxf/lib/parsers/parse-dxf-sections';

test('parseEntities#LINE entity', (t) => {
  const dxf = `  0
SECTION
  2
ENTITIES
  0
LINE
  5
1A
  8
TestLayer
 10
1.0
 20
2.0
 30
3.0
 11
4.0
 21
5.0
 31
6.0
  0
ENDSEC
  0
EOF`;

  const pairs = tokenizeDXF(dxf);
  const sections = parseSections(pairs);
  const entities = parseEntitiesWithVertices(sections.entities);

  t.equal(entities.length, 1, 'has 1 entity');
  const entity = entities[0];
  t.equal(entity.type, 'LINE', 'type is LINE');
  if (entity.type === 'LINE') {
    t.equal(entity.layer, 'TestLayer', 'layer is TestLayer');
    t.deepEqual(entity.startPoint, [1, 2, 3], 'start point correct');
    t.deepEqual(entity.endPoint, [4, 5, 6], 'end point correct');
    t.equal(entity.handle, '1A', 'handle is correct');
  }
  t.end();
});

test('parseEntities#CIRCLE entity', (t) => {
  const dxf = `  0
SECTION
  2
ENTITIES
  0
CIRCLE
  8
0
 10
5.0
 20
5.0
 40
3.0
  0
ENDSEC
  0
EOF`;

  const pairs = tokenizeDXF(dxf);
  const sections = parseSections(pairs);
  const entities = parseEntitiesWithVertices(sections.entities);

  t.equal(entities.length, 1, 'has 1 entity');
  const entity = entities[0];
  t.equal(entity.type, 'CIRCLE', 'type is CIRCLE');
  if (entity.type === 'CIRCLE') {
    t.deepEqual(entity.center, [5, 5], 'center correct');
    t.equal(entity.radius, 3, 'radius correct');
  }
  t.end();
});

test('parseEntities#LWPOLYLINE entity', (t) => {
  const dxf = `  0
SECTION
  2
ENTITIES
  0
LWPOLYLINE
  8
0
 70
1
 10
0.0
 20
0.0
 10
10.0
 20
0.0
 10
10.0
 20
10.0
  0
ENDSEC
  0
EOF`;

  const pairs = tokenizeDXF(dxf);
  const sections = parseSections(pairs);
  const entities = parseEntitiesWithVertices(sections.entities);

  t.equal(entities.length, 1, 'has 1 entity');
  const entity = entities[0];
  t.equal(entity.type, 'LWPOLYLINE', 'type is LWPOLYLINE');
  if (entity.type === 'LWPOLYLINE') {
    t.equal(entity.vertices.length, 3, 'has 3 vertices');
    t.equal(entity.closed, true, 'is closed');
    t.equal(entity.vertices[0].x, 0, 'first vertex x');
    t.equal(entity.vertices[0].y, 0, 'first vertex y');
  }
  t.end();
});

test('parseEntities#INSERT entity', (t) => {
  const dxf = `  0
SECTION
  2
ENTITIES
  0
INSERT
  8
0
  2
MYBLOCK
 10
5.0
 20
10.0
 41
2.0
 42
3.0
 50
45.0
  0
ENDSEC
  0
EOF`;

  const pairs = tokenizeDXF(dxf);
  const sections = parseSections(pairs);
  const entities = parseEntitiesWithVertices(sections.entities);

  t.equal(entities.length, 1, 'has 1 entity');
  const entity = entities[0];
  t.equal(entity.type, 'INSERT', 'type is INSERT');
  if (entity.type === 'INSERT') {
    t.equal(entity.blockName, 'MYBLOCK', 'blockName correct');
    t.deepEqual(entity.insertionPoint, [5, 10], 'insertion point correct');
    t.equal(entity.scaleX, 2, 'scaleX correct');
    t.equal(entity.scaleY, 3, 'scaleY correct');
    t.equal(entity.rotation, 45, 'rotation correct');
  }
  t.end();
});

test('parseEntities#multiple entity types', (t) => {
  const dxf = `  0
SECTION
  2
ENTITIES
  0
LINE
  8
0
 10
0.0
 20
0.0
 11
1.0
 21
1.0
  0
POINT
  8
0
 10
5.0
 20
5.0
  0
TEXT
  8
0
 10
0.0
 20
0.0
 40
1.0
  1
Hello
  0
ENDSEC
  0
EOF`;

  const pairs = tokenizeDXF(dxf);
  const sections = parseSections(pairs);
  const entities = parseEntitiesWithVertices(sections.entities);

  t.equal(entities.length, 3, 'has 3 entities');
  t.equal(entities[0].type, 'LINE', 'first is LINE');
  t.equal(entities[1].type, 'POINT', 'second is POINT');
  t.equal(entities[2].type, 'TEXT', 'third is TEXT');
  if (entities[2].type === 'TEXT') {
    t.equal(entities[2].text, 'Hello', 'text content correct');
  }
  t.end();
});
