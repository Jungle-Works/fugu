/**
 * Created by ashishprasher on 27/11/17.
 */

const Promise                       = require('bluebird');
const CronJob                       = require('cron').CronJob;
const logger                        = require('../Routes/logging');
const BillingController             = require('../Controller/billingController');
const UniversalFunc                 = require('../Utils/universalFunctions');
const utils                         = require('../Controller/utils');

const apiModule                     = "cron";

// cron help
// Seconds: 0-59
// Minutes: 0-59
// Hours: 0-23
// Day of Month: 1-31
// Months: 0-11
// Day of Week: 0-6


// var CronJob = require('cron').CronJob;
// var job = new CronJob(new Date(), function() {
//     /* runs once at the specified date. */
//   }, function () {
//     /* This function is executed when the job stops */
//   },
//   true, /* Start the job right now */
//   timeZone /* Time zone of this job. */
// );


// try {
//   new CronJob('i0 13 */2 * * *', function() {
//     console.log('this should not be printed');
//   })
// } catch(ex) {
//   console.log("cron pattern not valid");
// }

// 0 30 23 * * *
let dayEndTask  = new CronJob('0 30 23 * * *', (() => {
  let logHandler = {
    uuid       : UniversalFunc.generateRandomString(10),
    apiModule  : apiModule,
    apiHandler : "dayEndTask"
  };
  Promise.coroutine(function* () {
    logger.info(logHandler, "______________dayEndTask Started_______________");

    let date = new Date();
    date.setDate(date.getDate() - 1);

    let payload = {
      plan_created_after : utils.getDate(date)
    };

    if(utils.isEnv('production') || utils.isEnv('test')) {
      yield BillingController.runDayEndTask(logHandler, payload);
    }


    logger.info(logHandler, "______________dayEndTask Finished_______________");
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
  }, (error) => {
    logger.error(logHandler, error);
  });
}), (() => {
    console.log("______________dayEndTask Stopped_______________");
  }), false, 'Asia/Calcutta');


// 0 0 1 1 * *
let monthEndTask  = new CronJob('0 0 1 1 * *', (() => {
  let logHandler = {
    uuid       : UniversalFunc.generateRandomString(10),
    apiModule  : apiModule,
    apiHandler : "dayEndTask"
  };
  Promise.coroutine(function* () {
    logger.info(logHandler, "______________monthEndTask Started_______________");

    let date = new Date();
    let opts = {
      month : date.getMonth() + 1,
      year  : date.getFullYear()
    };
    if(utils.isEnv('production') || utils.isEnv('test')) {
      yield BillingController.runBilling(logHandler, opts);
    }
    logger.info(logHandler, "______________monthEndTask Finished_______________");
  })().then((data) => {
    logger.trace(logHandler, { RESPONSE : data });
  }, (error) => {
    logger.error(logHandler, error);
  });
}), (() => {
    console.log("______________monthEndTask Stopped_______________");
  }), false, 'Asia/Calcutta');
