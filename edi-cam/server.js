// modules
var childProcess = require('child_process')
  , express = require('express')
  , http = require('http')
  , morgan = require('morgan')
  , ws = require('ws')
  , bodyParser = require('body-parser')
  , mraa = require('mraa')

  var m = require('mraa'); //require mraa
// configuration files
var configServer = require('./lib/config/server');

/*
                           cmd     arg
Ax Analog input port       0xAx    0 do not get voltage value , 1 get voltage value
Dx Digital input port      0xDx    1 high   0 low
Moter1 Direction           0xB1    1 anticlockwise 0 clockwise
Moter2 Direction           0xB2    1 anticlockwise 0 clockwise
Moter1 Speed               0xC1    speed value
Moter2 Speed               0xC2    speed value 
servo control              0xEx    duty
*/

function Motor(motor) {
  this.i2c = new mraa.I2c(1);
  this.i2c.address(0x04); // atmega i2c address
  if(motor === 1) {
    this.motor = 0xc1;	
    this.direction = 0xb1;	
  } else {
    this.motor = 0xc2;	
    this.direction = 0xb2;	
  }
}

Motor.prototype.speed = function(value) {
  var number = parseInt(value)
  var buf = new Buffer(5);
  buf[0] = 0x55;
  buf[1] = 0xaa;
  buf[2] = this.motor;
  buf[3] = number;
  buf[4] = buf[0]+buf[1]+buf[2]+buf[3]  // check sum
  this.i2c.write(buf)
}

Motor.prototype.forward = function() {
  var buf = new Buffer(5);
  buf[0] = 0x55;
  buf[1] = 0xaa;
  buf[2] = this.direction;
  buf[3] = 1;
  buf[4] = buf[0]+buf[1]+buf[2]+buf[3]  // check sum
  this.i2c.write(buf)
}

Motor.prototype.reverse = function() {
  var buf = new Buffer(5);
  buf[0] = 0x55;
  buf[1] = 0xaa;
  buf[2] = this.direction;
  buf[3] = 0;
  buf[4] = buf[0]+buf[1]+buf[2]+buf[3]  // check sum
  this.i2c.write(buf)
}

function Point(x, y) {
  this.x = x;
  this.y = y;
}
function Position(x, y, motor) {
  this.origin = new Point(x, y);
  this.current = null;
  this.state = null;
  this.motor = motor;
}
Position.prototype.delta = function(x, y) {
  this.current = new Point(x-this.origin.x, this.origin.y-y);
}
Position.prototype.move = function(side) {
  console.log(side+" y="+this.current.y);
  if(this.current.y > 0) {
    this.motor.forward();
    this.motor.speed(this.current.y * 2);
  } else if(this.current.y < 0) {
    this.motor.reverse();
    this.motor.speed(this.current.y * 2);
  } else {
    this.motor.speed(0)
  }
}
var leftPosition, rightPosition;
var joysticksActive = false;

// app parameters
var app = express();
app.set('port', configServer.httpPort);
app.use(express.static(configServer.staticFolder));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/data', function(req, res) {
  if(!joysticksActive) {
    joysticksActive = true;
    setInterval(function(){
      leftPosition && leftPosition.move("left");
      rightPosition && rightPosition.move("right");
    }, 1000);
  }
  switch(req.body.joystick) {
    case "left":
      if(!leftPosition) {
        leftPosition = new Position(req.body.dx, req.body.dy, new Motor(2));
      } else {
        leftPosition.delta(req.body.dx, req.body.dy);
      }
      break;
    case "leftStop":
      leftPosition.current = new Point(0,0);
      break;
    case "right":
      if(!rightPosition) {
        rightPosition = new Position(req.body.dx, req.body.dy, new Motor(1));
      } else {
        rightPosition.delta(req.body.dx, req.body.dy);
      }
      break;
    case "rightStop":
      rightPosition.current = new Point(0,0);
      break;
  }
  res.sendStatus(200);
});

// serve index
require('./lib/routes').serveIndex(app, configServer.staticFolder);

// HTTP server
http.createServer(app).listen(app.get('port'), function () {
  console.log('HTTP server listening on port ' + app.get('port'));
});

/// Video streaming section
// Reference: https://github.com/phoboslab/jsmpeg/blob/master/stream-server.js

var STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes
var width = 320;
var height = 240;

// WebSocket server
var wsServer = new (ws.Server)({ port: configServer.wsPort });
console.log('WebSocket server listening on port ' + configServer.wsPort);

wsServer.on('connection', function(socket) {
  // Send magic bytes and video size to the newly connected socket
  // struct { char magic[4]; unsigned short width, height;}
  var streamHeader = new Buffer(8);

  streamHeader.write(STREAM_MAGIC_BYTES);
  streamHeader.writeUInt16BE(width, 4);
  streamHeader.writeUInt16BE(height, 6);
  socket.send(streamHeader, { binary: true });

  console.log('New WebSocket Connection (' + wsServer.clients.length + ' total)');

  socket.on('close', function(code, message){
    console.log('Disconnected WebSocket (' + wsServer.clients.length + ' total)');
  });
});

wsServer.broadcast = function(data, opts) {
  for(var i in this.clients) {
    if(this.clients[i].readyState == 1) {
      this.clients[i].send(data, opts);
    }
    else {
      console.log('Error: Client (' + i + ') not connected.');
    }
  }
};

// HTTP server to accept incoming MPEG1 stream
http.createServer(function (req, res) {
  console.log(
    'Stream Connected: ' + req.socket.remoteAddress +
    ':' + req.socket.remotePort + ' size: ' + width + 'x' + height
  );

  req.on('data', function (data) {
    wsServer.broadcast(data, { binary: true });
  });
}).listen(configServer.streamPort, function () {
  console.log('Listening for video stream on port ' + configServer.streamPort);

  // Run do_ffmpeg.sh from node                                                   
  childProcess.exec('../../bin/do_ffmpeg.sh');
});

module.exports.app = app;
