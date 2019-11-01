const fs = require('fs');
const { promisify } = require('util');
const { performance } = require('perf_hooks');

const readFilePromise = promisify(fs.readFile);

const getMaxPath = (parent, vertices, edges, INDEX_MAPS) => {
    const selectedEdges = INDEX_MAPS.EDGE_FROM[parent.id].map(eIdx => edges[eIdx]);
    const childNodes = selectedEdges.map(e => vertices[INDEX_MAPS.VERTEX[e.to]]);
    let maxPath = [parent];
    if (childNodes.length > 0) { // not a leaf node
        const maxPaths = childNodes.map(c => getMaxPath(c, vertices, edges, INDEX_MAPS));
        const maxLen = Math.max(...maxPaths.map(m => m.length));
        const filteredMaxPaths = maxPaths.filter(m => m.length === maxLen);

        if (filteredMaxPaths.length > 0) {
            const maxDepth = Math.max(...filteredMaxPaths.map(m => parent.value - m[m.length - 1].value));
            const m = filteredMaxPaths.find(m => (parent.value - m[m.length - 1].value) === maxDepth);
            maxPath = maxPath.concat(m);
        } else {
            maxPath = maxPath.concat(filteredMaxPaths[0]);
        }
    }
    return maxPath;
}

const executeMap = async mapFilePath => {
    const INDEX_MAPS = {
        VERTEX: {},
        EDGE_FROM: {}
    };

    const inputs = await readFilePromise(mapFilePath, { encoding: 'utf8' });
    const inputRows = inputs.split('\n');
    const [rows, cols] = inputRows.shift().split(' ').map(n => Number(n));
    const inputMap = inputRows.slice(0, rows).map(r => r.split(' ').map(n => Number(n)));
    const vertices = []; // [{id: <vertex>, value: <number>, isSource: <boolean>}]

    const edges = []; // [{from: <vertex>, to: <vertex>}]

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const currentVertexId = `r${r}_c${c}`;
            const currentVertexValue = inputMap[r][c];

            // neighboring cells
            const north = (r > 0) ? { id: `r${r - 1}_c${c}`, value: inputMap[r - 1][c] } : undefined;
            const west = (c > 0) ? { id: `r${r}_c${c - 1}`, value: inputMap[r][c - 1] } : undefined;
            const east = (c < cols - 1) ? { id: `r${r}_c${c + 1}`, value: inputMap[r][c + 1] } : undefined;
            const south = (r < rows - 1) ? { id: `r${r + 1}_c${c}`, value: inputMap[r + 1][c] } : undefined;

            const definedNeighbors = [north, east, west, south].filter(n => typeof n !== 'undefined');
            const validPathsFromCurrentVertex = definedNeighbors.filter(n => n.value < currentVertexValue);
            const validPathsToCurrentVertex = definedNeighbors.filter(n => n.value >= currentVertexValue);

            // store vertex
            vertices.push({
                id: currentVertexId,
                value: currentVertexValue,
                isSource: !validPathsToCurrentVertex.length
            });
            INDEX_MAPS.VERTEX[currentVertexId] = vertices.length - 1;
            INDEX_MAPS.EDGE_FROM[currentVertexId] = [];
            // store edges
            validPathsFromCurrentVertex.forEach(p => {
                edges.push({
                    from: currentVertexId,
                    to: p.id
                });
                INDEX_MAPS.EDGE_FROM[currentVertexId].push(edges.length - 1);
            })
        }
    }

    const sourceVertices = vertices.filter(v => v.isSource);
    console.log(`vertices -> (sources/total): (${sourceVertices.length}/${vertices.length})`);
    console.log('edges -> total', edges.length);
    const maxPaths = sourceVertices.map(v => getMaxPath(v, vertices, edges, INDEX_MAPS));

    // filter paths by longest length
    let maxPathLen = 0;
    maxPaths.forEach(m => {
        maxPathLen = m.length > maxPathLen ? m.length : maxPathLen;
    });
    const maxPathsFilteredByLen = maxPaths.filter(m => m.length === maxPathLen)

    // filter paths by maximum depth
    let maxDepth = 0;
    maxPathsFilteredByLen.forEach(m => {
        const start = m[0].value;
        const end = m[m.length - 1].value;
        const depth = start - end;
        maxDepth = depth > maxDepth ? depth : maxDepth;
    });
    const maxPathsFilteredByLenAndDepth = maxPathsFilteredByLen.filter(m => (m[0].value - m[m.length - 1].value) === maxDepth)
    console.log('=-=-=-=-=-=-=-=-=-=-=-=-=-=Results=-=-=-=-=-=-=-=-=-=-=-=-=-=');
    console.log(`No. of paths with the longest length (${maxPathLen}) and depth (${maxDepth}): ${maxPathsFilteredByLenAndDepth.length}`);
    maxPathsFilteredByLenAndDepth.map((maxPath, idx) => {
        console.log(idx + 1, maxPath.map(m => `[${m.id}(${m.value})]`).join('-'));
    })
    console.log('Processed time in ms', performance.now());
    console.log('Email: ' + maxPathLen + maxDepth + '@redmart.com');
}

executeMap('./map.txt');
// executeMap('./sample_map.txt');
