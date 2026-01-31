// node_modules/@loaders.gl/worker-utils/dist/lib/node/worker_threads-browser.js
var parentPort = null;

// node_modules/@loaders.gl/worker-utils/dist/lib/worker-utils/get-transfer-list.js
function getTransferList(object, recursive = true, transfers) {
  const transfersSet = transfers || /* @__PURE__ */ new Set();
  if (!object) {
  } else if (isTransferable(object)) {
    transfersSet.add(object);
  } else if (isTransferable(object.buffer)) {
    transfersSet.add(object.buffer);
  } else if (ArrayBuffer.isView(object)) {
  } else if (recursive && typeof object === "object") {
    for (const key in object) {
      getTransferList(object[key], recursive, transfersSet);
    }
  }
  return transfers === void 0 ? Array.from(transfersSet) : [];
}
function isTransferable(object) {
  if (!object) {
    return false;
  }
  if (object instanceof ArrayBuffer) {
    return true;
  }
  if (typeof MessagePort !== "undefined" && object instanceof MessagePort) {
    return true;
  }
  if (typeof ImageBitmap !== "undefined" && object instanceof ImageBitmap) {
    return true;
  }
  if (typeof OffscreenCanvas !== "undefined" && object instanceof OffscreenCanvas) {
    return true;
  }
  return false;
}

// node_modules/@loaders.gl/worker-utils/dist/lib/worker-farm/worker-body.js
async function getParentPort() {
  return parentPort;
}
var onMessageWrapperMap = /* @__PURE__ */ new Map();
var WorkerBody = class {
  /** Check that we are actually in a worker thread */
  static async inWorkerThread() {
    return typeof self !== "undefined" || Boolean(await getParentPort());
  }
  /*
   * (type: WorkerMessageType, payload: WorkerMessagePayload) => any
   */
  static set onmessage(onMessage) {
    async function handleMessage(message) {
      const parentPort2 = await getParentPort();
      const { type, payload } = parentPort2 ? message : message.data;
      onMessage(type, payload);
    }
    getParentPort().then((parentPort2) => {
      if (parentPort2) {
        parentPort2.on("message", (message) => {
          handleMessage(message);
        });
        parentPort2.on("exit", () => console.debug("Node worker closing"));
      } else {
        globalThis.onmessage = handleMessage;
      }
    });
  }
  static async addEventListener(onMessage) {
    let onMessageWrapper = onMessageWrapperMap.get(onMessage);
    if (!onMessageWrapper) {
      onMessageWrapper = async (message) => {
        if (!isKnownMessage(message)) {
          return;
        }
        const parentPort3 = await getParentPort();
        const { type, payload } = parentPort3 ? message : message.data;
        onMessage(type, payload);
      };
    }
    const parentPort2 = await getParentPort();
    if (parentPort2) {
      console.error("not implemented");
    } else {
      globalThis.addEventListener("message", onMessageWrapper);
    }
  }
  static async removeEventListener(onMessage) {
    const onMessageWrapper = onMessageWrapperMap.get(onMessage);
    onMessageWrapperMap.delete(onMessage);
    const parentPort2 = await getParentPort();
    if (parentPort2) {
      console.error("not implemented");
    } else {
      globalThis.removeEventListener("message", onMessageWrapper);
    }
  }
  /**
   * Send a message from a worker to creating thread (main thread)
   * @param type
   * @param payload
   */
  static async postMessage(type, payload) {
    const data = { source: "loaders.gl", type, payload };
    const transferList = getTransferList(payload);
    const parentPort2 = await getParentPort();
    if (parentPort2) {
      parentPort2.postMessage(data, transferList);
    } else {
      globalThis.postMessage(data, transferList);
    }
  }
};
function isKnownMessage(message) {
  const { type, data } = message;
  return type === "message" && data && typeof data.source === "string" && data.source.startsWith("loaders.gl");
}

// node_modules/@loaders.gl/loader-utils/dist/lib/worker-loader-utils/create-loader-worker.js
var requestId = 0;
async function createLoaderWorker(loader) {
  if (!await WorkerBody.inWorkerThread()) {
    return;
  }
  WorkerBody.onmessage = async (type, payload) => {
    switch (type) {
      case "process":
        try {
          const { input, options = {}, context = {} } = payload;
          const result = await parseData({
            loader,
            arrayBuffer: input,
            options,
            // @ts-expect-error fetch missing
            context: {
              ...context,
              _parse: parseOnMainThread
            }
          });
          WorkerBody.postMessage("done", { result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          WorkerBody.postMessage("error", { error: message });
        }
        break;
      default:
    }
  };
}
function parseOnMainThread(arrayBuffer, loader, options, context) {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const onMessage = (type, payload2) => {
      if (payload2.id !== id) {
        return;
      }
      switch (type) {
        case "done":
          WorkerBody.removeEventListener(onMessage);
          resolve(payload2.result);
          break;
        case "error":
          WorkerBody.removeEventListener(onMessage);
          reject(payload2.error);
          break;
        default:
      }
    };
    WorkerBody.addEventListener(onMessage);
    const payload = { id, input: arrayBuffer, options };
    WorkerBody.postMessage("process", payload);
  });
}
async function parseData({ loader, arrayBuffer, options, context }) {
  let data;
  let parser;
  if (loader.parseSync || loader.parse) {
    data = arrayBuffer;
    parser = loader.parseSync || loader.parse;
  } else if (loader.parseTextSync) {
    const textDecoder = new TextDecoder();
    data = textDecoder.decode(arrayBuffer);
    parser = loader.parseTextSync;
  } else {
    throw new Error(`Could not load data with ${loader.name} loader`);
  }
  options = {
    ...options,
    modules: loader && loader.options && loader.options.modules || {},
    core: {
      ...options.core,
      worker: false
    }
  };
  return await parser(data, { ...options }, context, loader);
}

