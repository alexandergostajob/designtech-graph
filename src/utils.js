import { Position, MarkerType } from '@xyflow/react';

/**
 * utils.js
 * Utility functions used by the DesignTech graph visualization.
 *
 * This file contains helper functions for:
 * - Computing intersection points between node boundaries and edge lines
 * - Determining which side of a node an edge should attach to
 * - Generating initial demo elements
 * - Arranging nodes in circular or vertical layouts
 * - Building edges from the provided raw dataset (company -> tech, tech -> tech)
 * - Creating simple user nodes
 */

// -----------------------------------------------------------------------------
// Geometry helpers
// -----------------------------------------------------------------------------

/**
 * Compute the intersection point on the border of `intersectionNode` where
 * a straight line from the center of `intersectionNode` to the center of
 * `targetNode` crosses the node boundary.
 *
 * The algorithm assumes nodes are rectangular and uses a normalized coordinate
 * transform to compute the boundary intersection. The implementation is adapted
 * from a community math solution for rectangle/line intersection.
 *
 * @param {object} intersectionNode - ReactFlow node object (expects measured and internals.positionAbsolute)
 * @param {object} targetNode - ReactFlow node object to aim at
 * @returns {{x:number,y:number}} - point on the border of intersectionNode
 */
function getNodeIntersection(intersectionNode, targetNode) {
  // Source: https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
    intersectionNode.measured;
  const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
  const targetPosition = targetNode.internals.positionAbsolute;

  // half-width / half-height
  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;

  // center coordinates for the intersection node
  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  // center coordinates for the target node
  const x1 = targetPosition.x + targetNode.measured.width / 2;
  const y1 = targetPosition.y + targetNode.measured.height / 2;

  // transform and compute a normalized intersection point on the unit rectangle
  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  // map back to rectangle coordinates
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

/**
 * Given a node and an intersection point, determine which side of the node
 * (left, right, top, bottom) the intersection sits on. This helps the UI
 * determine connection anchor positions for custom edges.
 *
 * @param {object} node - ReactFlow node (expects internals.positionAbsolute and measured)
 * @param {{x:number,y:number}} intersectionPoint - point on/near the node border
 * @returns {Position} - one of Position.Left, Position.Right, Position.Top, Position.Bottom
 */
function getEdgePosition(node, intersectionPoint) {
  // create a convenient object with node absolute position and size
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  // Compare intersection coordinates against node bounding box (with small tolerance)
  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + n.measured.width - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= n.y + n.measured.height - 1) {
    return Position.Bottom;
  }

  // Default to top if something is ambiguous
  return Position.Top;
}

// -----------------------------------------------------------------------------
// Edge helpers
// -----------------------------------------------------------------------------

/**
 * Compute the raw parameters used to render a custom edge between two nodes.
 * Returns the start/end coordinates and the attachment sides for each node.
 *
 * @param {object} source - source node object
 * @param {object} target - target node object
 * @returns {{sx:number,sy:number,tx:number,ty:number,sourcePos:Position,targetPos:Position}}
 */
export function getEdgeParams(source, target) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

// -----------------------------------------------------------------------------
// Demo / initial elements
// -----------------------------------------------------------------------------

/**
 * Create a small demo graph consisting of a central "target" node and several
 * sources arranged in a circle around it. Useful for playgrounds and initial load.
 *
 * @returns {{nodes:Array,edges:Array}}
 */
export function initialElements() {
  const nodes = [];
  const edges = [];
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  nodes.push({ id: 'target', data: { label: 'Target' }, position: center });

  // Create 8 source nodes arranged in a circle and connect them to the center
  for (let i = 0; i < 8; i++) {
    const degrees = i * (360 / 8);
    const radians = degrees * (Math.PI / 180);
    const x = 400 * Math.cos(radians) + center.x;
    const y = 400 * Math.sin(radians) + center.y;

    nodes.push({ id: `${i}`, data: { label: 'Source' }, position: { x, y } });

    edges.push({
      id: `edge-${i}`,
      target: 'target',
      source: `${i}`,
      type: 'floating',
      markerEnd: {
        type: MarkerType.Arrow,
      },
    });
  }

  return { nodes, edges };
}

