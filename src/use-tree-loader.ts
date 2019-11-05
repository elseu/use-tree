import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoadableArray, RootTree, TreeNode, TreeSource, TreeSourceNode, TreeState } from './types';

interface StringMap<V> {
    [k: string]: V;
}

function suffixes<T>(arr: T[]): T[][] {
    const output: T[][] = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        output.push(arr.slice(i));
    }
    return output;
}

function valuesEqual(arr1: unknown[], arr2: unknown[]): boolean {
    if (arr1 === arr2) {
        return true;
    }
    const len = arr1.length;
    if (arr2.length !== len) {
        return false;
    }
    for (let i = 0; i < len; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

export interface TreeLoaderOptions {
    loadingTransitionMs?: number;
}

export function useTreeLoader<T>(
    source: TreeSource<T>,
    state: TreeState,
    options?: TreeLoaderOptions | null,
): RootTree<T> {
    const { loadingTransitionMs = 0 } = options || {};
    const [rootNodes, setRootNodes] = useState<LoadableArray<TreeSourceNode<T>>>({ isLoading: true, items: [] });
    const [children, setChildren] = useState<StringMap<LoadableArray<TreeSourceNode<T>>>>({});
    const [trails, setTrails] = useState<StringMap<Array<TreeSourceNode<T>>>>({});

    const statefulNodes = useRef<StringMap<TreeNode<T>>>({});

    const { activeId, expandedIds } = state;

    // Get active trail IDs from active ID.
    const activeTrailIds = useMemo(
        () => (activeId && trails[activeId]) ? trails[activeId].map((node) => node.id) : []
    , [activeId, trails]);

    // Add new trails and their sub trails.
    const addTrails = useCallback((newTrails: Array<Array<TreeSourceNode<T>>>) => {
        setTrails((currentTrails) => {
            const newEntries = newTrails.map((trail) => [trail[0].id, trail]);
            return newEntries.length > 0 ? { ...currentTrails, ...Object.fromEntries(newEntries) } : currentTrails;
        });
    }, [setTrails]);

    // Load root nodes immediately.
    useEffect(() => {
        source.children(null).then((loadedRootNodes) => {
            setRootNodes({ isLoading: false, items: loadedRootNodes });
            addTrails(loadedRootNodes.map((child) => [child]));
        });
    }, [source, addTrails, setRootNodes]);

    // Load trail for active ID so we can expand the trail all the way to that item.
    useEffect(() => {
        if (activeId && !trails[activeId]) {
            source.trail(activeId).then((loadedTrail) => {
                addTrails(suffixes(loadedTrail));
            });
        }
    }, [activeId, trails, source, addTrails]);

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

        const enableChildrenLoadingState = () => {
                setChildren((currentChildren) => ({
                ...currentChildren, ...Object.fromEntries(idsToLoad.map((id) => [id, { isLoading: true, items: [] }])),
            }));
        };
        let loadingTransitionTimeout: unknown | null = null;

        // Set a loading state for these IDs.
        if (loadingTransitionMs > 0) {
            loadingTransitionTimeout = setTimeout(enableChildrenLoadingState, loadingTransitionMs);
        } else {
            enableChildrenLoadingState();
        }

        // Load them from the source.
        Promise.all(
            idsToLoad.map((id) => source.children(id).then((items) => [id, { loading: false, items }])),
        ).then((results) => {
            if (loadingTransitionTimeout !== null) {
                clearTimeout(loadingTransitionTimeout as any);
            }

            // Add the children to state.
            const loadedChildren: StringMap<LoadableArray<TreeSourceNode<T>>> = Object.fromEntries(results);
            setChildren((currentChildren) => ({ ...currentChildren, ...loadedChildren }));

            // Add trails for the new children so we can make them active.
            addTrails(Object.entries(loadedChildren).flatMap(
                ([id, childrenForId]) => childrenForId.items.map((child) => [child, ...trails[id]]),
            ));
        });
    }, [expandedIds, children, trails, activeTrailIds, source, addTrails, setChildren, loadingTransitionMs]);

    return useMemo(() => {
        const activeTrailIdsIndex = Object.fromEntries(activeTrailIds.map((id) => [id, true]));
        const expandedIdsIndex = expandedIds || {};

        function buildOutputNode(node: TreeSourceNode<T>, depth: number): TreeNode<T> {
            const nodeId = node.id;
            const current = statefulNodes.current[nodeId];
            const mappedChildren = (children[nodeId] ? children[nodeId].items : [])
                .map((child) => buildOutputNode(child, depth + 1));
            const isActive = activeId === nodeId;
            const isActiveTrail = !!activeTrailIdsIndex[nodeId];
            const isExpanded = expandedIdsIndex[nodeId] === true
                || (isActiveTrail && expandedIdsIndex[nodeId] !== false); // TODO: do we really want this?
            const isLoadingChildren = children[nodeId] && children[nodeId].isLoading;
            if (current
                && current.isExpanded === isExpanded
                && current.isActiveTrail === isActiveTrail
                && current.isActive === isActive
                && current.depth === depth
                && current.children.isLoading === isLoadingChildren
                && valuesEqual(current.children.items, mappedChildren)) {
                // Item is still up-to-date. Return the same instance to allow React.memo magic.
                return current;
            }
            const outputNode = {
                ...node,
                isExpanded,
                isActive,
                isActiveTrail,
                depth,
                children: { isLoading: isLoadingChildren, items: mappedChildren },
            };
            statefulNodes.current[nodeId] = outputNode;
            return outputNode;
        }

        return {
            items: rootNodes.items.map((item) => buildOutputNode(item, 0)),
            isLoading: rootNodes.isLoading,
            allNodes: statefulNodes.current,
        };
    }, [activeId, expandedIds, rootNodes, children, activeTrailIds, statefulNodes]);
}
