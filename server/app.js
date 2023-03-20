const express = require('express');
const scraper = require('./scraper');
const cors = require('cors');

const app = express();
const PORT = 8000;

app.use(cors());


app.post('/scrape', async (req, res) => {
  try {
    const result = await scraper.run();
    res.json(result);
  } catch (error) {
    console.error('Error running function:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, (error) =>{
  if(!error)
    console.log("Server is Successfully Running, and App is listening on port "+ PORT)
  else 
    console.log("Error occurred, server can't start", error);
});
