import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
} from 'd3-force';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Panel,
  MiniMap,
  addEdge,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodesInitialized,
  applyNodeChanges
} from '@xyflow/react';
 
import { collide } from './collide.js';
import FloatingEdge from './FloatingEdge';
import FloatingConnectionLine from './FloatingConnectionLine';
import { initialElements } from './initialElements.js';
import CustomNode from './CustomNode';
import UserNode  from './user-node.jsx';
import ArrangeButton from './ArrangeButton';
import { arrangeNodes, createUserNode } from './utils';

import '@xyflow/react/dist/style.css';
import TypeFilterPanel from './TypeFilterPanel.jsx';
 
const width = window.innerWidth;
const height = window.innerHeight;
const getNodeId = () => `node_${+new Date()}`;
const edgeTypes = { floating: FloatingEdge };
const { nodes: initialNodes, edges: initialEdges } = initialElements();

const useLayoutedElements = () => {
  const { getNodes, setNodes, getEdges, fitView } = useReactFlow();
  const initialized = useNodesInitialized();

  const aspectRatio = width / height;
  const aspectModifier = aspectRatio * 0.8;
  const baseStrength = 0.075;
  const xStrength = baseStrength * (1 / aspectModifier);
  const yStrength = baseStrength * aspectModifier;

  const simulation = forceSimulation()
    .force('charge', forceManyBody().strength(-1200))
    .force('x', forceX().x(0).strength(xStrength))
    .force('y', forceY().y(0).strength(yStrength))
    .force('collide', collide())
    .alphaTarget(0.05)
    .stop();

  const draggingNodeRef = useRef(null);
  const runningRef = useRef(false); 

  const dragEvents = useMemo(() => ({
    start: (_event, node) => (draggingNodeRef.current = node),
    drag: (_event, node) => (draggingNodeRef.current = node),
    stop: () => (draggingNodeRef.current = null),
  }), []);

  return useMemo(() => {
    const nodes = getNodes().map((node) => ({
      ...node,
      x: node.position.x,
      y: node.position.y,
    }));

    const edges = getEdges();

    if (!initialized || nodes.length === 0) return [false, {}, dragEvents];

    simulation.nodes(nodes).force(
      'link',
      forceLink(edges)
        .id(d => d.id)
        .strength(0.05)
        .distance(100)
    );

    const tick = () => {
      getNodes().forEach((node, i) => {
        const dragging = draggingNodeRef.current?.id === node.id;

        if (dragging) {
          nodes[i].fx = draggingNodeRef.current.position.x;
          nodes[i].fy = draggingNodeRef.current.position.y;
        } else {
          delete nodes[i].fx;
          delete nodes[i].fy;
        }
      });

      simulation.tick();

      setNodes(prevNodes => {
        const simMap = new Map(nodes.map(n => [n.id, n]));

        const changes = prevNodes.map(node => {
          const simNode = simMap.get(node.id);
          if (!simNode) return null;

          return {
            id: node.id,
            type: 'position',
            position: {
              x: simNode.fx ?? simNode.x,
              y: simNode.fy ?? simNode.y,
            }
          };
        }).filter(Boolean);

        return applyNodeChanges(changes, prevNodes);
      });

      window.requestAnimationFrame(() => {
        fitView();
        if (runningRef.current) tick();
      });
    };

    const toggle = () => {
      if (!runningRef.current) {
        getNodes().forEach((node, i) => {
          Object.assign(nodes[i], node);
          nodes[i].x = node.position.x;
          nodes[i].y = node.position.y;
        });
      }

      runningRef.current = !runningRef.current;
      if (runningRef.current) window.requestAnimationFrame(tick);
    };

    const isRunning = () => runningRef.current;

    return [true, { toggle, isRunning }, dragEvents];
  }, [initialized, dragEvents, getNodes, getEdges, setNodes, fitView]);
};

const LayoutFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [interoperabilityOrder, setInteroperabilityOrder] = useState(1);

  const allTypes = useMemo(() => {
    const types = Array.from(new Set(nodes.map(n => n.data.type)));
    return types.map(type => ({
      type,
      color: nodes.find(n => n.data.type === type)?.data.color || '#ccc',
    }));
  }, [nodes]);


  const [activeTypes, setActiveTypes] = useState(new Set(allTypes.map(t => t.type)));

  const toggleType = (type) => {
      setActiveTypes(prev => {
        const updated = new Set(prev);
        if (updated.has(type)) {
          updated.delete(type);
        } else {
          updated.add(type);
        }
        return updated;
      });
    };
    
    useEffect(() => {
      setNodes((prevNodes) => {
        const updatedNodes = prevNodes.map((node) => ({
          ...node,
          hidden: !activeTypes.has(node.data.type),
        }));

        const nodeTypeMap = new Map();
        updatedNodes.forEach((n) => nodeTypeMap.set(n.id, n.data.type));

        setEdges((prevEdges) =>
          prevEdges.map((edge) => {
            const sourceType = nodeTypeMap.get(edge.source);
            const targetType = nodeTypeMap.get(edge.target);
            const visible = activeTypes.has(sourceType) && activeTypes.has(targetType);
            return {
              ...edge,
              hidden: !visible,
            };
          })
        );

        return updatedNodes;
      });
    }, [activeTypes]);


  const firstOrderNodes = new Set();
  const firstOrderEdges = new Set();
  const secondOrderNodes = new Set();
  const secondOrderEdges = new Set();

  if (selectedNodeId) {
    // First-degree
    edges.forEach((edge) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        firstOrderEdges.add(edge.id);
        firstOrderNodes.add(edge.source);
        firstOrderNodes.add(edge.target);
      }
    });

    if (interoperabilityOrder === 2) {
      // Second-degree
      edges.forEach((edge) => {
        const isConnectedToFirst = firstOrderNodes.has(edge.source) || firstOrderNodes.has(edge.target);
        const isDirect = edge.source === selectedNodeId || edge.target === selectedNodeId;

        if (isConnectedToFirst && !isDirect) {
          secondOrderEdges.add(edge.id);
          if (!firstOrderNodes.has(edge.source)) secondOrderNodes.add(edge.source);
          if (!firstOrderNodes.has(edge.target)) secondOrderNodes.add(edge.target);
        }
      });
    }
  }

  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      let opacity = 1;

      if (selectedNodeId) {
        if (firstOrderNodes.has(node.id)) {
          opacity = 1;
        } else if (interoperabilityOrder === 2 && secondOrderNodes.has(node.id)) {
          opacity = 0.5;
        } else {
          opacity = 0.1;
        }
      }

      return {
        ...node,
        data: {
          ...node.data,
          isDimmed: opacity < 1,
          opacity,
        },
      };
    });
  }, [nodes, selectedNodeId, firstOrderNodes, secondOrderNodes, interoperabilityOrder]);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      let opacity = 1;

      if (selectedNodeId) {
        if (firstOrderEdges.has(edge.id)) {
          opacity = 1;
        } else if (interoperabilityOrder === 2 && secondOrderEdges.has(edge.id)) {
          opacity = 0.35;
        } else {
          opacity = 0.05;
        }
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          isDimmed: opacity < 1,
          opacity,
        },
      };
    });
  }, [edges, selectedNodeId, firstOrderEdges, secondOrderEdges, interoperabilityOrder]);


    const onConnect = useCallback(
      (params) =>
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: 'floating',
            },
            eds,
          ),
        ),
      [setEdges],
    );

  const [initialized, { toggle, isRunning }, dragEvents] = useLayoutedElements();

  const handleArrange = (arrangeBy) => {
    const newNodes = arrangeNodes(nodes, width, height, arrangeBy);
    setNodes(newNodes);
  };

  const handleAddNode = () => {
    const newNode = {
      id: getNodeId(),
      type: 'user',
      data: { label: 'right-click to name me', editable: true, type:"user" },
      position: { x: 50, y: 50 },
    };
    setNodes(nds => [...nds, newNode]);
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        
        edgeTypes={edgeTypes}
        nodeTypes={{custom: CustomNode, user:UserNode}}
        onPaneClick={() => setSelectedNodeId(null)}
        nodes={styledNodes}
        edges={styledEdges}
        onNodeDragStart={dragEvents.start}
        onNodeDrag={dragEvents.drag}
        onNodeDragStop={dragEvents.stop}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onConnect={onConnect}
        connectionLineComponent={FloatingConnectionLine}
      >

        <Panel position="top-left">
          {initialized && (
            <>
              <button onClick={toggle} style={{ marginRight: '5px' }}>
                {isRunning() ? 'Stop' : 'Start'} force simulation
              </button>
              <button onClick={handleAddNode}>Add node</button>

              <label style={{ display: 'flex', alignItems: 'center', marginLeft: '10px', marginTop: "20px" }}>
              <span>Order of interoperability: {interoperabilityOrder}</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={interoperabilityOrder === 2}
                  onChange={() =>
                    setInteroperabilityOrder((prev) => (prev === 1 ? 2 : 1))
                  }
                />
                <span className="slider" />
              </label>
            </label>
            </>
          )}
        </Panel>
        <TypeFilterPanel types={allTypes} activeTypes={activeTypes} toggleType={toggleType} />
        <MiniMap />
        <Controls />
        <ArrangeButton arrangeBy="label" onClick={handleArrange} position="top-right" />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};
 
export default function () {
  return (
    <ReactFlowProvider>
      <LayoutFlow />
    </ReactFlowProvider>
  );
}