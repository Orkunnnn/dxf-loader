// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
import { parseEntitiesWithVertices } from './parse-dxf-entities';
/**
 * Parse the BLOCKS section into block definitions
 */
export function parseBlocks(pairs) {
    const blocks = new Map();
    let currentBlockName = null;
    let currentBasePoint = [0, 0];
    let blockEntityPairs = [];
    let collectingEntities = false;
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if (pair.code === 0 && pair.value === 'BLOCK') {
            currentBlockName = null;
            currentBasePoint = [0, 0];
            blockEntityPairs = [];
            collectingEntities = false;
            continue;
        }
        if (pair.code === 0 && pair.value === 'ENDBLK') {
            if (currentBlockName) {
                const entities = parseEntitiesWithVertices(blockEntityPairs);
                blocks.set(currentBlockName, {
                    name: currentBlockName,
                    basePoint: currentBasePoint,
                    entities
                });
            }
            currentBlockName = null;
            collectingEntities = false;
            continue;
        }
        if (!collectingEntities) {
            // Still reading block header
            if (pair.code === 2) {
                currentBlockName = pair.value;
            }
            else if (pair.code === 10) {
                currentBasePoint = [parseFloat(pair.value), currentBasePoint[1]];
            }
            else if (pair.code === 20) {
                currentBasePoint = [currentBasePoint[0], parseFloat(pair.value)];
            }
            else if (pair.code === 0) {
                // First entity in block
                collectingEntities = true;
                blockEntityPairs.push(pair);
            }
        }
        else {
            blockEntityPairs.push(pair);
        }
    }
    return blocks;
}
//# sourceMappingURL=parse-dxf-blocks.js.map