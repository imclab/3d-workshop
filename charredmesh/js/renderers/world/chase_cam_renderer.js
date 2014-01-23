import SoundEngine from 'sound';

var cameraTarget = new THREE.Vector3();

var ChaseCamRender = function(world) {
  this.world = world;
};

ChaseCamRender.prototype.render = function chaseCamRender() {
  var currentPlayerId = this.world.get('currentPlayerId');

  // don't try to update the camera if the player hasn't been instantiated yet.
  if(!currentPlayerId){
    return;
  }

  var p;

  if(input.aim){
    p = players[currentPlayerId].barrelDirection.clone().multiplyScalar(-300);
    p.add(players[currentPlayerId].obj.position);
  } else {
    if (!players[currentPlayerId].rotation) {
      return
    }
    p = players[currentPlayerId].obj.position.clone();
    p.y += 100;
    p.z -= Math.cos(players[currentPlayerId].rotation) * 300;
    p.x -= Math.sin(players[currentPlayerId].rotation) * 300;
  }

  // Use larger of either an offset from the players Y position, or a point above the ground.  
  // This prevents the camera from clipping into mountains.
  p.y = Math.max( terrain.getGroundHeight(p.x, p.z) + 75, p.y);

  // constantly lerp the camera to that position to keep the motion smooth.
  camera.position.lerp(p, 0.05);

  SoundEngine.setListenerPosition(camera.position, cameraTarget.clone().sub(camera.position).normalize());

  // Find a spot in front of the player

  if(input.aim){
    p.copy(players[currentPlayerId].barrelDirection);
    p.multiplyScalar(300);
    p.add(players[currentPlayerId].obj.position);
  }else{
   p.copy(players[currentPlayerId].obj.position);
   p.z += Math.cos(players[currentPlayerId].rotation) * 300;
   p.x += Math.sin(players[currentPlayerId].rotation) * 300;
  }

  // constantly lerp the target position too, again to keep things smooth.
  cameraTarget.lerp(p, input.aim ? 0.5 : 0.2);

  // look at that spot (looking at the player makes it hard to see what's ahead)  
  camera.lookAt(cameraTarget);

  mapObject(function(player){
    // console.log(player.obj.position.x);
    if(player.overlay){
      player.overlay.obj.lookAt(camera.position);
    }
  }, players);

  skyDome.position.copy(camera.position);
  skyDome.position.y = 0;
};

export default = ChaseCamRender;
