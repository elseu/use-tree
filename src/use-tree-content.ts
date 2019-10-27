import { createContext, useContext } from 'react';
import { StatefulTree, Tree } from './types';

export const TreeContentContext = createContext<Tree<unknown>>({ isLoading: false, items: [] });

export function useTreeContent<T>(): StatefulTree<T> {
    return useContext(TreeContentContext) as StatefulTree<T>;
}