// src/lib/parsers/parse-dxf-sections.ts
function tokenizeDXF(text) {
  const lines = text.split(/\r?\n/);
  const pairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const codeLine = lines[i].trim();
    if (codeLine === "") {
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
function parseSections(pairs) {
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
    if (pair.code === 0 && pair.value === "EOF") {
      break;
    }
    if (pair.code === 0 && pair.value === "SECTION") {
      if (i + 1 < pairs.length && pairs[i + 1].code === 2) {
        currentSection = pairs[i + 1].value.toUpperCase();
        sectionPairs = [];
        i++;
      }
      continue;
    }
    if (pair.code === 0 && pair.value === "ENDSEC") {
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

// src/lib/parsers/parse-dxf-header.ts
function parseHeader(pairs) {
  const header = {};
  let currentVariable = null;
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
      case "$ACADVER":
        if (pair.code === 1) {
          header.version = pair.value;
        }
        break;
      case "$INSUNITS":
        if (pair.code === 70) {
          header.insertionUnits = parseInt(pair.value, 10);
        }
        break;
      case "$EXTMIN":
        if (pair.code === 10) {
          header.extMin = [parseFloat(pair.value), 0, 0];
        } else if (pair.code === 20 && header.extMin) {
          header.extMin[1] = parseFloat(pair.value);
        } else if (pair.code === 30 && header.extMin) {
          header.extMin[2] = parseFloat(pair.value);
        }
        break;
      case "$EXTMAX":
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

// src/lib/parsers/parse-dxf-tables.ts
function parseTables(pairs) {
  const tables = {
    layers: /* @__PURE__ */ new Map(),
    lineTypes: /* @__PURE__ */ new Map(),
    styles: /* @__PURE__ */ new Map()
  };
  let currentTableType = null;
  let currentEntry = null;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair.code === 0 && pair.value === "TABLE") {
      if (i + 1 < pairs.length && pairs[i + 1].code === 2) {
        currentTableType = pairs[i + 1].value;
        i++;
      }
      continue;
    }
    if (pair.code === 0 && pair.value === "ENDTAB") {
      if (currentEntry) {
        storeEntry(tables, currentTableType, currentEntry);
        currentEntry = null;
      }
      currentTableType = null;
      continue;
    }
    if (pair.code === 0) {
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
    case "LAYER": {
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
    case "LTYPE": {
      const lineType = {
        name,
        description: entry.description || "",
        elements: []
      };
      tables.lineTypes.set(name, lineType);
      break;
    }
    case "STYLE": {
      const style = {
        name,
        fontName: entry.fontName || "",
        height: entry.height || 0
      };
      tables.styles.set(name, style);
      break;
    }
    default:
      break;
  }
}

// src/lib/parsers/parse-dxf-entities.ts
function parseEntitiesWithVertices(pairs) {
  const entities = [];
  let i = 0;
  while (i < pairs.length) {
    if (pairs[i].code !== 0) {
      i++;
      continue;
    }
    const entityType = pairs[i].value;
    i++;
    const entityPairs = [];
    if (entityType === "POLYLINE") {
      while (i < pairs.length && pairs[i].code !== 0) {
        entityPairs.push(pairs[i]);
        i++;
      }
      const vertices = [];
      while (i < pairs.length) {
        if (pairs[i].code === 0 && pairs[i].value === "VERTEX") {
          i++;
          const vertexPairs = [];
          while (i < pairs.length && pairs[i].code !== 0) {
            vertexPairs.push(pairs[i]);
            i++;
          }
          vertices.push(parseVertexPairs(vertexPairs));
        } else if (pairs[i].code === 0 && pairs[i].value === "SEQEND") {
          i++;
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
function parseVertexPairs(pairs) {
  let x = 0;
  let y = 0;
  let z;
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
  return { x, y, z, bulge };
}
function buildPolylineEntity(pairs, vertices) {
  const base = parseBaseProperties(pairs);
  let flags = 0;
  for (const pair of pairs) {
    if (pair.code === 70) {
      flags = parseInt(pair.value, 10);
    }
  }
  return {
    ...base,
    type: "POLYLINE",
    vertices,
    closed: (flags & 1) !== 0
  };
}
function buildEntity(type, pairs) {
  switch (type) {
    case "LINE":
      return parseLine(pairs);
    case "POINT":
      return parsePoint(pairs);
    case "CIRCLE":
      return parseCircle(pairs);
    case "ARC":
      return parseArc(pairs);
    case "ELLIPSE":
      return parseEllipse(pairs);
    case "LWPOLYLINE":
      return parseLWPolyline(pairs);
    case "SPLINE":
      return parseSpline(pairs);
    case "TEXT":
      return parseText(pairs);
    case "MTEXT":
      return parseMText(pairs);
    case "INSERT":
      return parseInsert(pairs);
    case "3DFACE":
      return parse3DFace(pairs);
    case "SOLID":
      return parseSolid(pairs);
    case "HATCH":
      return parseHatch(pairs);
    case "DIMENSION":
      return parseDimension(pairs);
    default:
      return null;
  }
}
function parseBaseProperties(pairs) {
  let handle;
  let layer = "0";
  let colorIndex;
  let lineType;
  let lineWeight;
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
  return { handle, layer, colorIndex, lineType, lineWeight, visible };
}
function readPoint(pairs, xCode) {
  let x = 0;
  let y = 0;
  let z;
  for (const pair of pairs) {
    if (pair.code === xCode) {
      x = parseFloat(pair.value);
    } else if (pair.code === xCode + 10) {
      y = parseFloat(pair.value);
    } else if (pair.code === xCode + 20) {
      z = parseFloat(pair.value);
    }
  }
  return z !== void 0 && z !== 0 ? [x, y, z] : [x, y];
}
function parseLine(pairs) {
  const base = parseBaseProperties(pairs);
  return {
    ...base,
    type: "LINE",
    startPoint: readPoint(pairs, 10),
    endPoint: readPoint(pairs, 11)
  };
}
function parsePoint(pairs) {
  const base = parseBaseProperties(pairs);
  return {
    ...base,
    type: "POINT",
    position: readPoint(pairs, 10)
  };
}
function parseCircle(pairs) {
  const base = parseBaseProperties(pairs);
  let radius = 0;
  for (const pair of pairs) {
    if (pair.code === 40) {
      radius = parseFloat(pair.value);
    }
  }
  return {
    ...base,
    type: "CIRCLE",
    center: readPoint(pairs, 10),
    radius
  };
}
function parseArc(pairs) {
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
    type: "ARC",
    center: readPoint(pairs, 10),
    radius,
    startAngle,
    endAngle
  };
}
function parseEllipse(pairs) {
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
    type: "ELLIPSE",
    center: readPoint(pairs, 10),
    majorAxisEndPoint: readPoint(pairs, 11),
    ratioMinorToMajor,
    startParameter,
    endParameter
  };
}
function parseLWPolyline(pairs) {
  const base = parseBaseProperties(pairs);
  const vertices = [];
  let flags = 0;
  let elevation;
  let currentVertex = null;
  for (const pair of pairs) {
    switch (pair.code) {
      case 70:
        flags = parseInt(pair.value, 10);
        break;
      case 38:
        elevation = parseFloat(pair.value);
        break;
      case 10:
        if (currentVertex) {
          vertices.push(currentVertex);
        }
        currentVertex = { x: parseFloat(pair.value), y: 0, bulge: 0 };
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
    type: "LWPOLYLINE",
    vertices,
    closed: (flags & 1) !== 0,
    elevation
  };
}
function parseSpline(pairs) {
  const base = parseBaseProperties(pairs);
  let degree = 3;
  let flags = 0;
  const controlPoints = [];
  const fitPoints = [];
  const knots = [];
  const weights = [];
  let controlX = null;
  let controlY = null;
  let fitX = null;
  let fitY = null;
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
  if (controlX !== null && controlY !== null) {
    controlPoints.push([controlX, controlY]);
  }
  if (fitX !== null && fitY !== null) {
    fitPoints.push([fitX, fitY]);
  }
  return {
    ...base,
    type: "SPLINE",
    degree,
    closed: (flags & 1) !== 0,
    controlPoints,
    fitPoints,
    knots,
    weights
  };
}
function parseText(pairs) {
  const base = parseBaseProperties(pairs);
  let height = 1;
  let text = "";
  let rotation = 0;
  let style;
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
    type: "TEXT",
    insertionPoint: readPoint(pairs, 10),
    height,
    text,
    rotation,
    style
  };
}
function parseMText(pairs) {
  const base = parseBaseProperties(pairs);
  let height = 1;
  let text = "";
  let rotation = 0;
  let width = 0;
  let style;
  for (const pair of pairs) {
    switch (pair.code) {
      case 40:
        height = parseFloat(pair.value);
        break;
      case 1:
        text += pair.value;
        break;
      case 3:
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
    type: "MTEXT",
    insertionPoint: readPoint(pairs, 10),
    height,
    text,
    rotation,
    width,
    style
  };
}
function parseInsert(pairs) {
  const base = parseBaseProperties(pairs);
  let blockName = "";
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
    type: "INSERT",
    blockName,
    insertionPoint: readPoint(pairs, 10),
    scaleX,
    scaleY,
    scaleZ,
    rotation
  };
}
function parse3DFace(pairs) {
  const base = parseBaseProperties(pairs);
  const points = [[], [], [], []];
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
  const vertices = points.filter((p) => p.length > 0).map((p) => p[2] !== void 0 ? [p[0], p[1], p[2]] : [p[0], p[1]]);
  return {
    ...base,
    type: "3DFACE",
    vertices
  };
}
function parseSolid(pairs) {
  const base = parseBaseProperties(pairs);
  const points = [[], [], [], []];
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
  const vertices = points.filter((p) => p.length > 0).map((p) => p[2] !== void 0 ? [p[0], p[1], p[2]] : [p[0], p[1]]);
  return {
    ...base,
    type: "SOLID",
    vertices
  };
}
function parseHatch(pairs) {
  const base = parseBaseProperties(pairs);
  let patternName = "";
  let solid = false;
  const boundaryPaths = [];
  let numberOfPaths = 0;
  let currentPathIndex = -1;
  let pathType = 0;
  let currentEdges = [];
  let polylineVertices = [];
  let phase = "header";
  let edgeType = 0;
  let edgeData = {};
  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
    const pair = pairs[pairIndex];
    if (phase === "header") {
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
            phase = "path";
          }
          break;
      }
      continue;
    }
    if (phase === "path") {
      if (pair.code === 92) {
        if (currentPathIndex >= 0) {
          flushBoundaryPath(boundaryPaths, pathType, polylineVertices, currentEdges);
        }
        currentPathIndex++;
        pathType = parseInt(pair.value, 10);
        currentEdges = [];
        polylineVertices = [];
        if ((pathType & 2) !== 0) {
          phase = "path";
        } else {
          phase = "edges";
        }
        continue;
      }
      if (pair.code === 10) {
        polylineVertices.push({ x: parseFloat(pair.value), y: 0, bulge: 0 });
      } else if (pair.code === 20 && polylineVertices.length > 0) {
        polylineVertices[polylineVertices.length - 1].y = parseFloat(pair.value);
      } else if (pair.code === 42 && polylineVertices.length > 0) {
        polylineVertices[polylineVertices.length - 1].bulge = parseFloat(pair.value);
      }
    }
    if (phase === "edges") {
      if (pair.code === 72) {
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
          phase = "path";
        }
        continue;
      }
      edgeData[pair.code] = parseFloat(pair.value);
    }
  }
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
    type: "HATCH",
    patternName,
    solid,
    boundaryPaths
  };
}
function flushBoundaryPath(paths, pathType, vertices, edges) {
  if ((pathType & 2) !== 0 && vertices.length > 0) {
    paths.push({ type: "polyline", vertices, closed: true });
  } else if (edges.length > 0) {
    paths.push({ type: "edges", edges });
  }
}
function buildEdge(edgeType, data) {
  switch (edgeType) {
    case 1:
      return {
        type: "line",
        startPoint: [data[10] || 0, data[20] || 0],
        endPoint: [data[11] || 0, data[21] || 0]
      };
    case 2:
      return {
        type: "arc",
        center: [data[10] || 0, data[20] || 0],
        radius: data[40] || 0,
        startAngle: data[50] || 0,
        endAngle: data[51] || 0,
        counterClockwise: (data[73] || 0) !== 0
      };
    case 3:
      return {
        type: "ellipse",
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
function parseDimension(pairs) {
  const base = parseBaseProperties(pairs);
  let dimensionType = 0;
  let text;
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
    type: "DIMENSION",
    definitionPoint: readPoint(pairs, 10),
    middleOfText: readPoint(pairs, 11),
    dimensionType,
    text,
    linearPoint: hasCode(pairs, 13) ? readPoint(pairs, 13) : void 0
  };
}
function hasCode(pairs, code) {
  return pairs.some((p) => p.code === code);
}

// src/lib/parsers/parse-dxf-blocks.ts
function parseBlocks(pairs) {
  const blocks = /* @__PURE__ */ new Map();
  let currentBlockName = null;
  let currentBasePoint = [0, 0];
  let blockEntityPairs = [];
  let collectingEntities = false;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair.code === 0 && pair.value === "BLOCK") {
      currentBlockName = null;
      currentBasePoint = [0, 0];
      blockEntityPairs = [];
      collectingEntities = false;
      continue;
    }
    if (pair.code === 0 && pair.value === "ENDBLK") {
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
      if (pair.code === 2) {
        currentBlockName = pair.value;
      } else if (pair.code === 10) {
        currentBasePoint = [parseFloat(pair.value), currentBasePoint[1]];
      } else if (pair.code === 20) {
        currentBasePoint = [currentBasePoint[0], parseFloat(pair.value)];
      } else if (pair.code === 0) {
        collectingEntities = true;
        blockEntityPairs.push(pair);
      }
    } else {
      blockEntityPairs.push(pair);
    }
  }
  return blocks;
}

// src/lib/utils/dxf-color-table.ts
var ACI_COLORS = [
  "#000000",
  // 0 - BYBLOCK
  "#FF0000",
  // 1 - Red
  "#FFFF00",
  // 2 - Yellow
  "#00FF00",
  // 3 - Green
  "#00FFFF",
  // 4 - Cyan
  "#0000FF",
  // 5 - Blue
  "#FF00FF",
  // 6 - Magenta
  "#FFFFFF",
  // 7 - White/Black
  "#414141",
  // 8
  "#808080",
  // 9
  "#FF0000",
  // 10
  "#FFAAAA",
  // 11
  "#BD0000",
  // 12
  "#BD7E7E",
  // 13
  "#810000",
  // 14
  "#815656",
  // 15
  "#680000",
  // 16
  "#684545",
  // 17
  "#4F0000",
  // 18
  "#4F3535",
  // 19
  "#FF3F00",
  // 20
  "#FFBFAA",
  // 21
  "#BD2E00",
  // 22
  "#BD8D7E",
  // 23
  "#811F00",
  // 24
  "#816056",
  // 25
  "#681900",
  // 26
  "#684E45",
  // 27
  "#4F1300",
  // 28
  "#4F3B35",
  // 29
  "#FF7F00",
  // 30
  "#FFD4AA",
  // 31
  "#BD5E00",
  // 32
  "#BD9D7E",
  // 33
  "#814000",
  // 34
  "#816B56",
  // 35
  "#683400",
  // 36
  "#685645",
  // 37
  "#4F2700",
  // 38
  "#4F4235",
  // 39
  "#FFBF00",
  // 40
  "#FFEAAA",
  // 41
  "#BD8D00",
  // 42
  "#BDAD7E",
  // 43
  "#816000",
  // 44
  "#817656",
  // 45
  "#684E00",
  // 46
  "#685F45",
  // 47
  "#4F3B00",
  // 48
  "#4F4935",
  // 49
  "#FFFF00",
  // 50
  "#FFFFAA",
  // 51
  "#BDBD00",
  // 52
  "#BDBD7E",
  // 53
  "#818100",
  // 54
  "#818156",
  // 55
  "#686800",
  // 56
  "#686845",
  // 57
  "#4F4F00",
  // 58
  "#4F4F35",
  // 59
  "#BFFF00",
  // 60
  "#EAFFAA",
  // 61
  "#8DBD00",
  // 62
  "#ADBD7E",
  // 63
  "#608100",
  // 64
  "#768156",
  // 65
  "#4E6800",
  // 66
  "#5F6845",
  // 67
  "#3B4F00",
  // 68
  "#494F35",
  // 69
  "#7FFF00",
  // 70
  "#D4FFAA",
  // 71
  "#5EBD00",
  // 72
  "#9DBD7E",
  // 73
  "#408100",
  // 74
  "#6B8156",
  // 75
  "#346800",
  // 76
  "#566845",
  // 77
  "#274F00",
  // 78
  "#424F35",
  // 79
  "#3FFF00",
  // 80
  "#BFFFAA",
  // 81
  "#2EBD00",
  // 82
  "#8DBD7E",
  // 83
  "#1F8100",
  // 84
  "#608156",
  // 85
  "#196800",
  // 86
  "#4E6845",
  // 87
  "#134F00",
  // 88
  "#3B4F35",
  // 89
  "#00FF00",
  // 90
  "#AAFFAA",
  // 91
  "#00BD00",
  // 92
  "#7EBD7E",
  // 93
  "#008100",
  // 94
  "#568156",
  // 95
  "#006800",
  // 96
  "#456845",
  // 97
  "#004F00",
  // 98
  "#354F35",
  // 99
  "#00FF3F",
  // 100
  "#AAFFBF",
  // 101
  "#00BD2E",
  // 102
  "#7EBD8D",
  // 103
  "#00811F",
  // 104
  "#568160",
  // 105
  "#006819",
  // 106
  "#45684E",
  // 107
  "#004F13",
  // 108
  "#354F3B",
  // 109
  "#00FF7F",
  // 110
  "#AAFFD4",
  // 111
  "#00BD5E",
  // 112
  "#7EBD9D",
  // 113
  "#008140",
  // 114
  "#56816B",
  // 115
  "#006834",
  // 116
  "#456856",
  // 117
  "#004F27",
  // 118
  "#354F42",
  // 119
  "#00FFBF",
  // 120
  "#AAFFEA",
  // 121
  "#00BD8D",
  // 122
  "#7EBDAD",
  // 123
  "#008160",
  // 124
  "#568176",
  // 125
  "#00684E",
  // 126
  "#45685F",
  // 127
  "#004F3B",
  // 128
  "#354F49",
  // 129
  "#00FFFF",
  // 130
  "#AAFFFF",
  // 131
  "#00BDBD",
  // 132
  "#7EBDBD",
  // 133
  "#008181",
  // 134
  "#568181",
  // 135
  "#006868",
  // 136
  "#456868",
  // 137
  "#004F4F",
  // 138
  "#354F4F",
  // 139
  "#00BFFF",
  // 140
  "#AAEAFF",
  // 141
  "#008DBD",
  // 142
  "#7EADBD",
  // 143
  "#006081",
  // 144
  "#567681",
  // 145
  "#004E68",
  // 146
  "#455F68",
  // 147
  "#003B4F",
  // 148
  "#35494F",
  // 149
  "#007FFF",
  // 150
  "#AAD4FF",
  // 151
  "#005EBD",
  // 152
  "#7E9DBD",
  // 153
  "#004081",
  // 154
  "#566B81",
  // 155
  "#003468",
  // 156
  "#455668",
  // 157
  "#00274F",
  // 158
  "#35424F",
  // 159
  "#003FFF",
  // 160
  "#AABFFF",
  // 161
  "#002EBD",
  // 162
  "#7E8DBD",
  // 163
  "#001F81",
  // 164
  "#566081",
  // 165
  "#001968",
  // 166
  "#454E68",
  // 167
  "#00134F",
  // 168
  "#353B4F",
  // 169
  "#0000FF",
  // 170
  "#AAAAFF",
  // 171
  "#0000BD",
  // 172
  "#7E7EBD",
  // 173
  "#000081",
  // 174
  "#565681",
  // 175
  "#000068",
  // 176
  "#454568",
  // 177
  "#00004F",
  // 178
  "#35354F",
  // 179
  "#3F00FF",
  // 180
  "#BFAAFF",
  // 181
  "#2E00BD",
  // 182
  "#8D7EBD",
  // 183
  "#1F0081",
  // 184
  "#605681",
  // 185
  "#190068",
  // 186
  "#4E4568",
  // 187
  "#13004F",
  // 188
  "#3B354F",
  // 189
  "#7F00FF",
  // 190
  "#D4AAFF",
  // 191
  "#5E00BD",
  // 192
  "#9D7EBD",
  // 193
  "#400081",
  // 194
  "#6B5681",
  // 195
  "#340068",
  // 196
  "#564568",
  // 197
  "#27004F",
  // 198
  "#42354F",
  // 199
  "#BF00FF",
  // 200
  "#EAAAFF",
  // 201
  "#8D00BD",
  // 202
  "#AD7EBD",
  // 203
  "#600081",
  // 204
  "#765681",
  // 205
  "#4E0068",
  // 206
  "#5F4568",
  // 207
  "#3B004F",
  // 208
  "#49354F",
  // 209
  "#FF00FF",
  // 210
  "#FFAAFF",
  // 211
  "#BD00BD",
  // 212
  "#BD7EBD",
  // 213
  "#810081",
  // 214
  "#815681",
  // 215
  "#680068",
  // 216
  "#684568",
  // 217
  "#4F004F",
  // 218
  "#4F354F",
  // 219
  "#FF00BF",
  // 220
  "#FFAAEA",
  // 221
  "#BD008D",
  // 222
  "#BD7EAD",
  // 223
  "#810060",
  // 224
  "#815676",
  // 225
  "#68004E",
  // 226
  "#68455F",
  // 227
  "#4F003B",
  // 228
  "#4F3549",
  // 229
  "#FF007F",
  // 230
  "#FFAAD4",
  // 231
  "#BD005E",
  // 232
  "#BD7E9D",
  // 233
  "#810040",
  // 234
  "#81566B",
  // 235
  "#680034",
  // 236
  "#684556",
  // 237
  "#4F0027",
  // 238
  "#4F3542",
  // 239
  "#FF003F",
  // 240
  "#FFAABF",
  // 241
  "#BD002E",
  // 242
  "#BD7E8D",
  // 243
  "#81001F",
  // 244
  "#815660",
  // 245
  "#680019",
  // 246
  "#68454E",
  // 247
  "#4F0013",
  // 248
  "#4F353B",
  // 249
  "#333333",
  // 250
  "#505050",
  // 251
  "#696969",
  // 252
  "#828282",
  // 253
  "#BEBEBE",
  // 254
  "#FFFFFF"
  // 255
];
function aciToHex(colorIndex) {
  if (colorIndex >= 0 && colorIndex < ACI_COLORS.length) {
    return ACI_COLORS[colorIndex];
  }
  return "#FFFFFF";
}

// src/lib/converters/convert-line.ts
function convertLine(entity, include3D) {
  const coordinates = [
    pointToCoord(entity.startPoint, include3D),
    pointToCoord(entity.endPoint, include3D)
  ];
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates
    },
    properties: {}
  };
}
function pointToCoord(point, include3D) {
  if (include3D && point.length > 2) {
    return [point[0], point[1], point[2]];
  }
  return [point[0], point[1]];
}

// src/lib/converters/convert-point.ts
function convertPoint(entity, include3D) {
  const coordinates = include3D && entity.position.length > 2 ? [entity.position[0], entity.position[1], entity.position[2]] : [entity.position[0], entity.position[1]];
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates
    },
    properties: {}
  };
}

