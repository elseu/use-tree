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

const source = {
    async children(id?: string | null | undefined) {
        console.log('source load children', id);
        const parentId = id || '';
        await timeout(500);
        return letterRange().map((x) => ({
            id: parentId + x,
            label: parentId + x,
            hasChildren: true,
        }));
    },
    async trail(id: string) {
        console.log('source load trail', id);
        await timeout(500);
        return range(1, id.length).reverse().map((length) => {
            return {
                id: id.substr(0, length),
                label: id.substr(0, length),
                hasChildren: true,
            };
        });
    },
};

export const testSource = () => source;
