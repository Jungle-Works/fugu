
var smtpConfig = {
  Mandrill : {
    host : "smtp.mandrillapp.com",
    port : 587, // port for secure SMTP
    auth : {
      user : "<user-name>",
      pass : "<user-password>"
    },
    senderEmail : "email"
  },
  Mailgun : {
    host : "smtp.mailgun.org",
    port : 587, // port for secure SMTP
    auth : {
      user : "<user-name>",
      pass : "<user-password>"
    },
    senderEmail : "email"
  }
};
module.exports = {
  smtpConfig : smtpConfig
};
