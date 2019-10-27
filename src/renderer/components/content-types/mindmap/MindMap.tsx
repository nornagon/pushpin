import React, { useRef, useState, useEffect, useCallback } from "react"
import { ContentHandle, ContentProps } from "../../Content";
import { useDocument } from "../../../Hooks";

import './MindMap.css'
import { MindMapDoc, idsFromEdge, MindMapNode, MindMapLink, addNode, addEdge } from ".";
import uuid from "uuid";
import { number } from "prop-types";

const Edge = ({ a, b, link }: { a: MindMapNode, b: MindMapNode, link: MindMapLink }) => {
  const d = `M${a.x} ${a.y} L${b.x} ${b.y}`
  return <g>
    <path d={d} stroke="#ccc" strokeWidth="3" strokeLinecap="round" />
    <path d={d} style={{ pointerEvents: 'auto' }} stroke="transparent" strokeWidth="9" />
  </g>
}

const Edges = ({ doc, protoEdge }: { doc: MindMapDoc, protoEdge?: { from: string, to: { x: number, y: number } } }) => {
  let protoEdgeElement
  if (protoEdge) {
    const source = doc.nodes[protoEdge.from]
    protoEdgeElement = <path d={`M${source.x} ${source.y} L${protoEdge.to.x} ${protoEdge.to.y}`} stroke="#ccc" strokeWidth="3" strokeLinecap="round" />
  }
  return <div className="MindMapEdges">
    <svg>
      {Object.keys(doc.edges).map(e => {
        const [aId, bId] = idsFromEdge(e)
        const a = doc.nodes[aId]
        const b = doc.nodes[bId]
        if (a && b) {
          return <Edge key={e} a={a} b={b} link={doc.edges[e]} />
        }
      })}
      {protoEdgeElement}
    </svg>
  </div>
}

const Node = ({ node, onStartDragging }: { node: MindMapNode, onStartDragging: (e: React.MouseEvent) => void }) => {
  return <div className="MindMapNode" onMouseDown={onStartDragging} style={{ left: node.x, top: node.y }}>
    {node.text}
  </div>
}

const Nodes = ({ doc, onStartDraggingNode }: { doc: MindMapDoc, onStartDraggingNode: (e: React.MouseEvent, id: string) => void }) => {
  return <div className="MindMapNodes">
    {Object.keys(doc.nodes).map(nodeId => {
      const node = doc.nodes[nodeId]
      return <Node
        key={nodeId}
        node={node}
        onStartDragging={(e) => onStartDraggingNode(e, nodeId)}
      />
    })}
  </div>
}

const useDrag = (dropped: (target: { x: number, y: number }) => void) => {
  const [dragging, setDragging] = useState(false)
  const [current, setCurrent] = useState<{ x: number, y: number } | null>(null)
  const start = (x: number, y: number) => {
    setCurrent({ x, y })
    setDragging(true)
  }
  useEffect(() => {
    if (dragging) {
      const move = (e: MouseEvent) => {
        const point = { x: e.clientX, y: e.clientY }
        setCurrent(point)
      }
      const up = (e: MouseEvent) => {
        dropped({ x: e.clientX, y: e.clientY })
        cancel()
      }
      const cancel = () => {
        setDragging(false)
        setCurrent(null)
      }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
      window.addEventListener('blur', cancel)
      return () => {
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
        window.removeEventListener('blur', cancel)
      }
    }
  }, [dragging])
  return { start, stop, current }
}

const useClientBoundingRect = (ref: React.RefObject<HTMLElement>) => {
  const [rect, set] = useState({ x: 0, y: 0, width: 0, height: 0 })
  useEffect(() => {
    if (!ref.current) return
    const { x, y, width, height } = ref.current!.getBoundingClientRect() as DOMRect
    if (x !== rect.x || y !== rect.y || width !== rect.width || height !== rect.height)
      set({ x, y, width, height })
  })
  return rect
}

export const MindMap = (props: ContentProps) => {
  const [doc, changeDoc] = useDocument<MindMapDoc>(props.hypermergeUrl)
  const root = useRef<HTMLDivElement>(null)
  const { x: rootX, y: rootY } = useClientBoundingRect(root)
  const [dragSourceNodeId, setDragSourceNodeId] = useState<string | null>(null)
  const createDrag = useDrag((target) => {
    const newId = uuid.v4()
    changeDoc(addNode(newId, { text: 'bar', x: target.x - rootX, y: target.y - rootY, color: 'red' }))
    changeDoc(addEdge(dragSourceNodeId!, newId, { primary: true }))
    setDragSourceNodeId(null)
  })
  if (!doc) return null
  const onDoubleClick = (e: React.MouseEvent) => {
    const x = e.clientX - rootX, y = e.clientY - rootY
    changeDoc(addNode(uuid.v4(), { x, y, text: 'foo', color: 'red' }))
  }
  const onStartDraggingNode = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return
    e.preventDefault()
    if (e.shiftKey) {
      // move node
    } else {
      setDragSourceNodeId(nodeId)
      createDrag.start(e.clientX, e.clientY)
    }
  }
  return <div className="MindMap" onDoubleClick={onDoubleClick} ref={root}>
    <Edges doc={doc} protoEdge={dragSourceNodeId && createDrag.current ? { from: dragSourceNodeId, to: { x: createDrag.current.x - rootX, y: createDrag.current.y - rootY } } : undefined} />
    <Nodes doc={doc} onStartDraggingNode={onStartDraggingNode} />
  </div>
}

export const MindMapOnBoard = () => {
  return <div>mindmap</div>
}