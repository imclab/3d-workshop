var renderer, camera;
var scene, element;
var ambient, point;
var mouse, time;

var clock;

var socket, gameState;

var tankModel, keyboard;

var players = {};

var FIRING_STATE_NONE = 0;
var FIRING_STATE_CHARGING = 1;
var FIRING_STATE_FIRING = 2;

var world = new World({
  previousFirePower : 0,
  firePower : 0,
  firingState : FIRING_STATE_NONE,
  fireTimer : 0
});

var worldRenderer = new WorldRenderer(world);

var playerId;

var effectQueue = [];

var gunCamera;
var gunCameraRenderTarget;

var readyFlags = {
  terrain : false,
  geometry : false,
  audio: false
};

function mapObject(f, m) {
  var out = {};
  for (var key in m) {
    if (m.hasOwnProperty(key)) {
      out[key] = f(m[key]);
    }
  }
  return out;
}

function playerInput() {
  return {
    fire: false,
    forward: false,
    back: false,
    left: false,
    right: false,
    up: false,
    down: false
  };
}

var input = playerInput();
var turretLength = 50;
var caliber = 1.5;

function createPlayer(playerData) {
  var position = new THREE.Vector3().fromArray(playerData.position);
  var rotation = playerData.rotation;

  var newPlayer = {
    motorSound : charredmesh.sound.getSound("motor"),
    trackSound : charredmesh.sound.getSound("tracks"),
    rotateSound : charredmesh.sound.getSound("rotate"),
    id: playerData.id,
    health: playerData.health,
    name: playerData.name,
    color: playerData.color,
    lastPosition: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    barrelDirection: new THREE.Vector3()
  };

  newPlayer.rotateSound.gain.value = 0;

  console.log(newPlayer.name + " has entered the game!");

  var material = new THREE.MeshLambertMaterial({
    color: new THREE.Color().setStyle(newPlayer.color).offsetHSL(0,-0.2,0)
  });
  
  var turretMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color().setStyle(newPlayer.color).offsetHSL(0,-0.2,0)
  });

  var equipmentMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color().setStyle(newPlayer.color).offsetHSL(0, -0.8, 0),
    shininess:150
  });

  var tracksMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color().setStyle("#505050")
  });
  
  tank = tankModel.clone();
  
  tank.traverse(function(obj){
    switch(obj.name){
      case "chassis" :
        obj.material = material;
        break;
      case "turret" :
        obj.material = turretMaterial;
        break;
      case "turret barrel_mount":
        obj.material = turretMaterial;
        break;
      case "turret barrel_mount barrel":
        obj.material = tracksMaterial;
        break;
      case "tracks":
        obj.material = tracksMaterial;
      break;
      case "turret equipment":
        obj.material = equipmentMaterial;
        obj.geometry.computeFaceNormals();
        obj.geometry.computeVertexNormals();
        break;
    }
  });

  newPlayer.obj = new THREE.Object3D();
 
  /*
  var lightProbe = new THREE.Mesh(
    new THREE.SphereGeometry(15,15,16,16),
    new THREE.MeshLambertMaterial()
  );
  lightProbe.position.y = 25;
  newPlayer.obj.add(lightProbe);
 */
 
  newPlayer.obj.position.copy(position);
  
  newPlayer.obj.add(tank);

  // TODO: Figure out a way to preserve the heirarchy from C4D
  var turret = tank.getObjectByName("turret");
  turret.add(tank.getObjectByName("turret barrel_mount"));
  turret.add(tank.getObjectByName("turret equipment"));
  var barrel = turret.getObjectByName("turret barrel_mount");
  barrel.add(tank.getObjectByName("turret barrel_mount barrel"));

  newPlayer.turret = turret;
  newPlayer.barrel = barrel;

  world.add(new Player({
    id: newPlayer.id,
    isDriving: false,
    visible: true,
    position: newPlayer.obj.position.toArray()
  }));
  
  // add the health bar to all other players
  if(newPlayer.id != playerId){
    var overlayCanvas = makeCanvas(100, 20);
    var ctx = overlayCanvas.getContext("2d");

    var overlayTexture = new THREE.Texture(overlayCanvas);
    overlayTexture.needsUpdate = true;

    var overlaygeom = new THREE.PlaneGeometry(50, 10);
    var overlaymaterial = new THREE.MeshBasicMaterial({
      map : overlayTexture,
      transparent:true
    });
    
    var overlay = new THREE.Mesh(overlaygeom, overlaymaterial);
    overlay.rotation.y = -Math.PI;
    overlay.position.y = 50;
    scene.add(overlay);

    newPlayer.overlay = {
      texture : overlayTexture,
      canvas : overlayCanvas,
      material : overlaymaterial,
      obj : overlay,
    };
  } else {
    gunCamera.rotation.y = -Math.PI;
    gunCamera.position.x = 3;
    gunCamera.position.z = 1.0;
    gunCamera.position.y = 1.5;
    newPlayer.barrel.add(gunCamera);
  }
  
  scene.add(newPlayer.obj);
  players[newPlayer.id] = newPlayer;
}