// src/lib/utils/dxf-math.ts
function bulgeToArcPoints(p1, p2, bulge, segments) {
  if (Math.abs(bulge) < 1e-10) {
    return [];
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chordLength = Math.sqrt(dx * dx + dy * dy);
  if (chordLength < 1e-10) {
    return [];
  }
  const sagitta = bulge * chordLength / 2;
  const radius = Math.abs(
    (chordLength / 2 * (chordLength / 2) + sagitta * sagitta) / (2 * sagitta)
  );
  const includedAngle = Math.atan(bulge) * 4;
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const perpX = -(p2.y - p1.y) / chordLength;
  const perpY = (p2.x - p1.x) / chordLength;
  const distToCenter = radius - Math.abs(sagitta);
  const sign = bulge > 0 ? 1 : -1;
  const centerX = midX + sign * distToCenter * perpX;
  const centerY = midY + sign * distToCenter * perpY;
  const startAngle = Math.atan2(p1.y - centerY, p1.x - centerX);
  const endAngle = Math.atan2(p2.y - centerY, p2.x - centerX);
  const arcSegments = Math.max(2, Math.ceil(Math.abs(includedAngle) / (Math.PI * 2) * segments));
  const points = [];
  for (let i = 1; i < arcSegments; i++) {
    const t = i / arcSegments;
    let angle;
    if (bulge > 0) {
      angle = startAngle + normalizeAngle(endAngle - startAngle) * t;
    } else {
      angle = startAngle - normalizeAngle(startAngle - endAngle) * t;
    }
    points.push([centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
  }
  return points;
}
function normalizeAngle(angle) {
  while (angle < 0) {
    angle += Math.PI * 2;
  }
  while (angle > Math.PI * 2) {
    angle -= Math.PI * 2;
  }
  return angle;
}
function tessellateCircle(center, radius, segments) {
  const ring = [];
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI * 2;
    const point = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    if (center.length > 2 && center[2] !== void 0) {
      point.push(center[2]);
    }
    ring.push(point);
  }
  return ring;
}
function tessellateArc(center, radius, startAngleDeg, endAngleDeg, segments) {
  const startAngle = startAngleDeg * Math.PI / 180;
  let endAngle = endAngleDeg * Math.PI / 180;
  if (endAngle <= startAngle) {
    endAngle += Math.PI * 2;
  }
  const sweep = endAngle - startAngle;
  const arcSegments = Math.max(2, Math.ceil(sweep / (Math.PI * 2) * segments));
  const points = [];
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = startAngle + sweep * t;
    const point = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    if (center.length > 2 && center[2] !== void 0) {
      point.push(center[2]);
    }
    points.push(point);
  }
  return points;
}
function tessellateArcRadians(options) {
  const { center, radius, startAngle, endAngle, counterClockwise, segments } = options;
  let sweep;
  if (counterClockwise) {
    sweep = endAngle - startAngle;
    if (sweep <= 0) {
      sweep += Math.PI * 2;
    }
  } else {
    sweep = startAngle - endAngle;
    if (sweep <= 0) {
      sweep += Math.PI * 2;
    }
    sweep = -sweep;
  }
  const arcSegments = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI * 2) * segments));
  const points = [];
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = startAngle + sweep * t;
    const point = [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    if (center.length > 2 && center[2] !== void 0) {
      point.push(center[2]);
    }
    points.push(point);
  }
  return points;
}
function tessellateEllipse(options) {
  const { center, majorAxisEndPoint, ratio, startParam, endParam, segments } = options;
  const majorX = majorAxisEndPoint[0];
  const majorY = majorAxisEndPoint[1];
  const majorLength = Math.sqrt(majorX * majorX + majorY * majorY);
  const minorLength = majorLength * ratio;
  const rotation = Math.atan2(majorY, majorX);
  let sweep = endParam - startParam;
  if (sweep <= 0) {
    sweep += Math.PI * 2;
  }
  const arcSegments = Math.max(2, Math.ceil(sweep / (Math.PI * 2) * segments));
  const points = [];
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const param = startParam + sweep * t;
    const ex = majorLength * Math.cos(param);
    const ey = minorLength * Math.sin(param);
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const point = [center[0] + ex * cosR - ey * sinR, center[1] + ex * sinR + ey * cosR];
    if (center.length > 2 && center[2] !== void 0) {
      point.push(center[2]);
    }
    points.push(point);
  }
  return points;
}
function evaluateBSpline(degree, controlPoints, knots, weights, numPoints) {
  if (controlPoints.length === 0) {
    return [];
  }
  if (knots.length === 0) {
    const n = controlPoints.length;
    const knotCount = n + degree + 1;
    knots = [];
    for (let i = 0; i < knotCount; i++) {
      if (i <= degree) {
        knots.push(0);
      } else if (i >= knotCount - degree - 1) {
        knots.push(1);
      } else {
        knots.push((i - degree) / (knotCount - 2 * degree - 1));
      }
    }
  }
  const hasWeights = weights.length === controlPoints.length;
  const tMin = knots[degree];
  const tMax = knots[knots.length - degree - 1];
  const result = [];
  for (let i = 0; i < numPoints; i++) {
    const t = tMin + i / (numPoints - 1) * (tMax - tMin);
    const point = deBoor(degree, controlPoints, knots, hasWeights ? weights : null, t);
    result.push(point);
  }
  return result;
}
function deBoor(degree, controlPoints, knots, weights, t) {
  const n = controlPoints.length;
  let span = degree;
  for (let i = degree; i < n; i++) {
    if (t >= knots[i] && t < knots[i + 1]) {
      span = i;
      break;
    }
  }
  if (t >= knots[n]) {
    span = n - 1;
  }
  const dim = controlPoints[0].length;
  const d = [];
  for (let j = 0; j <= degree; j++) {
    const idx = span - degree + j;
    const cp = controlPoints[Math.max(0, Math.min(idx, n - 1))];
    const w2 = weights ? weights[Math.max(0, Math.min(idx, n - 1))] : 1;
    const point = [];
    for (let k = 0; k < dim; k++) {
      point.push(cp[k] * w2);
    }
    point.push(w2);
    d.push(point);
  }
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const idx = span - degree + j;
      const knotLeft = knots[idx];
      const knotRight = knots[idx + degree - r + 1];
      const denom = knotRight - knotLeft;
      const alpha = denom > 1e-10 ? (t - knotLeft) / denom : 0;
      for (let k = 0; k <= dim; k++) {
        d[j][k] = (1 - alpha) * d[j - 1][k] + alpha * d[j][k];
      }
    }
  }
  const w = d[degree][dim];
  const result = [];
  for (let k = 0; k < dim; k++) {
    result.push(w > 1e-10 ? d[degree][k] / w : d[degree][k]);
  }
  return result;
}
function applyInsertTransform(options) {
  const { point, insertionPoint, basePoint, scaleX, scaleY, scaleZ, rotationDeg } = options;
  const rotation = rotationDeg * Math.PI / 180;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  let x = (point[0] - basePoint[0]) * scaleX;
  let y = (point[1] - basePoint[1]) * scaleY;
  const rx = x * cosR - y * sinR;
  const ry = x * sinR + y * cosR;
  x = rx + insertionPoint[0];
  y = ry + insertionPoint[1];
  if (point.length > 2) {
    const z = ((point[2] || 0) - (basePoint[2] || 0)) * scaleZ + (insertionPoint[2] || 0);
    return [x, y, z];
  }
  return [x, y];
}

