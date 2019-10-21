import { useEffect, useRef, useState } from 'react';
import { Tree, TreeNode } from 'types/tree';
import { useMemo } from '@storybook/addons';

interface TreeSource<T> {
    children(id?: string | null | undefined): Promise<Array<TreeNode<T>>>;
    trail(id: string): Promise<Array<TreeNode<T>>>;
}

export interface TreeState {
    activeId?: string | null;
    expandedIds?: {[k: string]: boolean};
}

interface TreeNodeState {
    isExpanded: boolean;
    isActive: boolean;
    isActiveTrail: boolean;
    isLoadingChildren: boolean;
    children: this[];
}

export type StatefulTreeNode<T> = TreeNode<T> & TreeNodeState;

function valuesEqual<T>(arr1: T[], arr2: T[]): boolean {
    const len = arr1.length;
    if (len !== arr2.length) {
        return false;
    }
    for (let i = 0; i < len; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

// TODO: explain that you cannot switch sources
export function useTree<T>(source: TreeSource<T>, state: TreeState): Tree<StatefulTreeNode<T>> {
    const [rootNodes, setRootNodes] = useState<Array<TreeNode<T>> | null>(null);
    const [children, setChildren] = useState<{ [k: string]: Array<TreeNode<T>> }>({});
    const [trails, setTrails] = useState<{ [k: string]: Array<TreeNode<T>> }>({});
    const outputNodes = useRef<{ [k: string]: StatefulTreeNode<T> }>({});
    const [activeTrailIds, setActiveTrailIds] = useState<string[]>([]);

    const activeId = state.activeId;
    const expandedIds = state.expandedIds;

    // Cache loads to make sure we load remote content only once.
    const loadPromisesRef = useRef<{ [k: string]: Promise<unknown> }>({});
    function loadOnce<U>(k: string, f: () => Promise<U>): Promise<U> {
        if (!loadPromisesRef.current[k]) {
            loadPromisesRef.current[k] = f();
        }
        return loadPromisesRef.current[k] as Promise<U>;
    }

    // Expand trails when we load children.
    function expandTrails(trail: Array<TreeNode<T>>, newChildren: Array<TreeNode<T>>) {
        setTrails((currentTrails) => {
            const newTrails: {[k: string]: Array<TreeNode<T>>} = {};
            let hasNewTrails = false;
            for (const newChild of newChildren) {
                if (!currentTrails[newChild.id]) {
                    newTrails[newChild.id] = [newChild, ...trail];
                    hasNewTrails = true;
                }
            }
            return hasNewTrails ? { ...currentTrails, ...newTrails } : currentTrails;
        });
    }

    // Load trail for active ID.
    useEffect(() => {
        if (activeId && !trails[activeId]) {
            loadOnce(`activeId:${activeId}`, () => source.trail(activeId)).then((loadedTrail) => {
                setTrails((currentTrails) => (
                    currentTrails[activeId] ? currentTrails : {...currentTrails, [activeId]: loadedTrail }
                ));
            });
        }
    }, [activeId, trails, source]);

    // Load children for expanded items.
    useEffect(() => {
        const expandedIdsArray = [
            ...(Object.entries(expandedIds || {})
                .filter(([_, expanded]) => expanded)
                .map(([id]) => id)),
            ...activeTrailIds,
        ];
        expandedIdsArray
            .filter((id) => !children[id]) // Only those without children.
            .forEach((id) => {
                loadOnce(`children:${id}`, () => source.children(id)).then((loadedChildren) => {
                    setChildren((currentChildren) => (
                        currentChildren[id] ? currentChildren : { ...currentChildren, [id]: loadedChildren }
                    ));
                    if (trails[id]) {
                        expandTrails(trails[id], loadedChildren);
                    }
                });
            });
    }, [expandedIds, children, trails, activeTrailIds, source]);

    // Load root nodes.
    useEffect(() => {
        if (rootNodes === null) {
            loadOnce(`rootNodes`, () => source.children(null)).then((loadedRootNodes) => {
                setRootNodes((currentRootNodes) => currentRootNodes || loadedRootNodes);
                expandTrails([], loadedRootNodes);
            });
        }
    }, [rootNodes, source]);

    // Set the active trail IDs correctly if the active ID changes.
    useEffect(() => {
        if (activeId && trails[activeId] && trails[activeId].length > 0) {
            if (trails[activeId].length !== activeTrailIds.length || activeTrailIds[0] !== activeId) {
                // The activeTrailIds have changed.
                setActiveTrailIds(trails[activeId].map((node) => node.id));
            }
        } else if (activeTrailIds.length > 0) {
            // Empty the active trail.
            setActiveTrailIds([]);
        }
    }, [trails, activeId, activeTrailIds]);

    return useMemo(() => {
        const activeTrailIdsIndex = Object.fromEntries(activeTrailIds.map((id) => [id, true]));
        const expandedIdsIndex = expandedIds || {};

        function buildOutputNode(node: TreeNode<T>): StatefulTreeNode<T> {
            const nodeId = node.id;
            const current = outputNodes.current[nodeId];
            const mappedChildren = (children[nodeId] || []).map(buildOutputNode);
            if (current
                && current.isExpanded === !!expandedIdsIndex[nodeId]
                && current.isActiveTrail === !!activeTrailIdsIndex[nodeId]
                && (activeId === nodeId) === current.isActive
                && valuesEqual(current.children, mappedChildren)) {
                // Item is still up-to-date.
                return current;
            }
            const outputNode = {
                ...node,
                isExpanded: !!expandedIdsIndex[nodeId],
                isActive: activeId === nodeId,
                isActiveTrail: !!activeTrailIdsIndex[nodeId],
                isLoadingChildren: false, // TODO
                children: mappedChildren,
            };
            outputNodes.current[nodeId] = outputNode;
            return outputNode;
        }

        const rootOutputNodes = (rootNodes || []).map(buildOutputNode);

        return {
            rootNodes: rootOutputNodes,
            isLoading: rootNodes === null,
        };
    }, [activeId, expandedIds, rootNodes, children, trails, activeTrailIds, source, outputNodes]);
}
