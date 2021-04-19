exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('users').del()
    .then(function () {
      // Inserts seed entries
      return knex('payment_types').insert([
        { name: 'J-Fenix' },
        { name: 'Transferencia Bancaria' },
        { name: 'Zelle' },
        { name: 'Bank of America' },
        { name: 'Dolares Efectivo' },
        { name: '100% BANCO' },
        { name: 'ABN AMRO BANK' },
        { name: 'BANCAMIGA BANCO MICROFINANCIERO, C.A.' },
        { name: 'BANCO ACTIVO BANCO COMERCIAL, C.A.' },
        { name: 'BANCO AGRICOLA' },
        { name: 'BANCO BICENTENARIO' },
        { name: 'BANCO CARONI, C.A. BANCO UNIVERSAL' },
        { name: 'BANCO DE DESARROLLO DEL MICROEMPRESARIO' },
        { name: 'BANCO DE VENEZUELA S.A.I.C.A.' },
        { name: 'BANCO DEL CARIBE, C.A.' },
        { name: 'BANCO DEL PUEBLO SOBERANO, C.A.' },
        { name: 'BANCO DEL TESORO' },
        { name: 'BANCO ESPIRITO SANTO, S.A.' },
        { name: 'BANCO EXTERIOR, C.A.' },
        { name: 'BANCO INDUSTRIAL DE VENEZUELA.' },
        { name: 'BANCO INTERNACIONAL DE DESARROLLO, C.A.' },
        { name: 'BANCO MERCANTIL, C.A.' },
        { name: 'BANCO NACIONAL DE CREDITO' },
        { name: 'BANCO OCCIDENTAL DE DESCUENTO.' },
        { name: 'BANCO PLAZA' },
        { name: 'BANCO PROVINCIAL BBVA' },
        { name: 'BANCO VENEZOLANO DE CREDITO, S.A.' },
        { name: 'BANCRECER S.A. BANCO DE DESARROLLO' },
        { name: 'BANFANB' },
        { name: 'BANGENTE' },
        { name: 'BANPLUS BANCO COMERCIAL, C.A' },
        { name: 'CITIBANK' },
        { name: 'CORP BANCA.' },
        { name: 'DELSUR BANCO UNIVERSAL' },
        { name: 'FONDO COMÚN' },
        { name: 'INSTITUTO MUNICIPAL DE CRÉDITO POPULAR' },
        { name: 'MIBANCO BANCO DE DESARROLLO, C.A' },
        { name: 'SOFITASA' }
      ]);
    });
};
