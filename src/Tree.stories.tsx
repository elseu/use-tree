import { action } from '@storybook/addon-actions';
import { text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { TreeContainer, useTreeContent, useTreeController } from 'TreeContainer';
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

interface IListProps {
    items: Array<StatefulTreeNode<Labeled>>;
    isLoading: boolean;
}

const List: React.FC<IListProps> = React.memo(({ items, isLoading }) => {
    return (
        <ul>
            {isLoading ? <li>loading...</li> : null}
            {items.map((item) => (
                <ListItem item={item} key={item.id} />
            ))}
        </ul>
    );
});

interface IListItemProps {
    item: StatefulTreeNode<Labeled>;
}

const ListItem: React.FC<IListItemProps> = React.memo(({ item }) => {
    console.log('render', item.id);
    const { setExpanded } = useTreeController();
    const onClickExpanded = useCallback(() => {
        setExpanded(item.id, !item.isExpanded);
    }, [item, setExpanded]);
    const subItems = item.isExpanded && item.hasChildren
        ? <List items={item.children || []} isLoading={item.isLoadingChildren} />
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

const RootList: React.FC<{}> = ({ children }) => {
    const tree = useTreeContent<Labeled>();
    return <List items={tree.rootNodes} isLoading={tree.isLoading} />;
};

const TreeExampleContainer: React.FC<{ activeId?: string }> = ({ activeId }) => {
    const [state, setState] = useState<TreeState>({ activeId });
    if (state.activeId !== activeId) {
        setState({ ...state, activeId });
    }

    return (
        <TreeContainer source={testSource} state={state} setState={setState}>
            <RootList />
        </TreeContainer>
    );
};

stories.add('Test', () => {
    return (
        <>
            <TreeExampleContainer activeId={text('Active ID', 'sebastiaan')} />
        </>
    );
 });
