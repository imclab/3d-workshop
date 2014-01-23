import { defineWrapper } from './game';
import { proxyMethodsTo } from '../utils';

var Renderer = function(entity, options) {
  this.entity = entity;
  this.options_ = options;

  proxyMethodsTo.call(this, ['get'], this.entity);
};

Renderer.prototype.render = function(delta) {
};

Renderer.prototype.getOption = function(name) {
  var ref = this.options_[name];

  if ('function' === typeof ref) {
    return ref.call(this);
  } else {
    return ref;
  }
};

Renderer.prototype.destroy = function() {

};

Renderer.define = function(details) {
  var constructor = details.initialize || function() {};
  // delete details.initialize;

  return defineWrapper(Renderer, constructor, details);
};

export default = Renderer;