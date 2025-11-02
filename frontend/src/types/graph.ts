// Shape types for tensor validation
export type TensorShape =
  | { type: 'vector'; size: number }
  | { type: 'image'; channels: number; height: number; width: number }
  | { type: 'unknown' };

export type LayerKind =
  | 'Input'
  | 'Dense'
  | 'Convolution'
  | 'Pooling'
  | 'Flatten'
  | 'Dropout'
  | 'Output';

export type ActivationType = 'relu' | 'sigmoid' | 'tanh' | 'softmax' | 'none';

// Base layer interface
export interface Layer {
  id: string;
  kind: LayerKind;
  params: Record<string, any>;
  shapeOut?: TensorShape;
  position?: {
    x: number;
    y: number;
  };
}

// Specific layer types
export interface InputLayer extends Layer {
  kind: 'Input';
  params: {
    size: number;
    channels?: number;
    height?: number;
    width?: number;
  };
}

export interface DenseLayer extends Layer {
  kind: 'Dense';
  params: {
    units: number;
    activation: ActivationType;
    use_bias?: boolean;
  };
}

export interface ConvLayer extends Layer {
  kind: 'Convolution';
  params: {
    filters: number;
    kernel: number;
    stride: number;
    padding: 'valid' | 'same';
    activation: Exclude<ActivationType, 'softmax'>;
  };
}

export interface PoolingLayer extends Layer {
  kind: 'Pooling';
  params: {
    type: 'max';
    pool_size: number;
    stride: number;
    padding: number;
  };
}

export interface FlattenLayer extends Layer {
  kind: 'Flatten';
  params: Record<string, never>;
}

export interface DropoutLayer extends Layer {
  kind: 'Dropout';
  params: {
    rate: number;
  };
}

export interface OutputLayer extends Layer {
  kind: 'Output';
  params: {
    classes: number;
    activation: 'softmax';
  };
}

export type AnyLayer =
  | InputLayer
  | DenseLayer
  | ConvLayer
  | PoolingLayer
  | FlattenLayer
  | DropoutLayer
  | OutputLayer;

// Edge with shape label
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

// Helper to format shape as string
export function formatShape(shape?: TensorShape): string {
  if (!shape) return 'unknown';
  if (shape.type === 'vector') return `(${shape.size})`;
  if (shape.type === 'image') {
    return `(${shape.channels}×${shape.height}×${shape.width})`;
  }
  return 'unknown';
}

// Calculate parameter count for a layer
export function calculateParams(layer: AnyLayer, inputShape?: TensorShape): number {
  if (layer.kind === 'Dense' && inputShape?.type === 'vector') {
    const weights = inputShape.size * layer.params.units;
    const useBias = layer.params.use_bias ?? true;
    const bias = useBias ? layer.params.units : 0;
    return weights + bias;
  }
  if (layer.kind === 'Convolution') {
    const kernelArea = Math.max(1, layer.params.kernel) ** 2;
    if (inputShape?.type === 'image') {
      const weights = kernelArea * inputShape.channels * layer.params.filters;
      const bias = layer.params.filters;
      return weights + bias;
    }
    if (inputShape?.type === 'vector') {
      const weights = kernelArea * inputShape.size * layer.params.filters;
      const bias = layer.params.filters;
      return weights + bias;
    }
  }
  return 0;
}
