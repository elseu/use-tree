import { text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react';
import React, { useState } from 'react';

import { Tree, TreeContainer, TreeNode, TreeState, useTreeNodeController } from 'index';

/* tslint:disable:no-console */

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
    async children(id: string | null) {
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

interface IListProps {
    tree: Tree<Labeled>;
}

const List: React.FC<IListProps> = React.memo(({ tree }) => {
    return (
        <ul>
            {tree.isLoading ? <li>loading...</li> : null}
            {tree.items.map((item) => (
                <ListItem item={item} key={item.id} />
            ))}
        </ul>
    );
});

interface IListItemProps {
    item: TreeNode<Labeled>;
}

const ListItem: React.FC<IListItemProps> = React.memo(({ item }) => {
    console.log('render', item.id);
    const { toggleExpanded } = useTreeNodeController(item);
    const subItems = item.isExpanded && item.hasChildren
        ? <List tree={item.children} />
        : null;
    return (
        <li>
            <button onClick={toggleExpanded}>
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

const TreeExampleContainer: React.FC<{ activeId?: string }> = ({ activeId }) => {
    const [state, setState] = useState<TreeState>({ activeId });
    if (state.activeId !== activeId) {
        setState({ ...state, activeId });
    }

    return (
        <TreeContainer source={testSource} state={state} onStateChange={setState} rootElement={List} />
    );
};

stories.add('Test', () => {
    return (
        <>
            <TreeExampleContainer activeId={text('Active ID', 'sebastiaan')} />
        </>
    );
 });
