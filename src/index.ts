import { Tree, TreeNodeState, TreeOptions, TreeState } from 'types/tree';

export function useTree<T>(opts: TreeOptions<T>, state: TreeState): Tree<T & TreeNodeState> {
    return {
        items: [],
        isLoading: false,
    };
}
