
# socket.io-amqp-emitter

socket.io emitter for use with RabbitMQ & other AMQP services (written to be used with [socket.io-amqp](https://github.com/genixpro/socket.io-amqp)).

## How to use

```js
var io = require('socket.io-amqp-emitter')('amqp://localhost');
setInterval(function(){
  io.emit('time', new Date);
}, 5000);
```

## API

`socket.io-amqp-emitter` is virtually the same as [socket.io-emitter](https://github.com/socketio/socket.io-emitter).

### Emitter(uri[, opts])

- `uri`: String like `amqp://localhost` to connect to AMQP/RMQ server, MANDATORY
- `opts.prefix`: Prefix that will be applied to all queues, exchanges, and messages used by socket.io-amqp-emitter (same as adapter)

### Emitter#to(room:String):Emitter
### Emitter#in(room:String):Emitter

Specifies a specific `room` that you want to emit to.

### Emitter#of(namespace:String):Emitter

Specifies a specific namespace that you want to emit to.

## TODO

Fix tests - they're still the original `socket.io-emitter` code so don't expect them to work.

## License

MIT
