'use strict';
const { PdfReader } = require("pdfreader");

var rows = {}; // indexed by y-position

function sortRows() {
    return Object.keys(rows) // => array of y-positions (type: float)
        .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
        .map(key => rows[key]);
}

function nextFloat(collection, index = 0) {
    for (const item of collection){
        const res = parseFloat(
            item.split('.')
                .map(item => item.replace(',', '.'))
                .join('')
        );
        if (res)
            return res;
    }
}

function toJsonProduct(product) {
    const [code, description, quantity, ...rest] = product;
    const price = nextFloat(rest)
    return {
        code: code.trim(),
        description: description.trim(),
        quantity: parseInt(quantity),
        price
    }
}

function sanitizeProducts(products) {
    const cleanProducts = products.filter(line => line.length > 3);
    return cleanProducts.reduce((acc, cur) => {
        const product = toJsonProduct(cur);
        acc.push(product);
        return acc;
    }, []);
}

async function getProducts(id, entity) {
    const sortedRows = sortRows();
    const index = sortedRows.findIndex(item => item[0].includes('Adic.*')) + 1;
    const num = sortedRows.findIndex(item => item[0].includes('Referencias:')) - index;
    const products = sanitizeProducts(sortedRows.splice(index, num));
    if (products.length > 0) {
        const data = await strapi.query(entity).findOne({ id });
        if (data.products.length === 0) {
            await strapi.query(entity).update({ id }, { products })
        }
    }
    return products;
}

async function updateData(id, name, entity) {
    new PdfReader().parseFileItems(name, function (
        err,
        item
    ) {
        try {
            if (!item || item.page) {
                // end of file, or page
                if (item && item.page >= 2) throw new Error('should finish')
                getProducts(id, entity).then(products => products);
                // console.log("PAGE:", item.page);
                rows = {}; // clear rows for next page
            } else if (item.text) {
                // accumulate text items into rows object, per line
                (rows[item.y] = rows[item.y] || []).push(item.text);
            }
        } catch (error) {}
    });
}

module.exports = {
    updateData
}