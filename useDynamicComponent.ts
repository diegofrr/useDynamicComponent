import { ComponentType, useCallback, useEffect, useReducer, useRef } from 'react';

type DynamicModule<T> = { default?: ComponentType<T>; [key: string]: ComponentType<T> | undefined };

type DynamicComponentOptions<T> = {
  /**
   * If provided, the hook will load the export with this name
   * from the imported module.
   * Otherwise, it will try to use the `default` export.
   */
  autoLoad?: boolean;

  /**
   * Name of the export to load from the module.
   * If not provided, the default export will be used.
   */
  exportName?: string;

  /**
   * Render when there is an error loading the component.
   */
  fallback?: ComponentType<T>;

  onLoad?: () => void;
  onError?: (error: Error) => void;
};

enum ActionType {
  LOAD_START = 'LOAD_START',
  LOAD_SUCCESS = 'LOAD_SUCCESS',
  LOAD_ERROR = 'LOAD_ERROR',
  RELOAD = 'RELOAD',
}

type State<T> = {
  Component?: ComponentType<T>;
  isLoading: boolean;
  isLoaded: boolean;
  error?: Error;
};

type Action<T> =
  | { type: ActionType.LOAD_START }
  | { type: ActionType.LOAD_SUCCESS; Component: ComponentType<T> }
  | { type: ActionType.LOAD_ERROR; error: Error }
  | { type: ActionType.RELOAD };

const reducer = <T>(state: State<T>, action: Action<T>): State<T> => {
  switch (action.type) {
    case ActionType.LOAD_START:
      return { ...state, isLoading: true, error: undefined };
    case ActionType.LOAD_SUCCESS:
      return { Component: action.Component, isLoading: false, isLoaded: true, error: undefined };
    case ActionType.LOAD_ERROR:
      return { ...state, isLoading: false, isLoaded: false, error: action.error };
    case ActionType.RELOAD:
      return { Component: undefined, isLoading: false, isLoaded: false, error: undefined };
    default:
      return state;
  }
};

export const useDynamicComponent = <T>(
  loader: () => Promise<DynamicModule<T>>,
  { autoLoad, exportName, onLoad, onError, fallback }: DynamicComponentOptions<T> = {},
) => {
  const isLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const hasAutoLoaded = useRef(false);
  const initialState: State<T> = { isLoading: false, isLoaded: false };

  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    if (isLoadedRef.current || isLoadingRef.current) return;

    isLoadingRef.current = true;
    dispatch({ type: ActionType.LOAD_START });

    try {
      const mod = await loader();
      const keys = Object.keys(mod).filter((k) => k !== '__esModule');

      let LoadedComponent: ComponentType<T> | undefined;

      if (exportName) LoadedComponent = mod[exportName as keyof DynamicModule<T>];
      else if (keys.length === 1) LoadedComponent = mod[keys[0] as keyof DynamicModule<T>];
      else throw new Error(`Module has multiple exports (${keys.join(', ')}), but no exportName was provided.`);

      if (!LoadedComponent) {
        throw new Error(`Component ${exportName || 'default'} not found. Loaded modules: ${Object.keys(mod).join(', ')}`);
      }

      dispatch({ type: ActionType.LOAD_SUCCESS, Component: LoadedComponent });
      isLoadedRef.current = true;
      onLoad?.();
    } catch (err) {
      const error = err as Error;
      dispatch({ type: ActionType.LOAD_ERROR, error });
      onError?.(error);
      console.error('Failed to load component', error);

      if (fallback) dispatch({ type: ActionType.LOAD_SUCCESS, Component: fallback });
    } finally {
      isLoadingRef.current = false;
    }
  }, [loader, exportName, onLoad, onError]);

  const reload = useCallback(() => {
    isLoadedRef.current = false;
    isLoadingRef.current = false;

    dispatch({ type: ActionType.RELOAD });
    return load();
  }, [load]);

  useEffect(() => {
    if (!autoLoad || hasAutoLoaded.current) return;
    load().then(() => (hasAutoLoaded.current = true));
  }, [autoLoad, load]);

  return { ...state, load, reload };
};
