/**
 * App.jsx - Main component for the DesignTech Usage Visualization application
 * 
 * This application visualizes relationships between companies and design technology tools,
 * showing both direct company usage and tool interoperability connections.
 */

// D3 force simulation imports for graph layout
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
} from 'd3-force';

// React core hooks
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// ReactFlow components and hooks for graph visualization
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
 
// Custom components and utilities
import { collide } from './collide.js';              // Custom collision detection for nodes
import FloatingEdge from './FloatingEdge';           // Custom edge component
import FloatingConnectionLine from './FloatingConnectionLine';  // Visual feedback for edge creation
import { initialElements } from './initialElements.js';         // Initial graph data
import CustomNode from './CustomNode';                // Custom node component
import UserNode  from './user-node.jsx';             // User-editable node component
import ArrangeButton from "./ArrangeButton.jsx";     // Layout control button
import rawData from './data.json';                   // Source data for visualization
import { arrangeNodes, arrangeNodesVertically, buildCompanyEdges, buildInteroperabilityEdges } from './utils';

// Styles and UI components
import '@xyflow/react/dist/style.css';
import TypeFilterPanel from './TypeFilterPanel.jsx';
 
// Constants for viewport dimensions and node/edge configuration
const width = window.innerWidth;
const height = window.innerHeight;
const getNodeId = () => `node_${+new Date()}`; // Generates unique IDs for new nodes
const edgeTypes = { floating: FloatingEdge }; // Register custom edge type
const { nodes: initialNodes, edges: initialEdges } = initialElements();

/**
 * Custom hook for managing force-directed layout of graph elements
 * This hook handles the physics simulation that positions nodes and edges
 * in a visually appealing way using D3's force simulation
 */
