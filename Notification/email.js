const nodeMailerModule        = require('nodemailer');
const smtpTransport           = require('nodemailer-smtp-transport');
const Handlebars              = require('handlebars');
const Config                  = require('../Config');

const transporter             = nodeMailerModule.createTransport(smtpTransport(Config.emailConfig.smtpConfig.Mailgun));
const emailTemplates          = require('../Config/emailTemplates');
const logger                  = require('../Routes/logging');
const constants               = require('../Utils/constants');

const logHandler = {
  apiModule  : "server",
  apiHandler : "email"
};


exports.sendEmailToUser = function (emailType, emailVariables, emailId, emailSubject) {
  let mailOptions = {
    from    : "Fugu Support <support@email.fuguchat.com>",
    to      : emailId,
    subject : emailSubject,
    html    : null
  };
  logger.trace(logHandler, emailType, emailVariables, emailId, emailSubject);

  switch (emailType) {
    case constants.emailType.REQUEST_MAIL:
      mailOptions.html = renderMessageFromTemplateAndVariables(emailTemplates.requestEmail, emailVariables);
      break;
    case constants.emailType.AGENT_INVITATION:
      mailOptions.html = renderMessageFromTemplateAndVariables(emailTemplates.agentInvitation, emailVariables);
      break;
    case constants.emailType.RESELLER_SIGNUP:
      mailOptions.html = renderMessageFromTemplateAndVariables(emailTemplates.resellerSignup, emailVariables);
      break;
    case constants.emailType.RESET_PASSWORD:
      mailOptions.html = renderMessageFromTemplateAndVariables(emailTemplates.resetPassword, emailVariables);
      break;
    case constants.emailType.WELCOME_MAIL:
      mailOptions.html = renderMessageFromTemplateAndVariables(emailTemplates.welcomeEmail, emailVariables);
      break;
    case constants.emailType.SIMPLE_TEXT_MAIL:
      mailOptions.html = renderMessageFromTemplateAndVariables(emailTemplates.simpleTextMail, emailVariables);
      break;
    default:
      logger.error(logHandler, "No case matched while sending mail with : " + emailType);
      return;
  }
  sendMailViaTransporter(mailOptions, (err, res) => {
  });
};


function renderMessageFromTemplateAndVariables(templateData, variablesData) {
  return Handlebars.compile(templateData)(variablesData);
}

function sendMailViaTransporter(mailOptions, cb) {
  transporter.sendMail(mailOptions, (error, info) => {
    if(error) { logger.error(logHandler, 'Mail Sent Callback Error:', error); }
    logger.info(logHandler, 'Mail Sent ', info);
  });
  cb();
}
