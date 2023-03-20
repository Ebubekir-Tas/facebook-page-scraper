// todo: hammer down on search feature not being 100% consistent
// todo: add a confidence meter, when element not found meter goes down.
// todo: make more consistence on headless.
// todo: second cluster queue of 5 on 10 queries is giving 'element not found'

const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
var pdfParser = require('pdf-parser');
const fs = require('fs');
const { URL } = require('url');
require('dotenv').config();
const XLSX = require('xlsx');

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const LOCATION_SEARCH = 'Washington DC';
const PAGE_SEARCH = 'home buyers';
const CONCURRENCY = 5;
const queries = 10;

async function run() {
  const start = Date.now();
  // const browser = await puppeteer.launch({ headless: false, args: ["--disable-notifications"] });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 900 });

  await page.goto('https://facebook.com/login');

  const pageScroller = async () => {
    await page.waitForTimeout(1000);
    let previousHeight;
    let loadingIndicator;
    while (true) {
      // Scroll down to the bottom of the page.
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');

      // Wait for the loading indicator to appear.
      loadingIndicator = await page.waitForSelector('[role="progressbar"][aria-label="Loading..."][data-visualcompletion="loading-state"]', { timeout: 1000, visible: true }).catch(() => { });
      if (loadingIndicator) {
        // If the loading indicator is visible, continue scrolling down the page.
        continue;
      }

      // Get the new height of the page and check if it has changed.
      const currentHeight = await page.evaluate('document.body.scrollHeight');
      if (currentHeight === previousHeight) {
        break;
      }
      previousHeight = currentHeight;
    }
  }

  const login = async () => {
    await page.type('#email', EMAIL);
    await page.type('#pass', PASSWORD);
    await page.click('#loginbutton');
  }

  await login();
  await page.waitForNavigation();
  console.log('log in success')

  const searchForPage = async () => {
    await page.waitForTimeout(1000);
    const input = await page.$('input[type="search"]');
    await input.type(PAGE_SEARCH);
    await page.waitForTimeout(100);
    await page.keyboard.press('Enter');
  }

  const MAX_ATTEMPTS = 3;
  let attempt = 1;
  let success = false;
  
  while (attempt <= MAX_ATTEMPTS && !success) {
    try {
      await searchForPage();
      await page.waitForNavigation();
      await page.waitForTimeout(200);
      console.log('search for page success');
      success = true;
    } catch (error) {
      console.log(`Attempt ${attempt} failed: ${error}`);
      attempt++;
    }
  }
  
  if (!success) {
    console.log(`Search for page failed after ${MAX_ATTEMPTS} attempts.`);
  }
  

  await page.waitForSelector('div[role="listitem"]');

  const pageTabsSelector = 'div[role="list"] > div[role="listitem"]';
  await page.waitForSelector(pageTabsSelector);

  const clickPagesTab = async () => {
    await page.waitForTimeout(100);
    // // Page is currently 7th child. This is hardcoded for now.
    const pagesSelector = 'div[role="list"] > div[role="listitem"]:nth-child(7) div a'
    await page.waitForSelector(pagesSelector);
    await page.click(pagesSelector);
    await page.waitForTimeout(200);
    await page.click(pagesSelector);
  };

  await clickPagesTab();

  const searchLocation = async () => {
    // I have no idea why facebook nests their elements so deeply into divs, not sure if there's another way of doing this
    const locationSelector =
      'div[role="list"] > div[role="listitem"]:nth-child(7) > div[role="list"] > div[role="listitem"]:nth-child(2) > div > div > div > div > div > div > div > div > div';

    await page.waitForSelector(locationSelector);
    await page.click(locationSelector);

    await page.waitForSelector(locationSelector);

    const locationInput =
      'div[role="list"] > div[role="listitem"]:nth-child(7) > div > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(2) > input';
    await page.waitForSelector(locationInput);
    await page.type(locationInput, LOCATION_SEARCH);
    await page.waitForTimeout(500);

    await page.waitForFunction(() => {
      const element = document.querySelector('div[style*="position: fixed;"][style*="width: 294px;"][style*="transform: translate("]');
      const li = element ? element.querySelector('li[aria-selected="false"]') : null;
      if (li) {
        return li;
      }
    });
    await page.waitForTimeout(500);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  };

  await searchLocation();
  console.log('search location success')

  const phoneRegex = /\(\d{3}\) \d{3}-\d{4}/;
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  // todo better regex this one has false positives for emails
  const websiteRegex = /(https?:\/\/)?(www\.)?[\w-]+\.(com|org|net|us)/gi

  const pagesData = [];
  const urlsArr = [];

  await page.waitForTimeout(1500);

  if (queries > 10) await pageScroller();

  const tabBack = async () => {
    await page.waitForTimeout(1000);
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    await page.waitForTimeout(300);
  };

  const tab = async () => {
    await page.waitForTimeout(100);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    let wrongElFocused = false;
    let href = "";

    href = await page.evaluate(() => {
      const focusedElement = document.activeElement;
      const pfpEl =
        focusedElement.getAttribute("href")?.includes("https://www.facebook.com/") &&
        focusedElement.getAttribute("role") === "link" &&
        !focusedElement.getAttribute("aria-label").includes("ollow") &&
        !focusedElement.getAttribute("aria-label").includes("ike");
      if (pfpEl) {
        return focusedElement.getAttribute("href");
      }
    });

    if (href) urlsArr.push(href);

    try {
      wrongElFocused = await page.evaluate(() => {
        const focusedElement = document.activeElement;

        const isPfp =
          focusedElement.getAttribute("role") === "link" &&
          focusedElement.getAttribute("aria-label") !== "Following" &&
          focusedElement.getAttribute("href")?.includes("https://www.facebook.com/") ||
          focusedElement.getAttribute("href")?.includes("/stories/");
        const verified = focusedElement.getAttribute("aria-label") === "Verified";
        const isBtn =
          focusedElement.getAttribute("aria-label")?.includes("ollow") ||
          focusedElement.getAttribute("aria-label")?.includes("ike");
        const newMsg = document.querySelector('div[role="button"][aria-label="New Message"]');
        const isMsg = focusedElement === newMsg;

        if (isMsg || (!isPfp && !verified && !isBtn)) {
          return true;
        } else {
          return false;
        }
      });
    } catch (err) {
      console.log(err);
    }
    if (wrongElFocused) {
      console.log("focused out of bounds");
      await tabBack();
    }
    await page.waitForTimeout(100);
  };

  while (urlsArr.length < queries) {
    await tab();
  }


  const PDF_PATH = 'page.pdf';

  const generatedPdfs = [];

  const scrapePage = async (url, i) => {
    console.log('page ' + (i + 1))
    console.log(url)

    // Create a new page instance
    const newPage = await browser.newPage();
    await newPage.goto(url);
    await newPage.waitForTimeout(100);
    const indexedPdf_Path = i + PDF_PATH;
    generatedPdfs.push(indexedPdf_Path)
    await newPage.pdf({ path: indexedPdf_Path});
    const pageTitle = await newPage.$eval('title', (el) => el.textContent);
    const MAX_WAIT_TIME = 10000; // Maximum time to wait for the element in milliseconds
    const POLLING_INTERVAL = 200; // Time to wait between checks in milliseconds

    let startTime = Date.now();
    let isOnPage = null;
    while (Date.now() - startTime < MAX_WAIT_TIME && !isOnPage) {
      isOnPage = await newPage.$('footer[role="contentinfo"]');
      if (!isOnPage) {
        console.log('Element not found. Retrying in', POLLING_INTERVAL, 'milliseconds.');
        await newPage.waitForTimeout(POLLING_INTERVAL);
      }
    }

    if (isOnPage) {
      console.log('element found');
    } else {
      console.log('Element not found within', MAX_WAIT_TIME, 'milliseconds.');
    }
    isOnPage = null;

    // Use a Promise to await the result of pdf2json
    const pdfToJsonPromise = new Promise((resolve, reject) => {
      pdfParser.pdf2json(indexedPdf_Path, (error, pdf) => {
        if (error != null) {
          console.log(error);
          reject(error);
        } else {
          resolve(pdf);
        }
      });
    });

    // Wait for the result of pdf2json before continuing
    const pdf = await pdfToJsonPromise;

    const objString = JSON.stringify(pdf);

    const phoneNumberMatch = objString.match(phoneRegex);
    const phoneNumber = phoneNumberMatch ? phoneNumberMatch[0] : "N/A";

    const emailMatch = objString.match(emailRegex);
    const email = emailMatch ? emailMatch[0] : "N/A";

    const websiteMatch = objString.match(websiteRegex);
    const website = websiteMatch ? websiteMatch[0] : "N/A";

    const obj = {};
    if (phoneNumber) obj.phoneNumber = phoneNumber;
    if (email) obj.email = email;
    if (website) obj.website = website;
    if (pageTitle) obj.pageTitle = pageTitle.replace(' | Facebook', '');
    
    const parsedUrl = new URL(url).toString().replace('__tn__=%3C', "");
    obj.url = parsedUrl;

    if (Object.keys(obj).length) {
      pagesData.push(obj);
      await newPage.close();
    } else {
      console.log("no data found");
    }

    await newPage.close();
  };

  const scrapeArrURL = async (url, page, i) => {
    await page.waitForTimeout(100);
    await scrapePage(url, i);
  };

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: CONCURRENCY,
    puppeteerOptions: {
      headless: true,
    }
  });

  await cluster.task(async ({ page, data: { url, i} }) => {
    await scrapeArrURL(url, page, i);
  });

  for (let i = 0; i < urlsArr.length; i++) {
    await cluster.queue({ url: urlsArr[i], i });
  }

  await cluster.idle();
  await cluster.close();

  const end = Date.now();
  const elapsed = end - start;
  const timeTaken = `Function took ${elapsed} milliseconds to complete ${queries} pages.`;
  console.log(pagesData)
  console.log(urlsArr)
  console.log(timeTaken)

  const data = pagesData.map(obj => JSON.stringify(obj)).join('\n') + '\n' + timeTaken;

  const headers = ["phone number", "email", "website", "page title", "url"];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(pagesData, { headers });

  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, 'data.xlsx');

  for (const pdf of generatedPdfs) {
    fs.unlink(pdf, (err) => {
      if (err) throw err;
    });
  };

  let i = 0;
  let filename = `results/results${i}.txt`;
  while (true) {
    try {
      fs.accessSync(filename);
      i++;
      filename = `results/results${i}.txt`;
    } catch (error) {
      break;
    }
  }
  console.log(`Using filename: ${filename}`);
  

  fs.writeFile(filename, data, function (err) {
    if (err) {
      console.log('Error saving file:', err);
    } else {
      console.log('Results saved to file.');
    }
  });

  return JSON.stringify(pagesData);
}

module.exports = { run };