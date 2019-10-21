import { useStatefulTree } from 'build/stateful-tree-builder';
import { useEffect, useMemo, useState } from 'react';
import { KeyedIndex } from 'types/common';
import { StatefulTreeNode, Tree, TreeNode, TreeSource, TreeState } from 'types/tree';
import { suffixes } from 'util/functional';

export function useTree<T>(source: TreeSource<T>, state: TreeState): Tree<StatefulTreeNode<T>> {
    const [rootNodes, setRootNodes] = useState<Array<TreeNode<T>> | null>(null);
    const [children, setChildren] = useState<KeyedIndex<Array<TreeNode<T>>>>({});
    const [childrenLoading, setChildrenLoading] = useState<KeyedIndex<boolean>>({});
    const [trails, setTrails] = useState<KeyedIndex<Array<TreeNode<T>>>>({});

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

    return useStatefulTree({
        activeId,
        activeTrailIds,
        children,
        childrenLoading,
        expandedIds: expandedIds || {},
        rootNodes,
    });
}
