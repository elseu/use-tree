import { createContext, useContext, useMemo } from 'react';
import { TreeNode, TreeState } from './types';

export interface TreeController {
    updateState(f: (st: TreeState) => TreeState): void;
    toggleExpanded(id: string): void;
    setExpanded(id: string, expanded?: boolean): void;
    setActiveId(id: string | null): void;
}

export interface TreeNodeController {
    setExpanded(expanded?: boolean): void;
    toggleExpanded(): void;
    setActive(active?: boolean): void;
}

export function treeControllerFromUpdateState(updateState: (f: (st: TreeState) => TreeState) => void): TreeController {
    const obj: Partial<TreeController> = {
        updateState,
    };
    obj.setExpanded = (id: string, expanded?: boolean) => {
        obj.updateState!(({ expandedIds, ...rest }) => ({
            ...rest,
            expandedIds: { ...expandedIds, [id]: expanded !== false },
        }));
    };
    obj.toggleExpanded = (id: string) => {
        obj.updateState!(({ expandedIds, ...rest }) => ({
            ...rest,
            expandedIds: { ...expandedIds, [id]: !expandedIds || !expandedIds[id] },
        }));
    };
    obj.setActiveId = (id: string | null) => {
        obj.updateState!((st) => ({ ...st, activeId: id }));
    };
    return obj as TreeController;
}

export const noopUpdateState = (f: (st: TreeState) => TreeState) => { /* noop */ };

export const noopTreeController = treeControllerFromUpdateState(noopUpdateState);

export const TreeControllerContext = createContext<TreeController>(noopTreeController);

export function useTreeController(): TreeController {
    return useContext(TreeControllerContext);
}

export function useTreeNodeController(item: string | TreeNode<unknown>): TreeNodeController {
    const id = typeof item === 'string' ? item : (item as TreeNode<unknown>).id;
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
