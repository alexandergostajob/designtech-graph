import rawData from './data.json';
import { arrangeNodes } from './utils';

const colorPalette = [
  '#7AC8A4', // grön
  '#FFA07A', // korall
  '#87CEFA', // ljusblå
  '#FFD700', // gul
  '#DDA0DD', // ljuslila
  '#D3D3D3', // grå
  '#ADD8E6', // blågrå
  '#90EE90', // ljusgrön
  '#F08080', // rödrosa
  '#B0C4DE', // stålblå
  '#FFB6C1', // ljusrosa
];

function generateColorMap(data) {
  const types = [...new Set(data.map(item => item.Type))];
  const colorMap = {};
  
  // Always set company type to a distinctive dark blue
  const COMPANY_COLOR = '#1E40AF';  // distinctive dark blue
  
  let colorIndex = 0;
  types.forEach((type) => {
    if (type.toLowerCase() === 'company') {
      colorMap[type] = COMPANY_COLOR;
    } else {
      // For non-company types, use the color palette
      if (colorIndex < colorPalette.length) {
        colorMap[type] = colorPalette[colorIndex];
      } else {
        // Fallback to HSL if we run out of palette colors
        const hue = (10 + colorIndex * 50) % 360;
        colorMap[type] = `hsl(${hue}, 55%, 70%)`;
      }
      colorIndex++;
    }
  });

  return colorMap;
}

export function initialElements() {
  const filteredData = rawData.filter(item => item.Type.toLowerCase() !== 'filformat');
  const colorMap = generateColorMap(filteredData);

  const nodes = filteredData.map(item => ({
    id: item.Name,
    type: 'custom',
    data: {
      label: item.Name,
      type: item.Type,
      description: item.Description,
      website: item.Website,
      designtechs: item.Designtechs || [],
      color: colorMap[item.Type] || '#ccc'
    }
  }));

  // 🎯 Använd arrangeNodes för att sätta positioner i en cirkel baserat på namn
  const width = window.innerWidth;
  const height = window.innerHeight;
  const positionedNodes = arrangeNodes(nodes, width, height); // default sort by 'Name'

  // 💡 Fortsätt här med kanter och storlekar som tidigare...
  const nodeIds = new Set(positionedNodes.map(n => n.id));
  const edges = [];

  // Create edges from companies to their design technologies
  positionedNodes.forEach(node => {
    if (node.data.type.toLowerCase() === 'company' && node.data.designtechs) {
      node.data.designtechs.forEach(tech => {
        if (nodeIds.has(tech)) {
          const edgeId = `e-${node.id}-${tech}`;
          edges.push({
            id: edgeId,
            source: node.id,
            target: tech,
            type: 'floating'
          });
        }
      });
    }
  });

  const connectionCount = {};
  edges.forEach(edge => {
    connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
    connectionCount[edge.target] = (connectionCount[edge.target] || 0) + 1;
  });

  positionedNodes.forEach(node => {
    node.data.size = connectionCount[node.id] || 1;
  });

  return { nodes: positionedNodes, edges };
}