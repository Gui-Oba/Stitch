import type { DragEvent } from 'react'
import type { ActivationType } from '@/types/graph'

type DenseTemplate = {
  id: string
  label: string
  description: string
  kind: 'Dense'
  params: {
    units: number
    activation: ActivationType
  }
}

type ConvTemplate = {
  id: string
  label: string
  description: string
  kind: 'Convolution'
  params: {
    filters: number
    kernel: number
    stride: number
    padding: 'valid' | 'same'
    activation: Exclude<ActivationType, 'softmax'>
  }
}

type LayerTemplate = DenseTemplate | ConvTemplate

const TEMPLATE_STYLES: Record<
  LayerTemplate['kind'],
  {
    border: string
    background: string
    hover: string
    label: string
    description: string
  }
> = {
  Dense: {
    border: 'border-blue-300',
    background: 'bg-blue-50',
    hover: 'hover:bg-blue-100',
    label: 'text-blue-700',
    description: 'text-blue-600',
  },
  Convolution: {
    border: 'border-indigo-300',
    background: 'bg-indigo-50',
    hover: 'hover:bg-indigo-100',
    label: 'text-indigo-700',
    description: 'text-indigo-600',
  },
}

const DENSE_LAYER_TEMPLATE: DenseTemplate = {
  id: 'dense-layer',
  label: 'Dense Layer',
  description: 'Default 64 units · ReLU',
  kind: 'Dense',
  params: {
    units: 64,
    activation: 'relu',
  },
}

const CONV_LAYER_TEMPLATE: ConvTemplate = {
  id: 'conv-layer',
  label: 'Conv Layer',
  description: '32 filters · 3×3 · ReLU',
  kind: 'Convolution',
  params: {
    filters: 32,
    kernel: 3,
    stride: 1,
    padding: 'same',
    activation: 'relu',
  },
}

const LAYER_TEMPLATES: LayerTemplate[] = [DENSE_LAYER_TEMPLATE, CONV_LAYER_TEMPLATE]

function createDragStartHandler(template: LayerTemplate) {
  return (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(
      'application/layer-template',
      JSON.stringify({
        kind: template.kind,
        params: template.params,
      })
    )
  }
}

export function LayersPanel({ className }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 w-[200px] sm:w-[280px] md:w-[280px] ${className ?? ''}`}>
      <div className="w-full px-4 py-2.5 flex items-center justify-between rounded-t-lg border-b border-gray-200">
        <span className="font-semibold text-gray-700 text-sm">Layer Palette</span>
      </div>
      <div className="p-4 flex flex-col gap-3 min-w-[280px]">
        <p className="text-xs text-gray-500">
          Drag a preset onto the canvas, then tune the settings inline.
        </p>
        {LAYER_TEMPLATES.map((template) => {
          const style = TEMPLATE_STYLES[template.kind]
          return (
            <div
              key={template.id}
              draggable
              onDragStart={createDragStartHandler(template)}
              className={`border border-dashed ${style.border} rounded-lg px-3 py-2 ${style.background} ${style.hover} cursor-grab active:cursor-grabbing transition-colors`}
            >
              <div className={`text-sm font-semibold ${style.label}`}>{template.label}</div>
              <div className={`text-xs ${style.description}`}>{template.description}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
