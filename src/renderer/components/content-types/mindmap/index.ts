import ContentTypes from "../../../ContentTypes";
import { Handle } from "hypermerge";
import { HypermergeUrl } from "../../../ShareLink";
import { MindMap, MindMapOnBoard } from "./MindMap";

export interface MindMapNode {
  x: number
  y: number
  text: string
  color: string
}

export interface MindMapLink {
  primary: boolean
}

export interface MindMapDoc {
  title: string
  backgroundColor: string
  hypermergeUrl: HypermergeUrl // added by workspace
  authorIds: HypermergeUrl[]
  nodes: { [id: string]: MindMapNode }
  edges: { [id_pair: string]: MindMapLink }
}

export const idForEdge = (idA: string, idB: string) => idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`
export const idsFromEdge = (edgeId: string) => edgeId.split(':') as [string, string]
export const edgesInvolving = (doc: MindMapDoc, id: string) => {
  const edges = [] as string[]
  for (const edgeId in doc.edges) {
    const [idA, idB] = idsFromEdge(edgeId)
    if (idA === id || idB === id)
      edges.push(edgeId)
  }
  return edges
}

export const addNode = (nodeId: string, node: MindMapNode) => (doc: MindMapDoc) => {
  doc.nodes[nodeId] = node
}
export const addEdge = (idA: string, idB: string, link: MindMapLink) => (doc: MindMapDoc) => {
  doc.edges[idForEdge(idA, idB)] = link
}
export const removeEdge = (idA: string, idB: string) => (doc: MindMapDoc) => {
  delete doc.edges[idForEdge(idA, idB)]
}
export const removeNode = (id: string) => (doc: MindMapDoc) => {
  delete doc.nodes[id]
  edgesInvolving(doc, id).forEach((edge) => { delete doc.edges[edge] })
}

interface Attrs {
  title?: string
  backgroundColor?: string
}

function initializeMindMap(
  { title = 'No Title', backgroundColor = 'white' }: Attrs,
  handle: Handle<MindMapDoc>
) {
  handle.change((board) => {
    board.title = title
    board.backgroundColor = backgroundColor
    board.authorIds = []
    board.nodes = {}
    board.edges = {}
  })
}

function create(typeAttrs: Attrs, handle: Handle<any>) {
  initializeMindMap(typeAttrs, handle)
}

ContentTypes.register({
  type: 'mindmap',
  contexts: {
    workspace: MindMap,
    board: MindMapOnBoard,
  },
  name: 'Mind Map',
  icon: 'sitemap',
  create,
})