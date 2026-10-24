import React, { useEffect, useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);
  const [log, setLog] = useState([]);
  const [draft, setDraft] = useState('');
  const [items, setItems] = useState([]);
  const [nextId, setNextId] = useState(1);
  const doubled = count * 2;
  const parity = count % 2 === 0 ? 'Even' : 'Odd';

  useEffect(() => {
    setLog((prev) => [...prev, `count=${count} doubled=${doubled}`]);
  }, [count, doubled]);

  const addThree = () => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  };

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: nextId, text }]);
    setNextId((n) => n + 1);
    setDraft('');
  };

  return (
    <section>
      <p>
        Count: <span data-count>{count}</span>
      </p>
      <p>
        Doubled: <span data-doubled>{doubled}</span>
      </p>
      <p>
        Parity: <span data-parity>{parity}</span>
      </p>
      <button type="button" data-inc onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
      <button type="button" data-batch onClick={addThree}>
        Add 3
      </button>
      <ul data-log>
        {log.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
      <input data-draft value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="button" data-add onClick={addItem}>
        Add item
      </button>
      <button type="button" data-clear onClick={() => setItems([])}>
        Clear items
      </button>
      <ul data-items>
        {items.length === 0 ? (
          <li className="empty">No items yet</li>
        ) : (
          items.map((item) => <li key={item.id}>{item.text}</li>)
        )}
      </ul>
    </section>
  );
}
