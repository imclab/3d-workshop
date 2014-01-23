var NetworkClient = function(world, socket, typeLookup) {
  this.world = world;
  this.socket = socket;
  this.typeLookup = typeLookup;

  var self = this;
  this.socket.on('actor:operation', function(data) {
    self.onOperation(data);
  });
};

NetworkClient.prototype.onOperation = function(data) {
  if (data.op === 'event') {
    console.log('Received Network Event', data.type, data.params);
    this.world.trigger(data.type, [data.params]);
    return;
  }
  
  var typeConstructor = this.typeLookup[data.type];

  if (!typeConstructor) {
    console.log('Unhandled network operation', data);
    return;
  }

  if (data.op === 'create') {
    var e = new typeConstructor(data.params);
    this.world.add(e);
  } else if (data.op === 'update') {
    var e = this.world.getEntity(typeConstructor, data.params.id);

    if (!e) {
      console.log('Unmatched entity to update', data);
      return;
    }

    e.sync(data.params);
  } else if (data.op === 'remove') {
    var e = this.world.getEntity(typeConstructor, data.params.id);
    
    if (!e) {
      console.log('Unmatched entity to remove', data);
      return;
    }

    this.world.remove(e);
  }
};

export default = NetworkClient;