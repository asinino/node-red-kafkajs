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

  function KafkajsBrokerNode(config) {
    RED.nodes.createNode(this, config);

    let node = this;
    let options = new Object();

    // if (node.credentials && !node.credentials.accessToken && config.apiKey) {
    //   RED.nodes.addCredentials(node.id, { accessToken: config.apiKey });
    // }

    /** @type {KafkaConfig} */
    options = {
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
      options.retry = options.retry || {};
      Object.assign(options.retry, {
        maxRetryTime: parseInt(config.maxretrytime),
        initialRetryTime: parseInt(config.initialretrytime),
        factor: parseFloat(config.factor),
        multiplier: parseInt(config.multiplier),
        retries: parseInt(config.retries),
      });
    }

    if (config.auth == 'tls') {
      options.ssl = options.ssl || {};
      Object.assign(options.ssl, {
        ca: config.tlscacert? fs.readFileSync(config.tlscacert, 'utf-8') : undefined,
        cert: config.tlsclientcert? fs.readFileSync(config.tlsclientcert, 'utf-8') : undefined,
        key: config.tlsprivatekey? fs.readFileSync(config.tlsprivatekey, 'utf-8') : undefined,
        passphrase: config.tlspassphrase?? undefined
      });
    } else if (config.auth == 'sasl') {
      options.ssl = config.saslssl ? { rejectUnauthorized: !config.saslselfsign } : false;

      options.sasl = options.sasl || {};
      Object.assign(options.sasl, {
        mechanism: config.saslmechanism || 'plain',
        username: node.credentials.saslusername,
        password: node.credentials.saslpassword,
      });
    }

    node.options = options;
    /** @type {Kafka} */
    node.server = new Kafka(node.options);
  }

  RED.nodes.registerType('node-red-kafkajs-broker', KafkajsBrokerNode, {
    credentials: {
      saslusername: {type:"text"},
      saslpassword: {type:"password"}
    }
  });
};
