import { useEffect, useMemo, useRef, useState } from 'react';
import { StatefulTreeNode, Tree, TreeNode, TreeSource, TreeState } from 'types';

interface KeyedIndex<V> {
    [k: string]: V;
}

function suffixes<T>(arr: T[]): T[][] {
    const output: T[][] = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        output.push(arr.slice(i));
    }
    return output;
}

export function valuesEqual<T>(arr1: T[], arr2: T[]): boolean {
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

export function useTree<T>(source: TreeSource<T>, state: TreeState): Tree<StatefulTreeNode<T>> {
    const [rootNodes, setRootNodes] = useState<Array<TreeNode<T>> | null>(null);
    const [children, setChildren] = useState<KeyedIndex<Array<TreeNode<T>>>>({});
    const [childrenLoading, setChildrenLoading] = useState<KeyedIndex<boolean>>({});
    const [trails, setTrails] = useState<KeyedIndex<Array<TreeNode<T>>>>({});

    const statefulNodes = useRef<KeyedIndex<StatefulTreeNode<T>>>({});

    const activeId = state.activeId;
    const expandedIds = state.expandedIds;

    // Get active trail IDs from active ID.
    const activeTrailIds = useMemo(
        () => (activeId && trails[activeId]) ? trails[activeId].map((node) => node.id) : []
    , [activeId, trails]);

    // Add new trails and their sub trails.
    function addTrails(newTrails: Array<Array<TreeNode<T>>>) {
        setTrails((currentTrails) => {
            const newEntries = newTrails.map((trail) => [trail[0].id, trail]);
            return newEntries.length > 0 ? { ...currentTrails, ...Object.fromEntries(newEntries) } : currentTrails;
        });
    }

    // Load root nodes immediately.
    useEffect(() => {
        source.children(null).then((loadedRootNodes) => {
            setRootNodes((currentRootNodes) => currentRootNodes || loadedRootNodes);
            addTrails(loadedRootNodes.map((child) => [child]));
        });
    }, [source]);

    // Load trail for active ID.
    useEffect(() => {
        if (activeId && !trails[activeId]) {
            source.trail(activeId).then((loadedTrail) => {
                addTrails(suffixes(loadedTrail));
            });
        }
    }, [activeId, trails, source]);

    // Load children for expanded items.
    useEffect(() => {
        const idsToLoad = [
            ...(Object.entries(expandedIds || {}).filter(([_, expanded]) => expanded).map(([id]) => id)),
            ...activeTrailIds,
        ].filter((id) => !children[id] && !childrenLoading[id]);
        if (idsToLoad.length === 0) {
            return;
        }
        setChildrenLoading((currentChildrenLoading) => ({
            ...currentChildrenLoading, ...Object.fromEntries(idsToLoad.map((id) => [id, true])),
        }));
        Promise.all(idsToLoad.map(async (id) => [id, await source.children(id)])).then((results) => {
            const loadedChildren: KeyedIndex<Array<TreeNode<T>>> = Object.fromEntries(results);
            setChildren((currentChildren) => ({ ...currentChildren, ...loadedChildren }));
            setChildrenLoading((currentChildrenLoading) => Object.fromEntries(
                Object.entries(currentChildrenLoading).filter(([id]) => !loadedChildren[id]),
            ));
            Object.entries(loadedChildren)
                .filter(([id]) => !!trails[id])
                .map(([id, childrenForId]) => childrenForId.map((child) => [child, ...trails[id]]))
                .forEach(addTrails);
        });
    }, [expandedIds, children, trails, activeTrailIds, source, childrenLoading]);

    return useMemo(() => {
        const activeTrailIdsIndex = Object.fromEntries(activeTrailIds.map((id) => [id, true]));
        const expandedIdsIndex = expandedIds || {};

        function buildOutputNode(node: TreeNode<T>): StatefulTreeNode<T> {
            const nodeId = node.id;
            const current = statefulNodes.current[nodeId];
            const mappedChildren = (children[nodeId] || []).map(buildOutputNode);
            const isActive = activeId === nodeId;
            const isActiveTrail = !!activeTrailIdsIndex[nodeId];
            const isExpanded = expandedIdsIndex[nodeId] === true
                || (isActiveTrail && expandedIdsIndex[nodeId] !== false);
            const isLoadingChildren = !!childrenLoading[nodeId];
            if (current
                && current.isExpanded === isExpanded
                && current.isActiveTrail === isActiveTrail
                && current.isActive === isActive
                && current.isLoadingChildren === isLoadingChildren
                && valuesEqual(current.children, mappedChildren)) {
                // Item is still up-to-date.
                return current;
            }
            const outputNode = {
                ...node,
                isExpanded,
                isActive,
                isActiveTrail,
                isLoadingChildren,
                children: mappedChildren,
            };
            statefulNodes.current[nodeId] = outputNode;
            return outputNode;
        }

        const rootstatefulNodes = (rootNodes || []).map(buildOutputNode);

        return {
            rootNodes: rootstatefulNodes,
            isLoading: rootNodes === null,
        };
    }, [activeId, expandedIds, rootNodes, children, activeTrailIds, statefulNodes, childrenLoading]);
}
