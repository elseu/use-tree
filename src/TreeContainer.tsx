import React, { PropsWithChildren, ReactElement, useCallback, useRef } from 'react';
import { useBinding } from 'use-binding';
import { TreeContentContext } from 'use-tree-content';
import { noopUpdateState, TreeController, TreeControllerContext, treeControllerFromUpdateState } from 'use-tree-controller';
import { Tree, TreeSource, TreeState } from './types';
import { useTreeLoader } from './use-tree-loader';

interface TreeContainerProps<T> {
    source: TreeSource<T>;
    defaultState?: TreeState;
    state?: TreeState;
    setState?: (st: TreeState) => void;
    rootElement?: React.FC<{ tree: Tree<T> }>;
}

export function TreeContainer<T>(props: PropsWithChildren<TreeContainerProps<T>>, context?: any): ReactElement | null {
    const { source, defaultState, state, setState, rootElement, children } = props;
    const controller = useRef<TreeController>(treeControllerFromUpdateState(noopUpdateState));
    const [innerState, setInnerState] = useBinding(defaultState, state, setState, {});

    const tree = useTreeLoader(source, innerState);

    controller.current.updateState = useCallback((updater) => {
        setInnerState(updater(innerState));
    }, [innerState, setInnerState]);

    return (
        <TreeContentContext.Provider value={tree}>
            <TreeControllerContext.Provider value={controller.current}>
                {rootElement ? React.createElement(rootElement, { tree }) : children}
            </TreeControllerContext.Provider>
        </TreeContentContext.Provider>
    );
}