const useLayoutedElements = () => {
  // Get ReactFlow utilities for node/edge management
  const { getNodes, setNodes, getEdges, fitView } = useReactFlow();
  const initialized = useNodesInitialized(); // Check if nodes are ready

  // Calculate force strengths based on viewport aspect ratio
  const aspectRatio = width / height;
  const aspectModifier = aspectRatio * 0.8; // Adjust forces based on screen shape
  const baseStrength = 0.075;
  const xStrength = baseStrength * (1 / aspectModifier); // Horizontal force
  const yStrength = baseStrength * aspectModifier;       // Vertical force

  // Configure D3 force simulation
  const simulation = forceSimulation()
    .force('charge', forceManyBody().strength(-1200))  // Repulsion between nodes
    .force('x', forceX().x(0).strength(xStrength))     // Center nodes horizontally
    .force('y', forceY().y(0).strength(yStrength))     // Center nodes vertically
    .force('collide', collide())                       // Prevent node overlap
    .alphaTarget(0.05)                                 // Keep simulation "warm"
    .stop();                                           // Don't start automatically

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

/**
 * Main component for the graph visualization
 * Manages the graph state, user interactions, and visualization modes
 */
const LayoutFlow = () => {
  // State management for graph elements
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Visualization mode state
  const [edgeMode, setEdgeMode] = useState('company'); // Toggle between company connections and tool interoperability
  const [selectedNodeId, setSelectedNodeId] = useState(null); // Currently selected node for highlighting
  const [interoperabilityOrder, setInteroperabilityOrder] = useState(1); // Depth of interoperability connections (1st or 2nd order)
  
  // ReactFlow utility for viewport management
  const { fitView } = useReactFlow();

  // Extract unique node types and their colors for filtering
  const allTypes = useMemo(() => {
    // Get unique types from all nodes
    const types = Array.from(new Set(nodes.map(n => n.data.type)));
    // Map types to objects with their associated colors
    return types.map(type => ({
      type,
      color: nodes.find(n => n.data.type === type)?.data.color || '#ccc',
    }));
  }, [nodes]);

  // Track which node types are currently visible
  const [activeTypes, setActiveTypes] = useState(new Set(allTypes.map(t => t.type)));

  /**
   * Toggle visibility of nodes of a specific type
   * @param {string} type - The node type to toggle
   */
  const toggleType = (type) => {
      setActiveTypes(prev => {
        const updated = new Set(prev);
        if (updated.has(type)) {
          updated.delete(type); // Hide nodes of this type
        } else {
          updated.add(type);    // Show nodes of this type
        }
        return updated;
      });
    };
    
    /**
     * Effect to update node and edge visibility based on active types
     * Hides/shows nodes and their connected edges when types are toggled
     */
    useEffect(() => {
      setNodes((prevNodes) => {
        // Update node visibility based on their type
        const updatedNodes = prevNodes.map((node) => ({
          ...node,
          hidden: !activeTypes.has(node.data.type),
        }));

        // Create a map of node IDs to their types for edge filtering
        const nodeTypeMap = new Map();
        updatedNodes.forEach((n) => nodeTypeMap.set(n.id, n.data.type));

        // Update edge visibility based on their connected nodes' types
        setEdges((prevEdges) =>
          prevEdges.map((edge) => {
            const sourceType = nodeTypeMap.get(edge.source);
            const targetType = nodeTypeMap.get(edge.target);
            // Edge is visible only if both connected nodes' types are active
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

  // Sets to track nodes and edges for interoperability visualization
  const firstOrderNodes = new Set();  // Directly connected nodes
  const firstOrderEdges = new Set();  // Direct connections
  const secondOrderNodes = new Set(); // Nodes connected through one intermediate
  const secondOrderEdges = new Set(); // Second-degree connections

  // Calculate interoperability connections when a node is selected
  if (selectedNodeId) {
    // Find first-degree connections (direct neighbors)
    edges.forEach((edge) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        firstOrderEdges.add(edge.id);            // Track the direct connection
        firstOrderNodes.add(edge.source);        // Track connected source node
        firstOrderNodes.add(edge.target);        // Track connected target node
      }
    });

    // If second-order interoperability is enabled, find indirect connections
    if (interoperabilityOrder === 2) {
      edges.forEach((edge) => {
        // Check if this edge connects to any first-order node
        const isConnectedToFirst = firstOrderNodes.has(edge.source) || firstOrderNodes.has(edge.target);
        // Avoid counting direct connections again
        const isDirect = edge.source === selectedNodeId || edge.target === selectedNodeId;

        if (isConnectedToFirst && !isDirect) {
          secondOrderEdges.add(edge.id);  // Track the indirect connection
          // Add new nodes that aren't already in first-order set
          if (!firstOrderNodes.has(edge.source)) secondOrderNodes.add(edge.source);
          if (!firstOrderNodes.has(edge.target)) secondOrderNodes.add(edge.target);
        }
      });
    }
  }

  /**
   * Apply visual styling to nodes based on their relationship to the selected node
   * - Full opacity (1.0) for directly connected nodes
   * - Medium opacity (0.5) for second-order connections
   * - Low opacity (0.1) for unrelated nodes
   */
  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      let opacity = 1;

      if (selectedNodeId) {
        if (firstOrderNodes.has(node.id)) {
          opacity = 1;      // Direct connection to selected node
        } else if (interoperabilityOrder === 2 && secondOrderNodes.has(node.id)) {
          opacity = 0.5;    // Second-order connection
        } else {
          opacity = 0.1;    // Not connected to selected node
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

  /**
   * Apply visual styling to edges based on their relationship to the selected node
   * - Full opacity (1.0) for direct connections
   * - Medium opacity (0.35) for second-order connections
   * - Very low opacity (0.05) for unrelated connections
   */
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      let opacity = 1;

      if (selectedNodeId) {
        if (firstOrderEdges.has(edge.id)) {
          opacity = 1;      // Direct connection
        } else if (interoperabilityOrder === 2 && secondOrderEdges.has(edge.id)) {
          opacity = 0.35;   // Second-order connection
        } else {
          opacity = 0.05;   // Unrelated connection
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


    /**
     * Handle new edge connections between nodes
     * Creates a new floating edge when nodes are connected by the user
     */
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

  // Initialize force-directed layout and get control functions
  const [initialized, { toggle, isRunning }, dragEvents] = useLayoutedElements();

  /**
   * Arrange nodes in the specified layout (grid or custom arrangement)
   * @param {string} arrangeBy - The layout type to apply
   */
  const handleArrange = (arrangeBy) => {
    const newNodes = arrangeNodes(nodes, width, height, arrangeBy);
    setNodes(newNodes);
    fitView();
  };

  /**
   * Add a new user-editable node to the graph
   * Creates a node with default properties that can be renamed
   */
  const handleAddNode = () => {
    const newNode = {
      id: getNodeId(),
      type: 'user',
      data: { label: 'right-click to name me', editable: true, type:"user" },
      position: { x: 50, y: 50 },
    };
    setNodes(nds => [...nds, newNode]);
  };

  /**
   * Rebuild edge connections based on the current visualization mode
   * Updates node sizes based on their connection count
   * @param {string} mode - 'company' or 'interoperability'
   * @param {Array} currentNodes - Current node array, defaults to nodes state
   */
  const rebuildEdges = (mode, currentNodes = nodes) => {
    let result;
    if (mode === 'company') {
      result = buildCompanyEdges(currentNodes, rawData);       // Company -> Tool connections
    } else {
      result = buildInteroperabilityEdges(currentNodes, rawData); // Tool -> Tool connections
    }

    const newEdges = result.edges || [];
    const connectionCount = result.connectionCount || {};

    // Update node sizes based on number of connections
    setNodes(prev => prev.map(n => ({
      ...n,
      data: {
        ...n.data,
        size: connectionCount[n.id] || 1
      }
    })));

    setEdges(newEdges);
  };

  /**
   * Toggle between company and interoperability visualization modes
   * Rebuilds edges to show different relationships between nodes
   */
  const toggleEdgeMode = () => {
    const next = edgeMode === 'company' ? 'interoperability' : 'company';
    setEdgeMode(next);
    setEdges([]); // Clear existing edges
    rebuildEdges(next); // Build new edges for selected mode
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
              <button onClick={toggleEdgeMode} style={{ marginLeft: '8px' }}>
                Edge mode: {edgeMode === 'company' ? 'Company → Designtechs' : 'Interoperability'}
              </button>

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
        <ArrangeButton onClick={handleArrange} onVerticalClick={() => {
          const newNodes = arrangeNodesVertically(nodes, width, height);
          setNodes(newNodes);
          fitView();
        }} position="top-right" />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};
 
/**
 * Root component that provides ReactFlow context
 * Wraps the main LayoutFlow component with necessary providers
 */
export default function () {
  return (
    <ReactFlowProvider>
      <LayoutFlow />
    </ReactFlowProvider>
  );
}