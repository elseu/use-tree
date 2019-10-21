import { useEffect } from 'react';

export function useAsyncEffect(f: () => Promise<void>, deps: any[]) {
    return useEffect(() => {
        f();
    }, deps);
}
