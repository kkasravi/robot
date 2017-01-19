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
  var m = require('mraa'); //require mraa
  this.i2c = new m.I2c(1);
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

function Devastator() {
  this.motor1 = new Motor(1);
  this.motor2 = new Motor(2);
}

Devastator.prototype.forward = function(speed) {
  this.motor1.forward();
  this.motor2.forward();
  this.motor1.speed(speed);
  this.motor2.speed(speed);
}

Devastator.prototype.left = function(speed) {
  this.motor1.forward();
  this.motor2.reverse();
  this.motor1.speed(speed);
  this.motor2.speed(speed);
}

Devastator.prototype.right = function(speed) {
  this.motor1.reverse();
  this.motor2.forward();
  this.motor1.speed(speed);
  this.motor2.speed(speed);
}

Devastator.prototype.reverse = function(speed) {
  this.motor1.reverse();
  this.motor2.reverse();
  this.motor1.speed(speed);
  this.motor2.speed(speed);
}

if(process.argv.length < 4) {
  console.log("Usage:");
  console.log(process.argv[1]+" {forward|reverse|right|left} speed duration");
  console.log("  where speed is 1-255");
  console.log("  where duration is in milliseconds");
  process.exit(0);
}

var devastator = new Devastator();
switch(process.argv[2]) {
  case "forward":
    devastator.forward(process.argv[3]);
    setTimeout(function(){devastator.forward(0);}, process.argv[4]);
    break;
  case "left":
    devastator.left(process.argv[3]);
    setTimeout(function(){devastator.left(0);}, process.argv[4]);
    break;
  case "right":
    devastator.right(process.argv[3]);
    setTimeout(function(){devastator.right(0);}, process.argv[4]);
    break;
  case "reverse":
    devastator.reverse(process.argv[3], process.argv[4]);
    setTimeout(function(){devastator.reverse(0);}, process.argv[4]);
    break;
  default:
    console.log("unknown arguments");
    break;
}
