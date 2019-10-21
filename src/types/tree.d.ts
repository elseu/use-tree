import { TreeSourceNode } from 'types/source';

export interface TreeData {
    id: string
    hasChildren: boolean
    children?: this[]
}

export type TreeNode<T> = T & TreeData;

export interface Tree<T> {
    items: Array<TreeNode<T>>
    isLoading: boolean
}

export interface TreeOptions<T> {
    children(id?: string | null | undefined): Promise<Array<TreeNode<T>>>;
    trail?(id: string): Promise<Array<TreeNode<T>>>;
}

export interface TreeState {
    activeId?: string | null
    expandedIds?: string[]
}

export interface TreeNodeState {
    isExpanded: boolean
    isActive: boolean
    isActiveTrail: boolean
}