// src/lib/converters/convert-circle.ts
function convertCircle(entity, circleSegments, include3D) {
  const ring = tessellateCircle(entity.center, entity.radius, circleSegments);
  const coordinates = include3D ? ring : ring.map((p) => [p[0], p[1]]);
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates]
    },
    properties: {}
  };
}

// src/lib/converters/convert-arc.ts
function convertArc(entity, circleSegments, include3D) {
  const points = tessellateArc(
    entity.center,
    entity.radius,
    entity.startAngle,
    entity.endAngle,
    circleSegments
  );
  const coordinates = include3D ? points : points.map((p) => [p[0], p[1]]);
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates
    },
    properties: {}
  };
}

// src/lib/converters/convert-polyline.ts
function convertPolyline(entity, circleSegments, include3D) {
  const vertices = entity.vertices;
  const coords = [];
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    const coord = include3D && vertex.z !== void 0 ? [vertex.x, vertex.y, vertex.z] : [vertex.x, vertex.y];
    coords.push(coord);
    if (Math.abs(vertex.bulge) > 1e-10) {
      const nextIndex = (i + 1) % vertices.length;
      if (nextIndex !== i) {
        const nextVertex = vertices[nextIndex];
        const arcPoints = bulgeToArcPoints(vertex, nextVertex, vertex.bulge, circleSegments);
        for (const arcPoint of arcPoints) {
          coords.push(include3D && vertex.z !== void 0 ? [...arcPoint, vertex.z] : arcPoint);
        }
      }
    }
  }
  if (entity.closed && coords.length > 0) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coords]
      },
      properties: {}
    };
  }
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: coords
    },
    properties: {}
  };
}

