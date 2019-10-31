import { TreeSource, TreeSourceNode } from './types';

export type StaticTreeSourceNode<T> = TreeSourceNode<T & StaticTreeSourceNodeData<T>>;

interface StaticTreeSourceNodeData<T> {
    children: Array<StaticTreeSourceNode<T>>;
}

class StaticTreeSource<T> implements TreeSource<T> {
    private rootElements: Array<StaticTreeSourceNode<T>> = [];
    private childrenData: { [k: string]: Array<StaticTreeSourceNode<T>> } = {};
    private trailsData: { [k: string]: Array<StaticTreeSourceNode<T>> } = {};

    constructor(data: Array<StaticTreeSourceNode<T>>) {
        this.rootElements = data;
        const walkTree = (children: Array<StaticTreeSourceNode<T>>, trail: Array<StaticTreeSourceNode<T>>) => {
            const parentId = trail[0] ? trail[0].id : null;
            if (parentId !== null) {
                this.childrenData[parentId] = [];
            }
            for (const child of children) {
                if (parentId !== null) {
                    this.childrenData[parentId].push(child);
                }
                const childTrail = [child, ...trail];
                this.trailsData[child.id] = childTrail;
                walkTree(child.children, childTrail);
            }
        };
        walkTree(data, []);
    }

    public children(id: string | null): Promise<Array<TreeSourceNode<T>>> {
        return Promise.resolve(id === null ? this.rootElements : (this.childrenData[id] || []));
    }
    public trail(id: string): Promise<Array<TreeSourceNode<T>>> {
        return Promise.resolve(this.trailsData[id] || []);
    }
}

export const staticTreeSource = <T>(data: Array<StaticTreeSourceNode<T>>): TreeSource<T> => {
    return new StaticTreeSource(data);
};
