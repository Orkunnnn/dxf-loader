// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import test from 'tape-promise/tape';
import type {
  DXFLineEntity,
  DXFCircleEntity,
  DXFPointEntity,
  DXFSolidEntity
} from '@loaders.gl/dxf/lib/types';
import {convertLine} from '@loaders.gl/dxf/lib/converters/convert-line';
import {convertCircle} from '@loaders.gl/dxf/lib/converters/convert-circle';
import {convertPoint} from '@loaders.gl/dxf/lib/converters/convert-point';
import {convertSolid} from '@loaders.gl/dxf/lib/converters/convert-solid';

test('convertLine#basic conversion', (t) => {
  const entity: DXFLineEntity = {
    type: 'LINE',
    layer: '0',
    visible: true,
    startPoint: [0, 0],
    endPoint: [10, 5]
  };

  const feature = convertLine(entity, true);
  t.equal(feature.type, 'Feature', 'is Feature');
  t.equal(feature.geometry.type, 'LineString', 'geometry is LineString');
  t.deepEqual(
    feature.geometry.coordinates,
    [
      [0, 0],
      [10, 5]
    ],
    'coordinates correct'
  );
  t.end();
});

test('convertLine#3D coordinates', (t) => {
  const entity: DXFLineEntity = {
    type: 'LINE',
    layer: '0',
    visible: true,
    startPoint: [0, 0, 1],
    endPoint: [10, 5, 2]
  };

  const feature3D = convertLine(entity, true);
  t.deepEqual(
    feature3D.geometry.coordinates,
    [
      [0, 0, 1],
      [10, 5, 2]
    ],
    '3D coordinates preserved'
  );

  const feature2D = convertLine(entity, false);
  t.deepEqual(
    feature2D.geometry.coordinates,
    [
      [0, 0],
      [10, 5]
    ],
    '2D strips Z'
  );
  t.end();
});

test('convertCircle#tessellation', (t) => {
  const entity: DXFCircleEntity = {
    type: 'CIRCLE',
    layer: '0',
    visible: true,
    center: [5, 5],
    radius: 3
  };

  const feature = convertCircle(entity, 36, true);
  t.equal(feature.geometry.type, 'Polygon', 'is Polygon');
  t.equal(feature.geometry.coordinates[0].length, 37, '36 segments + closing point');

  // First and last point should be the same (closed ring)
  const ring = feature.geometry.coordinates[0];
  t.ok(Math.abs(ring[0][0] - ring[ring.length - 1][0]) < 1e-10, 'ring is closed (x)');
  t.ok(Math.abs(ring[0][1] - ring[ring.length - 1][1]) < 1e-10, 'ring is closed (y)');

  // Check a known point: at angle 0, should be center + (radius, 0)
  t.ok(Math.abs(ring[0][0] - 8) < 1e-10, 'first point at (center.x + radius, center.y)');
  t.ok(Math.abs(ring[0][1] - 5) < 1e-10, 'first point y is center.y');
  t.end();
});

test('convertPoint#basic conversion', (t) => {
  const entity: DXFPointEntity = {
    type: 'POINT',
    layer: '0',
    visible: true,
    position: [3, 4]
  };

  const feature = convertPoint(entity, true);
  t.equal(feature.geometry.type, 'Point', 'is Point');
  t.deepEqual(feature.geometry.coordinates, [3, 4], 'coordinates correct');
  t.end();
});

test('convertSolid#vertex reorder', (t) => {
  // DXF SOLID vertices: 1, 2, 3, 4 but polygon order should be 1, 2, 4, 3
  const entity: DXFSolidEntity = {
    type: 'SOLID',
    layer: '0',
    visible: true,
    vertices: [
      [0, 0],
      [10, 0],
      [0, 10],
      [10, 10]
    ]
  };

  const feature = convertSolid(entity, true);
  t.equal(feature.geometry.type, 'Polygon', 'is Polygon');
  const ring = feature.geometry.coordinates[0];
  // Expected order: [0,0], [10,0], [10,10], [0,10], [0,0]
  t.deepEqual(ring[0], [0, 0], 'vertex 1');
  t.deepEqual(ring[1], [10, 0], 'vertex 2');
  t.deepEqual(ring[2], [10, 10], 'vertex 4 (swapped)');
  t.deepEqual(ring[3], [0, 10], 'vertex 3 (swapped)');
  t.deepEqual(ring[4], [0, 0], 'ring closed');
  t.end();
});