// src/lib/converters/convert-ellipse.ts
function convertEllipse(entity, circleSegments, include3D) {
  const points = tessellateEllipse({
    center: entity.center,
    majorAxisEndPoint: entity.majorAxisEndPoint,
    ratio: entity.ratioMinorToMajor,
    startParam: entity.startParameter,
    endParam: entity.endParameter,
    segments: circleSegments
  });
  const coordinates = include3D ? points : points.map((p) => [p[0], p[1]]);
  const isFullEllipse = Math.abs(entity.startParameter) < 1e-6 && Math.abs(entity.endParameter - Math.PI * 2) < 1e-6;
  if (isFullEllipse) {
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push([...first]);
    }
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates]
      },
      properties: {}
    };
  }
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates
    },
    properties: {}
  };
}

// src/lib/converters/convert-spline.ts
function convertSpline(entity, splineSegmentsPerSpan, include3D) {
  let coordinates;
  if (entity.controlPoints.length > 0) {
    const numSpans = Math.max(1, entity.controlPoints.length - entity.degree);
    const numPoints = numSpans * splineSegmentsPerSpan + 1;
    const points = evaluateBSpline(
      entity.degree,
      entity.controlPoints,
      entity.knots,
      entity.weights,
      numPoints
    );
    coordinates = points.map(
      (p) => include3D && p.length > 2 ? [p[0], p[1], p[2]] : [p[0], p[1]]
    );
  } else if (entity.fitPoints.length > 0) {
    coordinates = entity.fitPoints.map(
      (p) => include3D && p.length > 2 ? [p[0], p[1], p[2]] : [p[0], p[1]]
    );
  } else {
    coordinates = [];
  }
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates
    },
    properties: {}
  };
}

