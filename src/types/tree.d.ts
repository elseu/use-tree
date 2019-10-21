import { TreeSourceNode } from 'types/source';

export interface TreeData {
    id: string
    hasChildren: boolean
}

export type TreeNode<T> = T & TreeData;

export interface Tree<T> {
    rootNodes: Array<TreeNode<T>>
    isLoading: boolean
}
