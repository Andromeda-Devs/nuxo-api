'use strict';

const puppeteer = require('puppeteer');

const splitNumber = (numToSplit) => {

    const numAsString = numToSplit + "";

    //TODO: mantain only numbers on the text

    return numAsString.split("");

}

class Crawler {

    constructor(config) {

        const { url } = config;

        this.url = url;
        this._browser = null;

    }

    async initialize() {

        const url = this.url;

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            'ignoreHTTPSErrors': true,
            timeout: 60000
        });

        this._browser = browser;

        const context = await browser.defaultBrowserContext();

        await context.overridePermissions( url , [ "notifications" ] );

        let page = await browser.newPage();

        await page.goto(url);

        this._page = page;

    }

    async close() {
        this._browser.close();
    }

    async pressDown(num) {
        for (let _i = 0; _i < num; _i++) {
            await this._page.keyboard.press('ArrowDown');
        }
        await this._page.keyboard.press('Enter');
    }

    async fill(query, value) {

        await this._page.waitForSelector(query);

        await this._page.type(query, value);

    }

    async clickByText(query, tagName = "button") {

        const [button] = await this._page.$x(`//${tagName}[contains( . , '${query}')]`);

        if (button) {

            await button.click();

            return button;

        }

        return;

    }

    async clickBy(config) {

        let selection = null;

        if ('selector' in config) {

            selection = await this._page.$(config.selector);

        } else {

            const { text, tagName = 'div', ...rest } = config;

            const params = Object
                .entries(rest)
                .map(([attribute, value]) => `@${attribute}='${value}'`);

            let paramsAsText = params.length
                ? "and " + params.join(" and ")
                : ``

            const [foundTag] = await this._page.$x(`//${tagName}[contains( . , '${text}') ${paramsAsText} ]`);

            selection = foundTag;
        }


        if (selection) {

            await selection.click();

            return selection;

        }

        return;

    }

    async selectBy(config) {

        let selection = null;

        if ('selector' in config) {

            selection = await this._page.$(config.selector);

        } else {

            const { text, tagName = 'div', ...rest } = config;

            const article = text ? "and" : ""

            const params = Object
                .entries(rest)
                .map(([attribute, value]) => `@${attribute}='${value}'`);

            let paramsAsText = params.length
                ? article + params.join(" and ")
                : ``

            const [foundTag] = await this._page.$x(`//${tagName}[${text ? `contains( . , '${text}')` : ''} ${paramsAsText} ]`);

            selection = foundTag;
        }


        if (selection) {

            return selection;

        }

        return;

    }

    async waitForButtonContent(query) {

        const button = await this._page.waitForFunction(
            (query) => {

                const buttons = document.getElementsByTagName('button');

                let buttonFound = null;

                for (let _i = 0; _i < buttons.length; _i += 1) {

                    if (buttons[_i].textContent.includes(query)) {

                        buttonFound = buttons[_i];

                    }

                }

                return buttonFound;

            },
            {},
            query
        );

        return button;

    }

    async waitForContent(query, tagName) {

        const node = await this._page.waitForFunction(
            (query, tagName) => {

                const tags = document.getElementsByTagName(tagName);

                let buttonFound = null;

                for (let _i = 0; _i < tags.length; _i += 1) {

                    if (tags[_i].textContent.includes(query)) {

                        buttonFound = tags[_i];

                    }

                }

                return buttonFound;

            },
            {},
            query,
            tagName
        );

        return node;

    }

    async sleep(ms = 1000) {

        await this._page.waitForTimeout(ms);

    }

    get page() {

        return this._page;

    }

}

class Eboleta {

    constructor() {

        this.userInput = "#input-14";
        this.passwordInput = "#input-15";
        this.loginErrorMessage = `Unauthenticated access is not supported for this identity pool`;

        this.affectBallot = {

            id: 'list-item-166-0',
            text: 'Boleta afecta'

        }

        this.exentBallot = {

            id: 'list-item-169-1',
            text: 'Boleta exenta'

        }

        this.url = 'https://eboleta.sii.cl/';

        this.crawler = new Crawler({
            url: this.url
        });

    }

    async close() {
        this.crawler.close();
    }

