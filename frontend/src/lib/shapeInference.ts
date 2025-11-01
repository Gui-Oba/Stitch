import type { AnyLayer, TensorShape } from '../types/graph';
import { toast } from 'sonner';

type VectorShape = Extract<TensorShape, { type: 'vector' }>;

function isVectorShape(shape: TensorShape): shape is VectorShape {
  return shape.type === 'vector';
}

/**
 * Validates if a connection between two layers is valid based on shape compatibility
 */
export function validateConnection(
  sourceLayer: AnyLayer,
  targetLayer: AnyLayer
): { valid: boolean; error?: string } {
  const shape = sourceLayer.shapeOut;

  if (!shape) {
    return {
      valid: false,
      error: 'Source layer has unknown output shape'
    };
  }

  if (shape.type === 'unknown') {
    return {
      valid: false,
      error: 'Source layer has unknown output shape'
    };
  }

  const outputShape: TensorShape = shape;

  // Input layers cannot receive connections
  if (targetLayer.kind === 'Input') {
    return {
      valid: false,
      error: 'Cannot connect to Input layer'
    };
  }

  // Dense and Output layers expect vector input
  if (targetLayer.kind === 'Dense' || targetLayer.kind === 'Output') {
    if (!isVectorShape(outputShape)) {
      return {
        valid: false,
        error: `${targetLayer.kind} layer expects vector input`
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
export function hasIncomingConnection(layerId: string, edges: Array<{ source: string; target: string }>): boolean {
  return edges.some(edge => edge.target === layerId);
}
