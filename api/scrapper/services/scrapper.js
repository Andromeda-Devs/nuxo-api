'use strict';
const tags = require('./selectors')
const { startBrowser, closeBrowser } = require('./browser')

const path = require("path");
const { sleep } = require("../../../utils");
const fs = require("fs");
const rimraf = require('rimraf');

const refreshData = async (resultScraping, data, entity) => {
  for (const enterpriseHistory of resultScraping) {
    let enterprise = await strapi.query('enterprise').findOne({
      enterpriseRut: enterpriseHistory.rut.trim(), rut: data.id
    });
    if (!enterprise) {
      enterprise = await strapi.query('enterprise').create({
        rut: data.id, enterpriseRut: enterpriseHistory.rut
      });
    }
    let info = enterpriseHistory.data.map((item) => {
      let fileExist = false;
      try {
        fs.readdirSync(`public/uploads/${item.code}`).forEach(file => {
          if (file) fileExist = true;
        });
        if (!fileExist) return null;
        return {
          rut: item[1].trim(), businessName: item[2],
          document: item[3], invoice: item[4],
          date: item[5], amount: item[6],
          state: item[7], enterprise: enterprise.id,
          code: item.code
        }
      } catch (error) {
        return null;
      }
    });

    info = info.filter((item) => {
      return item !== null;
    });
    let result;

    for (const item of info) {
      const { code } = item;
    
      try{
        result = await strapi.query(entity).create(item);
        const name = fs.readdirSync(`public/uploads/${code}`).reduce((acc, cur) => cur, '');
        const path = `/uploads/${code}/${name}`
        const publicPath = `public${path}`;
        const fileStat = fs.statSync(publicPath);
        await strapi.config.functions.document.updateData(result.id, publicPath, entity);
        await strapi.plugins.upload.services.upload.upload({
          data: {
            refId: result.id, ref: entity, field: 'file',
          },
          files: {
            path: publicPath, name: name,
            type: 'application/pdf', // mime type
            size: fileStat.size,
          },
        });
        await sleep(200);
      }catch(err) {
        console.log(err);
      } finally {
        rimraf.sync(`public/uploads/${code}`);
      }
    }
    return result;
  }
}

