import { getBezierPath, useInternalNode } from '@xyflow/react';
 
import { getEdgeParams } from './utils.js';
 
function FloatingEdge({ id, source, target, data }) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
 
  if (!sourceNode || !targetNode) {
    return null;
  }
 
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
  );
 
  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });
 
  const sourceColor = sourceNode?.data?.color || '#222';

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      style={
        {stroke: sourceColor,
        opacity: data.opacity ?? 1,
        transition: 'opacity 0.3s ease',
        }
      }
    />
  );
}
 
export default FloatingEdge;
