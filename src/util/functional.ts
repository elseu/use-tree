export function suffixes<T>(arr: T[]): T[][] {
    const output: T[][] = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        output.push(arr.slice(i));
    }
    return output;
}
