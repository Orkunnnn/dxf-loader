// loaders.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
/**
 * Tokenize DXF text into group code / value pairs
 */
export function tokenizeDXF(text) {
    const lines = text.split(/\r?\n/);
    const pairs = [];
    for (let i = 0; i < lines.length - 1; i += 2) {
        const codeLine = lines[i].trim();
        if (codeLine === '') {
            continue;
        }
        const code = parseInt(codeLine, 10);
        if (Number.isNaN(code)) {
            continue;
        }
        const value = lines[i + 1].trim();
        pairs.push({ code, value });
    }
    return pairs;
}
/**
 * Split tokenized pairs into named sections
 */
export function parseSections(pairs) {
    const sections = {
        header: [],
        tables: [],
        blocks: [],
        entities: []
    };
    let currentSection = null;
    let sectionPairs = [];
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if (pair.code === 0 && pair.value === 'EOF') {
            break;
        }
        if (pair.code === 0 && pair.value === 'SECTION') {
            // Next pair should be section name (code 2)
            if (i + 1 < pairs.length && pairs[i + 1].code === 2) {
                currentSection = pairs[i + 1].value.toUpperCase();
                sectionPairs = [];
                i++; // Skip the name pair
            }
            continue;
        }
        if (pair.code === 0 && pair.value === 'ENDSEC') {
            if (currentSection) {
                const key = currentSection.toLowerCase();
                if (key in sections) {
                    sections[key] = sectionPairs;
                }
            }
            currentSection = null;
            continue;
        }
        if (currentSection) {
            sectionPairs.push(pair);
        }
    }
    return sections;
}
//# sourceMappingURL=parse-dxf-sections.js.map