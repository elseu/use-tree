import { useMemo, useRef } from 'react';
import { KeyedIndex } from 'types/common';
import { StatefulTreeNode, Tree, TreeNode } from 'types/tree';
import { valuesEqual } from 'util/values-equal';

interface StatefulTreeInput<T> {
    activeId: string | null | undefined;
    activeTrailIds: string[];
    children: KeyedIndex<Array<TreeNode<T>>>;
    childrenLoading: KeyedIndex<boolean>;
    expandedIds: KeyedIndex<boolean>;
    rootNodes: Array<TreeNode<T>> | null;
}

export function useStatefulTree<T>(props: StatefulTreeInput<T>): Tree<StatefulTreeNode<T>> {
    const {
        activeId,
        activeTrailIds,
        children,
        childrenLoading,
        expandedIds,
        rootNodes,
    } = props;

    const outputNodes = useRef<KeyedIndex<StatefulTreeNode<T>>>({});

    return useMemo(() => {
        const activeTrailIdsIndex = Object.fromEntries(activeTrailIds.map((id) => [id, true]));
        const expandedIdsIndex = expandedIds;

        function buildOutputNode(node: TreeNode<T>): StatefulTreeNode<T> {
            const nodeId = node.id;
            const current = outputNodes.current[nodeId];
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
