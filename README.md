# node-red-kafkajs

> [__Note__]
>
> This repo is highly inspired on the repo at: <https://github.com/amey0309/node-red-contrib-kafkajs>
> It also depends on KafkaJS to do the basic functionallity, you can find more info at: <https://kafka.js.org/>

---

> [__Note 2__]
>
> KAFKA is a registered trademark of The Apache Software Foundation. This project has no affiliation with and is not endorsed by The Apache Software Foundation.

---

With this nodes you can consume and produce messages to the Kafka broker and the big difference between this and the other projects found at Node-RED is better handling of errors and node outputs to notify events. Has the project at the top of this document, this nodes are a wrapper of the library KafkaJS, and it just pipe the data to the provided functionallity of that library.

This library provides 3 nodes to make basic communication:

* kafkajs-broker
* kafkajs-producer
* kafkajs-consumer

It lets the flow to send data to the Kafka Broker in the desired format has it allows the user to send a Buffer object as the key and value of the message, this allows your flows to communicate with native data types if needed. It also provides a list of types that it can serriallize automatically without the need to create an extra node for the data canversion, including seriallize to JSON.

Advanced authentication is still missing tests, I'm rellying on the background projects.

## Input Parameters

### kafkajs-broker

* __Name__ (Optional)

  Name wanted to be shown in Node.

* __Brokers__

  Brokers comma delimited (Multiple host is provided).

* __Client ID__

  ID of client to be connected to Kafka Cluster.

* __Request Timeout__

  Request timeout of Kafka Client.

* __Connection Timeout__

  Connection timeout of Kafka Client.

* __Log Level__

  Log level of Kafka Cient.

#### Authentication

* __TLS__

  Check if tls security is required for Kafka Cluster.

  * __CA Certs__ (Optional)

    CA Root certificate path defined in Kafka Cluster.

  * __Client Cert__ (Optional)

    Client cert path created by openssl derived from Private Key (pem).

  * __Private Key__ (Optional)

    Private Key path created by openssl (pem).

  * __Passphare__ (Optional)

    Passphrase of created private Key.

* __SASL/PLAIN__

  Check if sasl auth is required for Kafka Cluster.

  * __Mechanism__

    The method used to send authentication data to the server.

  * __Username__

    Username in order to connect to Kafka Cluster.

  * __Password__

    Password in order to connect to Kafka Cluster.

  * __Use SSL__

    Activate SSL Connection.

#### Advanced Retry Options

Advanced Retry Options of Kafka Client.

* __Max. Retry__

  For automatic connection retry use a maximum wait time between retries, each retry will wait a bit more time. Value is in milliseconds.

* __Init. Retry__

  For automatic connection retry start by using this delay metween retries. Value is in milliseconds.

* __Factor__
* __Multiplier__

* __Retries__

  Maximum of retries until the client gives up.

### kafkajs-producer

* __Name__ (Optional)

  Name wanted to be shown on your node.

* __Broker__

  Broker which is wanted to be connect.

* __Topic__

  Topic name of selected broker which is wanted to be consume.

* __Serialize key as__

  Can make it easy to process the messages as it provides some basic serializers for the data received on msg key property.

* __Serialize value as__

  Can make it easy to process the messages as it provides some basic serializers for the data received on msg payload property.

* __Advanced Options__

  Advanced options of Producer.

The node can receive a message (msg object above payload) with the following properties:

* msg.topic

  The topic that will receive the message. It does not pre-validate if the partition exists, so use it with caution.

* msg.partition

  If it's needed that a particular partition receives the messages you can set it here, it does not pre-validate if the partition exists, so use it with caution.

* msg.key

  The key assotiated with the message. Can be of type Buffer or some of the basic types supported by the provided serializers.

* msg.payload

  Set to the value to be sent. Can be of type Buffer or some of the basic types supported by the provided serializers.

* msg.headers

  Extra info that you can assotiate with the message. The key and values for the headers should be string for now.

If some of this msg properties are set on the properties node, the node properties will prevail.

The node also provides two outputs so the flow can continue or react if the node succeeds or fails to send the message to the broker, this allows to cache the messages not sent to be sent later or to log the error (the catch node will also trigger if any error is thrown by the node). The outups are:

1. Triggered when the message was successfully sent.
1. Triggered when some error occurred to send the message.

### kafkajs-consumer

* __Name__ (Optional)

  Name wanted to be shown on your node

* __Client__

  Client which is wanted to be connect

* __Group ID__

  Group ID of consumer. If it is null, custom uuid will be generated for every connection

* __Topic__

  Topic name of selected broker which is wanted to be consume

* __Serialize key as__

  Can make it easy to process the messages as it provides some basic serializers for the data received on msg key property.

* __Serialize value as__

  Can make it easy to process the messages as it provides some basic serializers for the data received on msg payload property.

* __Advanced Options__

  Advanced options of Consumer

## Installation

```shell
npm install @asinino/node-red-kafkajs
```

## Screenshots

![kafkajs-broker](/images/broker-properties.png)

![kafkajs-consumer](/images/consumer-properties.png)

![kafkajs-producer](/images/producer-properties.png)

![example-flow](/images/example-flow.png)
