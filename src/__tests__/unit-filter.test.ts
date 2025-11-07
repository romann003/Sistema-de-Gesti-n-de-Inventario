import { mockProducts } from '../../src/lib/mockData';

// Simple filter function identical to the component logic (name + sku only)
function filterProducts(products: any[], q: string) {
  const query = (q || '').trim().toLowerCase();
  if (!query) return products;
  return products.filter((p) => {
    return (
      (p.name || '').toLowerCase().includes(query) ||
      (p.sku || '').toLowerCase().includes(query)
    );
  });
}

describe('filterProducts', () => {
  it('returns all products when query is empty', () => {
    const res = filterProducts(mockProducts, '');
    expect(res.length).toBe(mockProducts.length);
  });

  it('filters by name', () => {
    const res = filterProducts(mockProducts, 'Laptop');
    expect(res.some(p => p.name.includes('Laptop'))).toBe(true);
    expect(res.every(p => p.name.toLowerCase().includes('laptop') || p.sku.toLowerCase().includes('laptop'))).toBe(true);
  });

  it('filters by sku', () => {
    const res = filterProducts(mockProducts, 'SSD-007');
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[0].sku).toBe('SSD-007');
  });

  it('is case-insensitive', () => {
    const res = filterProducts(mockProducts, 'webcam');
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[0].name.toLowerCase()).toContain('webcam');
  });
});
