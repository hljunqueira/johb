import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';

// Mock component to test the context
const TestComponent = () => {
  const { items, total, itemCount, addItem, removeItem, updateQuantity, clearCart, updateObservation } = useCart();
  
  return (
    <div>
      <div data-testid="item-count">{itemCount}</div>
      <div data-testid="total">{total.toFixed(2)}</div>
      <div data-testid="items-length">{items.length}</div>
      
      <button 
        data-testid="add-item"
        onClick={() => addItem({
          id: '1',
          name: 'Test Product',
          price: 29.90,
          quantity: 1,
          additionals: []
        })}
      >
        Add Item
      </button>
      
      <button 
        data-testid="remove-item"
        onClick={() => removeItem(items[0]?.cart_id)}
      >
        Remove Item
      </button>
      
      <button 
        data-testid="update-quantity"
        onClick={() => items[0] && updateQuantity(items[0].cart_id, 3)}
      >
        Update Quantity
      </button>
      
      <button 
        data-testid="update-observation"
        onClick={() => items[0] && updateObservation(items[0].cart_id, 'Sem cebola')}
      >
        Update Observation
      </button>
      
      <button 
        data-testid="clear-cart"
        onClick={clearCart}
      >
        Clear Cart
      </button>
      
      {items.map(item => (
        <div key={item.cart_id} data-testid={`item-${item.id}`}>
          {item.name} - {item.quantity}x - {item.observation || 'No observation'}
        </div>
      ))}
    </div>
  );
};

const renderWithProvider = (component) => {
  return render(
    <CartProvider>
      {component}
    </CartProvider>
  );
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with empty cart', () => {
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByTestId('item-count')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0.00');
    expect(screen.getByTestId('items-length')).toHaveTextContent('0');
  });

  it('should add item to cart', () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByTestId('add-item'));
    
    expect(screen.getByTestId('item-count')).toHaveTextContent('1');
    expect(screen.getByTestId('total')).toHaveTextContent('29.90');
    expect(screen.getByTestId('items-length')).toHaveTextContent('1');
    expect(screen.getByTestId('item-1')).toHaveTextContent('Test Product');
  });

  it('should update item quantity', () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByTestId('add-item'));
    fireEvent.click(screen.getByTestId('update-quantity'));
    
    expect(screen.getByTestId('item-count')).toHaveTextContent('3');
    expect(screen.getByTestId('total')).toHaveTextContent('89.70');
  });

  it('should update item observation', () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByTestId('add-item'));
    fireEvent.click(screen.getByTestId('update-observation'));
    
    expect(screen.getByTestId('item-1')).toHaveTextContent('Sem cebola');
  });

  it('should remove item from cart', () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByTestId('add-item'));
    expect(screen.getByTestId('items-length')).toHaveTextContent('1');
    
    fireEvent.click(screen.getByTestId('remove-item'));
    expect(screen.getByTestId('items-length')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0.00');
  });

  it('should clear cart', () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByTestId('add-item'));
    fireEvent.click(screen.getByTestId('add-item'));
    expect(screen.getByTestId('items-length')).toHaveTextContent('2');
    
    fireEvent.click(screen.getByTestId('clear-cart'));
    expect(screen.getByTestId('items-length')).toHaveTextContent('0');
    expect(screen.getByTestId('item-count')).toHaveTextContent('0');
  });

  it('should calculate total correctly with additionals', () => {
    const TestWithAdditionals = () => {
      const { items, total, addItem } = useCart();
      
      return (
        <div>
          <div data-testid="total">{total.toFixed(2)}</div>
          <button 
            data-testid="add-with-additionals"
            onClick={() => addItem({
              id: '1',
              name: 'Test Product',
              price: 29.90,
              quantity: 2,
              additionals: [
                { name: 'Extra', price: 5.00 },
                { name: 'Bacon', price: 8.00 }
              ]
            })}
          >
            Add With Additionals
          </button>
        </div>
      );
    };
    
    renderWithProvider(<TestWithAdditionals />);
    
    fireEvent.click(screen.getByTestId('add-with-additionals'));
    // (29.90 + 5.00 + 8.00) * 2 = 85.80
    expect(screen.getByTestId('total')).toHaveTextContent('85.80');
  });
});