// src/lib/converters/convert-text.ts
function convertText(entity, include3D) {
  const point = entity.insertionPoint;
  const coordinates = include3D && point.length > 2 ? [point[0], point[1], point[2]] : [point[0], point[1]];
  const properties = {
    text: stripMTextFormatting(entity.text),
    textHeight: entity.height,
    textRotation: entity.rotation
  };
  if (entity.style) {
    properties.textStyle = entity.style;
  }
  if (entity.type === "MTEXT") {
    properties.textWidth = entity.width;
  }
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates
    },
    properties
  };
}
function stripMTextFormatting(text) {
  let result = text.replace(/\\P/gi, "\n");
  result = result.replace(/\{\\[^;]*;([^}]*)}/g, "$1");
  result = result.replace(/\\[A-Za-z][^;]*;/g, "");
  result = result.replace(/[{}]/g, "");
  return result;
}

// src/lib/converters/convert-insert.ts
function convertInsert(entity, blocks, options, depth) {
  if (depth >= options.maxBlockInsertionDepth) {
    return [];
  }
  const block = blocks.get(entity.blockName);
  if (!block) {
    return [];
  }
  const features = [];
  for (const blockEntity of block.entities) {
    const subFeatures = convertEntityToFeatures(blockEntity, blocks, options, depth + 1);
    for (const feature of subFeatures) {
      const transformed = transformFeatureGeometry(feature, {
        insertionPoint: entity.insertionPoint,
        basePoint: block.basePoint,
        scaleX: entity.scaleX,
        scaleY: entity.scaleY,
        scaleZ: entity.scaleZ,
        rotation: entity.rotation,
        include3D: options.include3D
      });
      features.push(transformed);
    }
  }
  return features;
}
function transformFeatureGeometry(feature, params) {
  const { insertionPoint, basePoint, scaleX, scaleY, scaleZ, rotation, include3D } = params;
  const geometry = feature.geometry;
  if (!geometry) {
    return feature;
  }
  const transformCoord = (coord) => {
    const point = coord.length > 2 ? [coord[0], coord[1], coord[2]] : [coord[0], coord[1]];
    const transformed = applyInsertTransform({
      point,
      insertionPoint,
      basePoint,
      scaleX,
      scaleY,
      scaleZ,
      rotationDeg: rotation
    });
    return include3D && transformed.length > 2 ? [transformed[0], transformed[1], transformed[2]] : [transformed[0], transformed[1]];
  };
  const transformedGeometry = transformGeometryCoordinates(geometry, transformCoord);
  return {
    ...feature,
    geometry: transformedGeometry,
    properties: {
      ...feature.properties,
      blockName: feature.properties?.blockName || void 0
    }
  };
}
function transformGeometryCoordinates(geometry, transform) {
  if (!geometry) {
    return geometry;
  }
  switch (geometry.type) {
    case "Point":
      return {
        type: "Point",
        coordinates: transform(geometry.coordinates)
      };
    case "LineString":
      return {
        type: "LineString",
        coordinates: geometry.coordinates.map(transform)
      };
    case "Polygon":
      return {
        type: "Polygon",
        coordinates: geometry.coordinates.map((ring) => ring.map(transform))
      };
    case "MultiPolygon":
      return {
        type: "MultiPolygon",
        coordinates: geometry.coordinates.map(
          (polygon) => polygon.map((ring) => ring.map(transform))
        )
      };
    default:
      return geometry;
  }
}

