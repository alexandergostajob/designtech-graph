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
  
  // Startpunkt för harmoniska färger
  const baseHue = 10; // lägre start för mer variation
  const hueStep = 50; // större skillnad mellan färger
  const saturation = 55; // lite dämpad
  const lightness = 70;  // mjuk pastellkänsla

  types.forEach((type, i) => {
    if (i < colorPalette.length) {
      colorMap[type] = colorPalette[i];
    } else {
      const hue = (baseHue + i * hueStep) % 360;
      colorMap[type] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
      interoperability: item.Interoperability?.split(',').map(s => s.trim()) || [],
      color: colorMap[item.Type] || '#ccc'
    }
  }));

  // 🎯 Använd arrangeNodes för att sätta positioner i en cirkel baserat på namn
  const width = window.innerWidth;
  const height = window.innerHeight;
  const positionedNodes = arrangeNodes(nodes, width, height); // default sort by 'Name'

  // 💡 Fortsätt här med kanter och storlekar som tidigare...
  const nodeIds = new Set(positionedNodes.map(n => n.id));
  const edgeSet = new Set();
  const edges = [];

  positionedNodes.forEach(node => {
    node.data.interoperability.forEach(target => {
      const [id1, id2] = [node.id, target].sort(); // sortera alfabetiskt för unik kombo
      const edgeId = `e-${id1}-${id2}`;

      if (node.id !== target && nodeIds.has(target) && !edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        edges.push({
          id: edgeId,
          source: node.id,
          target: target,
          type: 'floating'
        });
      }
    });
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