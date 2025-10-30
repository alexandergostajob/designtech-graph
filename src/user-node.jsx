import { memo, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

const UserNode = ({ data }) => {
  const divRef = useRef(null);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerText = data.label || 'Ny nod';
    }
  }, [data.label]);

  const baseSize = 8;
  const scale = Math.log(10 * (data.size || 1));
  const padding = baseSize * scale;

  return (
    <>
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        style={{
          padding: `${padding}px ${padding}px`,
          backgroundColor: data.color || '#ccc',
          border: '1px solid #aaa',
          borderRadius: 6,
          textAlign: 'center',
          fontSize: `${10 + scale * 2}px`,
          opacity: data.opacity ?? 1,
          transition: 'opacity 0.3s',
          minWidth: 80,
        }}
      />
      <Handle type="target" position={Position.Left} style={{ width: 16, height: 40, background: 'transparent', border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ width: 16, height: 40, background: 'transparent', border: 'none' }} />
    </>
  );
};

export default memo(UserNode);
