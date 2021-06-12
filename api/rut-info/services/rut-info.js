'use strict';

const { sanitizeEntity } = require('strapi-utils');
const clean = text => text.split('.').join('');
const getReceiverRut = doc => doc.receiver.rut;

const getReceiverCleanRut = async (doc) => {
	const {
		rut,
		dv
	} = getReceiverRut(doc);
	const cleanRut = clean(rut);
	return `${cleanRut}-${dv}`;
}

const saveSender = async (params, rut) => {
	if (typeof params.concept === 'string') {
		params.concept = [{
			value:params.concept,
			text:params.concept
		}]
	}
	const info = await strapi.services['rut-info'].create({
		rut,
		...params
	})

	return info;
}

const saveReceiver = async (params, rut) => {
	const info = await strapi.services['rut-info'].create({
		...params,
		rut
	})

	return info;
}

const toSender = (sender) => {
	const erase = ['contact', 'purchaseType'];
	return Object.keys(sanitizeEntity(sender, {model: strapi.models['rut-info']})).reduce(
		(acc, cur) => {
			if(!erase.includes(cur)){
				acc[cur] = sender[cur];
			}
			return acc;
		},
		{}
	)
};

const toReceiver = (receiver) => {
	const erase = ['saleType', 'phone', 'email', 'economicActivity'];
	const result = Object.keys(sanitizeEntity(receiver, {model: strapi.models['rut-info']})).reduce(
		(acc, cur) => {
			if(!erase.includes(cur)){
				acc[cur] = receiver[cur];
			}
			return acc;
		},
		{}
	);
	const splitedRut = result.rut.split('-');
	result.rut = {
		rut: splitedRut[0],
		dv: splitedRut[1]
	};
	return result;
};

const findOrCreate = async ({rut, document: doc, getDocumentReceiver, args}) => {
	const cleanRut = clean(rut);
	const receiverRut = await getReceiverCleanRut(doc);
	let sender = await strapi.query('rut-info').findOne({
		rut: cleanRut
	});
	let receiver = await strapi.query('rut-info').findOne({
		rut: receiverRut
	});

	if (!sender || !receiver){
		const result = await getDocumentReceiver(args, doc);
		console.log(result.receiver)
		if (!sender) sender = await saveSender(result.sender, cleanRut);
		if (!receiver) receiver = await saveReceiver(result.receiver, receiverRut);
	}

	return {
		sender: toSender(sender),
		receiver: toReceiver(receiver)
	}
};

module.exports = {
	findOrCreate
};
