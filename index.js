const puppeteer = require('puppeteer');
var pdfParser = require('pdf-parser');
require('dotenv').config();

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const LOCATION_SEARCH = 'Washington DC' 

async function run() {
  const start = Date.now();
  const browser = await puppeteer.launch({ headless: false, args: ["--disable-notifications"] });
  // const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000});

  await page.goto('https://facebook.com/login');

  // Enter the username and password and submit the form
  await page.type('#email', EMAIL);
  await page.type('#pass', PASSWORD);
  await page.click('#loginbutton');

  await page.waitForNavigation();
  const input = await page.$('input[type="search"]');

  await input.type('home buyers')

  await page.keyboard.press('Enter');

  await page.waitForNavigation();

  await page.waitForSelector('div[role="listitem"]');
  const pageTabsSelector = 'div[role="list"] > div[role="listitem"]';
  await page.waitForSelector(pageTabsSelector);

  // // Page is currently 7th child. This is hardcoded for now.
  // // also page has to be clicked twice for some reason.
  // const pagesTab = 'div[role="list"] > div[role="listitem"]:nth-child(7)';

  const pagesSelector = 'div[role="list"] > div[role="listitem"]:nth-child(7) div a'
  await page.click(pagesSelector);
  await page.click(pagesSelector);

  // I have no idea why facebook nests their elements so deeply into divs, not sure if there's another way of doing this
  const locationSelector = 'div[role="list"] > div[role="listitem"]:nth-child(7) > div[role="list"] > div[role="listitem"]:nth-child(2) > div > div > div > div > div > div > div > div > div'
  
  await page.waitForSelector(locationSelector);
  await page.click(locationSelector);

  await page.waitForSelector(locationSelector);

  const locationInput = 'div[role="list"] > div[role="listitem"]:nth-child(7) > div > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(2) > input'
  await page.type(locationInput, LOCATION_SEARCH);
  await page.waitForTimeout(2000);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  const phoneRegex = /\(\d{3}\) \d{3}-\d{4}/;
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const websiteRegex = /(?<=")[\w.+(?=")[^\s./]+\.com(?=\"|\s)|(^|\s)[^\s./]+\.com(?!\S|$)/gi

  const queries = 90;

  const arr = [];

  await page.waitForTimeout(1500);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  // await page.waitForTimeout(1500);

  const MAX_WAIT_TIME = 10000; // Maximum time to wait for the element in milliseconds
  const POLLING_INTERVAL = 200; // Time to wait between checks in milliseconds
  
  let startTime = Date.now();
  let profileTilesFeedDiv = null;
  
  while (Date.now() - startTime < MAX_WAIT_TIME && !profileTilesFeedDiv) {
    profileTilesFeedDiv = await page.$('footer[role="contentinfo"]');
    if (!profileTilesFeedDiv) {
      console.log('Element not found. Retrying in', POLLING_INTERVAL, 'milliseconds.');
      await page.waitForTimeout(POLLING_INTERVAL);
    }
  }

  //   while (Date.now() - startTime < MAX_WAIT_TIME && !profileTilesFeedDiv) {
  //   profileTilesFeedDiv = await page.$('div[data-pagelet="ProfileTilesFeed_0"]');
  //   if (!profileTilesFeedDiv) {
  //     console.log('Element not found. Retrying in', POLLING_INTERVAL, 'milliseconds.');
  //     await page.waitForTimeout(POLLING_INTERVAL);
  //   }
  // }
  if (profileTilesFeedDiv) {
    // Do something with the element
  } else {
    console.log('Element not found within', MAX_WAIT_TIME, 'milliseconds.');
  }

  // await page.waitForSelector(page.$('div[data-pagelet="ProfileTilesFeed_0"]'));
  // await page.waitForSelector( profileTilesFeedDiv, { timeout: 30000 });

  // await page.waitForSelector(profileTilesFeedDiv);
  // console.log(profileTilesFeedDiv)
  const PDF_PATH = 'page.pdf'
  // const title = await page.$eval('title', el => el.textContent);

  await page.pdf({ path: PDF_PATH });

  const scrapePage = async () => {
    const pageTitle = await page.$eval('title', el => el.textContent);
    pdfParser.pdf2json(PDF_PATH, async function (error, pdf) {
      if(error != null){
          console.log(error);
      }else{
          const objString = JSON.stringify(pdf);

          const phoneNumberMatch = objString.match(phoneRegex);
          const phoneNumber = phoneNumberMatch ? phoneNumberMatch[0] : 'N/A';

          const emailMatch = objString.match(emailRegex);
          const email = emailMatch ? emailMatch[0] : 'N/A';

          const websiteMatch = objString.match(websiteRegex);
          const website = websiteMatch ? websiteMatch[0] : 'N/A';

          const obj = {};
          if (phoneNumber) obj.phoneNumber = phoneNumber;
          if (email) obj.email = email;
          if (website) obj.website = website;
          if (pageTitle) obj.pageTitle = pageTitle;

          if (Object.keys(obj).length) {
            arr.push(obj);
          }
          // logArr()
      }
    });
  }

    scrapePage()

    async function changePage() {
      await page.goBack();
      await page.waitForTimeout(100);

      let isLinkHighlighted = false;
      let isVerified = false;
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      while (!isLinkHighlighted) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
        isVerified = await page.evaluate(() => {
          const focusedElement = document.activeElement;
          return focusedElement.getAttribute('aria-label') === 'Verified';
        });

        if (isVerified) {
          await page.waitForTimeout(100);
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
          // await page.keyboard.press('Tab');
          // await page.waitForTimeout(100);
          // todo: might only need one tab, but this isn't working for some reason.i should just copy implementation of below
        }
        isLinkHighlighted = await page.evaluate(() => {
          return document.activeElement.getAttribute('role') === 'link';
        });
        await page.waitForTimeout(100);
      }


      await page.waitForTimeout(100);

      await page.keyboard.press('Enter');

      // const pageLink = await page.$('a[role="link"]');

      await page.waitForTimeout(1500);
  
      await page.pdf({ path: PDF_PATH });

      await scrapePage()
    }

    for (let i=0; i<queries; i++){
      await changePage()
    }


    function logArr() {
      console.log(arr);
    }
logArr()
const end = Date.now();
const elapsed = end - start;
console.log(`Function took ${elapsed} milliseconds to complete.`);
}

