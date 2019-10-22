import { useEffect, useMemo, useRef, useState } from 'react';
import { StatefulTreeNode, Tree, TreeNode, TreeSource, TreeState } from 'types';

interface StringMap<V> {
    [k: string]: V;
}

interface LoadableArray<T> {
    items: T[];
    loading: boolean;
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
    const [rootNodes, setRootNodes] = useState<LoadableArray<TreeNode<T>>>({ loading: true, items: [] });
    const [children, setChildren] = useState<StringMap<LoadableArray<TreeNode<T>>>>({});
    const [trails, setTrails] = useState<StringMap<Array<TreeNode<T>>>>({});

    const statefulNodes = useRef<StringMap<StatefulTreeNode<T>>>({});

    const { activeId, expandedIds } = state;

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
            setRootNodes({ loading: false, items: loadedRootNodes });
            addTrails(loadedRootNodes.map((child) => [child]));
        });
    }, [source]);

    // Load trail for active ID so we can expand the trail all the way to that item.
    useEffect(() => {
        if (activeId && !trails[activeId]) {
            source.trail(activeId).then((loadedTrail) => {
                addTrails(suffixes(loadedTrail));
            });
        }
    }, [activeId, trails, source]);

    // Load children for expanded or active trail items.
    useEffect(() => {
        // Find out which IDs remain to be loaded.
        const idsToLoad = [
            ...(Object.entries(expandedIds || {}).filter(([_, expanded]) => expanded).map(([id]) => id)),
            ...activeTrailIds,
        ].filter((id) => !children[id]);
        if (idsToLoad.length === 0) {
            return;
        }

        // Set a loading state for these IDs.
        setChildren((currentChildren) => ({
            ...currentChildren, ...Object.fromEntries(idsToLoad.map((id) => [id, { loading: true, items: [] }])),
        }));

        // Load them from the source.
        Promise.all(
            idsToLoad.map(async (id) => [id, { loading: false, items: await source.children(id) }]),
        ).then((results) => {
            // Add the children to state.
            const loadedChildren: StringMap<LoadableArray<TreeNode<T>>> = Object.fromEntries(results);
            setChildren((currentChildren) => ({ ...currentChildren, ...loadedChildren }));

            // Add trails for the new children so we can make them active.
            addTrails(Object.entries(loadedChildren).flatMap(
                ([id, childrenForId]) => childrenForId.items.map((child) => [child, ...trails[id]]),
            ));
        });
    }, [expandedIds, children, trails, activeTrailIds, source]);

    return useMemo(() => {
        const activeTrailIdsIndex = Object.fromEntries(activeTrailIds.map((id) => [id, true]));
        const expandedIdsIndex = expandedIds || {};

        function buildOutputNode(node: TreeNode<T>): StatefulTreeNode<T> {
            const nodeId = node.id;
            const current = statefulNodes.current[nodeId];
            const mappedChildren = (children[nodeId] ? children[nodeId].items : []).map(buildOutputNode);
            const isActive = activeId === nodeId;
            const isActiveTrail = !!activeTrailIdsIndex[nodeId];
            const isExpanded = expandedIdsIndex[nodeId] === true
                || (isActiveTrail && expandedIdsIndex[nodeId] !== false); // TODO: do we really want this?
            const isLoadingChildren = children[nodeId] && children[nodeId].loading;
            if (current
                && current.isExpanded === isExpanded
                && current.isActiveTrail === isActiveTrail
                && current.isActive === isActive
                && current.isLoadingChildren === isLoadingChildren
                && valuesEqual(current.children, mappedChildren)) {
                // Item is still up-to-date. Return the same instance to allow React.memo magic.
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

        return {
            rootNodes: rootNodes.items.map(buildOutputNode),
            isLoading: rootNodes.loading,
        };
    }, [activeId, expandedIds, rootNodes, children, activeTrailIds, statefulNodes]);
}
