import { useCallback, useState } from 'react';

export function useInlineConfirm() {
    const [active, setActive] = useState(false);
    const ask = useCallback(() => setActive(true), []);
    const cancel = useCallback(() => setActive(false), []);
    const run = useCallback((fn) => {
        setActive(false);
        return fn?.();
    }, []);
    return { active, ask, cancel, run };
}
