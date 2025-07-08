import rawData from './data.json';
import { MarkerType} from '@xyflow/react';

const colorMap = {
  BIM: '#7AC8A4',
  CAD: '#FFA07A',
  GIS: '#87CEFA',
  SaaS: '#FFD700',
  Programspråk: '#DDA0DD',
  Visualisering: '#90EE90',
  Simulering: '#F08080',
  Maskininlärning: '#D8BFD8',
  Datadelning: '#D3D3D3',
  Gränssnitt: '#ADD8E6',
  Spelmotor: '#FFB6C1'
};


export function initialElements() {
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const radius = 500;
  const angleStep = (2 * Math.PI) / rawData.length;

  // Step 1: Create nodes with circular layout
  const nodes = rawData.map((item, index) => {
    const angle = index * angleStep;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);

    return {
      id: item.Name,
      type: 'custom',
      position: { x, y },
      data: {
        label: item.Name,
        type: item.Type,
        description: item.Description,
        website: item.Website,
        interoperability: item.Interoperability?.split(',').map(s => s.trim()) || [],
        color: colorMap[item.Type] || '#ccc'
      }
    };
  });

  // Step 2: Create edges based on interoperability
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = [];

  nodes.forEach(node => {
    node.data.interoperability.forEach(target => {
      if (
        nodeIds.has(target) &&
        node.id !== target &&
        node.id < target // ensures only one direction is kept
      ) {
        edges.push({
          id: `e-${node.id}-${target}`,
          source: node.id,
          target: target,
          type: 'floating',
          markerEnd: {
            type: MarkerType.Arrow
          }
        });
      }
    });
  });
  
    // 3. Count degree (connections) per node
  const connectionCount = {};
  edges.forEach(edge => {
    connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
    connectionCount[edge.target] = (connectionCount[edge.target] || 0) + 1;
  });

  // 4. Add size info to each node
  nodes.forEach(node => {
    const count = connectionCount[node.id] || 1;
    node.data.size = count;
  });

  return { nodes, edges };
}