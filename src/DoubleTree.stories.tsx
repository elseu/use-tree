/* eslint-disable import/no-anonymous-default-export */
import { Story } from '@storybook/react';
import { Tree, TreeContainer, TreeNode, TreeState, useTreeNodeController } from 'index';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TreeSource } from 'types';
import { useTreeController } from 'use-tree-controller';
import { objectFromEntries } from './util';


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

interface Labeled {
  label: string;
}

const LeftList: React.FC<IListProps> = React.memo(({ tree }) => {
  return (
    <ul>
      {tree.isLoading ? <li>loading...</li> : null}
      {tree.items.map((item) => (
        <LeftListItem item={item} key={item.id} />
      ))}
    </ul>
  );
});

const LeftListItem: React.FC<IListItemProps> = React.memo(({ item }) => {
  const { updateState, setActiveId } = useTreeController();
  const isRightListEntryPoint = item.depth === 2 && item.hasChildren;
  const subItems = item.isExpanded && item.hasChildren && !isRightListEntryPoint
    ? <LeftList tree={item.children} />
    : null;

  const onClick = useCallback(() => {
    if (isRightListEntryPoint) {
      // Make this item active, which will update the tree on the right.
      setActiveId(item.id);
    } else {
      // Toggle this item and collapse everything else at this depth.
      updateState((state, rootTree) => {
        const { expandedIds, ...rest } = state;
        const newExpandedIds: { [k: string]: boolean } = {
          ...expandedIds,
          // Collapse all children at this same depth.
          ...objectFromEntries(
            Object.values(rootTree.allNodes) // For all nodes in the tree.
              .filter(({ depth }) => depth === item.depth) // At the same level.
              .map(({ id }) => [id, false]), // Create a [id]: false element in expandedIds.
          ),
          // Toggle the current item.
          [item.id]: !item.isExpanded,
        };
        return { expandedIds: newExpandedIds, ...rest };
      });
    }
  }, [item, isRightListEntryPoint, setActiveId, updateState]);
  return (
    <li>
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a onClick={onClick}>
        {' '}
        {item.isActiveTrail
          ? (item.isActive ? <strong>{item.label}</strong> : <em>{item.label}</em>)
          : item.label
        }
        {` (${item.depth})`}
      </a>
      {subItems}
    </li>
  );
});

interface IListProps {
  tree: Tree<Labeled>;
}

interface IListItemProps {
  item: TreeNode<Labeled>;
}

const RightList: React.FC<IListProps> = React.memo(({ tree }) => {
  return (
    <ul>
      {tree.isLoading ? <li>loading...</li> : null}
      {tree.items.map((item) => (
        <RightListItem item={item} key={item.id} />
      ))}
    </ul>
  );
});

const RightListItem: React.FC<IListItemProps> = React.memo(({ item }) => {
  const { toggleExpanded } = useTreeNodeController(item);
  const subItems = item.isExpanded && item.hasChildren
    ? <RightList tree={item.children} />
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

/**
 * Create a source that returns only items under a specific root item of a tree.
 *
 * @param source The source to wrap.
 * @param rootId The root ID within the source.
 */
function useSubTreeSource<T>(source: TreeSource<T>, rootId: string | null): TreeSource<T> {
  return useMemo(() => {
    return {
      async children(id: string | null) {
        if (id === null) {
          if (rootId === null) {
            return [];
          }
          return source.children(rootId);
        }
        return source.children(id);
      },
      async trail(id: string) {
        if (rootId === null) {
          return [];
        }
        const fullTrail = await source.trail(id);
        const rootItemIndex = fullTrail.findIndex((item) => item.id === rootId);
        if (rootItemIndex === -1) {
          return [];
        }
        return fullTrail.slice(0, rootItemIndex + 1);
      },
    };
  }, [source, rootId]);
}

interface TreeExampleContainerProps {
  source: TreeSource<Labeled>;
  activeId?: string;
  loadingTransitionMs?: number;
}

const TreeExampleContainer: React.FC<TreeExampleContainerProps> = (props) => {
  const { activeId, source, loadingTransitionMs = 0 } = props;
  const [leftState, setLeftState] = useState<TreeState>({ activeId });
  const [rightState, setRightState] = useState<TreeState>({});

  // Switch active items based on Storybook knobs.
  useEffect(() => {
    setLeftState({ ...leftState, activeId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const subSource = useSubTreeSource(source, leftState.activeId || null);

  const currentActiveId = leftState.activeId;
  useEffect(() => {
    console.log(`The active ID has changed to ${currentActiveId}. We can update routing here.`);
  }, [currentActiveId]);

  return (
    <div style={{ clear: 'both' }}>
      <div style={{ float: 'left', width: '50%' }}>
        <TreeContainer
          source={source}
          state={leftState}
          onStateChange={setLeftState}
          rootElement={LeftList}
          loaderOptions={{ loadingTransitionMs }}
        />
      </div>
      <div style={{ float: 'left', width: '50%' }}>
        <TreeContainer
          source={subSource}
          state={rightState}
          onStateChange={setRightState}
          rootElement={RightList}
          loaderOptions={{ loadingTransitionMs }}
        />
      </div>
    </div>
  );
};


export default {
  title: 'DoubleTree',
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

const TemplateDoubleTree: Story<TreeExampleContainerProps> = (args: TreeExampleContainerProps) => (
  <TreeExampleContainer {...args} />
);

export const DoubleTree = TemplateDoubleTree.bind({});
DoubleTree.args = {
  activeId: 'seb',
  source: testSource,
  loadingTransitionMs: 100
};