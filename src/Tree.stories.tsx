import { action } from '@storybook/addon-actions';
import { text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { useTree } from 'index';
import { StatefulTreeNode, TreeState } from 'types';

// Generate strings 'a' through 'z'.
function letterRange(): string[] {
    return range(('a').charCodeAt(0), ('z').charCodeAt(0)).map((x) => String.fromCharCode(x));
}

// Generate an inclusive range.
function range(start: number, end: number): number[] {
    return [...Array(end - start + 1)].map((_, i) => i + start);
}

async function timeout(ms) {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
}

const testSource = {
    async children(id?: string | null | undefined) {
        console.log('source load children', id);
        const parentId = id || '';
        await timeout(100);
        return letterRange().map((x) => ({
            id: parentId + x,
            label: parentId + x,
            hasChildren: true,
        }));
    },
    async trail(id: string) {
        console.log('source load trail', id);
        await timeout(100);
        return range(1, id.length).reverse().map((length) => {
            return {
                id: id.substr(0, length),
                label: id.substr(0, length),
                hasChildren: true,
            };
        });
    },
};

interface Labeled {
    label: string;
}

const stories = storiesOf('Tree', module);

const renderAction = action('render');

interface IListProps {
    items: Array<StatefulTreeNode<Labeled>>;
    isLoading: boolean;
    onSetExpanded(id: string, expanded: boolean): void;
}

const List: React.FC<IListProps> = React.memo(({ items, isLoading, onSetExpanded }) => {
    return (
        <ul>
            {isLoading ? <li>loading...</li> : null}
            {items.map((item) => (
                <ListItem item={item} key={item.id} onSetExpanded={onSetExpanded} />
            ))}
        </ul>
    );
});

interface IListItemProps {
    item: StatefulTreeNode<Labeled>;
    onSetExpanded(id: string, expanded: boolean): void;
}

const ListItem: React.FC<IListItemProps> = React.memo(({ item, onSetExpanded }) => {
    // renderAction(item.label);
    const onClickExpanded = useCallback(() => {
        onSetExpanded(item.id, !item.isExpanded);
    }, [item, onSetExpanded]);
    const subItems = item.isExpanded && item.hasChildren
        ? <List items={item.children || []} isLoading={item.isLoadingChildren} onSetExpanded={onSetExpanded} />
        : null;
    return (
        <li>
            <button onClick={onClickExpanded}>
                {item.isExpanded ? '(-)' : '(+)'}
            </button>
            {' '}
            {item.isActiveTrail
                ? (item.isActive ? <strong>{item.label}</strong> : <em>{item.label}</em>)
                : item.label
            }
            {subItems}
        </li>
    );
});

const emptyTreeState: TreeState = {};

const TreeContainer: React.FC<{ activeId?: string }> = ({ activeId }) => {
    const [treeState, setTreeState] = useState(emptyTreeState);
    const tree = useTree(testSource, treeState);
    if (treeState.activeId !== activeId) {
        setTreeState((st) => ({ ...st, activeId}));
    }

    const onSetExpanded = useCallback((id: string, expanded: boolean) => {
        setTreeState((st: TreeState) => ({ ...st, expandedIds: { ...st.expandedIds, [id]: expanded } }));
    }, [setTreeState]);

    return (
        <List items={tree.rootNodes} isLoading={tree.isLoading} onSetExpanded={onSetExpanded} />
    );
}

stories.add('Test', () => {
    return (
        <>
            <TreeContainer activeId={text('Active ID', 'sebastiaan')} />
        </>
    );
 });
