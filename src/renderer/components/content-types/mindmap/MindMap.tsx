import React, { useRef, useState, useEffect, useCallback } from "react"
import { ContentHandle, ContentProps } from "../../Content";
import { useDocument } from "../../../Hooks";

import './MindMap.css'
import { MindMapDoc, idsFromEdge, MindMapNode, MindMapLink, addNode, addEdge, removeNode } from ".";
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

const ExpandingInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (props.autoFocus && input.current) {
      input.current.focus()
      input.current.select()
    }
  }, [props.autoFocus])
  return <div className="expanding-input">
    <div>
      <span>{props.value}</span>
      <br />
    </div>
    <input {...props} ref={input} />
  </div>
}


const Node = ({ node, id, onStartDragging, onChange, onFinishEditing, isEditing }: { id: string, isEditing: boolean, node: MindMapNode, onStartDragging: (e: React.MouseEvent) => void, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onFinishEditing: () => void }) => {
  return <div className="MindMapNode--wrapper">
    <div className="MindMapNode" onMouseDown={onStartDragging} style={{ left: node.x, top: node.y, backgroundColor: node.color }} data-nodeid={id}>
      {isEditing
        ? <ExpandingInput
          value={node.text}
          autoFocus={true}
          onChange={onChange}
          onBlur={onFinishEditing}
          onKeyDown={(e) => { if (e.which === 13 || e.which === 27) onFinishEditing() }} />
        : node.text}
    </div>
  </div>
}

const useDrag = (dropped: (e: MouseEvent) => void) => {
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
        dropped(e)
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

function closest<T>(e: Element | null, f: (e: Element) => T): T | null {
  if (e) {
    const x = f(e)
    if (x) return x
    else return closest(e.parentElement, f)
  }
  return null
}

export const MindMap = (props: ContentProps) => {
  const [doc, changeDoc] = useDocument<MindMapDoc>(props.hypermergeUrl)
  const root = useRef<HTMLDivElement>(null)
  const { x: rootX, y: rootY } = useClientBoundingRect(root)
  const [dragSourceNodeId, setDragSourceNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const createDrag = useDrag((e: MouseEvent) => {
    setDragSourceNodeId(null)
    const droppedId = closest(e.target as Element, e => e.getAttribute('data-nodeid'))
    if (droppedId === dragSourceNodeId) {
      setEditingNodeId(droppedId)
    } else {
      if (droppedId != null) {
        // connect 2 nodes
        changeDoc(addEdge(dragSourceNodeId!, droppedId, { primary: false }))
      } else {
        const newId = uuid.v4()
        changeDoc(addNode(newId, { text: '', x: e.clientX - rootX, y: e.clientY - rootY, color: 'red' }))
        changeDoc(addEdge(dragSourceNodeId!, newId, { primary: true }))
        setEditingNodeId(newId)
      }
    }
  })
  if (!doc) return null
  const onDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== root.current) return
    const x = e.clientX - rootX, y = e.clientY - rootY
    const newId = uuid.v4()
    changeDoc(addNode(newId, { x, y, text: '', color: 'red' }))
    setEditingNodeId(newId)
  }
  const onStartDraggingNode = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return
    if (!(e.target as Element).getAttribute('data-nodeid')) return
    e.preventDefault()
    if (e.shiftKey) {
      // TODO: move node
    } else {
      setDragSourceNodeId(nodeId)
      createDrag.start(e.clientX, e.clientY)
    }
  }
  return <div className="MindMap" onDoubleClick={onDoubleClick} ref={root}>
    <Edges doc={doc} protoEdge={dragSourceNodeId && createDrag.current ? { from: dragSourceNodeId, to: { x: createDrag.current.x - rootX, y: createDrag.current.y - rootY } } : undefined} />
    <div className="MindMapNodes">
      {Object.keys(doc.nodes).map(nodeId => {
        const node = doc.nodes[nodeId]
        return <Node
          key={nodeId}
          id={nodeId}
          node={node}
          isEditing={nodeId === editingNodeId}
          onChange={(e) => { changeDoc(doc => doc.nodes[nodeId].text = e.target.value) }}
          onFinishEditing={() => {
            if (doc.nodes[nodeId].text.trim().length === 0) {
              removeNode(nodeId)(doc)
            }
            setEditingNodeId(null)
          }}
          onStartDragging={(e) => onStartDraggingNode(e, nodeId)}
        />
      })}
    </div>
  </div>
}

export const MindMapOnBoard = () => {
  return <div>mindmap</div>
}