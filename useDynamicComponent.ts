import { ComponentType, useCallback, useEffect, useState } from 'react';

type DynamicComponentProps<T> = {
  loader: () => Promise<{ [key: string]: ComponentType<T> }>;
  defaultLoad?: boolean;
  exportName?: string;
  onLoad?: () => void;
};

type DynamicComponentResult<T> = {
  Component?: ComponentType<T>;
  load: () => Promise<void>;
  isLoading: boolean;
  isLoaded: boolean;
  error?: Error;
};

export const useDynamicComponent = <T>({ loader, exportName, defaultLoad, onLoad }: DynamicComponentProps<T>): DynamicComponentResult<T> => {
  const [Component, setComponent] = useState<ComponentType<T>>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error>();

  const load = useCallback(async () => {
    if (isLoaded || isLoading) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const mod = await loader();
      const modName = Object.keys(mod)[0];
      const LoadedComponent = exportName && mod[exportName] ? mod[exportName] : mod[modName] || mod.default;

      if (!LoadedComponent) {
        throw new Error(`Component ${exportName} not found. Loaded modules: ${Object.keys(mod).join(', ')}`);
      }

      setComponent(() => LoadedComponent);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load component', err);
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
      onLoad?.();
    }
  }, [isLoaded, isLoading, loader, exportName, onLoad]);

  useEffect(() => {
    if (defaultLoad) load();
  }, [defaultLoad, load]);

  return { Component, load, isLoading, isLoaded, error };
};
