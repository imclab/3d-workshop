import { defineClass } from 'core/game';

var WorldRenderer = defineClass(function(){}, {
  initialize: function(world) {
    this.world = world;
    this.renderOnWorld = [];
    this.renderOnEntity = {};
    this.activeRenderers = {};

    var self = this;
    this.world.on('addToWorld', function(entity) {
      var classId = entity.constructor.classTypeId;

      if (!self.renderOnEntity[classId]) { return; }

      for (var i = 0; i < self.renderOnEntity[classId].length; i++) {
        var rendererPair = self.renderOnEntity[classId][i];
        var renderer = new rendererPair[0](entity, rendererPair[1]);

        self.activeRenderers[classId] = self.activeRenderers[classId] || {};

        var entityId = entity.get('id');
        self.activeRenderers[classId][entityId] = self.activeRenderers[classId][entityId] || {};
        self.activeRenderers[classId][entityId][renderer.uid] = renderer;
      }
    });

    this.world.on('removeFromWorld', function(entity) {
      var classId = entity.constructor.classTypeId;

      if (!self.activeRenderers[classId]) { return; }
      
      var entityId = entity.get('id');
      if (!self.activeRenderers[classId][entityId]) { return; }

      for (var key in self.activeRenderers[classId][entityId]) {
        if (self.activeRenderers[classId][entityId].hasOwnProperty(key)) {
          var renderer = self.activeRenderers[classId][entityId][key];
          renderer.destroy();
        }
      }

      delete self.activeRenderers[classId][entityId];
    });
  },

  onWorld: function(renderer) {
    this.renderOnWorld.push(new renderer());
  },

  onEntity: function(entity, renderer, params) {
    var id = entity.classTypeId;
    this.renderOnEntity[id] = this.renderOnEntity[id] || [];
    this.renderOnEntity[id].push([renderer, params]);
  },

  render: function(delta) {
    for (var i = 0; i < this.renderOnWorld.length; i++) {
      this.renderOnWorld[i].render(delta);
    }

    for (var classId in this.activeRenderers) {
      if (this.activeRenderers.hasOwnProperty(classId)) {
        var classRenderers = this.activeRenderers[classId];
        for (var entityId in classRenderers) {
          if (classRenderers.hasOwnProperty(entityId)) {
            var entityRenderers = classRenderers[entityId];
            for (var rendererId in entityRenderers) {
              if (entityRenderers.hasOwnProperty(rendererId)) {
                var renderer = entityRenderers[rendererId];
                renderer.render(delta);
              }
            }
          }
        }
      }
    }
  }

});

export default = WorldRenderer;