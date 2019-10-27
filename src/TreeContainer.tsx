import React, { useCallback, useRef } from 'react';
import { useBinding } from 'use-binding';
import { TreeContentContext } from 'use-tree-content';
import { noopUpdateState, TreeController, TreeControllerContext, treeControllerFromUpdateState } from 'use-tree-controller';
import { TreeSource, TreeState } from './types';
import { useTree } from './use-tree';

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
