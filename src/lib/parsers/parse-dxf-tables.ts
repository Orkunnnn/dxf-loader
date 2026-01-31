// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {DXFGroupPair, DXFTables, DXFLayer, DXFLineType, DXFStyle} from '../types';

/**
 * Parse the TABLES section for layers, line types, and styles
 */
export function parseTables(pairs: DXFGroupPair[]): DXFTables {
  const tables: DXFTables = {
    layers: new Map(),
    lineTypes: new Map(),
    styles: new Map()
  };

  let currentTableType: string | null = null;
  let currentEntry: Record<string, unknown> | null = null;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];

    if (pair.code === 0 && pair.value === 'TABLE') {
      // Next pair (code 2) identifies table type
      if (i + 1 < pairs.length && pairs[i + 1].code === 2) {
        currentTableType = pairs[i + 1].value;
        i++;
      }
      continue;
    }

    if (pair.code === 0 && pair.value === 'ENDTAB') {
      if (currentEntry) {
        storeEntry(tables, currentTableType, currentEntry);
        currentEntry = null;
      }
      currentTableType = null;
      continue;
    }

    if (pair.code === 0) {
      // Start of a new table entry
      if (currentEntry) {
        storeEntry(tables, currentTableType, currentEntry);
      }
      currentEntry = {_type: pair.value};
      continue;
    }

    if (currentEntry) {
      applyTablePair(currentEntry, pair);
    }
  }

  if (currentEntry) {
    storeEntry(tables, currentTableType, currentEntry);
  }

  return tables;
}

function applyTablePair(entry: Record<string, unknown>, pair: DXFGroupPair): void {
  switch (pair.code) {
    case 2:
      entry.name = pair.value;
      break;
    case 6:
      entry.lineType = pair.value;
      break;
    case 7:
      entry.fontName = pair.value;
      break;
    case 3:
      entry.description = pair.value;
      break;
    case 40:
      entry.height = parseFloat(pair.value);
      break;
    case 62:
      entry.colorIndex = parseInt(pair.value, 10);
      break;
    case 70:
      entry.flags = parseInt(pair.value, 10);
      break;
    default:
      break;
  }
}

function storeEntry(
  tables: DXFTables,
  tableType: string | null,
  entry: Record<string, unknown>
): void {
  if (!tableType || !entry.name) {
    return;
  }

  const name = entry.name as string;

  switch (tableType) {
    case 'LAYER': {
      const flags = (entry.flags as number) || 0;
      const layer: DXFLayer = {
        name,
        colorIndex: (entry.colorIndex as number) || 7,
        flags,
        lineType: entry.lineType as string | undefined,
        frozen: (flags & 1) !== 0,
        off: ((entry.colorIndex as number) || 0) < 0
      };
      tables.layers.set(name, layer);
      break;
    }
    case 'LTYPE': {
      const lineType: DXFLineType = {
        name,
        description: (entry.description as string) || '',
        elements: []
      };
      tables.lineTypes.set(name, lineType);
      break;
    }
    case 'STYLE': {
      const style: DXFStyle = {
        name,
        fontName: (entry.fontName as string) || '',
        height: (entry.height as number) || 0
      };
      tables.styles.set(name, style);
      break;
    }
    default:
      break;
  }
}