function createProjectile(projectile) {
  if (projectile.owner == playerId){
    world.set('firingState', FIRING_STATE_FIRING);
  }

  world.add(new Projectile(projectile));
}

function updatePlayer(player) {
  players[player.id].barrelDirection.fromArray(player.barrelDirection);

  var playerInstance = world.getEntity('player', player.id);
  playerInstance.sync({
    isDriving: player.driving,
    position: player.position
  });

  players[player.id].obj.position.fromArray(player.position);

  if( (players[player.id].obj.position.y < 40) &&  (players[player.id].lastPosition.y > 40)){
    charredmesh.sound.playSound("splash", players[player.id].obj.position);
    var sp = new Splash({"position" : players[player.id].obj.position});
    scene.add(sp.obj);
    effectQueue.push(sp);
  }

  players[player.id].velocity = players[player.id].lastPosition.sub(players[player.id].obj.position);
  players[player.id].rotation = player.rotation;

  if(players[player.id].overlay){
    players[player.id].overlay.obj.position.fromArray(player.position);
    players[player.id].overlay.obj.position.y += 50;
  }

  players[player.id].turret.rotation.y = player.turretAngle;
  var motorGain = players[player.id].isDriving ? 1 : 0.4;
  var motorPitch = 0.5 + (players[player.id].velocity.length() / 10);
  motorPitch = Math.min(2.5, motorPitch);

  players[player.id].motorSound.gain.value += (motorGain - players[player.id].motorSound.gain.value) * 0.1;
  players[player.id].motorSound.playbackRate.value += (motorPitch - players[player.id].motorSound.playbackRate.value) * 0.2;
  

  var trackGain = (Math.min(players[player.id].velocity.length(), 10) / 20);
  trackGain = Math.max(trackGain, input.left || input.right ? 0.25 : 0);


  players[player.id].trackSound.gain.value += (trackGain - players[player.id].trackSound.gain.value) * 0.2;
  players[player.id].trackSound.playbackRate.value += (motorPitch - players[player.id].trackSound.playbackRate.value) * 0.2;

  players[player.id].motorSound.panner.setPosition(players[player.id].obj.position.x, players[player.id].obj.position.y, players[player.id].obj.position.z);
  players[player.id].trackSound.panner.setPosition(players[player.id].obj.position.x, players[player.id].obj.position.y, players[player.id].obj.position.z);
  players[player.id].rotateSound.panner.setPosition(players[player.id].obj.position.x, players[player.id].obj.position.y, players[player.id].obj.position.z);

  players[player.id].isDriving = player.driving;

  players[player.id].score = player.score;
  players[player.id].barrel.rotation.x = -player.barrelAngle;
  players[player.id].driving = player.isDriving;

  var rotateGain = 0;
  if(input.turretRight || input.turretLeft || input.up || input.down){
    rotateGain = 0.3;
  }
  players[player.id].rotateSound.gain.value += (rotateGain - players[player.id].rotateSound.gain.value) * 0.3;
  players[player.id].rotateSound.playbackRate.value += ((rotateGain*6) - players[player.id].rotateSound.playbackRate.value) * 0.3;


  players[player.id].obj.up.lerp(new THREE.Vector3().fromArray(player.up), 0.2);
  players[player.id].forward.lerp(new THREE.Vector3().fromArray(player.forward), 0.2);
  players[player.id].obj.lookAt(players[player.id].forward.clone().add(players[player.id].obj.position));

  players[player.id].health = player.health;
  if (player.id !== playerId) {
    // update UI overlay for other players.
    // players[player.id].overlay.canvas.getContext("2d");
    updateOverlay(players[player.id]);
  }

  players[player.id].lastPosition.copy(players[player.id].obj.position);
}

function updateOverlay( player ){
  var canvas = player.overlay.canvas;

  var ctx = player.overlay.canvas.getContext("2d");

  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "red";
  ctx.fillRect(0, 0, Math.max(0, player.health/100 * canvas.width), canvas.height);
  
  player.overlay.texture.needsUpdate = true;
}

function updateGameState(state) {
  gameState = state;
  mapObject(updatePlayer, gameState.players);
  mapObject(function(p) { return world.syncEntity('projectile', p); }, gameState.projectiles);

  updateChaseCam();
  updateTerrainChunks();
}


function projectileExplode(id) {
  if (playerId == id){
    world.set('firingState', FIRING_STATE_NONE);
  }

  world.removeByTypeId('projectile', id);
  delete gameState.projectiles[id];
}

