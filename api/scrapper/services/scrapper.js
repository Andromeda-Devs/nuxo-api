'use strict';
// const puppeteer = require('puppeteer-extra')
const puppeteer = require('puppeteer')
const path = require("path");
const { sleep } = require("../../../utils");
const fs = require("fs");
const { default: createStrapi } = require('strapi');

// puppeteer.use(require('puppeteer-extra-plugin-user-preferences')({
//   userPrefs: {
//     download: {
//       prompt_for_download: false,
//     },
//     plugins: {
//       always_open_pdf_externally: true // this should do the trick
//     }
//   }
// }));

const scraperObj = {
  multiRoute: '',
  next: 'a[title="Pagina siguiente"]',
  _documentBaseUrlSent: 'https://www1.sii.cl/cgi-bin/Portal001/mipeDisplayPDF.cgi?DHDR_CODIGO',
  _documentBaseUrlReceived: 'https://www1.sii.cl/cgi-bin/Portal001/mipeShowPdf.cgi?CODIGO',
  _limit: null,
  _browser: null,
  _ignore: null,
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
      address: 'select[name="EFXP_DIR_RECEP"]',
      commune: 'input[name="EFXP_CMNA_RECEP"]',
      city: 'input[name="EFXP_CIUDAD_RECEP"]',
      concept: 'select[name="EFXP_GIRO_RECEP"]',
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
    sendBtn: 'button[name="Button_Update"]',
    sign: 'input[name="btnSign"]',
    certificate: 'input[id="myPass"]',
    finalize: 'button[id="btnFirma"]'
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
  async scrapeDocuments(invoices, params) {
    const newInvoices = [];
    const { params: {refreshData, entity}, rut_id } = params;
    let count = 0;
    for (const invoice of invoices) {
      const code = invoice['0'].split('CODIGO=')[1].split('&')[0].trim();
      const is_exist = await strapi.query((entity.slice(0, entity.length - 1))).findOne({
        code_contains: code
      });

      const url = invoice['0'].includes('mipeGesDocEmi.cgi') ?
        this._documentBaseUrlSent :
        this._documentBaseUrlReceived;

      if (!is_exist) {
        let page;
        try {
          page = await this._browser.newPage();
        } catch (err1) {
          console.log('fallo aqui');
          continue;
        }
        const downloadPath = path.join(__dirname, `../../../public/uploads/${code}`)
        await page._client.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath
        });
        const invoiceElement = {
          ...invoice,
          '0': code,
          code,
          path: downloadPath
        }
        try {
          const completeUrl = `${url}=${code}`;
          // newInvoices.push(invoiceElement);
          console.log(completeUrl);
          await page.goto(completeUrl);
        } catch (e) {
          console.log('document: ', count++);
          let time = 100;

          const toRefresh = [
            {
              rut: rut_id,
              data: [invoiceElement]
            }
          ]
          do {
            await sleep(100);
            const fileExists = fs.existsSync(downloadPath + '/77022026.pdf');
            if (fileExists) {
              await refreshData(toRefresh, params.params, entity);
              break
            } else if (time === 10000) {
              break;
            }
            time += 100;
          } while (true);
        }
        await page.close();
      }
      if (this._limit && this._limit < count) {
      // if (count < 10) {
        break;
      }
      
    }
    await sleep(10000);
    console.log('finish');
    return newInvoices;
  },
  async scrapeBusiness(page, params) {
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
      if (process.env.TEST) break;
    } while (continueVar);
    data = await this.scrapeDocuments(data, params);
    return data;
  },
  async getID(page) {
    const id = await page.$eval('div div div > b', id => id.textContent);
    return id.split(';')[1].trim();
  },
  async scrapeMulti(page, params) {
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
      const result = await this.scrapeBusiness(page, { ...params, rut_id: id });
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
        //await page.waitForNavigation();
        await sleep(2000)
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
        await page.waitFor(100);
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
  async finalizeDocument(page, certificatePassword) {
    await page.click(this.tags.sendBtn);
    await page.waitForNavigation();
    await page.click(this.tags.sign);
    await page.waitForNavigation();
    await page.type(this.tags.certificate, certificatePassword);
    await page.click(this.tags.finalize);
    await page.waitForNavigation();

    const [link] = await page.$x(`//a[contains( . , 'Ver Documento')]`);
    if (link) {
      const href = await page.evaluate(el => {
        return el.href;
      }, link)
      return href;
    }

  },
  async createDocument({ document, browser, certificatePassword, empOption, ...params }) {
    let res = '';
    const page = await this.login((await browser.newPage()), params);
    const { products, ...rest } = document;
    if (page.url().includes('mipeSelEmpresa.cgi')) {
      await page.select('select[name="RUT_EMP"]', empOption)
      await page.click('button[type="submit"]');
      await page.waitForSelector('.container');
    }
    console.log("Se va a procesar selectores");
    for (const key of Object.keys(rest)) {
      await this.processSelectors(page, rest[key], this.tags[key])
    }
    console.log("Se Procesaron los selectores");
    console.log("Se van a procesar los productos");
    await this.processProducts(page, products);
    console.log("Se procesaron los productos");
    if (!params.debug) {
      console.log("Se van a finalizar los documentos");
      res = await this.finalizeDocument(page, certificatePassword);
      console.log("Se finalizaron todos los documentos");
    }
    return res;
  },
  async getReceiverData(page, receiver, result = {}) {
    if (typeof receiver !== 'string') {
      for (const key of Object.keys(receiver)) {
        result[key] = await this.getReceiverData(page, receiver[key]);
      }
      return result;
    }
    if (receiver.startsWith('input')) {
      const value = await page.$eval(receiver, item => item.value)
      return value;
    } else if (receiver.startsWith('select')) {
      const options = await page.$$eval(
        `${receiver} optgroup > option`,
        opts => opts.map(opt => opt.value)
      )
      return options;
    }
  },
  async getReceiver({ document: { receiver: receiverDoc }, browser, empOption, ...params }) {
    let res = '';
    const { receiver } = this.tags;
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('mipeSelEmpresa.cgi')) {
      await page.select('select[name="RUT_EMP"]', empOption)
      await page.click('button[type="submit"]');
      await page.waitForSelector('.container');
    }

    await this.processSelectors(page, receiverDoc, receiver)

    res = await this.getReceiverData(page, receiver);

    return res;
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
    this._browser = browser;
    this._limit = params.limit;
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('Portal001/mipeAdmin')) {
      const id = await this.getID(page);
      console.log('scraping unico', id)
      const result = await this.scrapeBusiness(page, { params, rut_id: id });
      data.push({
        rut: id,
        data: result
      })
    } else if (page.url().includes('mipeSelEmpresa')) {
      this.multiRoute = page.url();
      console.log('scraping multiple');
      data = await this.scrapeMulti(page, params);
    }

    return data;
  }
}

