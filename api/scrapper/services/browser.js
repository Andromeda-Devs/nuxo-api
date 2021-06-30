'use strict';
const puppeteer = require('puppeteer')

const startBrowser = async () => {
  let browser;
  try {
    console.log("Iniciando proceso, por favor espere...");
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      'ignoreHTTPSErrors': true,
      timeout: 60000,
      slowMo: 100
    });
  } catch (err) {
    console.log("Could not create a browser instance => : ", err);
  }
  return browser;
}

const closeBrowser = async browser => {
  try{
    let pages = await browser.pages();
    await Promise.all(pages.map(page =>page.close()));
    await browser.close();
  }catch(err){
    console.log("No se pudo cerrar el navegador");
  }
}

module.exports = {
	startBrowser,
	closeBrowser
}