/** @import { Node, NodeAPI, NodeInitializer } from 'node-red' */
/** @import { Consumer } from 'kafkajs' */
/** @import { KafkajsBrokerNode } from './broker' */

/**
 * Module to control the access to the broker.
 * @type {NodeInitializer}
 * @param {NodeAPI} RED Root node to register the components
 */
module.exports = function (RED) {
  const os = require('os');
  const crypto = require('node:crypto');

  /**
   * @typedef {Object} KafkajsConsumerNode
   * @extends {Node}
   * */
  function KafkajsConsumerNode(config) {
    //  * @property {Consumer} consumer
    /** 
     * @type {KafkajsConsumerNode} 
     * @extends {Node}
     * */
    const node = this;

    RED.nodes.createNode(this, config);

    /** @type {Consumer} */
    this.consumer = null;

    /** @type {KafkajsBrokerNode} */
    const broker = RED.nodes.getNode(config.broker);
    if (!broker) {
      node.status({ fill: 'red', shape: 'ring', text: 'Broker is missing.' });
      return;
    }

    const consumerOptions = {
      /** @type {string} */
      groupId: config.groupid ? config.groupid : 'kafka_js_' + os.hostname() + '_' + crypto.randomBytes(4).toString('hex'),
    };

    const subscribeOptions = {
      /** @type {string} */
      topic: config.topic,
    };

    /**
     * Deserializes the message payload or key to a buffer.
     * @param {Buffer} msg The message received from the broker.
     * @param {string} toType The type inside the Buffer to convert the message from.
     * @returns {object | string | number | bigint} The message as the requested type.
     */
    function convertMessage(msg, toType) {
      if (!Buffer.isBuffer(msg)) {
        return msg;
      }

      try {
        if (toType === 'json') {
          return JSON.parse(msg.toString());
        } else if (toType === 'string') {
          return msg.toString();
        } else if (toType === 'boolean') {
          return msg.readUInt8() != 0;
        } else if (toType === 'int8') {
          return msg.readInt8();
        } else if (toType === 'int16be') {
          return msg.readInt16BE();
        } else if (toType === 'int16le') {
          return msg.readInt16LE();
        } else if (toType === 'int32be') {
          return msg.readInt32BE();
        } else if (toType === 'int32le') {
          return msg.readInt32LE();
        } else if (toType === 'int64be') {
          return msg.readBigInt64BE();
        } else if (toType === 'int64le') {
          return msg.readBigInt64LE();
        } else if (toType === 'uint8') {
          return msg.readUInt8();
        } else if (toType === 'uint16be') {
          return msg.readUInt16BE();
        } else if (toType === 'uint16le') {
          return msg.readUInt16LE();
        } else if (toType === 'uint32be') {
          return msg.readUInt32BE();
        } else if (toType === 'uint32le') {
          return msg.readUint32LE();
        } else if (toType === 'uint64be') {
          return msg.readBigUInt64BE();
        } else if (toType === 'uint64le') {
          return msg.readBigUInt64LE();
        } else if (toType === 'doublebe') {
          return msg.readDoubleBE();
        } else if (toType === 'doublele') {
          return msg.readDoubleLE();
        } else if (toType === 'floatbe') {
          return msg.readFloatBE();
        } else if (toType === 'floatle') {
          return msg.readFloatLE();
        }
      } catch (ex) {
        node.error('Kafka Consumer Error (message conversion)', ex);
      }

      return msg;
    }

    const runOptions = {
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const msg = {
            topic: topic,
            partition: partition,
            payload: {
              key: convertMessage(message.key, config.keytype),
              value: convertMessage(message.value, config.valuetype),
              headers: Object.keys(message.headers).length === 0 ? null : {},
            },
          };
          for (const [key, value] of Object.entries(message.headers)) {
            msg.payload.headers[key] = value.toString();
          }

          node.send(msg);
          node.status({ fill: 'green', shape: 'dot', text: 'Message received' });
        } catch (ex) {
          node.onError('Kafka Consumer Error (message processing)', ex);
          node.status({ fill: 'red', shape: 'ring', text: 'Error' });
        }
      },
    };

    if (config.advancedoptions) {
      consumerOptions.sessionTimeout = config.sessiontimeout;
      consumerOptions.rebalanceTimeout = config.rebalancetimeout;
      consumerOptions.heartbeatInterval = config.heartbeatinterval;
      consumerOptions.metadataMaxAge = config.metadatamaxage;
      consumerOptions.allowAutoTopicCreation = config.allowautotopiccreation;
      consumerOptions.maxBytesPerPartition = config.maxbytesperpartition;
      consumerOptions.minBytes = config.minbytes;
      consumerOptions.maxBytes = config.maxbytes;
      consumerOptions.maxWaitTimeInMs = config.maxwaittimeinms;

      subscribeOptions.fromBeginning = config.frombeginning;

      runOptions.autoCommitInterval = config.autocommitinterval;
      runOptions.autoCommitThreshold = config.autocommitthreshold;
    }

    this.onConnect = function () {
      node.status({ fill: 'green', shape: 'ring', text: 'Ready' });
    };

    this.onDisconnect = function () {
      node.status({ fill: 'red', shape: 'ring', text: 'Offline' });
    };

    this.onRequestTimeout = function () {
      node.error('Kafka Consumer Timeout');
      node.status({ fill: 'red', shape: 'ring', text: 'Timeout' });
    };

    this.onError = function (ex) {
      node.error('Kafka Consumer Error', ex);
      node.status({ fill: 'red', shape: 'ring', text: 'Error' });
    };

    this.init = async function init() {
      node.consumer = broker.server.consumer(consumerOptions);
      node.status({ fill: 'yellow', shape: 'ring', text: 'Initializing' });

      const { CONNECT, DISCONNECT, REQUEST_TIMEOUT } = node.consumer.events;

      node.consumer.on(CONNECT, node.onConnect);
      node.consumer.on(DISCONNECT, node.onDisconnect);
      node.consumer.on(REQUEST_TIMEOUT, node.onRequestTimeout);

      await node.consumer.connect();
      await node.consumer.subscribe(subscribeOptions);
      await node.consumer.run(runOptions);
      node.send([null, { payload: { topic: subscribeOptions.topic, groupId: consumerOptions.groupId } }]);
    };

    this.init()
      .catch((e) => {
        node.status({ fill: 'red', shape: 'ring', text: 'Init error' });
        node.error('Kafka Consumer Init error', e);
      });

    node.on('close', function (done) {
      node.consumer
        .disconnect()
        .then(() => {
          node.status({ fill: 'grey', shape: 'ring', text: 'Disconnected' });

          if (done) {
            done();
          }
        })
        .catch((ex) => {
          if (done) {
            done(ex);
          } else {
            node.onError(ex);
          }
        });
    });
  }
  RED.nodes.registerType('node-red-kafkajs-consumer', KafkajsConsumerNode);
};
