// Shape types for tensor validation
export type TensorShape =
  | { type: 'vector'; size: number }
  | { type: 'unknown' };

export type LayerKind = 'Input' | 'Dense' | 'Convolution' | 'Output';

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

export interface OutputLayer extends Layer {
  kind: 'Output';
  params: {
    classes: number;
    activation: 'softmax';
  };
}

export type AnyLayer = InputLayer | DenseLayer | ConvLayer | OutputLayer;

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
  if (layer.kind === 'Convolution' && inputShape?.type === 'vector') {
    const kernelArea = Math.max(1, layer.params.kernel) ** 2;
    const weights = kernelArea * inputShape.size * layer.params.filters;
    const bias = layer.params.filters;
    return weights + bias;
  }
  return 0;
}