// src/lib/converters/convert-3dface.ts
function convert3DFace(entity, include3D) {
  const ring = entity.vertices.map(
    (v) => include3D && v.length > 2 ? [v[0], v[1], v[2]] : [v[0], v[1]]
  );
  const first = ring[0];
  ring.push([...first]);
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ring]
    },
    properties: {}
  };
}

// src/lib/converters/convert-solid.ts
function convertSolid(entity, include3D) {
  const toCoord = (v) => include3D && v.length > 2 ? [v[0], v[1], v[2]] : [v[0], v[1]];
  const vertices = entity.vertices;
  let ring;
  if (vertices.length === 4) {
    ring = [
      toCoord(vertices[0]),
      toCoord(vertices[1]),
      toCoord(vertices[3]),
      toCoord(vertices[2]),
      toCoord(vertices[0])
      // close ring
    ];
  } else {
    ring = vertices.map(toCoord);
    ring.push(toCoord(vertices[0]));
  }
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ring]
    },
    properties: {}
  };
}

// src/lib/converters/convert-hatch.ts
function convertHatch(entity, circleSegments, include3D) {
  const polygons = [];
  for (const path of entity.boundaryPaths) {
    const ring = convertBoundaryPath(path, circleSegments, include3D);
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }
      polygons.push(ring);
    }
  }
  if (polygons.length === 0) {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[]]
      },
      properties: {}
    };
  }
  if (polygons.length === 1) {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [polygons[0]]
      },
      properties: {}
    };
  }
  return {
    type: "Feature",
    geometry: {
      type: "MultiPolygon",
      coordinates: polygons.map((ring) => [ring])
    },
    properties: {}
  };
}
function convertBoundaryPath(path, circleSegments, include3D) {
  if (path.type === "polyline" && path.vertices) {
    return path.vertices.map(
      (v) => include3D && v.z !== void 0 ? [v.x, v.y, v.z] : [v.x, v.y]
    );
  }
  if (path.type === "edges" && path.edges) {
    return convertEdgesToRing(path.edges, circleSegments, include3D);
  }
  return [];
}
function convertEdgesToRing(edges, circleSegments, _include3D) {
  const ring = [];
  for (const edge of edges) {
    switch (edge.type) {
      case "line":
        ring.push([edge.startPoint[0], edge.startPoint[1]]);
        break;
      case "arc": {
        const arcPoints = tessellateArcRadians({
          center: edge.center,
          radius: edge.radius,
          startAngle: edge.startAngle * Math.PI / 180,
          endAngle: edge.endAngle * Math.PI / 180,
          counterClockwise: edge.counterClockwise,
          segments: circleSegments
        });
        for (const point of arcPoints) {
          ring.push([point[0], point[1]]);
        }
        break;
      }
      case "ellipse": {
        const majorLength = Math.sqrt(
          edge.majorAxisEndPoint[0] ** 2 + edge.majorAxisEndPoint[1] ** 2
        );
        const averageRadius = majorLength * (1 + edge.ratioMinorToMajor) / 2;
        const arcPoints = tessellateArcRadians({
          center: edge.center,
          radius: averageRadius,
          startAngle: edge.startAngle,
          endAngle: edge.endAngle,
          counterClockwise: edge.counterClockwise,
          segments: circleSegments
        });
        for (const point of arcPoints) {
          ring.push([point[0], point[1]]);
        }
        break;
      }
    }
  }
  return ring;
}

