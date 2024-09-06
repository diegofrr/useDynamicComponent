# useDynamicComponent
A React custom hook for dynamically loading components.

### Usage example

```typescript
export const Example = () => {
  const { Component, load, isLoading, error } = useDynamicComponent({
    loader: () => import('@/components/shared/inactive-badge'),
  });

  return (
    <div>
      <Button
        onClick={async () => {
          await load();
          console.log('Component loaded');
        }}
      >
        {isLoading ? 'Loading...' : 'Load Component'}
      </Button>

      {error && <div>Error: {error.message}</div>}

      {Component && <Component />}
    </div>
  );
};
```
