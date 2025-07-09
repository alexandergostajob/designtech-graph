// arrangeNodes.js
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
