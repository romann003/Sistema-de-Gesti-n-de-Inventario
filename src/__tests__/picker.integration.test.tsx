import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomersAndSales } from '../../src/components/CustomersAndSales';
import { mockProducts, mockCustomers } from '../../src/lib/mockData';

describe('Product picker integration', () => {
  it('opens picker and filters results by name/sku', async () => {
    const user = userEvent.setup();
    const onCustomersChange = vi.fn();
    const onSalesChange = vi.fn();
    const onProductsChange = vi.fn();

    render(
      <CustomersAndSales
        customers={mockCustomers}
        sales={[]}
        products={mockProducts}
        currentUserName="Tester"
        onCustomersChange={onCustomersChange}
        onSalesChange={onSalesChange}
        onProductsChange={onProductsChange}
      />
    );

    // Open the 'Registrar Venta' dialog
    const regButton = screen.getByRole('button', { name: /registrar venta/i });
    await user.click(regButton);

    // Click Productos to open picker
    const productsButton = await screen.findByRole('button', { name: /productos/i });
    await user.click(productsButton);

    // Wait for picker input
    const input = await screen.findByPlaceholderText(/Buscar producto por nombre o SKU/i);
    await user.type(input, 'SSD-007');

    // Expect a row with SSD-007 to appear
    const skuCell = await screen.findByText(/SSD-007/);
    expect(skuCell).toBeInTheDocument();

    // Type a query that shouldn't match and expect 'No se encontraron productos' message
    await user.clear(input);
    await user.type(input, 'NO-MATCH-XYZ');
    const noMatch = await screen.findByText(/No se encontraron productos que coincidan con la búsqueda/i);
    expect(noMatch).toBeInTheDocument();
  }, 20000);
});
