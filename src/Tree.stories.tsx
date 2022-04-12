/* eslint-disable import/no-anonymous-default-export */
import { Story } from '@storybook/react';
import { Tree, TreeContainer, TreeNode, TreeState, useTreeNodeController } from 'index';
import React, { useCallback, useState } from 'react';
import { staticTreeSource } from 'static-tree-source';
import { TreeSource } from 'types';
import { useTreeNodesController } from 'use-tree-controller';

/* tslint:disable:no-console */

// Generate strings 'a' through 'z'.
function letterRange(): string[] {
  return range(('a').charCodeAt(0), ('z').charCodeAt(0)).map((x) => String.fromCharCode(x));
}

// Generate an inclusive range.
function range(start: number, end: number): number[] {
  return [...Array(end - start + 1)].map((_, i) => i + start);
}

async function timeout(ms: number) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

const testSource = {
  async children(id: string | null) {
    console.log('source load children', id);
    const parentId = id || '';
    await timeout(100 + Math.random() * 1000);
    return letterRange().map((x) => ({
      id: parentId + x,
      label: parentId + x,
      hasChildren: true,
    }));
  },
  async trail(id: string) {
    console.log('source load trail', id);
    await timeout(100 + Math.random() * 1000);
    return range(1, id.length).reverse().map((length) => {
      return {
        id: id.substr(0, length),
        label: id.substr(0, length),
        hasChildren: true,
      };
    });
  },
};

const staticSource = staticTreeSource<Labeled>([
  {
    id: 'aap',
    label: 'Aap',
    hasChildren: false,
    children: [],
  },
  {
    id: 'pinguin',
    label: 'Pinguïn',
    hasChildren: false,
  },
  {
    id: 'schaap',
    label: 'Schaap',
    hasChildren: true,
    children: [
      {
        id: 'schaap-aap',
        label: 'Schaap/aap',
        hasChildren: true,
        children: [
          {
            id: 'schaap-aap-aap',
            label: 'Schaap/aap/aap',
            hasChildren: false,
            children: [],
          },
        ],
      },
      {
        id: 'schaap-blaat',
        label: 'Schaap/blaat',
        hasChildren: true,
        children: [
          {
            id: 'schaap-blaat-aap',
            label: 'Schaap/blaat/aap',
            hasChildren: false,
            children: [],
          },
        ],
      },
    ],
  },
]);

interface Labeled {
  label: string;
}

interface IListProps {
  tree: Tree<Labeled>;
}

const List: React.FC<IListProps> = React.memo(({ tree }) => {
  const { setMultipleExpanded } = useTreeNodesController(tree.items);

  const expandAll = useCallback(() => setMultipleExpanded(), [setMultipleExpanded]);

  return (
    <ul>
      <button onClick={expandAll}>Openklappen</button>
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
      {` (${item.depth})`}
      {subItems}
    </li>
  );
});

interface TreeExampleContainerProps {
  source: TreeSource<Labeled>;
  activeId?: string;
  loadingTransitionMs?: number;
}

const TreeExampleContainer: React.FC<TreeExampleContainerProps> = (props) => {
  const { activeId, source, loadingTransitionMs = 0 } = props;
  const [state, setState] = useState<TreeState>({ activeId });

  if (state.activeId !== activeId) {
    setState({ ...state, activeId });
  }

  return (
    <TreeContainer
      source={source}
      state={state}
      onStateChange={setState}
      rootElement={List}
      loaderOptions={{ loadingTransitionMs }}
    />
  );
};


export default {
  title: 'Tree',
  component: TreeContainer,
  argTypes: {
    activeId: { control: { type: 'text' } },
    loadingTransitionMs: { control: { type: 'number' } },
  },
  parameters: {
    controls: {
      exclude: ["source"],
    },
  },
};

const Template: Story<TreeExampleContainerProps> = (args: TreeExampleContainerProps) => (
  <TreeExampleContainer {...args} />
);

export const Static = Template.bind({});
Static.args = {
  activeId: 'schaap-blaat-aap',
  source: staticSource,
  loadingTransitionMs: 100
};

export const Test = Template.bind({});
Test.args = {
  activeId: 'sebastiaan',
  source: testSource,
  loadingTransitionMs: 100
};
