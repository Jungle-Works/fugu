/**
 * Created by ashishprasher on 24/11/17.
 */



const Promise                               = require('bluebird');
const _                                     = require('underscore');
const dbHandler                             = require('../database').dbHandler;
const sendEmail                             = require('../Notification/email').sendEmailToUser;
const constants                             = require('../Utils/constants');
const businessService                       = require('../services/business');
const authService                           = require('../services/auth');
const utilityService                        = require('../services/utility');
const utils                                 = require('../Controller/utils');
const logger                                = require('../Routes/logging');




exports.insertBillingPlan                             = insertBillingPlan;
exports.updateBillingPlan                             = updateBillingPlan;
exports.getBillingPlanDetails                         = getBillingPlanDetails;
exports.recordBillingTransaction                      = recordBillingTransaction;
exports.getAllBusinessesWithPlans                     = getAllBusinessesWithPlans;
exports.deductPayment                                 = deductPayment;
exports.setQuotaEqualToSelectAgentCount               = setQuotaEqualToSelectAgentCount;
exports.getTransactions                               = getTransactions;
exports.getBusinessesHavingSelectedAgentMoreThanQuota = getBusinessesHavingSelectedAgentMoreThanQuota;
exports.insertTrialExpiryDate                         = insertTrialExpiryDate;
exports.getTrialExpiryDate                            = getTrialExpiryDate;
exports.updateTrialExpiryDate                         = updateTrialExpiryDate;
exports.getAllTransactions                            = getAllTransactions;
exports.runBillingForBusiness                         = runBillingForBusiness;
exports.getBillingPlansCreatedAfter                   = getBillingPlansCreatedAfter;
exports.getBillingProperties                          = getBillingProperties;
exports.editProperties                                = editProperties;


