const tags = {
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
    references: {
      check: 'input[name="REF_SI_NO"]',
      type: 'select[name="EFXP_TPO_DOC_REF_00"]',
      ind: 'input[name="EFXP_IND_GLOBAL_00"]',
      ref: 'input[name="EFXP_FOLIO_REF_00"]',
      dd: 'select[name="cbo_dia_boleta_ref_0"]',
      mm: 'select[name="cbo_mes_boleta_ref_0"]',
      yyyy: 'select[name="cbo_anio_boleta_ref_0"]',
      option: 'select[name="EFXP_CODIGO_REF_00"]',
      reason: 'input[name="EFXP_RAZON_REF_00"]'
    },
    acceptBody: {
      status: 'select[name="ESTADO"]',
      email: 'input[name="MAIL"]',
      comment: 'textarea[name="MOTIVO"]',
      enclosure: 'textarea[name="RECINTO"]'
    },
    sendBtn: 'button[name="Button_Update"]',
    sign: 'input[name="btnSign"]',
    certificate: 'input[id="myPass"]',
    finalize: 'button[id="btnFirma"]'
  }

  module.exports = tags;