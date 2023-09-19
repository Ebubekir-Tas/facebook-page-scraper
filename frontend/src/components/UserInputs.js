import React from 'react';

export const UserInputs = ({
  pageName, setPageName,
  queries, setQueries,
  location, setLocation,
  concurrency, setConcurrency
}) => (
  <div>
    <div>
      <p style={{color: 'white', textAlign: 'center'}}>currently queries hardcoded to 'Washington DC' and 'home buyers' as development of this app is paused</p>
      <label>
        Search For Page:
        <input type="text" value={pageName} onChange={(e) => setPageName(e.target.value)} />
      </label>
    </div>
    <div>
      <label>
        Number of Pages:
        <input type="number" min="1" max="100" value={queries} onChange={(e) => setQueries(e.target.value)} />
      </label>
    </div>
    <div>
      <label>
        Location:
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
      </label>
    </div>
    <div>
      <label>
        Concurrency:
        <input type="number" min="1" max="10" value={concurrency} onChange={(e) => setConcurrency(e.target.value)} />
      </label>
    </div>
  </div>
);
