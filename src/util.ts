export function objectFromEntries<T = any>(entries: Array<[string | number, T]>): { [k: string]: T } {
    return entries.reduce<{ [k: string]: T }>((obj, [k, v]) => { obj[k] = v; return obj; }, {});
}
