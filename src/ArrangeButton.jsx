import { Panel } from '@xyflow/react';

function ArrangeButtonPanel({ onClick, onVerticalClick, position = 'top-right' }) {
  return (
    <Panel position={position} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <button onClick={() => onClick('label')}>
        Arrange by Name
      </button>
      <button onClick={() => onClick('type')}>
        Arrange by Type
      </button>
      <button onClick={onVerticalClick} title="Arrange vertically by type">
        Arrange in columns
      </button>
    </Panel>
  );
}

export default ArrangeButtonPanel;
