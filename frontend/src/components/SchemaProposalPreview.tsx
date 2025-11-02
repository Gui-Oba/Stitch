import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { InputLayerNode } from '@/components/nodes/InputLayerNode'
import { DenseLayerNode } from '@/components/nodes/DenseLayerNode'
import { ConvLayerNode } from '@/components/nodes/ConvLayerNode'
import { OutputLayerNode } from '@/components/nodes/OutputLayerNode'
import { PoolingLayerNode } from '@/components/nodes/PoolingLayerNode'
import { FlattenLayerNode } from '@/components/nodes/FlattenLayerNode'
import { DropoutLayerNode } from '@/components/nodes/DropoutLayerNode'
import type { AnyLayer, GraphEdge, LayerKind } from '@/types/graph'

const nodeTypes: NodeTypes = {
  input: InputLayerNode,
  dense: DenseLayerNode,
  conv: ConvLayerNode,
  pool: PoolingLayerNode,
  flatten: FlattenLayerNode,
  dropout: DropoutLayerNode,
  output: OutputLayerNode,
}

const layerKindToNodeType: Record<LayerKind, keyof typeof nodeTypes> = {
  Input: 'input',
  Dense: 'dense',
  Convolution: 'conv',
  Pooling: 'pool',
  Flatten: 'flatten',
  Dropout: 'dropout',
  Output: 'output',
}

interface SchemaProposalPreviewProps {
  currentLayers: Record<string, AnyLayer>
  currentEdges: GraphEdge[]
  proposedLayers: Record<string, AnyLayer>
  proposedEdges: GraphEdge[]
  onApply: () => void
  onReject: () => void
}

type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

export function SchemaProposalPreview({
  currentLayers,
  currentEdges,
  proposedLayers,
  proposedEdges,
  onApply,
  onReject,
}: SchemaProposalPreviewProps) {
  const { currentNodes, proposedNodes } = useMemo(() => {
    // Detect layer changes
    const layerChanges = new Map<string, ChangeType>()

    // Check for removed and modified layers
    Object.keys(currentLayers).forEach((id) => {
      if (!proposedLayers[id]) {
        layerChanges.set(id, 'removed')
      } else {
        // Check if layer was modified
        const current = currentLayers[id]
        const proposed = proposedLayers[id]
        const isModified =
          current.kind !== proposed.kind ||
          JSON.stringify(current.params) !== JSON.stringify(proposed.params)

        layerChanges.set(id, isModified ? 'modified' : 'unchanged')
      }
    })

    // Check for added layers
    Object.keys(proposedLayers).forEach((id) => {
      if (!currentLayers[id]) {
        layerChanges.set(id, 'added')
      }
    })

    const getNodeColor = (changeType: ChangeType): string => {
      switch (changeType) {
        case 'added':
          return '#10b981' // green
        case 'removed':
          return '#ef4444' // red
        case 'modified':
          return '#f59e0b' // yellow
        default:
          return '#6b7280' // gray
      }
    }

    const createNodes = (
      layers: Record<string, AnyLayer>,
      isProposed: boolean
    ): Node[] => {
      return Object.values(layers).map((layer, index) => {
        const changeType = layerChanges.get(layer.id) || 'unchanged'
        const borderColor = getNodeColor(changeType)

        return {
          id: layer.id,
          type: layerKindToNodeType[layer.kind],
          position: layer.position ?? { x: index * 300 + 50, y: 250 },
          data: {},
          draggable: false,
          style: {
            background: 'transparent',
            border: `3px solid ${borderColor}`,
            borderRadius: '8px',
            padding: 0,
            boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 0 0 3px ${borderColor}33`,
          },
        }
      })
    }

    const currentNodes = createNodes(currentLayers, false)
    const proposedNodes = createNodes(proposedLayers, true)

    return { currentNodes, proposedNodes }
  }, [currentLayers, proposedLayers])

  const { currentReactFlowEdges, proposedReactFlowEdges } = useMemo(() => {
    const createEdges = (edges: GraphEdge[]): Edge[] => {
      return edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        label: edge.label,
        animated: true,
      }))
    }

    return {
      currentReactFlowEdges: createEdges(currentEdges),
      proposedReactFlowEdges: createEdges(proposedEdges),
    }
  }, [currentEdges, proposedEdges])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Architecture Proposal</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review the proposed changes to your neural network architecture
          </p>
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Modified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Removed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span>Unchanged</span>
            </div>
          </div>
        </div>

        {/* Side by side comparison */}
        <div className="flex-1 flex overflow-hidden">
          {/* Current */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Current Architecture</h3>
            </div>
            <div className="flex-1">
              <ReactFlow
                nodes={currentNodes}
                edges={currentReactFlowEdges}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Background />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </div>

          {/* Proposed */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <h3 className="font-semibold text-blue-900">Proposed Architecture</h3>
            </div>
            <div className="flex-1">
              <ReactFlow
                nodes={proposedNodes}
                edges={proposedReactFlowEdges}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Background />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
          <button
            onClick={onReject}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onApply}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}
