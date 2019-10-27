import React, { createContext, useCallback, useContext, useRef } from 'react';
import { useBinding } from 'use-binding';
import { StatefulTreeNode, Tree, TreeSource, TreeState } from './types';
import { useTree } from './use-tree';

interface TreeController {
    updateState(f: (st: TreeState) => TreeState): void;
    setExpanded(id: string, expanded?: boolean): void;
    setActiveId(id: string | null): void;
}

function treeControllerFromUpdateState(updateState: (f: (st: TreeState) => TreeState) => void): TreeController {
    const obj: Partial<TreeController> = {
        updateState,
    };
    obj.setExpanded = (id: string, expanded?: boolean) => {
        obj.updateState!(({ expandedIds, ...rest }) => ({
            ...rest,
            expandedIds: { ...expandedIds, [id]: expanded !== false },
        }));
    }
    obj.setActiveId = (id: string | null) => {
        obj.updateState!((st) => ({ ...st, activeId: id }));
    }
    return obj as TreeController;
}

const noopUpdateState = (f: (st: TreeState) => TreeState) => { /* noop */ };

const noopTreeController = treeControllerFromUpdateState(noopUpdateState);

const TreeControllerContext = createContext<TreeController>(noopTreeController);
const TreeContentContext = createContext<Tree<unknown>>({ isLoading: false, rootNodes: [] });

interface TreeContainerProps<T> {
    source: TreeSource<T>;
    defaultState?: TreeState;
    state?: TreeState;
    setState?: (st: TreeState) => void;
}

export const TreeContainer: React.FC<TreeContainerProps<unknown>> = (props) => {
    const { source, defaultState, state, setState, children } = props;
    const controller = useRef<TreeController>(treeControllerFromUpdateState(noopUpdateState));
    const [innerState, setInnerState] = useBinding(defaultState, state, setState, {});

    const tree = useTree(source, innerState);

    controller.current.updateState = useCallback((updater) => {
        setInnerState(updater(innerState));
    }, [innerState, setInnerState]);

    return (
        <TreeContentContext.Provider value={tree}>
            <TreeControllerContext.Provider value={controller.current}>
                {children}
            </TreeControllerContext.Provider>
        </TreeContentContext.Provider>
    );
};

export function useTreeController(): TreeController {
    return useContext(TreeControllerContext);
}

export function useTreeContent<T>(): Tree<StatefulTreeNode<T>> {
    return useContext(TreeContentContext) as Tree<StatefulTreeNode<T>>;
}
