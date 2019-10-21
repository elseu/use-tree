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

export interface TreeSource<T> {
    children(id?: string | null | undefined): Promise<Array<TreeNode<T>>>;
    trail(id: string): Promise<Array<TreeNode<T>>>;
}

export interface TreeState {
    activeId?: string | null;
    expandedIds?: {[k: string]: boolean};
}

export interface TreeNodeState {
    isExpanded: boolean;
    isActive: boolean;
    isActiveTrail: boolean;
    isLoadingChildren: boolean;
    children: this[];
}

export type StatefulTreeNode<T> = TreeNode<T> & TreeNodeState;