const startBrowser = async () => {
  let browser;
  try {
    console.log("Iniciando proceso, por favor espere...");
    browser = await puppeteer.launch({
      headless: !process.env.TEST,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      'ignoreHTTPSErrors': true,
      timeout: 60000,
    });
  } catch (err) {
    console.log("Could not create a browser instance => : ", err);
  }
  return browser;
}

const scrapeAll = async ({ rut: username, clave: password, ...params }) => {
  let browser;
  let limit = (process.env.TEST) ? 10 : null;
  let tries = 0;
  await strapi.query('process').update({id: params.processDocument.id}, {
    ...params.processDocument,
    status: 'PROCESSING'
  });
  while (tries < 3) {
    try {
      browser = await startBrowser();
      const result = await scraperObj.scraper({
        browser,
        username,
        password,
        limit,
        ...params
      });
      browser.close();

      await strapi.query('process').update({id: params.processDocument.id}, {
        ...params.processDocument,
        status: 'DONE'
      });
      
      return result;
    }
    catch (err) {
      browser.close();
      console.log(err);
      if (++tries === 3){
        await strapi.query('process').update({ id: params.processDocument.id }, {
          ...params.processDocument,
          status: 'FAILED',
          log: err
        });
        throw err;
      }
    }
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
    return result;
  }
  catch (err) {
    console.log(err);
    throw err;
  }finally{
    let pages = await browser.pages();
    await Promise.all(pages.map(page =>page.close()));
    await browser.close();
  }
}

const getDocumentData = async ({ rut: username, clave: password, ...params }) => {
  let browser;
  try {
    browser = await startBrowser();
    const result = await scraperObj.getReceiver({
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
  const result = await scrapeAll({ url, ...settings });
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

const getDocumentReceiver = async (settings, document) => {
  const result = await getDocumentData({
    document,
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
  getDocumentReceiver
};
