import React, { useEffect, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { mockProducts } from '../lib/mockData';

// Create a small component that calls getProducts on mount and shows count
const TestConsumer: React.FC<{ getProducts: () => Promise<any[]> }> = ({ getProducts }) => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      const p = await getProducts();
      setCount(p?.length ?? 0);
    })();
  }, [getProducts]);

  return <div>{count === null ? 'loading' : `count:${count}`}</div>;
};

describe('Products integration (mocked)', () => {
  it('renders products count using a mocked getProducts', async () => {
    const fakeGetProducts = vi.fn(async () => mockProducts);
    render(<TestConsumer getProducts={fakeGetProducts} />);
    await waitFor(() => expect(screen.getByText(/count:/)).toBeInTheDocument());
    expect(screen.getByText(`count:${mockProducts.length}`)).toBeInTheDocument();
    expect(fakeGetProducts).toHaveBeenCalledOnce();
  });
});
