// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {DXFGroupPair, DXFHeader} from '../types';

/**
 * Parse the HEADER section for key variables
 */
export function parseHeader(pairs: DXFGroupPair[]): DXFHeader {
  const header: DXFHeader = {};

  let currentVariable: string | null = null;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];

    if (pair.code === 9) {
      currentVariable = pair.value;
      continue;
    }

    if (!currentVariable) {
      continue;
    }

    switch (currentVariable) {
      case '$ACADVER':
        if (pair.code === 1) {
          header.version = pair.value;
        }
        break;

      case '$INSUNITS':
        if (pair.code === 70) {
          header.insertionUnits = parseInt(pair.value, 10);
        }
        break;

      case '$EXTMIN':
        if (pair.code === 10) {
          header.extMin = [parseFloat(pair.value), 0, 0];
        } else if (pair.code === 20 && header.extMin) {
          header.extMin[1] = parseFloat(pair.value);
        } else if (pair.code === 30 && header.extMin) {
          header.extMin[2] = parseFloat(pair.value);
        }
        break;

      case '$EXTMAX':
        if (pair.code === 10) {
          header.extMax = [parseFloat(pair.value), 0, 0];
        } else if (pair.code === 20 && header.extMax) {
          header.extMax[1] = parseFloat(pair.value);
        } else if (pair.code === 30 && header.extMax) {
          header.extMax[2] = parseFloat(pair.value);
        }
        break;

      default:
        break;
    }
  }

  return header;
}
