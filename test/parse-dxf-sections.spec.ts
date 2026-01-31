// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import test from 'tape-promise/tape';
import {tokenizeDXF, parseSections} from '@loaders.gl/dxf/lib/parsers/parse-dxf-sections';

const MINIMAL_DXF = `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1027
  0
ENDSEC
  0
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
10.0
 21
5.0
  0
ENDSEC
  0
EOF`;

test('tokenizeDXF#basic tokenization', (t) => {
  const pairs = tokenizeDXF(MINIMAL_DXF);
  t.ok(pairs.length > 0, 'produces group pairs');
  t.equal(pairs[0].code, 0, 'first code is 0');
  t.equal(pairs[0].value, 'SECTION', 'first value is SECTION');

  const lastPair = pairs[pairs.length - 1];
  t.equal(lastPair.code, 0, 'last code is 0');
  t.equal(lastPair.value, 'EOF', 'last value is EOF');
  t.end();
});

test('parseSections#splits into sections', (t) => {
  const pairs = tokenizeDXF(MINIMAL_DXF);
  const sections = parseSections(pairs);

  t.ok(sections.header.length > 0, 'has header pairs');
  t.ok(sections.entities.length > 0, 'has entity pairs');
  t.equal(sections.tables.length, 0, 'no tables section');
  t.equal(sections.blocks.length, 0, 'no blocks section');
  t.end();
});

test('tokenizeDXF#handles CRLF line endings', (t) => {
  const crlfText = '  0\r\nSECTION\r\n  2\r\nHEADER\r\n  0\r\nENDSEC\r\n  0\r\nEOF';
  const pairs = tokenizeDXF(crlfText);
  t.equal(pairs[0].value, 'SECTION', 'correctly parses CRLF');
  t.end();
});

test('tokenizeDXF#handles empty input', (t) => {
  const pairs = tokenizeDXF('');
  t.equal(pairs.length, 0, 'empty input produces no pairs');
  t.end();
});
