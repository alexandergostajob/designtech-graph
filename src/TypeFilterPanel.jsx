import { Panel } from '@xyflow/react';

const TypeFilterPanel = ({ types, activeTypes, toggleType }) => {
  return (
    <Panel position="top-left" style={{ top: 100, left: 10 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Filter types</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {types.map(({ type, color }) => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            style={{
              backgroundColor: color,
              opacity: activeTypes.has(type) ? 1 : 0.2,
              border: 'none',
              padding: '4px 4px',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#000',
              textAlign: 'left',
              fontSize: "small"
            }}
          >
            {type}
          </button>
        ))}
      </div>
    </Panel>
  );
};

export default TypeFilterPanel;
