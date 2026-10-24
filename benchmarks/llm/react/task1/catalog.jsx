import React from 'react';
import { renderToString } from 'react-dom/server';

function statusLabel(status) {
  switch (status) {
    case 'featured':
      return 'Featured';
    case 'clearance':
      return 'Clearance';
    default:
      return 'Standard';
  }
}

export function Catalog({ products, title = 'Product Catalog', sale = true }) {
  return (
    <main>
      <h1>{title}</h1>
      {sale ? <p className="banner">Sale now on</p> : null}
      <ul>
        {products.length === 0 ? (
          <li className="empty">No products available</li>
        ) : (
          products.map((product) => (
            <li key={product.id}>
              <span className="name">{product.name}</span>
              <span className="price">${product.price}</span>
              <span className="stock">{product.stock > 0 ? 'In stock' : 'Out of stock'}</span>
              <span className="status">{statusLabel(product.status)}</span>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}

export function renderCatalog(products, options = {}) {
  return renderToString(<Catalog products={products} {...options} />);
}
