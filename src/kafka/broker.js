/** @import { NodeAPI } from 'node-red' */
/** @import { KafkaConfig } from 'kafkajs' */

// Disable KafkaJS partitioner warning */
process.env.KAFKAJS_NO_PARTITIONER_WARNING = 1;

/**
 * Module to control the access to the broker.
 * @param {NodeAPI} RED Root node to register the components
 */
module.exports = function (RED) {
  const { Kafka, logLevel } = require('kafkajs');
  const fs = require('fs');

  const dictLogLevel = {
    none: logLevel.NOTHING,
    error: logLevel.ERROR,
    warn: logLevel.WARN,
    info: logLevel.INFO,
    debug: logLevel.DEBUG,
  };

  exports.KafkajsBrokerNode = function(config) {
    RED.nodes.createNode(this, config);

    /** @type {KafkaConfig} */
    this.options = {
      brokers: config.brokers.replace(' ', '').split(','),
      clientId: config.clientid,
      logLevel: dictLogLevel[config.loglevel],
      connectionTimeout: parseInt(config.connectiontimeout),
      requestTimeout: parseInt(config.requesttimeout),
      retry: null,
      ssl: null,
      sasl: null,
    };

    if (config.advancedretry) {
      Object.assign(this.options.retry, {
        maxRetryTime: parseInt(config.maxretrytime),
        initialRetryTime: parseInt(config.initialretrytime),
        factor: parseFloat(config.factor),
        multiplier: parseInt(config.multiplier),
        retries: parseInt(config.retries),
      });
    }

    if (config.auth == 'tls') {
      Object.assign(this.options.ssl, {
        ca: [fs.readFileSync(config.tlscacert, 'utf-8')],
        cert: fs.readFileSync(config.tlsclientcert, 'utf-8'),
        key: fs.readFileSync(config.tlsprivatekey, 'utf-8'),
        passphrase: config.tlspassphrase,
      });
    } else if (config.auth == 'sasl') {
      this.options.ssl = config.saslssl;

      Object.assign(this.options.sasl, {
        mechanism: config.saslmechanism || 'plain',
        username: this.credentials.saslusername,
        password: this.credentials.saslpassword,
      });
    }

    /** @type {Kafka} */
    this.server = new Kafka(this.options);
  }

  RED.nodes.registerType('node-red-kafkajs-broker', exports.KafkajsBrokerNode);
};
