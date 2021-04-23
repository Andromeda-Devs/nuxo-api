'use strict';
const puppeteer = require('puppeteer');
const data = require('../../../data.json');


const scraperObj = {
  url: 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D2%26TIPO%3D4',
  uniqueRoute: 'https://www1.sii.cl/cgi-bin/Portal001/mipeAdminDocsEmi.cgi?RUT_RECP=&FOLIO=&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=&ESTADO=&ORDEN=&NUM_PAG=1',
  multiRoute: 'https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D2%26TIPO%3D4',
  next: 'a[title="Pagina siguiente"]',
  async setUrl(url) {
    this.url = url;
    return this.url;
  },
  async scrapeTable(page) {
    const data = await page.$$eval('table > tbody > tr', elements => {
      return elements.map(element => {
        const result = element.querySelectorAll('td');
        return Object.keys(result).reduce((acc, cur) => {
          if (cur === '0') {
            acc[cur] = result[cur].getElementsByTagName('a')[0].href;
          } else {
            acc[cur] = result[cur].textContent;
          }
          return acc;
        }, {});
      });
    });
    return data;
  },
  async scrapeBusiness(page) {
    let continueVar = false;
    let data = [];
    let iteration = 1;
    do {
      await page.waitForSelector('#tablaDatos');
      console.log(`Table part ${iteration++}`);
      const newData = await this.scrapeTable(page);
      const nextButton = await page.$(this.next)
      if (nextButton) {
        await page.click(this.next);
        continueVar = true;
      } else {
        continueVar = false;
      }
      data = data.concat(newData);
    } while (continueVar);
    return data;
  },
  async getID(page) {
    const id = await page.$eval('div div div > b', id => id.textContent);
    return id.split(';')[1].trim();
  },
  async scrapeMulti(page) {
    const data = {};
    const options = await page.$$eval(
      'select[name="RUT_EMP"] optgroup > option',
      opts => opts.map(opt => opt.value)
    )
    for (const option of options) {
      await page.select('select[name="RUT_EMP"]', option)
      await page.click('button[type="submit"]');
      await page.waitForSelector('.container');
      const id = await this.getID(page);
      data[id] = await this.scrapeBusiness(page);
      await page.goto(this.multiRoute);
      await page.waitForSelector('.container');
    }
    return data;
  },
  async scraper({ browser, username, password }) {
    let data = {};
    const page = await browser.newPage();

    await page.goto(this.url);
    await page.type('#rutcntr', username);
    await page.type('#clave', password);
    await page.click('#bt_ingresar');
    await page.waitForSelector('.container');
    console.log('scraping business 1');
    if (page.url() === this.uniqueRoute) {
      const id = await this.getID(page);
      data[id] = await this.scrapeBusiness(page);
      console.log('scraping unico', id)
    } else if (page.url() === this.multiRoute) {
      console.log('scraping multiple');
      data = await this.scrapeMulti(page);
    }

    return data;
  }
}

const startBrowser = async () => {
  let browser;
  try {
    console.log("Iniciando proceso, por favor espere...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
      'ignoreHTTPSErrors': true,
      timeout: 60000
    });
  } catch (err) {
    console.log("Could not create a browser instance => : ", err);
  }
  return browser;
}

const scrapeAll = async ({ rut: username, clave: password, url }) => {
  let browser;
  try {
    browser = await startBrowser();
    const result = await scraperObj.scraper({
      browser,
      username,
      password
    });
    browser.close();
    return result;
  }
  catch (err) {
    browser.close();
    throw err;
  }
}

const getEmited = async (settings) => {
  const result = await scrapeAll(settings);
  return result;
}

const data = require('../../../data.json');

module.exports = {
  getEmited,
  test
};
