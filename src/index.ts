import { useEffect, useMemo, useRef, useState, createContext } from 'react';
import { StatefulTreeNode, Tree, TreeNode, TreeSource, TreeState } from 'types/tree';
import { useLoadOnce } from 'util/use-load-once';
import { valuesEqual } from 'util/values-equal';

interface KeyedIndex<V> {
    [k: string]: V;
}

interface InternalTreeState<T> {
    rootNodes: Array<TreeNode<T>> | null;
    children: KeyedIndex<Array<TreeNode<T>>>;
    childrenLoading: KeyedIndex<boolean>;
    trails: KeyedIndex<Array<TreeNode<T>>>;
    outputNodes: KeyedIndex<StatefulTreeNode<T>>;
    activeTrailIds: string[];
}

export function useTree<T>(source: TreeSource<T>, state: TreeState): Tree<StatefulTreeNode<T>> {
    const [rootNodes, setRootNodes] = useState<Array<TreeNode<T>> | null>(null);
    const [children, setChildren] = useState<KeyedIndex<Array<TreeNode<T>>>>({});
    const [childrenLoading, setChildrenLoading] = useState<KeyedIndex<boolean>>({});
    const [trails, setTrails] = useState<KeyedIndex<Array<TreeNode<T>>>>({});
    const outputNodes = useRef<KeyedIndex<StatefulTreeNode<T>>>({});
    const [activeTrailIds, setActiveTrailIds] = useState<string[]>([]);

    const activeId = state.activeId;
    const expandedIds = state.expandedIds;

    // Cache loads to make sure we load remote content only once.
    const loadOnce = useLoadOnce();

    // Expand trails when we load children.
    function expandTrails(trail: Array<TreeNode<T>>, newChildren: Array<TreeNode<T>>) {
        setTrails((currentTrails) => {
            const newTrails: KeyedIndex<Array<TreeNode<T>>> = {};
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
    }, [activeId, trails, source, loadOnce]);

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
                setChildrenLoading((currentChildrenLoading) => (
                    currentChildrenLoading[id]
                    ? currentChildrenLoading
                    : { ...currentChildrenLoading, [id]: true }
                ));
                loadOnce(`children:${id}`, () => source.children(id)).then((loadedChildren) => {
                    setChildren((currentChildren) => (
                        currentChildren[id] ? currentChildren : { ...currentChildren, [id]: loadedChildren }
                    ));
                    setChildrenLoading((currentChildrenLoading) => {
                        const loading = { ...currentChildrenLoading };
                        delete loading[id];
                        return loading;
                    });
                    if (trails[id]) {
                        expandTrails(trails[id], loadedChildren);
                    }
                });
            });
    }, [expandedIds, children, trails, activeTrailIds, source, loadOnce]);

    // Load root nodes.
    useEffect(() => {
        if (rootNodes === null) {
            loadOnce(`rootNodes`, () => source.children(null)).then((loadedRootNodes) => {
                setRootNodes((currentRootNodes) => currentRootNodes || loadedRootNodes);
                expandTrails([], loadedRootNodes);
            });
        }
    }, [rootNodes, source, loadOnce]);

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
                && current.isActive === (activeId === nodeId)
                && current.isLoadingChildren === !!childrenLoading[nodeId]
                && valuesEqual(current.children, mappedChildren)) {
                // Item is still up-to-date.
                return current;
            }
            const outputNode = {
                ...node,
                isExpanded: !!expandedIdsIndex[nodeId],
                isActive: activeId === nodeId,
                isActiveTrail: !!activeTrailIdsIndex[nodeId],
                isLoadingChildren: !!childrenLoading[nodeId],
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
    }, [activeId, expandedIds, rootNodes, children, activeTrailIds, outputNodes, childrenLoading]);
}
