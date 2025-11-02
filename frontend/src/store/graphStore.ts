import { create } from 'zustand'
import type { AnyLayer, GraphEdge, TensorShape } from '../types/graph'

interface GraphState {
  layers: Record<string, AnyLayer>
  edges: GraphEdge[]

  // Actions
  addLayer: (layer: AnyLayer) => void
  removeLayer: (id: string) => void
  updateLayerParams: (id: string, params: Record<string, any>) => void
  updateLayerPosition: (id: string, position: { x: number; y: number }) => void
  addEdge: (edge: GraphEdge) => void
  removeEdge: (id: string) => void
  recomputeShapes: () => void
  getInputShape: (layerId: string) => TensorShape | undefined
}

// Compute output shape for a layer given its input shape
function computeOutputShape(layer: AnyLayer, inputShape?: TensorShape): TensorShape {
  switch (layer.kind) {
    case 'Input':
      return { type: 'vector', size: layer.params.size }

    case 'Dense':
      if (inputShape?.type === 'vector') {
        return { type: 'vector', size: layer.params.units }
      }
      return { type: 'unknown' }

    case 'Convolution':
      if (inputShape?.type === 'vector') {
        return { type: 'vector', size: layer.params.filters }
      }
      return { type: 'unknown' }

    case 'Output':
      if (inputShape?.type === 'vector') {
        return { type: 'vector', size: layer.params.classes }
      }
      return { type: 'unknown' }

    default:
      return { type: 'unknown' }
  }
}

export const useGraphStore = create<GraphState>((set, get) => ({
  layers: {},
  edges: [],

  addLayer: (layer) => {
    set((state) => ({
      layers: { ...state.layers, [layer.id]: layer } as Record<string, AnyLayer>
    }))
    get().recomputeShapes()
  },

  removeLayer: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.layers
    return {
      layers: rest as Record<string, AnyLayer>,
      edges: state.edges.filter(e => e.source !== id && e.target !== id)
    }
  }),

  updateLayerParams: (id, params) => {
    set((state) => {
      const layer = state.layers[id]
      if (!layer) return state

      return {
        layers: {
          ...state.layers,
          [id]: { ...layer, params: { ...layer.params, ...params } } as AnyLayer
        } as Record<string, AnyLayer>
      }
    })
    get().recomputeShapes()
  },

  updateLayerPosition: (id, position) => {
    set((state) => {
      const layer = state.layers[id]
      if (!layer) return state
      return {
        layers: {
          ...state.layers,
          [id]: { ...layer, position } as AnyLayer,
        } as Record<string, AnyLayer>,
      }
    })
  },

  addEdge: (edge) => {
    const normalizeHandle = (handle?: string | null) => handle ?? null

    set((state) => {
      const nextEdges = state.edges.filter((existing) => {
        const sameSourcePort =
          existing.source === edge.source &&
          normalizeHandle(existing.sourceHandle) === normalizeHandle(edge.sourceHandle)

        const sameTargetPort =
          existing.target === edge.target &&
          normalizeHandle(existing.targetHandle) === normalizeHandle(edge.targetHandle)

        return !sameSourcePort && !sameTargetPort
      })

      return {
        edges: [...nextEdges, edge] as GraphEdge[]
      }
    })
    get().recomputeShapes()
  },

  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter(e => e.id !== id)
    }))
    get().recomputeShapes()
  },

  getInputShape: (layerId: string): TensorShape | undefined => {
    const state = get()
    const incomingEdge = state.edges.find(e => e.target === layerId)

    if (!incomingEdge) return undefined

    const sourceLayer = state.layers[incomingEdge.source]
    return sourceLayer?.shapeOut
  },

  recomputeShapes: () => set((state) => {
    const updatedLayers = { ...state.layers }
    const visited = new Set<string>()

    // Topological sort helper
    function visit(layerId: string) {
      if (visited.has(layerId)) return
      visited.add(layerId)

      const layer = updatedLayers[layerId]
      if (!layer) return

      // Find incoming edge
      const incomingEdge = state.edges.find(e => e.target === layerId)

      // Visit source first if exists
      if (incomingEdge) {
        visit(incomingEdge.source)
      }

      // Get input shape
      const inputShape = incomingEdge
        ? updatedLayers[incomingEdge.source]?.shapeOut
        : undefined

      // Compute output shape
      const outputShape = computeOutputShape(layer, inputShape)
      updatedLayers[layerId] = { ...layer, shapeOut: outputShape }
    }

    // Visit all layers
    Object.keys(updatedLayers).forEach(visit)

    // Update edge labels with shapes
    const updatedEdges = state.edges.map(edge => {
      const sourceLayer = updatedLayers[edge.source]
      const label = sourceLayer?.shapeOut
        ? `${sourceLayer.shapeOut.type === 'vector' ? sourceLayer.shapeOut.size : '?'}`
        : undefined
      return { ...edge, label }
    })

    return {
      layers: updatedLayers as Record<string, AnyLayer>,
      edges: updatedEdges
    }
  })
}))

