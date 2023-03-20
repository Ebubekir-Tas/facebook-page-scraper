
const express = require('express');
const scraper = require('./scraper');
  
const app = express();
const PORT = 8000;
  
app.get('/scrape', async (req, res) => {
  const data = await scraper.run();
  res.json(data);
});

app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is Successfully Running, and App is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
);
