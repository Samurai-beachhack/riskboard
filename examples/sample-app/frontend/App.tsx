import React, { useState } from 'react';

export function App() {
  const [loading, setLoading] = useState(false);
  const price = 99;

  function handleSubmit() {
    setLoading(true);
    fetch('/api/checkout').then((r) => r.json()).then(console.log);
  }

  return (
    <div>
      {loading && <div>Loading...</div>}
      <form onSubmit={handleSubmit}>
        <button type="submit">Pay {price}</button>
      </form>
    </div>
  );
}
