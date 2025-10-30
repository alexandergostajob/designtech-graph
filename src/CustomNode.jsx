import { memo } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';

const CustomNode = ({ data, selected }) => {
  const baseSize = 8;
  const scale = (Math.log(10*data.size)); // dampens size growth
  const padding = baseSize * scale;

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div style={{
          padding: '4px 8px',
          fontSize: 12,
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: 4
        }}>
          <div><strong>{data.type}</strong>{data.description ? `: ${data.description}` : ''}</div>
          {data.website && (
            <div><strong>Website: </strong>
            <a
              href={data.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0077cc', textDecoration: 'underline' }}
            >
              {data.website}
            </a>
            </div>
          )}
        </div>
      </NodeToolbar>

      <div
        style={{
          padding: `${padding / 4}px ${padding / 2}px`,
          backgroundColor: data.color,
          border: '1px solid #aaa',
          borderRadius: 6,
          textAlign: 'center',
          fontSize: `${10 + scale * 2}px`,
          opacity: data.opacity ?? 1,
          transition: 'opacity 0.3s',
          hidden: false,
          color: data.type.toLowerCase() === 'company' ? '#ffffff' : 'inherit',
          fontWeight: data.type.toLowerCase() === 'company' ? 'bold' : 'normal'
        }}
      >
        {data.label}
      </div>

      <Handle 
      type="target" 
      position={Position.Left}
      style={{
        width: 16,
        height: 40,

        background: 'transparent',
        border: 'none',
      }}
      />
      <Handle 
      type="source" 
      position={Position.Right} 
      style={{
        width: 16,
        height: 40,
        background: 'transparent',
        border: 'none',
      }}
      />
    </>
  );
};

export default memo(CustomNode);