// -----------------------------------------------------------------------------
// Layout helpers
// -----------------------------------------------------------------------------

/**
 * Arrange nodes evenly in a circle (useful for force-layout resets or previews).
 *
 * @param {Array} nodes - array of node objects
 * @param {number} width - viewport width
 * @param {number} height - viewport height
 * @param {string} arrangeBy - node.data property to sort by (default: 'label')
 * @param {number} radius - circle radius in px
 * @returns {Array} - new array of nodes with updated positions
 */
export function arrangeNodes(nodes, width, height, arrangeBy = 'label', radius = 600) {
  const centerX = width / 2;
  const centerY = height / 2;

  const sortedNodes = [...nodes].sort((a, b) => {
    const aVal = a.data[arrangeBy]?.toLowerCase() || '';
    const bVal = b.data[arrangeBy]?.toLowerCase() || '';
    return aVal.localeCompare(bVal);
  });

  const angleStep = (2 * Math.PI) / sortedNodes.length;

  return sortedNodes.map((node, i) => {
    const angle = i * angleStep;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });
}

/**
 * Arrange nodes in vertical columns grouped by node type.
 * Each column corresponds to a node type, and nodes within a type are
 * vertically stacked and alphabetically ordered by label.
 *
 * @param {Array} nodes
 * @param {number} width
 * @param {number} height
 * @returns {Array} - new array of nodes with updated positions
 */
export function arrangeNodesVertically(nodes, width, height) {
  const VERTICAL_SPACING = 50;
  const COLUMN_SPACING = 250;
  const nodesByType = {};
  
  // Group nodes by type
  nodes.forEach(node => {
    const type = node.data.type;
    if (!nodesByType[type]) {
      nodesByType[type] = [];
    }
    nodesByType[type].push(node);
  });

  // Sort types alphabetically so column order is stable
  const types = Object.keys(nodesByType).sort();
  
  // Calculate total height needed per column (not strictly used here but useful if centering columns later)
  const columnHeights = types.map(type => nodesByType[type].length * VERTICAL_SPACING);
  const maxHeight = Math.max(...columnHeights);
  
  const arrangedNodes = [];
  types.forEach((type, columnIndex) => {
    const typeNodes = nodesByType[type].sort((a, b) => 
      a.data.label.toLowerCase().localeCompare(b.data.label.toLowerCase())
    );
    
    // Center the column vertically around the viewport center
    const columnStartY = height/2 - (typeNodes.length * VERTICAL_SPACING)/2;
    
    typeNodes.forEach((node, rowIndex) => {
      arrangedNodes.push({
        ...node,
        position: {
          x: columnIndex * COLUMN_SPACING + 100,
          y: columnStartY + rowIndex * VERTICAL_SPACING
        }
      });
    });
  });

  return arrangedNodes;
}

// -----------------------------------------------------------------------------
// Edge builders from dataset
// -----------------------------------------------------------------------------

/**
 * Build edges connecting company nodes to design technology nodes using the
 * provided rawData. This function accepts nodes that already have positions
 * and inspects either node.data.designtechs or the rawData mapping.
 *
 * Returns an object with `edges` array and `connectionCount` map used to
 * compute node sizes or strengths in the UI.
 *
 * @param {Array} positionedNodes - nodes with id and data
 * @param {Array} rawData - dataset containing Name, Designtechs, Interoperability etc.
 * @returns {{edges:Array,connectionCount:Object}}
 */