// Convert graph to backend architecture format
type VectorShapeState = { kind: 'vector'; size: number }
type ImageShapeState = { kind: 'image'; channels: number; height: number; width: number }
type ShapeState = VectorShapeState | ImageShapeState

function inferImageShapeFromSize(size: number): ImageShapeState | undefined {
  const side = Math.round(Math.sqrt(size))
  if (side * side !== size) return undefined
  return { kind: 'image', channels: 1, height: side, width: side }
}

function ensureFlattenLayer(state: ShapeState, layers: any[]): VectorShapeState {
  if (state.kind === 'vector') return state
  const flattenedSize = state.channels * state.height * state.width
  layers.push({ type: 'flatten' })
  return { kind: 'vector', size: flattenedSize }
}

function computeConvOutputDim(input: number, kernel: number, stride: number, padding: 'same' | 'valid'): number {
  if (padding === 'same') {
    return Math.ceil(input / stride)
  }
  return Math.max(1, Math.floor((input - kernel) / stride + 1))
}

export function graphToArchitecture(layers: Record<string, AnyLayer>, edges: GraphEdge[]) {
  // Build adjacency map for graph traversal
  const adjacency = new Map<string, string>()
  edges.forEach(edge => {
    adjacency.set(edge.target, edge.source)
  })

  // Find input layer (no incoming edges)
  const inputLayer = Object.values(layers).find(
    layer => layer.kind === 'Input' && !edges.some(e => e.target === layer.id)
  )

  if (!inputLayer || inputLayer.kind !== 'Input') {
    throw new Error('No input layer found')
  }

  const inputSize = inputLayer.params.size
  const initialImageShape = inferImageShapeFromSize(inputSize)
  let currentShape: ShapeState = initialImageShape ?? { kind: 'vector', size: inputSize }
  const backendLayers: any[] = []

  // Traverse graph in topological order starting from input
  let currentId: string | undefined = inputLayer.id

  while (currentId) {
    const layer = layers[currentId]
    if (!layer) break

    if (layer.kind === 'Input') {
      // Skip adding the input layer itself; move to next
    } else if (layer.kind === 'Dense') {
      currentShape = ensureFlattenLayer(currentShape, backendLayers)
      const units = layer.params.units
      const inputDim = currentShape.size
      backendLayers.push({
        type: 'linear',
        in: inputDim,
        out: units,
      })

      const activation = layer.params.activation
      if (activation && activation !== 'none') {
        backendLayers.push({ type: activation })
      }

      currentShape = { kind: 'vector', size: units }
    } else if (layer.kind === 'Convolution') {
      if (currentShape.kind === 'vector') {
        const inferred = inferImageShapeFromSize(currentShape.size)
        if (!inferred) {
          throw new Error('Cannot infer image shape for convolution layer input')
        }
        currentShape = inferred
      }

      const { filters, kernel, stride, padding, activation } = layer.params
      const strideValue = Math.max(1, stride)
      const paddingMode: 'same' | 'valid' = padding === 'same' ? 'same' : 'valid'

      backendLayers.push({
        type: 'conv2d',
        in_channels: currentShape.channels,
        out_channels: filters,
        kernel_size: kernel,
        stride: strideValue,
        padding: paddingMode,
      })

      if (activation && activation !== 'none') {
        backendLayers.push({ type: activation })
      }

      const nextHeight = computeConvOutputDim(currentShape.height, kernel, strideValue, paddingMode)
      const nextWidth = computeConvOutputDim(currentShape.width, kernel, strideValue, paddingMode)

      currentShape = {
        kind: 'image',
        channels: filters,
        height: nextHeight,
        width: nextWidth,
      }
    } else if (layer.kind === 'Output') {
      currentShape = ensureFlattenLayer(currentShape, backendLayers)

      const classes = layer.params.classes
      const inputDim = currentShape.size
      backendLayers.push({
        type: 'linear',
        in: inputDim,
        out: classes,
      })

      if (layer.params.activation === 'softmax') {
        backendLayers.push({ type: 'softmax' })
      }

      currentShape = { kind: 'vector', size: classes }
    }

    // Move to next connected layer
    const nextEdge = edges.find(e => e.source === currentId)
    currentId = nextEdge?.target
  }

  const architecture: Record<string, any> = {
    input_size: inputSize,
    layers: backendLayers,
  }

  if (initialImageShape) {
    architecture.input_channels = initialImageShape.channels
    architecture.input_height = initialImageShape.height
    architecture.input_width = initialImageShape.width
  }

  return architecture
}
