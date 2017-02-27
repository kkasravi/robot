console.log("touchscreen is", VirtualJoystick.touchScreenAvailable() ? "available" : "not available");

// one on the right of the screen
var joystick1 = new VirtualJoystick({
   container  : document.body,
   strokeStyle  : 'cyan',
   limitStickTravel: true,
   stickRadius  : 120    
});
joystick1.addEventListener('touchStartValidation', function(event){
   var touch  = event.changedTouches[0];
   if( touch.pageX < window.innerWidth/2 )  return false;
   return true;
});
joystick1.addEventListener('touchStart', function(){
   console.log('joystick right down')
   joystick1.active = true;
});
joystick1.addEventListener('touchEnd', function(){
   console.log('joystick right up');
   joystick1.active = false;
   var xhttp = new XMLHttpRequest();
   xhttp.open("POST", "data", true);
   xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
   xhttp.send('joystick=rightStop'); 
});

// one on the left of the screen
var joystick2 = new VirtualJoystick({
  container  : document.body,
  strokeStyle  : 'cyan',
  limitStickTravel: true,
  stickRadius  : 120
});
joystick2.addEventListener('touchStartValidation', function(event){
   var touch  = event.changedTouches[0];
   if( touch.pageX >= window.innerWidth/2 )  return false;
   return true;
});
joystick2.addEventListener('touchStart', function(){
   console.log('joystick left down')
   joystick2.active = true;
})
joystick2.addEventListener('touchEnd', function(){
   console.log('joystick left up')
   joystick2.active = false;
   var xhttp = new XMLHttpRequest();
   xhttp.open("POST", "data", true);
   xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
   xhttp.send('joystick=leftStop'); 
});

var outputEl = document.getElementById('canvas-video');
setInterval(function(){
  if(joystick1.active) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "data", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('joystick=right' 
      + '&dx='+joystick1.deltaX()
      + '&dy='+joystick1.deltaY()
    );
  }
  if(joystick2.active) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "data", true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send('joystick=left'
      + '&dx='+joystick2.deltaX()
      + '&dy='+joystick2.deltaY()
    );
  }
}, 1/30 * 1000);