const scraperObj = {
  multiRoute: '',
  next: 'a[title="Pagina siguiente"]',
  _urlSent: 'https://www1.sii.cl/cgi-bin/Portal001/mipeDisplayPDF.cgi?DHDR_CODIGO',
  _urlReceived: 'https://www1.sii.cl/cgi-bin/Portal001/mipeShowPdf.cgi?CODIGO',
  _limit: null,
  _browser: null,
  _ignore: null,
  tags,
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
  async getCodeFromUrl (url) {
    return url.split('CODIGO=')[1].split('&')[0].trim();
  },
  async buildDownloadPath (code) {
    return path.join(__dirname, `../../../public/uploads/${code}`);
  },
  async scrapeDocuments(invoices, params) {
    const newInvoices = [];
    const { params: { entity }, rut_id } = params;
    let count = 0;
    for (const invoice of invoices) {
      const code = await this.getCodeFromUrl(invoice['0']);
      const is_exist = await strapi.query(entity).findOne({
        code_contains: code
      });
      const url = invoice['0'].includes('mipeGesDocEmi.cgi') ? this._urlSent : this._urlReceived;
      if (!is_exist) {
        let page = await this._browser.newPage();
        const downloadPath = await this.buildDownloadPath(code);
        await page._client.send('Page.setDownloadBehavior', {
          behavior: 'allow', downloadPath
        });
        const invoiceElement = {
          ...invoice, '0': code,
          code, path: downloadPath
        }
        const completeUrl = `${url}=${code}`;
        try {
          await page.goto(completeUrl);
          console.log(completeUrl);
        } catch (e) {

          console.log('document: ', count++);
          let time = 100;
          const toRefresh = [
            { rut: rut_id, data: [invoiceElement] }
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
      // if (this._limit && this._limit < count) {
      if (10 < count) {
        break;
      }
    }
    await sleep(10000);
    console.log('finish');
    return newInvoices;
  },
  async scrapeBusiness(page, params, searchCode = false) {
    let continueVar = false;
    let data = [];
    let iteration = 1;
    do {
      await page.waitForSelector('#tablaDatos');
      console.log(`Table part ${iteration++}`);
      const newData = await this.scrapeTable(page);
      if (searchCode){
        const wantedInvoice = newData.find(item => item['0'].includes(`${searchCode}`))
        if(wantedInvoice) return wantedInvoice;
      }
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
    if(searchCode) return;
    data = await this.scrapeDocuments(data, params);
    return data;
  },
  async getID(page) {
    const id = await page.$eval('div div div > b', id => id.textContent);
    return id.split(';')[1].trim();
  },
  async scrapeMulti(page, params, searchCode = null) {
    const data = [];
    const options = await page.$$eval(
      'select[name="RUT_EMP"] optgroup > option',
      opts => opts.map(opt => opt.value)
    )
    for (const option of options) {
      await page.select('select[name="RUT_EMP"]', option)
      await page.click('button[type="submit"]');
      await page.waitForSelector('.container');
      const result = await this.scrapeBusiness(page, { ...params, rut_id: option }, searchCode);
      if(searchCode) return result;
      data.push({
        rut: option,
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
        await sleep(2000)
      }
    }
  },
  async processSelect(page, data, selector) {
    console.log(data, selector)
    if (typeof data === 'number') {
      await page.select(selector, data);
    } else {
      const options = await page.$$eval(
        `${selector} option`,
        opts => opts.map(opt => {
          return (({ value, text }) => ({ value, text }))(opt);
        })
      )
      for (const option of options) {
        if (option.value === data || option.text === data) {
          await page.select(selector, option.value);
          break;
        }
      }
    }
  },
  async processField(...args) {
    if (args[2].startsWith('input') || args[2].startsWith('textarea')) {
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
        await this.processInput( page, { action: 'click' }, products.options.code );
      }
      if (product.additionalTax && !addTx) {
        addTx = !addTx;
        await this.processInput( page, { action: 'click' }, products.options.additionalTaxes );
      }
      if (description) {
        const { check, value } = products.description;
        await this.processInput( page, { action: 'click' }, check.replace('"]', `${num}"]`) );
        await this.processInput( page, description, value.replace('"]', `${num}"]`) );
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
  async getDocumentLink (page) {
    const [link] = await page.$x(`//a[contains( . , 'Ver Documento')]`);
    if (link) {
      const href = await page.evaluate(el => {
        return el.href;
      }, link)
      return href;
    }
  },
  async getLink (page, exp) {
    const [link] = await page.$x(exp);
    if (link) {
      const href = await page.evaluate(el => {
        return el.href;
      }, link)
      return href;
    }
  },
  async buildDocumentObject (page) {
    const [ref] = await page.$x(`//div[@class='web-sii cuerpo']/div/div[3]`);
    const text = await ref.evaluate(el => {
      return el.innerText;
    });
    const link = await this.getDocumentLink(page);
    const [
      myCompany, emitDate, myRut, documentType, folio,
      receiverName, receiverRut, total
    ] = text.split('\n').filter(item => item !== '')
      .map(item => item.includes('\t') ? item.split('\t')[1] : item);

    const res = {
      'senderRut': myRut.split(' ')[1], '1': receiverRut,
      '2': receiverName, '3': documentType, '4': folio.split(' ')[1],
      '5': emitDate.split(': ')[1].split('-').reverse().join('-'),
      '6': total.slice(1), '7': 'Documento Emitido', link
    };
    return res;
  },
  async saveInvoiceDocument (page, params) {
    const {
      link,
      senderRut,
      ...newItem
    } = await this.buildDocumentObject(page);

    const code = await this.getCodeFromUrl(link);
    const entity = 'emit';
    const downloadPath = await this.buildDownloadPath(code);
    const url = this._urlSent;

    const newPage = await this._browser.newPage();
    await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });

    let result;
    try {
      const completeUrl = `${url}=${code}`;
      await newPage.goto(completeUrl);
    } catch (e) {
      let time = 100;
      const toRefresh = [
        { rut: senderRut, data: [{ ...newItem, '0': code, code, path: downloadPath }] }
      ]
      do {
        await sleep(100);
        const fileExists = fs.existsSync(downloadPath + '/77022026.pdf');
        if (fileExists) {
          result = await refreshData(toRefresh, params, entity);
          break
        } else if (time === 10000) {
          break;
        }
        time += 100;
      } while (true);
    }

    return result;

  },

  async finalizeDocument(page, certificatePassword, params, isCancel = false) {
    if(!isCancel)
      await page.click(this.tags.sendBtn);
    await page.waitForSelector('.container');
    await page.click(this.tags.sign);
    await page.waitForSelector('.container');
    await page.type(this.tags.certificate, certificatePassword);
    await page.click(this.tags.finalize);
    await page.waitForSelector('.container');

    const result = await this.saveInvoiceDocument(page, params);

    return result;
  },
  async selectEmp(page, empOption) {
    await page.select('select[name="RUT_EMP"]', empOption)
    await page.click('button[type="submit"]');
    await page.waitForSelector('.container');
  },
  async flattenReference(reference) {
    const { date, ...rest } = reference;
    const splitedDate = date.split('-');
    const newDate = {
      yyyy: splitedDate[0],
      mm: splitedDate[1],
      dd: splitedDate[2]
    };
    return Object.assign(rest, newDate);
  },
  async processReferences(page, docReferences) {
    const { references } = this.tags;
    await page.click(references.check);
    let count = 1;
    for (const docReference of docReferences) {
      const reference = await this.flattenReference(docReference);
      for(const key of Object.keys(reference)){
        await this.processSelectors(page, reference[key], references[key].replace('"]', `${count}"]`))
      }
      count++;
    }
  },
  async fillDocument (page, document) {
    const { products, references, ...rest } = document;
    for (const key of Object.keys(rest)) {
      await this.processSelectors(page, rest[key], this.tags[key])
    }
    await this.processProducts(page, products);
    if (references) {
      await this.processReferences(page, references);
    }
  },
  async createDocument({ document, browser, certificatePassword, empOption, ...params }) {
    var res = '';
    this._browser = browser;
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('mipeSelEmpresa.cgi')) {
      await this.selectEmp(page, empOption);
    }
    await this.fillDocument(page, document);
    if (!params.debug) {
      console.log("Se van a finalizar los documentos");
      res = await this.finalizeDocument(page, certificatePassword, params);
    }
    return res;
  },
  async excludeInvoice(page, invoice, empOption, params) {
    const date = params.date.split('-');
    await page.goto('https://www4.sii.cl/consdcvinternetui/#/index');
    await sleep(2000);
    await page.select('select[name="rut"]', empOption.split('.').join(''));
    await sleep(2000);
    await page.select('select[id="periodoMes"]', date[1]);
    await page.select('select[ng-model="periodoAnho"]', date[0]);
    await page.click('button[type="submit"]');
    await sleep(2000);
    const [link] = await page.$x("//a[contains(., '(61)')]");
    if (link) {
      await link.click();
    }
    await page.waitForSelector('#folioB');
    await page.type('#folioB', invoice.invoice);
    console.log('folio', invoice.invoice);
    await sleep(2000);
    const [button] = await page.$x('//td[@class="sorting_1"]//button[@type="button"]');
    if(button) await button.click();
    await sleep(10000);
    console.log('ultimo paso');
    const [select] = await page.$x('//div[@class="panel-body"]//select');
    if (select) select.type('no');
    await sleep(3000);
    await page.click('input[value="Cambiar"]');
    await sleep(10000);
  },
  async cancelTicket({ document, browser, certificatePassword, empOption, ...params }) {
    var res = '';
    this._browser = browser;
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('mipeSelEmpresa.cgi')) {
      await this.selectEmp(page, empOption);
    }
    await page.goto('https://www1.sii.cl/Portal001/EmiNotaCredito2.html');
    await page.waitForSelector('a[name="boton_ir_blanco"]');
    await page.click('a[name="boton_ir_blanco"]');
    await page.waitForSelector('.container');
    await this.fillDocument(page, {
      ...document,
      receiver: {
        rut: await strapi.services.rut.format(empOption)
      },
      references: [{
        type: 'Boleta elec.',
        ref: params.reference,
        date: params.date
      }]
    });
    await page.select(tags.references.option.replace('"]', '1"]'), '1');
    await page.type(tags.references.reason.replace('"]', '1"]'), (params.description || params.reference) );
    await sleep(1000);
    await page.select(tags.references.option.replace('"]', '1"]'), '1');
    await page.type(tags.references.reason.replace('"]', '1"]'), (params.description || params.reference) );
    if (!params.debug) {
      console.log("Se van a finalizar los documentos");
      res = await this.finalizeDocument(page, certificatePassword, params);
    }
    await this.excludeInvoice(page, res, empOption, params);
    return res;
  },
  async getReceiverData(page, receiver, result = {}) {
    if (typeof receiver !== 'string') {
      for (const key of Object.keys(receiver)) {
        try{
          result[key] = await this.getReceiverData(page, receiver[key]);
        } catch(err){}
      }
      return result;
    }
    if (receiver.startsWith('input')) {
      const value = await page.$eval(receiver, item => item.value)
      return value;
    } else if (receiver.startsWith('select')) {
      const options = await page.$$eval(
        `${receiver} optgroup > option`,
        opts => opts.map(opt => ({
          value: opt.value,
          text: opt.text
        }))
      )
      return options;
    }
  },
  async normalizeModel(obj) {
    const { commune, city, address, ...model } = obj;
    model['addresses'] = { commune, city, address };
    return model;
  },
  async processAddresses(page, addresses) {
    const options = await this.getReceiverData(page, addresses.address);
    const result = [];

    for (const option of options){
      await page.select(addresses.address, option.value);
      const res = await this.getReceiverData(page, addresses);
      result.push({ ...res, address: option });
    }
    return result;
  },
  async getReceiver({ document: { receiver: receiverDoc }, browser, empOption, ...params }) {
    const { addresses: senderAddresses, ...sender} = await this.normalizeModel(this.tags.sender);
    const { addresses: receiverAddresses, ...receiver} = await this.normalizeModel(this.tags.receiver);
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('mipeSelEmpresa.cgi')) {
      await this.selectEmp(page, empOption);
    }

    await this.processSelectors(page, receiverDoc, receiver)
    await this.processSelectors(page, receiverDoc, sender)

    const receiverData = await this.getReceiverData(page, receiver);
    const senderData = await this.getReceiverData(page, sender);

    const senderA = await this.processAddresses(page, senderAddresses);
    const receiverA = await this.processAddresses(page, receiverAddresses);

    return {
      sender: { addresses:senderA, ...senderData },
      receiver: { addresses: receiverA, ...receiverData }
    };
  },
  async login(page, { url, username, password }) {
    await page.goto(url);
    console.log(username, password)
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
  async checkAccount({ browser, ...params }) {
    let data = [];
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('Portal001/mipeAdmin')) {
      const id = await this.getID(page);
      data.push(id.split('.').join(''));
    } else if (page.url().includes('mipeSelEmpresa')) {
      data  = await page.$$eval(
        'select[name="RUT_EMP"] optgroup > option',
        opts => opts.map(opt => opt.value)
      )
    }
    return data;
  },
  async scraper({ browser, ...params }) {
    let data = [];
    this._browser = browser;
    this._limit = params.limit;
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('Portal001/mipeAdmin')) {
      const id = await this.getID(page);
      console.log('scraping unico', id)
      const result = await this.scrapeBusiness(page, { params, rut_id: id.split('.').join('') });
      data.push({ rut: id, data: result })
    } else if (page.url().includes('mipeSelEmpresa')) {
      this.multiRoute = page.url();
      console.log('scraping multiple');
      data = await this.scrapeMulti(page, params);
    }
    return data;
  },
  async cancelInvoice({ browser, code, empOption, ...params }) {
    this._browser = browser;
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('mipeSelEmpresa.cgi')) {
      await this.selectEmp(page, empOption);
    }
    let result = await this.scrapeBusiness(page, params, code);
    await page.goto(result['0']);
    await page.waitForSelector('.container');
    const link = await this.getLink(page, `//a[contains( . , 'Generar Nota de Crédito de Anulación')]`);
    await page.goto(link);
    result = await this.finalizeDocument(page, params.certificatePassword, params, true);
    console.log(link)
    return result;
  },

  async acceptInvoice({ browser, code, commercialResponse, receiptAccuse, certificatePassword, empOption,...params }) {
    this._browser = browser;
    const { acceptBody } = this.tags;
    const page = await this.login((await browser.newPage()), params);
    if (page.url().includes('mipeSelEmpresa.cgi')) {
      await this.selectEmp(page, empOption);
    }
    let result = await this.scrapeBusiness(page, params, code);
    await page.goto(result['0']);
    await page.waitForSelector('.container');
    console.log('estoy en:', await page.url());
    const commercialResponsePath = await this.getLink(page, `//a[contains( . , 'Dar Respuesta comercial')]`);
    const receipt = await this.getLink(page, `//a[contains( . , 'Dar Acuse de Recibo')]`)
    await page.goto(commercialResponsePath);
    await page.waitForSelector('.container');
    console.log('escribiendo');
    await this.processSelectors(page, commercialResponse, acceptBody);
    await page.click('input[value="Firmar y Enviar"]');
    console.log('estoy en:', await page.url());
    await page.waitForSelector(this.tags.certificate);
    await sleep(1000);
    await page.type(this.tags.certificate, certificatePassword);
    console.log('estoy en:', await page.url());
    await sleep(1000);
    await page.click('div[id="ingresoClaveCertificadoCentral"] button');
    try{
      await page.waitForSelector('.container');
    }catch (err) {}
    ///////////////////////////////////////////////////////////////////////
    // await page.goto(receipt);
    // if(receiptAccuse)
    //   await this.processSelectors(page, receiptAccuse, acceptBody);
    // await page.click('input[value="Firmar y Enviar"]');
    // await page.waitForSelector(this.tags.certificate);
    // await page.type(this.tags.certificate, certificatePassword);
    // await page.click('div[id="ingresoClaveCertificadoCentral"] button');
    // await page.waitForSelector('.container');
    return {message: "successfull"};
  }
}

