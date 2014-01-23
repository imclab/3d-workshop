import Entity from '../core/entity';
import AddDelta from '../behaviors/add_delta_behavior';
import Actor from '../core/actor';
import { entity } from '../core/game';

var Explosion = Entity.define({
  behaviors: [
    [AddDelta, { varName: 'time', max: 1, eventName: 'explosionComplete' }]
  ],

  initialize: function Explosion() {
    this.set('time', 0);

    var self = this;
    this.on('explosionComplete', function() {
      self.getWorld().remove(self);
    });
  }
});

export default = Explosion;
