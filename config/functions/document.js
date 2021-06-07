'use strict';
const { PdfReader } = require("pdfreader");

class PdfParser {
    constructor(filePath, entity, id) {
        this.filePath = filePath;
        this.entity = entity;
        this.id = id;
        this.rows = {};
        this.shouldContinue = true;
        this.init();
    }

    orderAndJoin() {
        const rows = this.rows;
      const res = Object.keys(rows) // => array of y-positions (type: float)
            .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
            .reduce((acc, cur) => {
                acc.push(rows[cur]);
                return acc;
            }, []);
        return res.filter(this.isProduct);
    }

    getIndexLine(lines, arg) {
        return lines.findIndex(item => item.reduce((acc, cur) => {
            acc.push(cur.text)
            return acc;
        }, []).includes(arg));
    }

    getEndIndex(lines) {
        let endIndex = this.getIndexLine(lines, 'Referencias:');
        if (endIndex === -1) endIndex = this.getIndexLine(lines, 'Forma de Pago:');
        return endIndex;
    }

    isProduct(line) {
        const protos = [
            { x: 5, type: 'string' },
            { x: 8, type: 'string' },
            { x: 21, type: 'int' },
            { x: 25, type: 'float' }
        ];

        const isInRange = (x1, x2, range) => {
            return Math.abs(x1 - x2) <= range;
        }

        const isType = (type1, type2) => {
            let typeParsed = type2;

            if(['int', 'float'].includes(type1)) {
                typeParsed = type2.split(' ')[0];
            }

            if(type1 === 'int') {
                return typeof parseInt(typeParsed) === 'number';
            } else if(type1 === 'float') {
                return typeof parseFloat(typeParsed) === 'number';
            } else {
                return typeof typeParsed === 'string';
            }
        }

        const isMatch = (obj, line) => line.find(
            item => isInRange(obj.x, item.x, 2) && isType(obj.type, item.text)
        );

        return protos.reduce(function (acc, cur) { return acc ? isMatch(cur, line) : acc }, true)
    }

    saveProducts() { 
        const id = this.id;
        const lines = this.orderAndJoin();
        if (lines.length === 0) return;
        // console.log(lines)

        const toProduct = (line) => {
            const proto = {
                code: {x: 5, type:'string'},
                description: {x: 8, type:'string'},
                quantity: {x:21, type:'int'},
                price: {x:25, type:'float'}
            }
            const toNumber = (text) => text.split('.').join('').replace(',', '.');
            return Object.keys(proto).reduce((acc, cur) => {
                const section = line.find(item => Math.abs(item.x - proto[cur].x) < 2);
                if(proto[cur].type === 'int') {
                    acc[cur] = parseInt(toNumber(section.text));
                } else if(proto[cur].type === 'float') {
                    acc[cur] = parseFloat(toNumber(section.text));
                } else {
                    acc[cur] = section.text;
                }
                return acc;
            }, {})
        };

        const products = lines.map(toProduct);
        //set save logic here
        // console.log(products);
        // console.log(this.entity, this.id)
        strapi.query(this.entity).update({ id }, { products }).then(res=>res);
    }

    callbackFuction(err, item) {
        try{
            if (!item || item.page) {
              // end of file, or page
              if (item && item.page >= 2) {
                    this.shouldContinue = false;
              } else {
                    this.saveProducts();
              }
              // throw new Error('should end');
            } else if (item.text) {
              // accumulate text items into rows object, per line
              // console.log(fixed(item.y, 1), item.text);
              let match = Object.keys(this.rows).find(
                    row => Math.abs(row - item.y) < 0.20
              );
              if (!match)
                    match = item.y;
              if(this.shouldContinue)
                    (this.rows[match] = this.rows[match] || []).push(item);
            }
        }catch (err){
            console.error(err)
        }
    }

    init() {
        new PdfReader().parseFileItems(
          this.filePath,
          this.callbackFuction.bind(this)
        );
    }
}

async function updateData(id, name, entity) {
    const parser = new PdfParser(name, entity, id);
}

const getCodes = async (entity) => {
    const entities = await strapi.query(entity).find();
    return entities.map(_ => _.code);
}

module.exports = {
    updateData,
    getCodes
}