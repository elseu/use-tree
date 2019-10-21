import { useMemo, useRef } from 'react';

export function useLoadOnce(): <T>(k: string, f: () => Promise<T>) => Promise<T> {
    const loadPromisesRef = useRef<{ [k: string]: Promise<unknown> }>({});
    return useMemo(() => {
        return function loadOnce<U>(k: string, f: () => Promise<U>): Promise<U> {
            if (!loadPromisesRef.current[k]) {
                loadPromisesRef.current[k] = f();
            }
            return loadPromisesRef.current[k] as Promise<U>;
        };
    }, [loadPromisesRef]);
}
