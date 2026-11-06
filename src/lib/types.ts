export type OperationKind = 'trim' | 'crop' | 'rotate' | 'flip' | 'resize' | 'speed' | 'volume' | 'loop' | 'merge' | 'convert' | 'gif' | 'audio'
export type Operation = { id: string; kind: OperationKind; label: string; detail: string; values: Record<string, number | string> }
