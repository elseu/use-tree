export type TreeSourceNode<T> = T & {
    id: string;
    hasChildren: boolean;
};

export interface LoadableArray<T> {
    items: T[];
    isLoading: boolean;
}

export interface TreeSource<T> {
    children(id: string | null): Promise<Array<TreeSourceNode<T>>>;
    trail(id: string): Promise<Array<TreeSourceNode<T>>>;
}

export interface TreeState {
    activeId?: string | null;
    expandedIds?: {[k: string]: boolean};
}

export type TreeNode<T> = TreeSourceNode<T> & {
    isExpanded: boolean;
    isActive: boolean;
    isActiveTrail: boolean;
    children: Tree<T>;
};

export type Tree<T> = LoadableArray<TreeNode<T>>;
