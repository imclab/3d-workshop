import Behavior from '../core/behavior';
import Debris from '../entities/debris';

export default = Behavior.define({
  onMessage: function(eventName, data) {
    if (eventName === this.getOption('executeOn')) {
      this.execute(data);
    }
  },

  execute: function() {
    var pos = this.getOption('position');

    var debrisCount = Math.floor(Math.random() * 5 + 10);
    for (var i = 0; i < debrisCount; i++) {
      this.getWorld().add(new Debris({
        position: pos,
        size: [10, 4],
        randomSize: Math.random()
      }));
    }
  }
});
