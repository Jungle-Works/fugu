

/**
 * New Relic agent configuration.
 *
 * See lib/config.default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
const config = require('config');

const server_port = process.env.PORT || config.get('PORT');
const app_name = 'app name ' + process.env.NODE_ENV + " - " + server_port;

exports.config = {
  /**
   * Array of application names.
   */
  app_name    : [app_name],
  /**
   * Your New Relic license key.
   */
  license_key : 'newrelickey',
  logging     : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'info'
  },
  rules : {
    ignore : [
      '\/meta\/'
    ]
  }
};
