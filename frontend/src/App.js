import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [data, setData] = useState();

  const handleClick = async () => {
    try {
      const response = await fetch('http://localhost:8000/scrape', {
        method: 'POST'
      });
      const result = await response.json();
      console.log(result)
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="App">
      <img src={logo} className="App-logo" alt="logo" />
      <button onClick={() => handleClick()}>fetch</button>
      <p>{JSON.stringify(data)}</p>
    </div>
  );
}

export default App;