const scrapeAll = async ({ rut: username, clave: password, ...params }) => {
  let browser;
  let limit = (process.env.TEST) ? 10 : null;
  let tries = 0;
  await strapi.query('process').update({id: params.processDocument.id}, {
    ...params.processDocument, status: 'PROCESSING'
  });
  while (tries < 3) {
    try {
      browser = await startBrowser();
      const result = await scraperObj.scraper({
        browser, username, password, limit, ...params
      });
      await strapi.query('process').update({id: params.processDocument.id}, {
        ...params.processDocument, status: 'DONE'
      });
      return result;
    } catch (err) {
      console.log(err);
      if (++tries === 3){
        await strapi.query('process').update({ id: params.processDocument.id }, {
          ...params.processDocument, status: 'FAILED', log: err
        });
        throw err;
      }
    }
    finally{
      await closeBrowser(browser);
    }
  }
}

const scraperFunction = async ({ rut: username, clave: password, ...params }, attr) => {
  let browser;
  console.log(username, password)
  try {
    browser = await startBrowser();
    const result = await scraperObj[attr]({
      browser, username, password, ...params
    });
    return result;
  }
  catch (err) {
    console.log(err);
    throw err;
  }finally{
    await closeBrowser(browser);
  }
}

const getEmited = async (settings) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D2%26TIPO%3D4';
  const result = await scrapeAll({ url, ...settings });
  return result;
}