function initSocket() {
  socket = io.connect();

  socket.on('welcome', function(data) {
    //console.log('game state ', data);
    playerId = data.id;
    gameState = data.state;
    mapObject(createPlayer, gameState.players);
    mapObject(createProjectile, gameState.projectiles);
  });

  socket.on('playerJoin', function(data) {
    console.log('player join ', data);
    createPlayer(data);
  });
  
  socket.on('playerUpdate', updatePlayer);
  socket.on('loopTick', updateGameState);

  socket.on('projectileAppear', createProjectile);
  socket.on('projectileExplode', projectileExplode);

  socket.on('playerDisconnect', function(id) {
    console.log("Player removed.");
    projectileExplode(id);
    var oldPlayer = players[id];
    scene.remove(oldPlayer.obj);
    scene.remove(oldPlayer.overlay.obj);
    delete gameState.players[id];
    delete players[id];
  });

  world.pipeSocketEvent(socket, 'terrainUpdate');
  world.pipeSocketEvent(socket, 'playerDied');
  world.pipeSocketEvent(socket, 'playerSpawned');
}

// check to see when all the various async stuff is done loading.
function checkReadyState(){
  var ready = true;

  mapObject(function(item){
    ready = ready && item;
  }, readyFlags);

  if(ready){
    initSocket();
  }
}

function init(){
  keyboard = new KeyboardHandler(onKeyChange);
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mousemove', onMouseMove, false);

  window.addEventListener('resize', function() {
    worldRenderer.resize();
  }, false);

  charredmesh.sound.initialize(function(){
    readyFlags.audio = true;
    checkReadyState();
  });

  var sun = new Sun();
  sunPosition = sun.positionVector;
  world.add(sun);

  world.add(new Terrain());

  worldRenderer.registerRenderer(
    ThreeJSCoreRenderer,
    SkyRenderer,
    SunRenderer,
    TerrainRenderer,
    OceanRenderer,
    ChaseCamRenderer,
    PlayerRenderer,
    ProjectileRenderer,
    ProjectileSoundRenderer,
    DebrisRenderer,
    SplashSoundRenderer,
    EffectsRenderer,
    DustRenderer,
    BulletTrailRenderer,
    HUDRenderer,
    StatsRenderer
  );

  // Start renderframes
  onFrame();
}

function onMouseMove(event) {
  mouse.set( (event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * -2);
}

function onMouseDown(event) {
  var projector = new THREE.Projector();
  var m3 = new THREE.Vector3();
  m3.set(mouse.x, -mouse.y, 1);

  console.log(m3.toArray());
  
  var rayCaster = projector.pickingRay(m3, camera);
  
  var chunks = [];
  for(var itm in terrainChunks){
    chunks.push(terrainChunks[itm].obj);
  }
}

function onKeyChange(code, state) {
  var firingState = world.get('firingState');
  switch(code)
  {
  case 32:

    if(state && firingState == FIRING_STATE_NONE) {
      world.sync({
        'fireTimer': time,
        'firingState': FIRING_STATE_CHARGING
      });
    }

    if(!state && firingState == FIRING_STATE_CHARGING) {
      var firePower = world.get('firePower');
      world.set('previousFirePower', firePower);
      socket.emit('playerFire', {"power" : firePower});
    }

    input.fire = state;
    return;
    break;
  case 87: // W
    input.forward = state;
    break;
  case 83: // S
    input.back = state;
    break;
  case 65: // A
    input.left = state;
    break;
  case 68: // D
    input.right = state;
    break;
  case 82: // R
  case 38: // Up arrow
    input.up = state;
    break;
  case 70: // F
  case 40: // down arrow
    input.down = state;
    break;

  case 39: // right arrow
    input.turretRight = state;
    break;
  
  case 37: // left arrow
    input.turretLeft = state;
    break;
  case 69: // e
    input.aim = state;
    break;
  }
  
  socket.emit('playerInput', input);
}

function onFrame() {
  requestAnimationFrame(onFrame);

  var delta = clock.getDelta();

  world.tick(delta);

  time += delta;

  if (input.fire) {
    var firePower = Math.sin((time - world.get('fireTimer')) + (3 * Math.PI / 2));
    world.set('firePower', (firePower + 1) / 2);
  }

  renderer.clear();

  worldRenderer.render(delta, renderer, function() {
    renderer.render(scene, camera);
  });
}

function makeCanvas(width, height){
  var canvas = document.createElement("canvas");
  
  canvas.width = width;
  canvas.height = height;

  canvas.style.position = "absolute";
  canvas.style.zIndex = 100000;

  document.body.appendChild(canvas);

  return canvas;
}

init();