run();

      // await page.waitForTimeout(100);
      // const isVerified = await page.evaluate(() => {
      //   const focusedElement = document.activeElement;
      //   return focusedElement.getAttribute('aria-label') === 'Verified';
      // });
      // if (isVerified) {
      //   await page.waitForTimeout(100);
      //   await page.keyboard.press('Tab');
      //   await page.waitForTimeout(100);
      // }
      // await page.keyboard.press('Tab');

      // console.log(isVerified)


  // for (let i = 0; i < queries; i++) {
  //   await scrapePageData(i)
  // }
  // async function scrapePageData() {
  //   await page.pdf({ path: 'example.pdf' });

  //   pdfParser.pdf2json(PDF_PATH, function (error, pdf) {
  //     if(error != null){
  //         console.log(error);
  //     }else{
  //         const objString = JSON.stringify(pdf);
  //         const phoneNumber = phoneRegex.exec(objString)[0];
  //         const email = objString.match(emailRegex)[0];
  //         const website = objString.match(websiteRegex)[0];
  //         arr.push({phoneNumber, email, website, pageTitle})
  //         logArr()
  //     }
  //   });
  //   await page.goBack();
  //   await page.keyboard.press('Tab');
  //   await page.keyboard.press('Tab');
  //   await page.keyboard.press('Tab');
  //   await page.keyboard.press('Enter');
  // }




  
  // const searchResultsDiv = await page.$('div[aria-label="Search results"][role="main"] > div[role="article"]');

  // const q = await page.$('div[aria-label="Search results"][role="main"]')

  // const qq = await q.$('div[role="feed"]');

  // const article1 = await qq.$('div')

  // const title1 = await article1.$('a')


  //enter page

  // await page.waitForTimeout(1500);
  // // await title1.click();
  // await page.keyboard.press('Tab');
  // await page.keyboard.press('Enter');
  // await page.waitForTimeout(1500);

  

  
  
//   // const html = await phoneNumberElement.evaluate(el => el.html);
//   // console.log(html);
//   await page.pdf({ path: 'example.pdf' });

  // const pageTitle = await page.$eval('title', el => el.textContent);



//   pdfParser.pdf2json(PDF_PATH, function (error, pdf) {
//     if(error != null){
//         console.log(error);
//     }else{
//         const objString = JSON.stringify(pdf);
//         const phoneNumber = phoneRegex.exec(objString)[0];
//         const email = objString.match(emailRegex)[0];
//         const website = objString.match(websiteRegex)[0];
//         arr.push({phoneNumber, email, website, pageTitle})
//         logArr();
//     }
//   });
  
//   function logArr() {
//     console.log(arr);
// }

// await page.goBack();
// await page.keyboard.press('Tab');
// await page.keyboard.press('Tab');
// await page.keyboard.press('Tab');
// await page.keyboard.press('Enter');

/*
const phoneNumberElement = await page.$x(`//*[contains(text(), '(301) 922-1677')]`);
// const html = await phoneNumberElement.evaluate(el => el.html);
// console.log(html);
await page.pdf({ path: 'example.pdf' });

var PDF_PATH = 'example.pdf';

const phoneRegex = /\(\d{3}\) \d{3}-\d{4}/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

pdfParser.pdf2json(PDF_PATH, function (error, pdf) {
  if(error != null){
      console.log(error);
  }else{
      const pdfString = JSON.stringify(pdf);

      const phoneNumber = phoneRegex.exec(pdfString)[0];
      const email = emailRegex.exec(pdfString)[0];
      console.log(phoneNumber)
      console.log(email)
  }
});
}
*/
// const a = document.getElementsByClassName('__fb-light-mode')
// console.log(a)
// console.log(a[1])
// const b = a[2].querySelector('[role="presentation"][tabIndex="-1"]')
// const b = a[1].querySelector('div > div > ul > li > div > div')
// console.log(b)

// const q = document.querySelector('div[aria-label="Search results"][role="main"]')

// const qq = q.querySelector('div[role="feed"]')

// const article1 = qq.querySelector('div')

// const title1 = article1.querySelector('a')

