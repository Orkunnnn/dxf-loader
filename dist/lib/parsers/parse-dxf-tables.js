// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
/**
 * Parse the TABLES section for layers, line types, and styles
 */
export function parseTables(pairs) {
    const tables = {
        layers: new Map(),
        lineTypes: new Map(),
        styles: new Map()
    };
    let currentTableType = null;
    let currentEntry = null;
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
            currentEntry = { _type: pair.value };
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
function applyTablePair(entry, pair) {
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
function storeEntry(tables, tableType, entry) {
    if (!tableType || !entry.name) {
        return;
    }
    const name = entry.name;
    switch (tableType) {
        case 'LAYER': {
            const flags = entry.flags || 0;
            const layer = {
                name,
                colorIndex: entry.colorIndex || 7,
                flags,
                lineType: entry.lineType,
                frozen: (flags & 1) !== 0,
                off: (entry.colorIndex || 0) < 0
            };
            tables.layers.set(name, layer);
            break;
        }
        case 'LTYPE': {
            const lineType = {
                name,
                description: entry.description || '',
                elements: []
            };
            tables.lineTypes.set(name, lineType);
            break;
        }
        case 'STYLE': {
            const style = {
                name,
                fontName: entry.fontName || '',
                height: entry.height || 0
            };
            tables.styles.set(name, style);
            break;
        }
        default:
            break;
    }
}
//# sourceMappingURL=parse-dxf-tables.js.map