    async login({

        user,
        password

    }) {

        this.user = user;
        this.password = password;

        await this.crawler.initialize();

        this.crawler.page.on('requestfinished', async req => {

            if (req.method() === 'POST') {

                const res = req.response();
                const text = await res.text();
                const isAuthError = text.includes(this.loginErrorMessage);

                //if(isAuthError) 
                //throw new Error('User or password are incorrect');

            }

        });

        //fills user input
        await this.crawler.fill(
            this.userInput,
            this.user
        );

        //fills password input
        await this.crawler.fill(
            this.passwordInput,
            this.password
        );

        await this.crawler.clickByText("Ingresar");
        await this.crawler.page.waitForNavigation();

    }

    async emitTicket({
        amount,
        type = 'Boleta Afecta',
        receiver,
        detail
    }) {

        //presses eboleta page num pad
        await this.pressNumpad(amount);
        console.log("se ingreso el monto");
        await this.crawler.sleep();

        await this.crawler.clickByText("Emitir");

        await this.crawler.sleep();
        console.log("paso el numpad");

        await this.crawler.clickByText("Elija tipo boleta", "label");

        await this.crawler.sleep();
        console.log("tipo de boleta seleccionado");

        await this.selectBallot(type);

        await this.crawler.sleep();
        console.log("selecciono tipo");

        //Fills receiver input if reciver is defined
        await this.fillReceiverFormIfNeeded(receiver);

        await this.crawler.sleep();
        console.log("tipeo receiver");

        await this.fillDetailFormIfNeeded(detail);
        console.log("tipeo detalle");
        const downloadButton = await this.getDownloadButton();

        const ticketHref = await downloadButton.evaluate(node => node.getAttribute('href'));
        console.log("se obtuvo el href");
        return ticketHref;

    }

    async pressNumpad(quantity) {

        const quantitySplitted = splitNumber(quantity);

        await this.crawler.waitForButtonContent("Emitir");

        await this.crawler.sleep(3000);

        for (const number of quantitySplitted) {

            await this.crawler.clickByText(number);

        }

    }

    async selectBallot(ballotType) {

        switch (ballotType) {

            case 'Boleta Afecta': {
                // await this.crawler.clickBy(this.affectBallot);
                await this.crawler.pressDown(1);
                return
            }

            case 'Boleta Exenta': {
                await this.crawler.pressDown(2);
                return
            }

        }

    }

    async getDownloadButton() {

        const dialog = await this.crawler.page.$(`#app > div[role=document]`);

        const [_, emitButton] = await dialog.$x(`//button[contains( . , 'Emitir')]`);

        await this.crawler.sleep();

        if (emitButton) {

            await emitButton.click();

        }

        const downloadButton = await this.crawler.waitForContent("Descargar", "a");

        return downloadButton;

    }

    async fillDetailFormIfNeeded(detail) {

        if (detail) {

            const detailSwitchSelector = '#app > div.v-dialog__content.v-dialog__content--active > div > div.v-card.v-sheet.theme--light > div.v-card__text > div > v-template:nth-child(1) > div:nth-child(5) > div > div'

            const detailInput = "#input-133";
            const detailInputSecond = "#input-130";

            await this.crawler.clickBy({

                selector: detailSwitchSelector

            });

            await this.crawler.sleep();

            await this.crawler.fill(
                detailInput,
                detail
            )

            await this.crawler.fill(
                detailInputSecond,
                detail
            )

        }
    }

    async fillReceiverFormIfNeeded(receiver) {

        if (receiver) {

            const rutInput = '#input-113';
            const nameInput = '#input-119';
            const emailInput = '#input-123';
            const addressInput = '#input-121';

            const receiverSwitchSelector = `#app > div.v-dialog__content.v-dialog__content--active > div > div.v-card.v-sheet.theme--light > div.v-card__text > div > v-template:nth-child(1) > div:nth-child(3) > div > div > div`;

            await this.crawler.clickBy({

                selector: receiverSwitchSelector

            });

            await this.crawler.sleep();

            await this.crawler.fill(
                rutInput,
                receiver.rut
            )


            await this.crawler.fill(
                nameInput,
                receiver.name
            )


            await this.crawler.fill(
                emailInput,
                receiver.email
            )


            await this.crawler.fill(
                addressInput,
                receiver.address
            )

        }

    }
}


const eboleta = new Eboleta();

module.exports = {
    eboleta
};
