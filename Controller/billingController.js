/**
 * Created by ashishprasher on 23/11/17.
 */



const Promise                       = require('bluebird');
const _                             = require('underscore');
const RESP                          = require('../Config').responseMessages;
const utils                         = require('../Controller/utils');
const logger                        = require('../Routes/logging');
const constants                     = require('../Utils/constants');
const UniversalFunc                 = require('../Utils/universalFunctions');
const sendEmail                     = require('../Notification/email').sendEmailToUser;
const businessService               = require('../services/business');
const authService                   = require('../services/auth');
const billingService                = require('../services/billing');
const agentService                  = require('../services/agent');


exports.startAgentPlan              = startAgentPlan;
exports.addCard                     = addCard;
exports.getCard                     = getCard;
exports.deductPayment               = deductPayment;
exports.editAgentPlan               = editAgentPlan;
exports.getBillingPlans             = getBillingPlans;
exports.getTransactions             = getTransactions;
exports.runBilling                  = runBilling;
exports.runDayEndTask               = runDayEndTask;
exports.getAllTransactions          = getAllTransactions;
exports.getBillingProperties        = getBillingProperties;


function startAgentPlan(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let opts  = {};
    opts.auth_user_id = payload.userInfo.auth_user_id;
    opts.access_token = payload.access_token;
    opts.business_id  = payload.businessInfo.business_id;
    opts.stripe_token = payload.stripe_token;


    // validations
    let existingBillingPlan = yield billingService.getBillingPlanDetails(logHandler, { business_id : opts.business_id });
    if(!_.isEmpty(existingBillingPlan)) {
      throw new Error("business is already subscribed with a billing plan");
    }

    // disable to be disable agents
    if(!_.isEmpty(payload.to_be_disabled_agent_ids)) {
      let toBeDisabledAgentSet = new Set(payload.to_be_disabled_agent_ids);
      if(toBeDisabledAgentSet.has(payload.userInfo.user_id)) {
        throw new Error("You can't disable yourself");
      }
      yield agentService.disableAgents(logHandler, { business_id : opts.business_id, user_ids : payload.to_be_disabled_agent_ids });
    }

    // revoke to be revoked invitations
    if(!_.isEmpty(payload.to_be_revoked_invite_ids)) {
      yield agentService.revokeInvitations(logHandler, { business_id : opts.business_id, invite_ids : payload.to_be_revoked_invite_ids });
    }

    let activeAgentsAndInvitesCount = yield agentService.getActiveAgentsAndInvitesCount(logHandler, { business_id : payload.businessInfo.business_id });
    if(activeAgentsAndInvitesCount > payload.agent_count) {
      throw new Error("Agent count can't be less than current active agents & invites, Please disable/revoke some Agents and Retry");
    }


    // add card
    let authServerResponse = yield authService.addCard(logHandler, opts);
    if(authServerResponse.status == 200) {
      let opts = {
        user_id     : payload.userInfo.user_id,
        business_id : payload.businessInfo.business_id,
        activity    : "card added : " + payload.stripe_token
      };
      businessService.addBusinessActivity(logHandler, opts);
    } else {
      throw new Error("Invalid card!");
    }


    // add plan
    let properties = yield billingService.getBillingProperties(logHandler, opts.business_id);
    let billingObject = {
      business_id          : payload.businessInfo.business_id,
      selected_agent_count : payload.agent_count,
      current_month_quota  : payload.agent_count,
      per_agent_cost       : properties.per_agent_cost
    };
    yield billingService.insertBillingPlan(logHandler, billingObject);
    yield billingService.updateTrialExpiryDate(logHandler, { business_id : payload.businessInfo.business_id, expiry_date : null });

    // new plan mail
    // sendEmail('SIMPLE_MAIL_TEXT',{}, payload.userInfo.email , "subject");
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function getBillingPlans(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let plan = yield billingService.getBillingPlanDetails(logHandler, { business_id : payload.businessInfo.business_id });
    if(!_.isEmpty(plan)) {
      plan = plan[0];
    }
    return { plan : plan };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function addCard(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let opts  = {};
    opts.auth_user_id = payload.userInfo.auth_user_id;
    opts.access_token = payload.access_token;
    opts.business_id  = payload.businessInfo.business_id;
    opts.stripe_token = payload.stripe_token;
    let authServerResponse = yield authService.addCard(logHandler, opts);

    if(authServerResponse.status == 200) {
      let opts = {
        user_id     : payload.userInfo.user_id,
        business_id : payload.businessInfo.business_id,
        activity    : "card added : " + payload.stripe_token
      };
      businessService.addBusinessActivity(logHandler, opts);
    }
    return authServerResponse;
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.CARD_ADDED, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}

function getCard(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let opts  = {};
    opts.auth_user_id = payload.userInfo.auth_user_id;
    opts.access_token = payload.access_token;
    return yield authService.getCard(logHandler, opts);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function deductPayment(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      return yield billingService.deductPayment(logHandler, payload);
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function editAgentPlan(logHandler, payload, res) {
  Promise.coroutine(function* () {
    // disable to be disable agents
    if(!_.isEmpty(payload.to_be_disabled_agent_ids)) {
      let toBeDisabledAgentSet = new Set(payload.to_be_disabled_agent_ids);
      if(toBeDisabledAgentSet.has(payload.userInfo.user_id)) {
        throw new Error("You can't disable yourself");
      }
      yield agentService.disableAgents(logHandler, { business_id : payload.businessInfo.business_id, user_ids : payload.to_be_disabled_agent_ids });
    }

    // revoke to be revoked invitations
    if(!_.isEmpty(payload.to_be_revoked_invite_ids)) {
      yield agentService.revokeInvitations(logHandler, { business_id : payload.businessInfo.business_id, invite_ids : payload.to_be_revoked_invite_ids });
    }

    let activeAgentsAndInvitesCount = yield agentService.getActiveAgentsAndInvitesCount(logHandler, { business_id : payload.businessInfo.business_id });
    if(activeAgentsAndInvitesCount > payload.agent_count) {
      throw new Error("Agent count can't be less than current active agents & invites, Please disable/revoke some Agents and Retry");
    }

    let opts = {
      business_id          : payload.businessInfo.business_id,
      selected_agent_count : payload.agent_count,
    };
    yield billingService.updateBillingPlan(logHandler, opts);
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DEFAULT, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}



function getTransactions(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let transactions = yield billingService.getTransactions(logHandler, { business_id : payload.businessInfo.business_id });
    return { transactions : transactions };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}


function runBilling(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      let opts = {};

      if(utils.compareDate(new Date(payload.year, payload.month - 1, 1), new Date()) == 1) {
        throw new Error("Bill for this month can't be processed now!!");
      }

      if(payload.business_id) {
        opts.business_id = payload.business_id;
      }

      sendEmail(constants.emailType.SIMPLE_TEXT_MAIL, { mail_text : "Billing Started " + utils.getCurrentTime() }, constants.techSupportMail, "Billing Monthly (" + utils.getEnv() + ")");

      let businessPlans = yield billingService.getAllBusinessesWithPlans(logHandler, opts);
      for (let i = 0; i < businessPlans.length; i++) {
        try {
          payload.businessPlan = businessPlans[i];
          yield billingService.runBillingForBusiness(logHandler, payload);
        } catch (err) {
          logger.error(logHandler, "BILLING ERROR for business : " + businessPlans[i].business_id, err);
        }
      }

      sendEmail(constants.emailType.SIMPLE_TEXT_MAIL, { mail_text : "Billing Finished " + utils.getCurrentTime() }, constants.techSupportMail, "Billing Monthly (" + utils.getEnv() + ")");
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function runDayEndTask(logHandler, payload) {
  return new Promise((resolve, reject) => {
    Promise.coroutine(function* () {
      sendEmail(constants.emailType.SIMPLE_TEXT_MAIL, { mail_text : "Day End Task Started "  + utils.getCurrentTime() }, constants.techSupportMail, "Billing Daily (" + utils.getEnv() + ")");

      // charging newly created businesses
      let newlyCreatedBillingPlans = yield billingService.getBillingPlansCreatedAfter(logHandler, { plan_created_after : payload.plan_created_after });
      logger.trace(logHandler, "total created businesses after " + payload.plan_created_after + " : " + newlyCreatedBillingPlans.length);


      payload.plan_created_after = new Date(payload.plan_created_after);
      let transaction_name = constants.monthName[payload.plan_created_after.getMonth() + 1] + ", " + payload.plan_created_after.getFullYear() + " Bill";

      for (let i = 0; i < newlyCreatedBillingPlans.length; i++) {
        try {
          logger.trace(logHandler, "business plan created for " +  newlyCreatedBillingPlans[i].business_id);
          let alreadyBilled = yield billingService.getTransactions(logHandler, { transaction_name : transaction_name, business_id : newlyCreatedBillingPlans[i].business_id });
          if(!_.isEmpty(alreadyBilled)) {
            throw new Error("business is already billed");
          }

          let planCreatedDate     = new Date(newlyCreatedBillingPlans[i].created);
          let proratedBillingDays = utils.getRemainingProratedDaysInMonth(planCreatedDate);
          let billing_amount = newlyCreatedBillingPlans[i].current_month_quota * proratedBillingDays * newlyCreatedBillingPlans[i].per_agent_cost;

          let opts = {
            business_id      : newlyCreatedBillingPlans[i].business_id,
            billing_amount   : billing_amount,
            transaction_type : constants.billingTransactionType.BASEPLAN,
            transaction_name : transaction_name,
            comment          : "1st Month Bill (" + newlyCreatedBillingPlans[i].current_month_quota + " agents)",
            agent_count      : newlyCreatedBillingPlans[i].current_month_quota,
            bill_start_date  : planCreatedDate
          };


          yield billingService.deductPayment(logHandler, opts);
        } catch (e) {
          logger.error(logHandler, "DayEndTask2 ERROR for business : " + newlyCreatedBillingPlans[i].business_id, e);
        }
      }


      // charging businesses whose agent count has increased
      let updatedBusinesses = yield billingService.getBusinessesHavingSelectedAgentMoreThanQuota(logHandler, {});
      logger.trace(logHandler, "total business which increased agent count : " + updatedBusinesses.length);

      for (let i = 0; i < updatedBusinesses.length; i++) {
        try {
          logger.trace(logHandler, "business agent count " + updatedBusinesses[i].selected_agent_count + ", current_month_quota " + updatedBusinesses[i].current_month_quota);

          let proratedBillingDays = utils.getRemainingProratedDaysInMonth(new Date());
          let increasedAgentCount = updatedBusinesses[i].selected_agent_count - updatedBusinesses[i].current_month_quota;
          let billing_amount = increasedAgentCount * proratedBillingDays * updatedBusinesses[i].per_agent_cost;

          let opts = {
            business_id      : updatedBusinesses[i].business_id,
            billing_amount   : billing_amount,
            transaction_type : constants.billingTransactionType.AGENT_COUNT_INCREASED,
            transaction_name : "Agents increased from " + updatedBusinesses[i].current_month_quota + " to " + updatedBusinesses[i].selected_agent_count,
            comment          : "Agents increased from " + updatedBusinesses[i].current_month_quota + " to " + updatedBusinesses[i].selected_agent_count,
            agent_count      : updatedBusinesses[i].selected_agent_count - updatedBusinesses[i].current_month_quota,
            bill_start_date  : new Date()
          };

          yield billingService.deductPayment(logHandler, opts);
          yield billingService.setQuotaEqualToSelectAgentCount(logHandler, updatedBusinesses[i].business_id);
        } catch (e) {
          logger.error(logHandler, "DayEndTask1 ERROR for business : " + updatedBusinesses[i].business_id, e);
        }
      }

      sendEmail(constants.emailType.SIMPLE_TEXT_MAIL, { mail_text : "Day End Task Finished " + utils.getCurrentTime() }, constants.techSupportMail, "Billing Daily (" + utils.getEnv() + ")");
    })().then(
      (data) => { resolve(data); },
      (error) => { reject(error); }
    );
  });
}

function getAllTransactions(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let transactions = yield billingService.getAllTransactions(logHandler, { business_id : payload.business_id });

    return { transactions : transactions };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}



function getBillingProperties(logHandler, payload, res) {
  Promise.coroutine(function* () {
    let properties        = yield billingService.getBillingProperties(logHandler, payload.businessInfo.business_id);
    let registeredAgents  = yield agentService.getRegisteredAgents(logHandler, { business_id : payload.businessInfo.business_id });
    let invitedAgents     = yield agentService.getInvitedAgents(logHandler, { business_id : payload.businessInfo.business_id });
    let activeAgents      = [];
    for (let i = 0; i < registeredAgents.length; i++) {
      if(registeredAgents[i].status == constants.userStatus.ENABLE) {
        activeAgents.push(registeredAgents[i]);
      }
    }

    return {
      properties    : properties,
      activeAgents  : activeAgents,
      invitedAgents : invitedAgents
    };
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
    UniversalFunc.sendSuccess(RESP.SUCCESS.DATA_FETCHED_SUCCESSFULLY, data, res);
  }, (error) => {
    logger.error(logHandler, error);
    UniversalFunc.sendError(error, res);
  });
}
