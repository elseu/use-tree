# useTree
React components for tree structures

`useTree` is a set of components and hooks that make it ridiculously easy to work with lazy-loaded tree structures like navigation menus or tables of contents.

With `useTree` you can focus on how to render your tree structure and forget about loading data and managing tree state. `useTree` is easy to implement for any data source you can think of.

- [Installation](#installation)
- [Overview](#overview)
- [Components and hooks](#components-and-hooks)
  - [TreeContainer](#treecontainer)
  - [interface TreeSource](#interface-treesource)
  - [staticTreeSource()](#statictreesource)
  - [interface TreeState](#interface-treestate)
  - [useTreeController()](#usetreecontroller)
  - [useTreeNodeController(id: string)](#usetreenodecontrollerid-string)
  - [useTreeNodesController(ids: string[])](#usetreenodescontrollerids-string)
  - [useTreeContent()](#usetreecontent)
  - [useTreeLoader()](#usetreeloader)
- [Rendering a tree](#rendering-a-tree)
  - [Type RootTree<T>](#type-roottreet)
  - [Type Tree<T>](#type-treet)
  - [Type TreeNode<T>](#type-treenodet)
- [Typescript](#typescript)
- [Developer](#developer)

## Installation
`npm install -S use-tree`

## Overview
Using `useTree` is as easy as:

```tsx
import { TreeContainer } from 'use-tree';
import { myTreeDataSource } from './data';
import { List } from './list';

const MyTreeComponent = () => (
    <TreeContainer source={myTreeDataSource} rootElement={List} />
);
```

Here, `myTreeDataSource` is responsible for loading the data for your tree elements, and `List` is a custom component of your choice that renders the data from that tree.

What `TreeContainer` will do for you is:

* Call `myTreeDataSource` to load all required data.
* Pass the currently loaded tree data to `List`, and update that data to re-render whenever new data arrives.
* Manage which tree nodes are expanded and collapsed and use that information to load new data from `myTreeDataSource`.
* Include information in the data passed to `List` to allow it to show a loading state when child nodes are being fetched from the source.
* Make sure that re-rendering `List` works with `React.memo()` so that only the nodes that really need updates are re-rendered.
* Allow components inside `List` to expand and collapse tree nodes in one line of code.
* Allow you to make one tree node "active" and load and expand all nodes above it.

## Components and hooks
`useTree` provides these components and hooks:

* `TreeContainer`: the easiest entry point for normal use. Wrap this around your component, pass a data source of interface `TreeSource`, and you're usually good to go.
* `useTreeLoader()`: take a source and the current tree state and load data from the source to expand the tree, returning a simple an up-to-date data structure with tree data.
* `useTreeController()` / `useTreeNodeController(id: string)` / `useTreeNodesController(ids: string[])`: return an object that allows you to control the state of the current tree (from context).
* `useTreeContent()`: return the data for the current tree (from context).

We will now describe these in more detail.

### TreeContainer
The main wrapper component. Start here. This sets up tree loading and a tree context for a data source. It also allows you to pass the tree state and allow you to manage the tree state yourself.

Properties:

* `source: TreeSource`: the data source that `useTree` will fetch tree data from (described below).
* `state?: TreeState`: the current state of the tree. Pass this to use `TreeContainer` in controlled mode. This property tells `useTree` which tree nodes are expanded and which (if any) is active. If you pass a new state, `useTree` will update the tree data immediately and load the required data.
* * `defaultState?: TreeState`: the state to start with. If you pass this, but not `state`, then `TreeContainer` will manage state internally (uncontrolled).
* `onStateChange?: (st: TreeState) => void`: called whenever the tree state changes from within (usually through `useTreeController()`). Use this if you want to manage tree state in your own state container (like Redux).
* `loaderOptions?: TreeLoaderOptions`: options for loading data from the tree source. See [useTreeLoader()](#usetreeloader).
* `rootElement?: React.FC<{ tree: Tree<T> }>`: if passed, this element will be shown within the tree container. It will receive the tree as a prop.
* `render?: (props: { tree: Tree<T> }) => ReactNode`: if passed, this function will be called and its output tree is rendered within the tree container.


### interface TreeSource
Interface for a data source to fetch tree data, usually from a server. A data source should implement these two methods:

* `children(id: string | null): Promise<Array<TreeSourceNode<T>>>`: fetch an array of all children of a specified node, or all root elements if `id` is `null`.
* `trail(id: string): Promise<Array<TreeSourceNode<T>>>`: fetch a tree node *and all its ancestors*. The first element of the array should be the node, the seconds its parent, the third its parent's parent, all the way up to the root.

Type `TreeSourceNode<T>` contains all the properties of `T` (which is a type that you can define) as well as these properties:

* `id: string`: a unique identifier (within the tree) of the node.
* `hasChildren: boolean`: whether or not this node has child elements.

### staticTreeSource()
If you have the full content of the tree available in an object and you don't need lazy loading, you can use `staticTreeSource(data)` to turn it into a `TreeSource`. Your `data` must be an array of root nodes which conform to `StaticTreeSourceNode<T>`:

* All properties from `TreeSourceNode<T>`
* `children?: Array<StaticTreeSourceNode<T>>`

### interface TreeState
This interface describes the current display state of a tree. It contains two properties:

* `activeId?: string | null`: the ID of the tree node that is *active*. Within a navigation tree, this usually represents the current page or chapter. Setting an ID here causes `useTree` to load all of the ancestors of this node and all their child elements, to allow you to display the active item within its tree.
* `expandedIds?: { [k: string]: boolean }`: a dictionary of which elements are (or are not) expanded. Adding an element here as expanded will cause `useTree` to load its child elements, if they are not already known.

### useTreeController()
Get an object that lets you control the current tree (from context). Provides these methods:

* `updateState(updater: (oldState: TreeState, tree: RootTree<T>) => TreeState): void`: update the tree state with your own updater function.
* `setExpanded(id: string, expanded?: boolean): void`: expanded or collapse a tree node.
* `toggleExpanded(id: string): void`: toggle the expanded state of a tree node.
* `setActiveId(id: string | null): void`: set which (if any) tree node is active.

### useTreeNodeController(id: string)
Same as `useTreeController()`, but only for one tree node. You should, for instance, use this inside the component you use to render your tree nodes to control their expanded/collapsed state. Provides these methods:

* `setExpanded(expanded?: boolean): void`.
* `toggleExpanded(): void`.
* `setActive(active?: boolean): void`.

### useTreeNodesController(ids: string[])
Same as `useTreeNodeController()`, but for multiple tree nodes. Not all methods make sense, so it only provides:

* `setMultipleExpanded(expanded?: boolean): void`.

### useTreeContent()
When used inside the context of a tree, returns the current data of the tree. This can be used if you have several components nested inside your `<TreeContainer>` that all want to display the tree (or parts thereof).

### useTreeLoader()
Use this if you want full control and don't want to use `TreeContainer`. This hook takes a `TreeSource` and a `TreeState` and returns the most up-to-date tree data structure with type `RootTree<T>`. It will load data from the source if necessary and re-render as that data comes in.

The third argument to this hook is an optional `TreeLoaderOptions`. These options are as follows:

* `loadingTransitionMs?: number`: if set, `isLoading` on the children element of a node will only be set after we have been loading for the specified number of milliseconds. This prevents jarring unnecessary loading animations if data is usually loaded very quickly.

## Rendering a tree
When rendering a tree through the `rootElement` of `TreeContainer` or by passing the result of `useTreeLoader()` directly to your component, your component should accept these data types. We will assume that your `TreeSource` is of type `TreeSource<T>` where `T` is your own type that contains your own properties for tree nodes.

Root element properties:
* `tree: RootTree<T>`

### Type RootTree<T>
* All properties from `Tree<T>`
* `allNodes: {[k: string]: TreeNode<T>}`: all currently loaded tree nodes, indexed by ID.

### Type Tree<T>
* `isLoading: boolean`: whether the items are still being loaded.
* `items: Array<TreeNode<T>>`: an array of the currently loaded child nodes.

### Type TreeNode<T>
* All properties from `T`
* `id: string`
* `hasChildren: boolean`
* `isExpanded: boolean`
* `isActive: boolean`
* `isActiveTrail: boolean`
* `depth: number`
* `children: Tree<T>`

## Typescript
`useTree` supports Typescript and contains generic typings. Of course you can also use it in plain old Javascript.

## Developer

Developed by [Sebastiaan Besselsen](https://github.com/sbesselsen) at [Sdu Uitgevers](https://www.sdu.nl), The Netherlands.