function insertBillingPlan(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO billing_plans SET ? `;

    let queryObj = {
      query : query,
      args  : payload,
      event : "insertBillingPlan"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateBillingPlan(logHandler, payload) {
  return new Promise((resolve, reject) => {
    if(!payload.business_id) {
      return reject(new Error("Invalid business_id"));
    }

    let query = `UPDATE billing_plans SET ? WHERE business_id = ?`;
    let updateObj = {};
    (payload.per_agent_cost)        ? updateObj.per_agent_cost = payload.per_agent_cost : 0;
    (payload.selected_agent_count)  ? updateObj.selected_agent_count = payload.selected_agent_count : 0;
    (payload.current_month_quota)   ? updateObj.current_month_quota = payload.current_month_quota : 0;
    updateObj.updated = new Date();

    let queryObj = {
      query : query,
      args  : [updateObj, payload.business_id],
      event : "updateBillingPlan"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getBillingPlanDetails(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `SELECT per_agent_cost, selected_agent_count, current_month_quota FROM billing_plans WHERE business_id = ?`;

    let queryObj = {
      query : query,
      args  : [payload.business_id],
      event : "getBillingPlanDetails"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function recordBillingTransaction(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = `INSERT INTO billing_transactions SET ? `;
    let transaction = {
      business_id        : payload.business_id,
      transaction_id     : payload.transaction_id,
      transaction_status : payload.transaction_status,
      amount             : payload.amount,
      transaction_type   : payload.transaction_type,
      transaction_name   : payload.transaction_name,
      comment            : payload.comment,
      invoice            : payload.invoice,
      invoice_id         : payload.invoice_id
    };


    let queryObj = {
      query : query,
      args  : transaction,
      event : "recordBillingTransaction"
    };
    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getAllBusinessesWithPlans(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [];
    let query = `SELECT * FROM billing_plans WHERE 1=1 `;

    if(payload.business_id) {
      query += " AND business_id = ? ";
      values.push(payload.business_id);
    }

    let queryObj = {
      query : query,
      args  : values,
      event : "getAllBusinessesWithPlans"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function deductPayment(logHandler, payload) {
  return new Promise((resolve, reject) => {
    // billing amount should be greater than zero
    if(!payload.billing_amount || payload.billing_amount <= 0) {
      throw new Error("billing amount is not valid: " + payload.billing_amount);
    }
    // rounding off to 2 decimal places
    payload.billing_amount  = payload.billing_amount.toFixed(2);

    Promise.coroutine(function* () {
      let businessOwner   = yield businessService.syncAndGetBusinessOwner(logHandler, payload.business_id);
      let opts = {};
      opts.auth_user_id   = businessOwner.auth_user_id;
      opts.access_token   = businessOwner.access_token;
      opts.billing_amount = payload.billing_amount;
      let authResponse    = yield authService.deductPayment(logHandler, opts);

      let transaction = {
        business_id        : payload.business_id,
        transaction_id     : authResponse.transaction_id,
        transaction_status : authResponse.transaction_status,
        amount             : payload.billing_amount,
        transaction_type   : payload.transaction_type,
        transaction_name   : payload.transaction_name,
        comment            : payload.comment
      };

      if(authResponse.transaction_status == 1) {
        let invoiceId       = utils.getInvoiceId(payload.business_id);

        let opts = {
          businessOwner   : businessOwner,
          invoiceId       : invoiceId,
          bill_start_date : payload.bill_start_date,
          agent_count     : payload.agent_count,
          billing_amount  : payload.billing_amount
        };

        let invoiceUrl   = yield createInvoice(logHandler, opts);

        transaction.invoice     = invoiceUrl;
        transaction.invoice_id  = invoiceId;
      }

      yield recordBillingTransaction(logHandler, transaction);


      // payment deduction mail
      // sendEmail('SIMPLE_MAIL_TEXT',{}, businessOwner.email , "subject");

      return authResponse;
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}


function setQuotaEqualToSelectAgentCount(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    let query = "UPDATE billing_plans SET current_month_quota = selected_agent_count WHERE business_id = ?";

    let queryObj = {
      query : query,
      args  : [business_id],
      event : "setQuotaEqualToSelectAgentCount"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getTransactions(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [];
    let query = "SELECT transaction_id, invoice_id, invoice, transaction_type, transaction_name, comment, created, transaction_status, amount FROM billing_transactions WHERE 1=1 ";

    if(payload.business_id) {
      query += " AND business_id = ? ";
      values.push(payload.business_id);
    }
    if(payload.transaction_name) {
      query += " AND transaction_name = ? ";
      values.push(payload.transaction_name);
    }
    if(payload.transaction_status) {
      query += " AND transaction_status = ? ";
      values.push(payload.transaction_status);
    }


    let queryObj = {
      query : query,
      args  : values,
      event : "getTransactions"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getBusinessesHavingSelectedAgentMoreThanQuota(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM billing_plans WHERE selected_agent_count > current_month_quota";

    let queryObj = {
      query : query,
      args  : [],
      event : "getBusinessesHavingSelectedAgentMoreThanQuota"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function insertTrialExpiryDate(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "INSERT INTO billing_trials SET ? ";
    let queryObj = {
      query : query,
      args  : payload,
      event : "insertTrialExpiryDate"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getTrialExpiryDate(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    let query = "SELECT expiry_date FROM billing_trials WHERE business_id = ?";
    let queryObj = {
      query : query,
      args  : [business_id],
      event : "getTrialExpiryDate"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function updateTrialExpiryDate(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "UPDATE billing_trials SET expiry_date = ? WHERE business_id = ?";

    let queryObj = {
      query : query,
      args  : [payload.expiry_date, payload.business_id],
      event : "updateTrialExpiryDate"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function getAllTransactions(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let values = [];
    let query = `SELECT 
                    bt.business_id,
                    bd.business_name,
                    bt.transaction_id,
                    bt.transaction_status,
                    bt.transaction_type,
                    bt.transaction_name,
                    bt.comment,
                    bt.created
                FROM
                    billing_transactions bt
                        LEFT JOIN
                    business_details bd ON bd.business_id = bt.business_id 
                WHERE 1=1 `;

    if(payload.business_id) {
      query += " AND bd.business_id = ?";
      values.push(payload.business_id);
    }

    let queryObj = {
      query : query,
      args  : values,
      event : "getAllTransactions"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}


function runBillingForBusiness(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let transaction_name = constants.monthName[payload.month] + ", " + payload.year + " Bill";

      let businessTransaction = yield getTransactions(logHandler, { transaction_name : transaction_name, business_id : payload.businessPlan.business_id, transaction_status : 1 });
      if(!_.isEmpty(businessTransaction)) {
        throw new Error("Business already billed for this month");
      }

      // set current month quota equal to select agent count
      if(payload.businessPlan.selected_agent_count < payload.businessPlan.current_month_quota) {
        yield updateBillingPlan(logHandler, { current_month_quota : payload.businessPlan.selected_agent_count, business_id : payload.businessPlan.business_id });
        payload.businessPlan.current_month_quota = payload.businessPlan.selected_agent_count;
      }

      let amount = payload.businessPlan.current_month_quota * payload.businessPlan.per_agent_cost;
      let firstDateOfMonth = new Date();
      firstDateOfMonth.setDate(1);
      let deductObject = {
        business_id      : payload.businessPlan.business_id,
        billing_amount   : amount,
        comment          : "monthly bill",
        transaction_type : constants.billingTransactionType.BASEPLAN,
        transaction_name : transaction_name,
        bill_start_date  : firstDateOfMonth,
        agent_count      : payload.businessPlan.current_month_quota
      };
      yield deductPayment(logHandler, deductObject);
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function getBillingPlansCreatedAfter(logHandler, payload) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM billing_plans where created > ?";

    let queryObj = {
      query : query,
      args  : [payload.plan_created_after],
      event : "getBillingPlansCreatedAfter"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

function getBillingProperties(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let defaultProperties   = yield getProperties(logHandler, 0);
      let businessProperties  = yield getProperties(logHandler, business_id);
      _.each(businessProperties, (value, key) => {
        defaultProperties[key] = value;
      });

      return defaultProperties;
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}

function getProperties(logHandler, business_id) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM billing_properties WHERE business_id = ?";

    let queryObj = {
      query : query,
      args  : [business_id],
      event : "getProperties"
    };

    dbHandler.executeQuery(logHandler, queryObj).then((result) => {
      let propertyToValue = {};
      for (let i = 0; i < result.length; i++) {
        propertyToValue[result[i].property] = result[i].value;
      }
      resolve(propertyToValue);
    }, (error) => {
      reject(error);
    });
  });
}


function createInvoice(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let date = new Date();

      let variables = {
        companyName              : payload.businessOwner.business_name,
        invoiceNo                : payload.invoiceId,
        invoiceDate              : utils.getDate(date),
        customerName             : payload.businessOwner.full_name,
        companyAddress           : payload.businessOwner.business_address,
        month                    : constants.monthName[date.getMonth() + 1] + ", " + date.getFullYear(),
        duration                 : utils.getBillingDuration(payload.bill_start_date),
        qty                      : payload.agent_count,
        description              : "Agent Based",
        subtotal                 : payload.billing_amount,
        taxPercentage            : 0,
        tax                      : 0,
        creditAdjusted           : 0,
        totalAmount              : payload.billing_amount,
        brandImage               : constants.fuguLogoBase64,
        reseller_company_name    : "Fugu",
        reseller_brand_image     : "",
        reseller_billing_name    : "Socomo Inc.",
        reseller_company_address : "388 Market Street, Suite 1300, San Francisco, CA 94111, USA",
        reseller_company_email   : "support@fuguchat.com"
      };

      let pdf = yield utilityService.createPdf(logHandler, "INVOICE", variables);
      return pdf.url;
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function editProperties(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let allowedProperties = yield exports.getBillingProperties(logHandler, payload.business_id);
      let business_id = payload.businessInfo.business_id;
      let placeHolders = [];
      let values = [];
      _.each(allowedProperties, (value, key) => {
        if(key in payload) {
          placeHolders.push("(" + new Array(3).fill("?").join(',') + ")");
          values = values.concat([business_id, key, payload[key]]);
        }
      });
      if(_.isEmpty(placeHolders)) {
        throw new Error("Invalid Property");
      }

      let placeHolder = placeHolders.join(', ');
      let sql = `REPLACE INTO billing_properties (business_id, property, value) VALUES ${placeHolder} `;
      dbHandler.query(logHandler, "edit business configuration", sql, values, (err, response) => {
        if(err) {
          throw err;
        }
        return {};
      });
    })().then((data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
  });
}