// src/lib/converters/convert-dimension.ts
function convertDimension(entity, include3D) {
  const features = [];
  const toCoord = (point) => include3D && point.length > 2 ? [point[0], point[1], point[2]] : [point[0], point[1]];
  const lineCoords = [toCoord(entity.definitionPoint)];
  if (entity.linearPoint) {
    lineCoords.push(toCoord(entity.linearPoint));
  }
  if (lineCoords.length >= 2) {
    const lineFeature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: lineCoords
      },
      properties: {
        entityType: "DIMENSION",
        dimensionType: entity.dimensionType,
        text: entity.text
      }
    };
    features.push(lineFeature);
  }
  const textFeature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: toCoord(entity.middleOfText)
    },
    properties: {
      entityType: "DIMENSION",
      dimensionType: entity.dimensionType,
      text: entity.text
    }
  };
  features.push(textFeature);
  return features;
}

// src/lib/converters/convert-entities-to-features.ts
function convertEntitiesToFeatures(entities, tables, blocks, options) {
  const features = [];
  for (const entity of entities) {
    if (!shouldIncludeEntity(entity, tables, options)) {
      continue;
    }
    const entityFeatures = convertEntityToFeatures(entity, blocks, options, 0);
    for (const feature of entityFeatures) {
      addEntityProperties(feature, entity, tables);
      features.push(feature);
    }
  }
  return features;
}
function convertEntityToFeatures(entity, blocks, options, depth) {
  switch (entity.type) {
    case "LINE":
      return [convertLine(entity, options.include3D)];
    case "POINT":
      return [convertPoint(entity, options.include3D)];
    case "CIRCLE":
      return [convertCircle(entity, options.circleSegments, options.include3D)];
    case "ARC":
      return [convertArc(entity, options.circleSegments, options.include3D)];
    case "ELLIPSE":
      return [convertEllipse(entity, options.circleSegments, options.include3D)];
    case "LWPOLYLINE":
      return [convertPolyline(entity, options.circleSegments, options.include3D)];
    case "POLYLINE":
      return [convertPolyline(entity, options.circleSegments, options.include3D)];
    case "SPLINE":
      return [convertSpline(entity, options.splineSegmentsPerSpan, options.include3D)];
    case "TEXT":
    case "MTEXT":
      return [convertText(entity, options.include3D)];
    case "INSERT":
      if (options.inlineBlockReferences) {
        return convertInsert(entity, blocks, options, depth);
      }
      return [];
    case "3DFACE":
      return [convert3DFace(entity, options.include3D)];
    case "SOLID":
      return [convertSolid(entity, options.include3D)];
    case "HATCH":
      return [convertHatch(entity, options.circleSegments, options.include3D)];
    case "DIMENSION":
      return convertDimension(entity, options.include3D);
    default:
      return [];
  }
}
function shouldIncludeEntity(entity, tables, options) {
  if (options.entityTypes && options.entityTypes.length > 0) {
    if (!options.entityTypes.includes(entity.type)) {
      return false;
    }
  }
  if (options.layers && options.layers.length > 0) {
    if (!options.layers.includes(entity.layer)) {
      return false;
    }
  }
  if (!options.includeInvisible && !entity.visible) {
    return false;
  }
  if (!options.includeFrozenLayers) {
    const layer = tables.layers.get(entity.layer);
    if (layer && layer.frozen) {
      return false;
    }
  }
  return true;
}
function addEntityProperties(feature, entity, tables) {
  const layer = tables.layers.get(entity.layer);
  let colorIndex = entity.colorIndex;
  if (colorIndex === void 0 || colorIndex === 256) {
    colorIndex = layer ? Math.abs(layer.colorIndex) : 7;
  }
  const properties = feature.properties || {};
  properties.layer = entity.layer;
  properties.entityType = entity.type;
  properties.color = aciToHex(colorIndex);
  properties.colorIndex = colorIndex;
  if (entity.handle) {
    properties.handle = entity.handle;
  }
  if (entity.lineType) {
    properties.lineType = entity.lineType;
  }
  if (entity.lineWeight !== void 0) {
    properties.lineWeight = entity.lineWeight;
  }
  feature.properties = properties;
}

// src/lib/parse-dxf.ts
function parseDXF(text, options = {}) {
  const pairs = tokenizeDXF(text);
  const sections = parseSections(pairs);
  void parseHeader(sections.header);
  const tables = parseTables(sections.tables);
  const blocks = parseBlocks(sections.blocks);
  const entities = parseEntitiesWithVertices(sections.entities);
  const convertOptions = {
    circleSegments: options.circleSegments ?? 72,
    splineSegmentsPerSpan: options.splineSegmentsPerSpan ?? 20,
    inlineBlockReferences: options.inlineBlockReferences ?? true,
    maxBlockInsertionDepth: options.maxBlockInsertionDepth ?? 8,
    entityTypes: options.entityTypes,
    layers: options.layers,
    includeInvisible: options.includeInvisible ?? false,
    includeFrozenLayers: options.includeFrozenLayers ?? false,
    include3D: options.include3D ?? true
  };
  return convertEntitiesToFeatures(entities, tables, blocks, convertOptions);
}

// src/dxf-loader.ts
var VERSION = true ? "4.4.0-alpha.12" : "latest";
var DXFLoader = {
  dataType: null,
  batchType: null,
  name: "DXF (AutoCAD)",
  id: "dxf",
  module: "dxf",
  version: VERSION,
  worker: true,
  extensions: ["dxf"],
  mimeTypes: ["application/dxf", "application/x-dxf", "image/vnd.dxf"],
  category: "geometry",
  text: true,
  parse: async (arrayBuffer, options) => parseTextSync(new TextDecoder().decode(arrayBuffer), options),
  parseTextSync,
  options: {
    dxf: {
      shape: "geojson-table",
      circleSegments: 72,
      splineSegmentsPerSpan: 20,
      inlineBlockReferences: true,
      maxBlockInsertionDepth: 8,
      entityTypes: void 0,
      layers: void 0,
      includeInvisible: false,
      includeFrozenLayers: false,
      include3D: true
    }
  }
};
function parseTextSync(text, options) {
  const dxfOptions = { ...DXFLoader.options.dxf, ...options?.dxf };
  const features = parseDXF(text, dxfOptions);
  switch (dxfOptions.shape) {
    case "geojson-table": {
      const table = {
        shape: "geojson-table",
        type: "FeatureCollection",
        features
      };
      return table;
    }
    case "object-row-table": {
      const table = {
        shape: "object-row-table",
        data: features
      };
      return table;
    }
    default:
      throw new Error(`DXFLoader: Unsupported shape "${dxfOptions.shape}"`);
  }
}

// src/workers/dxf-worker.ts
createLoaderWorker(DXFLoader);
