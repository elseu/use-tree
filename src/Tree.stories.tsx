import { storiesOf } from '@storybook/react';
import React, { Dispatch, SetStateAction, useCallback, useState } from 'react';

import { StatefulTreeNode, TreeState, useTree } from 'index';
import { testSource } from 'test/testsource';

interface Labeled {
    label: string;
}

const stories = storiesOf('Tree', module);

const src = testSource();

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
    const onClickExpanded = useCallback(() => {
        onSetExpanded(item.id, !item.isExpanded);
    }, [item, onSetExpanded]);
    const subItems = item.isExpanded && item.hasChildren
        ? <List items={item.children || []} isLoading={item.isLoadingChildren} onSetExpanded={onSetExpanded} />
        : null;
    return (
        <li>
            <button onClick={onClickExpanded}>{item.isExpanded ? '(-)' : '(+)'}</button> {item.label}
            {subItems}
        </li>
    );
});

const emptyTreeState: TreeState = {};

stories.add('Test', () => {
    const [treeState, setTreeState] = useState(emptyTreeState);
    const tree = useTree(src, treeState);

    const onSetExpanded = useCallback((id: string, expanded: boolean) => {
        setTreeState((st: TreeState) => ({ ...st, expandedIds: { ...st.expandedIds, [id]: expanded } }));
    }, [setTreeState]);

    return (
        <>
            <List items={tree.rootNodes} isLoading={tree.isLoading} onSetExpanded={onSetExpanded} />
        </>
    );
 });
