'use strict';

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

const findOrCreate = async ({rut, document: doc}) => {
	const cleanRut = clean(rut);
	const receiverRut = await getReceiverCleanRut(doc);
	let sender = await strapi.query('rut-info').findOne({
		rut: cleanRut
	});
	let receiver = await strapi.query('rut-info').findOne({
		rut: cleanRut
	});

	if (!sender || !receiver){
		
	}

	return {
		sender,
		receiver
	}
};

module.exports = {
	findOrCreate
};
