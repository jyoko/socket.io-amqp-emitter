
/**
 * Module dependencies.
 */

var amqp = require('amqplib/callback_api');
var parser = require('socket.io-parser');
var hasBin = require('has-binary');
var msgpack = require('msgpack-js');
var debug = require('debug')('socket.io-amqp-emitter');

/**
 * Module exports.
 */

module.exports = Emitter;

/**
 * Flags.
 *
 * @api public
 */

var flags = [
  'json',
  'volatile',
  'broadcast'
];

/**
 * uid for emitter
 *
 * @api private
 */

var uid = 'amqp-emitter';

/**
 * Socket.IO AMQP based emitter.
 *
 * @param {String} uri
 * @param {Object} options
 * @api public
 */

// TODO namespaceInitializedCallback
function Emitter(uri, opts){
  if (!(this instanceof Emitter)) return new Emitter(uri, opts);
  opts = opts || {};

  if (!uri) {
    throw new Error('Missing AMQP connect URI');
  }

  this.uri = uri;
  if (opts.prefix === void 0) {
    this.prefix = '';
  } else {
    this.prefix = opts.prefix.toString();
  }

  this.amqpExchangeReady = false;
  var self = this;
  amqp.connect(uri, {}, function(err, conn) {
    if (err) {
      debug('Error connecting to RMQ: ', err.toString());
      return;
    } else {
      var ch = conn.createChannel();
      // TODO configurable opts/type
      var exchangeOpts = {
        durable: true,
        internal: false,
        autoDelete: false,
      };

      self.amqpExchangeName = self.prefix + '-socket.io';

      ch.assertExchange(self.amqpExchangeName, 'direct', exchangeOpts, function(err, exchange) {
        if (err) {
          debug('Error connecting to exchange: ', err.toString());
          return;
        } else {
          self.amqpExchangeReady = true;
          self.amqpPublish = function(chn, msg) {
            ch.publish(self.amqpExchangeName, chn, msg);
          };
        }
      });
    }
  });



  this._rooms = [];
  this._flags = {};
}

/**
 * Apply flags from `Socket`.
 */

flags.forEach(function(flag){
  Emitter.prototype.__defineGetter__(flag, function(){
    debug('flag %s on', flag);
    this._flags[flag] = true;
    return this;
  });
});

/**
 * Limit emission to a certain `room`.
 *
 * @param {String} room
 */

Emitter.prototype.in =
Emitter.prototype.to = function(room){
  if (!~this._rooms.indexOf(room)) {
    debug('room %s', room);
    this._rooms.push(room);
  }
  return this;
};

/**
 * Limit emission to certain `namespace`.
 *
 * @param {String} namespace
 */

Emitter.prototype.of = function(nsp) {
  debug('nsp set to %s', nsp);
  this._flags.nsp = nsp;
  return this;
};

/**
 * Send the packet.
 *
 * @api public
 */

Emitter.prototype.emit = function(){

  // TODO: ignoring emits prior to exchange being ready
  if (!this.amqpExchangeReady) return;

  var self = this;

  // packet
  var args = Array.prototype.slice.call(arguments);
  var packet = {};
  packet.type = hasBin(args) ? parser.BINARY_EVENT : parser.EVENT;
  packet.data = args;
  // set namespace to packet
  if (this._flags.nsp) {
    packet.nsp = this._flags.nsp;
    delete this._flags.nsp;
  } else {
    packet.nsp = '/';
  }

  var opts = {
    rooms: this._rooms,
    flags: this._flags
  };
  var chn = this.prefix + '#' + packet.nsp + '#';
  var msg = msgpack.encode([uid, packet, opts]);

  // publish
  if (opts.rooms && opts.rooms.length) {
    opts.rooms.forEach(function(room) {
      var chnRoom = chn + room + '#';
      self.amqpPublish(chnRoom, msg);
    });
  } else {
    this.amqpPublish(chn, msg);
  }

  // reset state
  this._rooms = [];
  this._flags = {};

  return this;
};

