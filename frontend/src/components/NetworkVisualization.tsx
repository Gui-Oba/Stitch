import { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { StoredLayer } from '@/hooks/useModels'

function createNodes(layers: StoredLayer[], currentDrawing?: number[][]): Node[] {
  const nodes: Node[] = []
  const verticalSpacing = 80
  const horizontalSpacing = 600 // Increased spacing between layers
  
  layers.forEach((layer, layerIndex) => {
    const numNeurons = layer.type === 'linear' ? layer.out ?? 1 : 1
    
    if (layerIndex === 0 && numNeurons === 784) {
      // Special handling for 28x28 input layer
      const gridSize = 28
      const nodeSize = 12
      const spacing = 14
      const totalWidth = gridSize * spacing
      const totalHeight = gridSize * spacing
      
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const index = row * gridSize + col
          const value = currentDrawing?.[row]?.[col] ?? 0
          const intensity = Math.floor(value * 255)
          
          const node: Node = {
            id: `${layerIndex}-${index}`,
            position: {
              x: col * spacing - totalWidth / 2,
              y: row * spacing - totalHeight / 2 + 150
            },
            data: { label: '' },
            className: 'rounded-full',
            style: {
              width: nodeSize,
              height: nodeSize,
              borderRadius: '50%',
              backgroundColor: `rgb(${intensity}, ${intensity}, ${intensity})`,
              border: '1px solid #93c5fd'
            }
          }
          nodes.push(node)
        }
      }
    } else {
      // Regular layer handling
      for (let i = 0; i < numNeurons; i++) {
        const node: Node = {
          id: `${layerIndex}-${i}`,
          position: {
            x: layerIndex * horizontalSpacing,
            y: i * verticalSpacing - (numNeurons * verticalSpacing) / 2 + 150
          },
          data: {
            label: layer.type === 'linear' ? '' : layer.type
          },
          className: 'rounded-full bg-blue-500 text-white text-xs',
          style: {
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }
        }
        nodes.push(node)
      }
    }
  })
  
  return nodes
}

function createEdges(layers: StoredLayer[]): Edge[] {
  const edges: Edge[] = []
  
  // Connect each node to all nodes in the next layer
  for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
    const currentLayerSize = layers[layerIndex].type === 'linear' 
      ? layers[layerIndex].out ?? 1 
      : 1
    const nextLayerSize = layers[layerIndex + 1].type === 'linear'
      ? layers[layerIndex + 1].out ?? 1
      : 1
      
    for (let i = 0; i < currentLayerSize; i++) {
      for (let j = 0; j < nextLayerSize; j++) {
        edges.push({
          id: `${layerIndex}-${i}-to-${layerIndex + 1}-${j}`,
          source: `${layerIndex}-${i}`,
          target: `${layerIndex + 1}-${j}`,
          style: { stroke: '#93c5fd', strokeWidth: 1 },
          type: 'straight',
        })
      }
    }
  }
  
  return edges
}

interface NetworkVisualizationProps {
  layers: StoredLayer[]
  currentDrawing?: number[][]
}

export function NetworkVisualization({ layers, currentDrawing }: NetworkVisualizationProps) {
  const nodes = createNodes(layers, currentDrawing)
  const edges = createEdges(layers)
  
  const handleInit = useCallback(() => {
    // Center the view when the flow is initialized
  }, [])
  
  return (
    <div className="h-[500px] w-full rounded-lg border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={handleInit}
        fitView
        minZoom={0.01}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}