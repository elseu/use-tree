import { createContext, useContext } from 'react';
import { Tree } from './types';

export const TreeContentContext = createContext<Tree<unknown>>({ isLoading: false, items: [] });

export function useTreeContent<T>(): Tree<T> {
    return useContext(TreeContentContext) as Tree<T>;
}
