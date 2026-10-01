import * as React from 'react';

/** useLayoutEffect in the browser, useEffect on the server: React 18 warns when a layout effect renders on the server. */
export const useIsoLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
