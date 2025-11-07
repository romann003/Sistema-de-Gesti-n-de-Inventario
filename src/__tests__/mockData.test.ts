import { describe, it, expect } from 'vitest';
import { mockProducts } from '../lib/mockData';

describe('mockData', () => {
  it('provides products with expected fields', () => {
    expect(Array.isArray(mockProducts)).toBe(true);
    expect(mockProducts.length).toBeGreaterThan(0);
    const p = mockProducts[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name');
    expect(p).toHaveProperty('sku');
    expect(typeof p.currentStock).toBe('number');
  });

  it('can filter products by sku', () => {
    const sku = mockProducts[0].sku;
    const found = mockProducts.filter((p) => p.sku === sku);
    expect(found.length).toBeGreaterThanOrEqual(1);
  });
});
