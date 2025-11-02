import type { AnyLayer, TensorShape } from '../types/graph';
import { toast } from 'sonner';

type VectorShape = Extract<TensorShape, { type: 'vector' }>;
type ImageShape = Extract<TensorShape, { type: 'image' }>;

function isVectorShape(shape: TensorShape): shape is VectorShape {
  return shape.type === 'vector';
}

function isImageShape(shape: TensorShape): shape is ImageShape {
  return shape.type === 'image';
}

function isSquareVector(shape: VectorShape): boolean {
  const side = Math.round(Math.sqrt(shape.size));
  return side * side === shape.size;
}

/**
 * Validates if a connection between two layers is valid based on shape compatibility
 */
export function validateConnection(
  sourceLayer: AnyLayer,
  targetLayer: AnyLayer
): { valid: boolean; error?: string } {
  const shape = sourceLayer.shapeOut;

  if (!shape || shape.type === 'unknown') {
    return {
      valid: false,
      error: 'Source layer has unknown output shape',
    };
  }

  if (targetLayer.kind === 'Input') {
    return {
      valid: false,
      error: 'Cannot connect to Input layer',
    };
  }

  if (targetLayer.kind === 'Convolution' || targetLayer.kind === 'Pooling') {
    if (sourceLayer.kind === 'Dense') {
      return {
        valid: false,
        error: `${targetLayer.kind} cannot receive input directly from a Dense layer`,
      };
    }

    if (isImageShape(shape)) {
      return { valid: true };
    }

    if (isVectorShape(shape) && isSquareVector(shape)) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `${targetLayer.kind} layer expects image-like input`,
    };
  }

  if (targetLayer.kind === 'Flatten') {
    if (isVectorShape(shape) || isImageShape(shape)) {
      return { valid: true };
    }
    return {
      valid: false,
      error: 'Flatten layer requires vector or image input',
    };
  }

  if (targetLayer.kind === 'Dense' || targetLayer.kind === 'Output') {
    if (!isVectorShape(shape)) {
      return {
        valid: false,
        error: `${targetLayer.kind} layer expects vector input`,
      };
    }
  }

  if (targetLayer.kind === 'Dropout') {
    if (!isVectorShape(shape) && !isImageShape(shape)) {
      return {
        valid: false,
        error: 'Dropout layer expects image or vector input',
      };
    }
  }

  return { valid: true };
}

/**
 * Shows a toast notification for connection validation errors
 */
export function notifyConnectionError(error: string) {
  toast.error('Invalid Connection', {
    description: error,
    duration: 3000,
  });
}

/**
 * Checks if a layer already has an incoming connection
 */
export function hasIncomingConnection(
  layerId: string,
  edges: Array<{ source: string; target: string }>
): boolean {
  return edges.some(edge => edge.target === layerId);
}
