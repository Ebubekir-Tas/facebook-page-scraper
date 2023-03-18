// todo: run 2 concurrently to double efficiency. Then try with 3 if 2 works

const puppeteer = require('puppeteer');
var pdfParser = require('pdf-parser');
const fs = require('fs');
const { URL } = require('url');
require('dotenv').config();

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const LOCATION_SEARCH = 'Washington DC';

async function run() {
  const start = Date.now();
  const browser = await puppeteer.launch({ headless: false, args: ["--disable-notifications"] });
  // const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 900 });

  const queries = 1;

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

  const searchForPage = async () => {
    const input = await page.$('input[type="search"]');
    await input.type('home buyers');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
  }

  await searchForPage();
  await page.waitForNavigation();
  await page.waitForTimeout(200);
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

  const phoneRegex = /\(\d{3}\) \d{3}-\d{4}/;
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const websiteRegex = /(?<=")[\w.+(?=")[^\s./]+\.com(?=\"|\s)|(^|\s)[^\s./]+\.com(?!\S|$)/gi;

  const arr = [];
  const urlsArr = [];

  await page.waitForTimeout(1500);

  if (queries > 10) await pageScroller();

  const PDF_PATH = 'page.pdf';

  await page.pdf({ path: PDF_PATH });

  const scrapePage = async (url) => {
    await page.waitForTimeout(100);
    await page.pdf({ path: PDF_PATH });
    const pageTitle = await page.$eval('title', (el) => el.textContent);
    const MAX_WAIT_TIME = 10000; // Maximum time to wait for the element in milliseconds
    const POLLING_INTERVAL = 200; // Time to wait between checks in milliseconds

    let startTime = Date.now();
    let isOnPage = null;
    while (Date.now() - startTime < MAX_WAIT_TIME && !isOnPage) {
      isOnPage = await page.$('footer[role="contentinfo"]');
      if (!isOnPage) {
        console.log('Element not found. Retrying in', POLLING_INTERVAL, 'milliseconds.');
        await page.waitForTimeout(POLLING_INTERVAL);
      }
    }

    if (isOnPage) {
      console.log('element found');
    } else {
      console.log('Element not found within', MAX_WAIT_TIME, 'milliseconds.');
    }
    isOnPage = null;

    pdfParser.pdf2json(PDF_PATH, async function (error, pdf) {
      if (error != null) {
        console.log(error);
      } else {
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
        if (pageTitle) obj.pageTitle = pageTitle;
        const parsedUrl = new URL(url).toString().replace(/\?.*/, "");
        obj.url = parsedUrl;

        if (Object.keys(obj).length) {
          arr.push(obj);
        } else {
          console.log("no data found");
        }
      }
    });
  }

  const tabBack = async () => {
    await page.waitForTimeout(2000);
    await page.keyboard.down("Shift");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.up("Shift");
    await page.waitForTimeout(300);
  };

  const tab = async () => {
    await page.keyboard.press("Tab");
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

  const scrapeArrURL = async (url) => {
    await page.goto(url);
    await page.waitForTimeout(100);
    await scrapePage(url);
    await page.waitForTimeout(100);
  };

  for (let i = 0; i < urlsArr.length; i++) {
    await scrapeArrURL(urlsArr[i]);
    await page.waitForTimeout(100);
  };

  const end = Date.now();
  const elapsed = end - start;
  const timeTaken = `Function took ${elapsed} milliseconds to complete ${queries} pages.`;
  console.log(arr)
  console.log(urlsArr)

  const data = arr.map(obj => JSON.stringify(obj)).join('\n') + '\n' + timeTaken;

  fs.writeFile('results2.txt', data, function (err) {
    if (err) {
      console.log('Error saving file:', err);
    } else {
      console.log('Results saved to file.');
    }
  });
}

run();