export function buildCompanyEdges(positionedNodes, rawData) {
  const nodeIds = new Set(positionedNodes.map(n => n.id));
  const edges = [];
  const edgeSet = new Set();

  // Build a map from company name -> designtechs (deduplicated)
  const designMap = new Map();
  rawData.forEach(item => {
    if (item.Designtechs && item.Designtechs.length) {
      const uniqueTechs = Array.from(new Set(item.Designtechs));
      designMap.set(item.Name, uniqueTechs);
    }
  });

  positionedNodes.forEach(node => {
    const isCompany = node.data.type && node.data.type.toLowerCase() === 'company';
    if (!isCompany) return;

    // prefer explicit node.data.designtechs; otherwise fall back to raw data map
    const techs = node.data.designtechs && node.data.designtechs.length ? node.data.designtechs : (designMap.get(node.id) || []);
    techs.forEach(tech => {
      if (nodeIds.has(tech) && tech !== node.id) {
        // Create a consistent undirected id so duplicate pairs map to same id
        const [id1, id2] = [node.id, tech].sort();
        const edgeId = `e-${id1}-${id2}`;
        // guard against duplicates
        if (edgeSet.has(edgeId)) {
          // Helpful debug during data import; safe to remove if noisy
          console.log(`Skipping duplicate company edge: ${node.id} -> ${tech} (${edgeId})`);
          return;
        }
        console.log(`Adding company edge: ${node.id} -> ${tech} (${edgeId})`);
        edgeSet.add(edgeId);
        edges.push({ id: edgeId, source: node.id, target: tech, type: 'floating' });
      }
    });
  });

  // Count connections per node (helps scale node sizes or labels)
  const connectionCount = {};
  edges.forEach(edge => {
    connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
    connectionCount[edge.target] = (connectionCount[edge.target] || 0) + 1;
  });

  return { edges, connectionCount };
}

/**
 * Build edges between non-company nodes based on an `Interoperability` CSV
 * field in the raw dataset. Each cell may contain a comma-separated list of
 * interoperable tool IDs (names). The function deduplicates and filters
 * to only include nodes present in `positionedNodes`.
 *
 * @param {Array} positionedNodes
 * @param {Array} rawData
 * @returns {{edges:Array,connectionCount:Object}}
 */
export function buildInteroperabilityEdges(positionedNodes, rawData) {
  const nodeIds = new Set(positionedNodes.map(n => n.id));
  const edges = [];
  const edgeSet = new Set();

  // Parse Interoperability CSV-like strings into arrays
  const interopMap = new Map();
  rawData.forEach(item => {
    if (item.Interoperability) {
      const list = item.Interoperability.split(',').map(s => s.trim()).filter(Boolean);
      if (list.length) interopMap.set(item.Name, list);
    }
  });

  positionedNodes.forEach(node => {
    const isCompany = node.data.type && node.data.type.toLowerCase() === 'company';
    if (isCompany) {
      // Skip companies: interoperability edges are for tools/tech nodes
      console.log(`Skipping company node in interop: ${node.id}`);
      return;
    }

    const interops = interopMap.get(node.id) || [];
    interops.forEach(target => {
      if (target === node.id) return; // ignore self-references
      if (!nodeIds.has(target)) return; // ignore references to unknown nodes

      // Build an undirected unique id to prevent duplicates
      const [id1, id2] = [node.id, target].sort();
      const edgeId = `e-${id1}-${id2}`;
      if (edgeSet.has(edgeId)) return;
      edgeSet.add(edgeId);
      edges.push({ id: edgeId, source: node.id, target, type: 'floating' });
    });
  });

  const connectionCount = {};
  edges.forEach(edge => {
    connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
    connectionCount[edge.target] = (connectionCount[edge.target] || 0) + 1;
  });

  return { edges, connectionCount };
}

// -----------------------------------------------------------------------------
// Convenience node factory
// -----------------------------------------------------------------------------

/**
 * Create a lightweight user node with a random-ish position. The default label
 * is Swedish ("min nya nod") to match the original project.
 *
 * @param {string} label - label for the node
 * @returns {object} node
 */
export function createUserNode(label = 'min nya nod') {
  return {
    id: `user-${+new Date()}`,
    type: 'user-node',
    position: {
      x: Math.random() * 600 - 300,
      y: Math.random() * 600 - 300
    },
    data: {
      label,
      editable: true
    }
  };
}
