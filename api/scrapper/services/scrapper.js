'use strict';
const puppeteer = require('puppeteer');

const scraperObj = {
  multiRoute: '',
  next: 'a[title="Pagina siguiente"]',
  tags: {
    sender: {
      businessName: 'input[name="EFXP_RZN_SOC"]',
      address: 'select[name="EFXP_DIR_ORIGEN"]',
      hideEmail: 'input[name="FONO_SI_NO"]',
      commune: 'input[name="EFXP_CMNA_ORIGEN"]',
      city: 'input[name="EFXP_CIUDAD_ORIGEN"]',
      saleType: 'select[name="EFXP_TIPOVENTA_SELECT"]',
      email: 'input[name="EFXP_EMAIL_EMISOR"]',
      phone: 'input[name="EFXP_FONO_EMISOR"]',
      concept: 'input[name="EFXP_GIRO_EMIS"]',
      economicActivity: 'select[name="EFXP_ACTECO_SELECT"]'
    },
    receiver: {
      rut: {
        rut: 'input[name="EFXP_RUT_RECEP"]',
        dv: 'input[name="EFXP_DV_RECEP"]'
      },
      businessName: 'input[name="EFXP_RZN_SOC_RECEP"]',
      purchaseType: 'select[name="EFXP_TIPOCOMPRA_SELECT"]',
      address: 'input[name="EFXP_DIR_RECEP"]',
      commune: 'input[name="EFXP_CMNA_RECEP"]',
      city: 'input[name="EFXP_CIUDAD_RECEP"]',
      concept: 'input[name="EFXP_GIRO_RECEP"]',
      contact: 'input[name="EFXP_CONTACTO"]',
      requestRut: {
        rut: 'input[name="EFXP_RUT_SOLICITA"]',
        dv: 'input[name="EFXP_DV_SOLICITA"]'
      }
    },
    transport: {
      rut: {
        rut: 'input[name="EFXP_RUT_TRANSPORTE"]',
        dv: 'input[name="EFXP_DV_TRANSPORTE"]'
      },
      patent: 'input[name="EFXP_PATENTE"]',
      driverRut: {
        rut: 'input[name="EFXP_RUT_CHOFER"]',
        dv: 'input[name="EFXP_DV_CHOFER"]'
      },
      driverName: 'input[name="EFXP_NOMBRE_CHOFER"]'
    },
    products: {
      options: {
        code: 'input[name="COD_SI_NO"]',
        additionalTaxes: 'input[name="OTRO_IMP_SI_NO"]',
        add: 'input[name="AGREGA_DETALLE"]'
      },
      type: 'input[name="EFXP_TPO_COD_"]',
      code: 'input[name="EFXP_COD_"]',
      name: 'input[name="EFXP_NMB_"]',
      description: {
        check: 'input[name="DESCRIP_"]',
        value: 'textarea[name="EFXP_DSC_ITEM_"]'
      },
      quantity: 'input[name="EFXP_QTY_"]',
      unity: 'input[name="EFXP_UNMD_"]',
      price: 'input[name="EFXP_PRC_"]',
      additionalTax: 'select[name="EFXP_OTRO_IMP_"]',
      discount: 'input[name="EFXP_PCTD_"]'
    },
    payment: {
      type: 'select[name="EFXP_FMA_PAGO"]'
    },
    sendBtn: 'button[name="Button_Update"]'
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
    const data = [];
    const options = await page.$$eval(
      'select[name="RUT_EMP"] optgroup > option',
      opts => opts.map(opt => opt.value)
    )
    for (const option of options) {
      await page.select('select[name="RUT_EMP"]', option)
      await page.click('button[type="submit"]');
      await page.waitForSelector('.container');
      const id = await this.getID(page);
      const result = await this.scrapeBusiness(page);
      data.push({
        rut: id,
        data: result
      });
      await page.goto(this.multiRoute);
      await page.waitForSelector('.container');
    }
    return data;
  },
  async processInput(page, data, selector) {
    if (data.action === 'click') {
      await page.click(selector);
    } else {
      await page.type(selector, data)
      if (selector.includes('EFXP_DV_RECEP')) {
        await page.click('.container');
        await page.waitForNavigation();
      }
    }
  },
  async processSelect(page, data, selector) {
    if (typeof data === 'number') {
      await page.select(selector, data);
    } else {
      const options = await page.$$eval(
        `${selector} optgroup > option`,
        opts => opts.map(opt => {
          return (({ value, text }) => ({ value, text }))(opt);
        })
      )
      for (const option of options) {
        if (option.text === data) {
          await page.select(selector, option.value);
          break;
        }
      }
    }
  },
  async processField(...args) {
    if (args[2].startsWith('input')) {
      await this.processInput(...args);
    } else if (args[2].startsWith('select')) {
      await this.processSelect(...args);
    }
  },
  async parseNum(num) {
    return num < 10 ? `0${num}` : `${num}`;
  },
  async processProducts(page, articles) {
    const { products } = this.tags;
    let codeQ = false;
    let addTx = false;
    let count = 1;

    for (const article of articles) {
      const num = await this.parseNum(count++);
      const {
        description,
        ...product
      } = article;
      if (num !== '01') {
        await page.click(products.options.add);
        await page.waitForTimeout(100);
      }
      if ((product.type || product.code) && !codeQ) {
        codeQ = !codeQ;
        await this.processInput(
          page,
          { action: 'click' },
          products.options.code
        );
      }
      if (product.additionalTax && !addTx) {
        addTx = !addTx;
        await this.processInput(
          page,
          { action: 'click' },
          products.options.additionalTaxes
        );
      }
      if (description) {
        const { check, value } = products.description;
        await this.processInput(
          page,
          { action: 'click' },
          check.replace('"]', `${num}"]`)
        );
        await this.processInput(
          page,
          description,
          value.replace('"]', `${num}"]`)
        );
      }
      for (const key of Object.keys(product)) {
        const selector = products[key].replace('"]', `${num}"]`);
        await this.processSelectors(page, product[key], `${selector}`);
      }
    }
  },
  async processSelectors(page, data, selector) {
    if (typeof data === 'object' && typeof selector === 'object') {
      for (const key of Object.keys(data)) {
        await this.processSelectors(page, data[key], selector[key]);
      }
    } else {
      const element = await page.$(selector);
      if (element) {
        await this.processField(page, data, selector);
      }
    }
  },
  async createDocument({ document, browser, ...params }) {
    const page = await this.login((await browser.newPage()), params);
    const { products, ...rest } = document;
    for (const key of Object.keys(rest)) {
      await this.processSelectors(page, rest[key], this.tags[key])
    }
    await this.processProducts(page, products);
    if (!params.debug) {
      await page.click(this.tags.sendBtn);
      await page.waitForNavigation();
    }
  },
  async login(page, { url, username, password }) {
    await page.goto(url);
    await page.type('#rutcntr', username);
    await page.type('#clave', password);
    await page.click('#bt_ingresar');
    await page.waitForSelector('.container');
    if (page.url().startsWith('https://www1.sii.cl/cgi-bin/Portal001'))
      console.log('login successfull');
    else
      console.log('login failed');
    return page;
  },
  async scraper({ browser, ...params }) {
    let data = [];
    const page = await this.login((await browser.newPage()), params);

    if (page.url().includes('Portal001/mipeAdmin')) {
      const id = await this.getID(page);
      console.log('scraping unico', id)
      const result = await this.scrapeBusiness(page);
      data.push({
        rut: id,
        data: result
      })
    } else if (page.url().includes('mipeSelEmpresa')) {
      this.multiRoute = page.url();
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
      headless: false,
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
      password,
      url
    });
    browser.close();
    return result;
  }
  catch (err) {
    browser.close();
    throw err;
  }
}

const createDocument = async ({ rut: username, clave: password, ...params }) => {
  let browser;
  try {
    browser = await startBrowser();
    const result = await scraperObj.createDocument({
      browser,
      username,
      password,
      ...params
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
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D2%26TIPO%3D4';
  const result = await scrapeAll({url, ...settings});
  return result;
}

const getReceived = async (settings) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D1%26TIPO%3D4';
  const result = await scrapeAll({ url, ...settings });
  return result;
}

const createAffectInvoice = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D33%26TIPO%3D4';
  const result = await createDocument({
    document,
    url,
    ...settings
  });
  return result;
}

const createExemptInvoice = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D34%26TIPO%3D4';
  const result = await createDocument({
    document,
    url,
    ...settings
  });
  return result;
}

const createDispatchGuide = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D52%26TIPO%3D4';
  const result = await createDocument({
    document,
    url,
    ...settings
  });
  return result;
}


module.exports = {
  getEmited,
  getReceived,
  createAffectInvoice,
  createExemptInvoice,
  createDispatchGuide,
};