const checkAccount = async (settings) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D2%26TIPO%3D4';
  const result = await scraperFunction({ url, ...settings }, 'checkAccount');
  return result;
}

const cancelInvoice = async (settings) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D2%26TIPO%3D4';
  const result = await scraperFunction({ url, ...settings }, 'cancelInvoice');
  return result;
}

const getReceived = async (settings) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D1%26TIPO%3D4';
  const result = await scrapeAll({ url, ...settings });
  return result;
}

const acceptInvoice = async (settings) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D1%26TIPO%3D4';
  const result = await scraperFunction({ url, ...settings }, 'acceptInvoice');
  return result;
}

const createAffectInvoice = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D33%26TIPO%3D4';
  const result = await scraperFunction({ document, url, ...settings }, 'createDocument');
  return result;
}

const cancelTicket = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D2%26TIPO%3D4';
  const result = await scraperFunction({ document, url, ...settings }, 'cancelTicket');
  return result;
}

const createExemptInvoice = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D34%26TIPO%3D4';
  const result = await scraperFunction({ document, url, ...settings }, 'createDocument');
  return result;
}

const createDispatchGuide = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D52%26TIPO%3D4';
  const result = await scraperFunction({ document, url, ...settings }, 'createDocument');
  return result;
}

const getDocumentReceiver = async (settings, document) => {
  const url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D33%26TIPO%3D4';
  const result = await scraperFunction({ document, url, ...settings }, 'getReceiver');
  return result;
}

module.exports = {
  getEmited,
  getReceived,
  createAffectInvoice,
  createExemptInvoice,
  createDispatchGuide,
  getDocumentReceiver,
  cancelInvoice,
  cancelTicket,
  acceptInvoice,
  checkAccount
};
