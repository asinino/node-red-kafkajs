/** @import { NodeAPI } from 'node-red' */
/** @import { Producer } from 'kafkajs' */

/** @import { KafkajsBrokerNode } from './broker' */

/**
 * Module to control the access to the broker.
 * @param {NodeAPI} RED Root node to register the components
 */
module.exports = function (RED) {
  const { Buffer } = require('node:buffer');
  
  const acksDict = {
    all: -1,
    none: 0,
    leader: 1,
  };

  function KafkajsProducerNode(config) {
    const node = this;

    RED.nodes.createNode(this, config);
    this.ready = false;

    /** @type {KafkajsBrokerNode} */
    const broker = RED.nodes.getNode(config.broker);
    if (!broker) {
      node.status({ fill: 'red', shape: 'ring', text: 'Broker is missing.' });
      return;
    }

    /** @type {Producer} */
    this.producer = null;

    this.sendOptions = {
      /** @type { string | null } */
      topic: config.topic || null,

      /** @type { string | null } */
      partition: config.partition || null,
      /** @type { string | number | Buffer | null } */
      key: config.key || null,
      /** @type { object } */
      headers: config.headeritems || {},

      /** @type { number } */
      acks: acksDict[config.acknowledge],
      /** @type { number } */
      timeout: config.responsetimeout,
    };

    this.onConnect = function () {
      node.ready = true;
      node.status({ fill: 'green', shape: 'ring', text: 'Ready' });
    };

    this.onDisconnect = function () {
      node.ready = false;
      node.status({ fill: 'red', shape: 'ring', text: 'Offline' });
    };

    this.onRequestTimeout = function () {
      node.status({ fill: 'red', shape: 'ring', text: 'Timeout' });
    };

    /**
     * Serializes the message payload or key to a buffer.
     * @param {any} msg The message to send to the broker.
     * @param {string} toType The type to convert the message to.
     * @returns {Buffer} The message as a buffer.
     */
    function convertMessage(msg, toType) {
      if (Buffer.isBuffer(msg)) {
        return msg;
      }

      /** @type {Buffer} */
      let buffer = null;

      if (toType === 'json') {
        return Buffer.from(JSON.stringify(msg));
      } else if (toType === 'string') {
        return Buffer.from(msg.toString());
      } else if (toType === 'boolean') {
        buffer = Buffer.alloc(1);
        buffer.writeUInt8(msg ? 1 : 0);
        return buffer;
      } else if (toType === 'int8') {
        buffer = Buffer.alloc(1);
        buffer.writeInt8(msg);
        return buffer;
      } else if (toType === 'int16be') {
        buffer = Buffer.alloc(2);
        buffer.writeInt16BE(msg);
        return buffer;
      } else if (toType === 'int16le') {
        buffer = Buffer.alloc(2);
        buffer.writeInt16LE(msg);
        return buffer;
      } else if (toType === 'int32be') {
        buffer = Buffer.alloc(4);
        buffer.writeInt32BE(msg);
        return buffer;
      } else if (toType === 'int32le') {
        buffer = Buffer.alloc(4);
        buffer.writeInt32LE(msg);
        return buffer;
      } else if (toType === 'int64be') {
        buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(msg);
        return buffer;
      } else if (toType === 'int64le') {
        buffer = Buffer.alloc(8);
        buffer.writeBigInt64LE(msg);
        return buffer;
      } else if (toType === 'uint8') {
        buffer = Buffer.alloc(1);
        buffer.writeUInt8(msg);
        return buffer;
      } else if (toType === 'uint16be') {
        buffer = Buffer.alloc(2);
        buffer.writeUInt16BE(msg);
        return buffer;
      } else if (toType === 'uint16le') {
        buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(msg);
        return buffer;
      } else if (toType === 'uint32be') {
        buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(msg);
        return buffer;
      } else if (toType === 'uint32le') {
        buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(msg);
        return buffer;
      } else if (toType === 'uint64be') {
        buffer = Buffer.alloc(8);
        buffer.writeBigUInt64BE(msg);
        return buffer;
      } else if (toType === 'uint64le') {
        buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(msg);
        return buffer;
      } else if (toType === 'doublebe') {
        buffer = Buffer.alloc(8);
        buffer.writeDoubleBE(msg);
        return buffer;
      } else if (toType === 'doublele') {
        buffer = Buffer.alloc(8);
        buffer.writeDoubleLE(msg);
        return buffer;
      } else if (toType === 'floatbe') {
        buffer = Buffer.alloc(4);
        buffer.writeFloatBE(msg);
        return buffer;
      } else if (toType === 'floatle') {
        buffer = Buffer.alloc(4);
        buffer.writeFloatLE(msg);
        return buffer;
      }

      return msg;
    }

    this.init = async function () {
      node.producer = broker.server.producer();
      node.status({ fill: 'yellow', shape: 'ring', text: 'Initializing' });

      const { CONNECT, DISCONNECT, REQUEST_TIMEOUT } = node.producer.events;
      node.producer.on(CONNECT, node.onConnect);
      node.producer.on(DISCONNECT, node.onDisconnect);
      node.producer.on(REQUEST_TIMEOUT, node.onRequestTimeout);

      await node.producer.connect();
    };

    this.init()
      .catch(e => {
        node.status({ fill: 'red', shape: 'ring', text: 'Init error' });
        node.error('Kafka Producer Init error', e);
      });

    this.on('input', function (msg, send, done) {
      if (!node.ready || !msg.payload) return;

      try {
        send = send || (() => node.send.apply(node, arguments));

        /** @type {Buffer | null} */
        let key = node.sendOptions.key || msg.key || null;
        if (key !== null && key !== undefined) key = convertMessage(key, config.keytype);
        /** @type {Buffer | null} */
        let value = msg.payload;
        if (value !== null && value !== undefined) value = convertMessage(value, config.valuetype);

        const sendOptions = {
          topic: node.sendOptions.topic || msg.topic || null,

          acks: node.sendOptions.acks || null,
          timeout: node.sendOptions.timeout || null,

          messages: [
            {
              key,
              partition: node.sendOptions.partition || msg.partition || null,
              headers: Object.keys(node.sendOptions.headers).length === 0 ? msg.headers : node.sendOptions.headers,
              value,
            },
          ],
        };

        node.producer
          .send(sendOptions)
          .then(() => {
            node.status({ fill: 'green', shape: 'dot', text: 'Sent' });

            send([msg, null]);

            if (done) {
              done();
            }
          })
          .catch((ex) => {
            node.status({ fill: 'red', shape: 'ring', text: 'Error' });

            send([null, { ...msg, error: ex }]);

            if (done) {
              done(ex);
            } else {
              node.error(ex, 'Kafka Producer Error');
            }
          });

        node.status({ fill: 'blue', shape: 'ring', text: 'Sending' });
      }
      catch (ex) {
        node.status({ fill: 'red', shape: 'ring', text: 'Error' });

        send([null, { ...msg, error: ex }]);

        if (done) {
          done(ex);
        } else {
          node.error(ex, 'Kafka Producer Error');
        }
      }
    });

    this.on('close', function (removed, done) {
      done = typeof done === 'function' ? done : typeof removed === 'function' ? removed : null;

      node.producer &&
      node.producer
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
  RED.nodes.registerType('node-red-kafkajs-producer', KafkajsProducerNode);
};
