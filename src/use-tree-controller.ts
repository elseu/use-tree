import { createContext, useContext, useMemo } from 'react';
import { RootTree, TreeSourceNode, TreeState } from './types';

type TreeStateUpdater<T> = (state: TreeState, tree: RootTree<T>) => TreeState;

export interface TreeController<T> {
    updateState(f: TreeStateUpdater<T>): void;
    setMultipleExpanded(id: string[], expanded?: boolean): void;
    toggleExpanded(id: string): void;
    setExpanded(id: string, expanded?: boolean): void;
    setActiveId(id: string | null): void;
}

export interface TreeNodeController {
    setExpanded(expanded?: boolean): void;
    toggleExpanded(): void;
    setActive(active?: boolean): void;
}

export interface TreeNodesController {
    setMultipleExpanded(expanded?: boolean): void;
}

export function treeControllerFromUpdateState<T>(updateState: (f: TreeStateUpdater<T>) => void): TreeController<T> {
    const obj: Partial<TreeController<T>> = {
        updateState,
    };
    obj.setExpanded = (id: string, expanded?: boolean) => {
        obj.updateState!(({ expandedIds, ...rest }) => ({
            ...rest,
            expandedIds: { ...expandedIds, [id]: expanded !== false },
        }));
    };
    obj.toggleExpanded = (id: string) => {
        obj.updateState!(({ expandedIds, ...rest }, { allNodes }) => {
            const explicitExpandedState = expandedIds ? expandedIds[id] : undefined;
            const isExpanded = (explicitExpandedState === true)
                || (allNodes[id] && allNodes[id].isActiveTrail && explicitExpandedState === undefined);

            return {
                ...rest,
                expandedIds: { ...expandedIds, [id]: !isExpanded },
            };
        });
    };
    obj.setMultipleExpanded = (ids: string[], expanded?: boolean) => {
        obj.updateState!(({ expandedIds, ...rest }, { allNodes }) => {
            const nodesToOpen = ids.map((id) => allNodes[id]).filter((item) => item);

            return {
                ...rest,
                expandedIds: {
                    ...expandedIds,
                    ...(nodesToOpen.reduce((obj, item) => {
                        obj![item.id] = !!expanded;
                        return obj;
                    }, {} as typeof expandedIds))
                },
            };
        });
    };
    obj.setActiveId = (id: string | null) => {
        obj.updateState!((st) => ({ ...st, activeId: id }));
    };
    return obj as TreeController<T>;
}

export const noopUpdateState = <T, >(f: TreeStateUpdater<T>) => { /* noop */ };

export const noopTreeController = treeControllerFromUpdateState(noopUpdateState);

export const TreeControllerContext = createContext<TreeController<unknown>>(noopTreeController);

export function useTreeController(): TreeController<unknown> {
    return useContext(TreeControllerContext);
}

export function useTreeNodeController(item: string | TreeSourceNode<unknown>): TreeNodeController {
    const id = typeof item === 'string' ? item : (item as TreeSourceNode<unknown>).id;
    const controller = useTreeController();
    return useMemo(() => ({
        toggleExpanded() {
            controller.toggleExpanded(id);
        },
        setExpanded(expanded?: boolean) {
            controller.setExpanded(id, expanded);
        },
        setActive() {
            controller.updateState((st) => {
                const { activeId, ...rest } = st;
                return activeId === id ? rest : st;
            });
            controller.setActiveId(id);
        },
    }), [controller, id]);
}

export function useTreeNodesController(items: TreeSourceNode<unknown>[]): TreeNodesController {
    const controller = useTreeController();
    return useMemo(() => ({
        setMultipleExpanded(expanded?: boolean) {
            controller.setMultipleExpanded(items.map(item => item.id), expanded)
        },
    }), [controller, items]);
}
