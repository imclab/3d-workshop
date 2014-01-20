var Util = {};

var counter = 0;

function makeComponent() {
  var l = arguments.length;

  var mixins = new Array(l + 1);

  for (var i = 0; i < l; i++) {
    mixins[i] = arguments[i];
  }

  var Component = function(params) {
    var args = Array.prototype.slice.call(arguments, 1);

    this.params = params || {};
    if ('undefined' === typeof this.params.id) {
      this.params.id = counter++;
    }
    
    this.klassName = this.toString().split(',')[0].toLowerCase();
    this.klass = { type: this.klassName };

    var beforeArgs = ['before:initialize'].concat(args);
    this.trigger.apply(this, beforeArgs);

    this.initialize.apply(this, args);
    
    var afterArgs = ['after:initialize'].concat(args);
    this.trigger.apply(this, afterArgs);
  };

  Component.prototype.initialize = function() {
  };

  var functionNameRegEx = /function (.*?)\s?\(/;
  Component.toString = Component.prototype.toString = function () {
    if (this.realName) { return this.realName; }

    var prettyPrintMixins = mixins.map(function (mixin) {
      var name = mixin.realName || mixin.name;
      if (name == null) {
        // function name property not supported by this browser, use regex
        var m = mixin.toString().match(functionNameRegEx);
        return m && m[1] ? m[1] : '';
      } else {
        return name;
      }
    }).filter(Boolean).join(', ');

    return prettyPrintMixins;
  };

  mixins.unshift(withPubSub);
  flight.compose.mixin(Component.prototype, mixins);

  return Component;
}

var GameObject = {};
GameObject.define = makeGameObject = function makeGameObject() {
  var mixins = Array.prototype.slice.call(arguments, 0);
  mixins.unshift(withState);
  mixins.unshift(withWorldReference);
  return makeComponent.apply(this, mixins)
}

function makeBehavior(behavior) {
  return function(options) {
    options = options || {};
    var eventMap = options.eventMap || {};

    var component = makeComponent(Behavior, withComponent);
    component.realName = component.prototype.realName = behavior.name;

    return component;

    function Behavior() {
      this.options = options;

      this.getOption = function(name) {
        var ref = this.options[name];

        if ('function' === typeof ref) {
          return ref.call(this);
        } else {
          return ref;
        }
      };

      behavior.apply(this, arguments);

      for (var key in eventMap) {
        if (eventMap.hasOwnProperty(key)) {
          this[key] = this[eventMap[key]];
        }
      }
    }
  };
}

Function.prototype.inherits = function(parentConstructor) {
  var childConstructor = this;
  childConstructor.prototype = Object.create(parentConstructor.prototype);
  childConstructor.parent = parentConstructor;
  childConstructor.getters = {};
  childConstructor.setters = {};
  childConstructor.type = childConstructor.name.toLowerCase();
  return childConstructor;
}

Util.arrayBufferToString = function(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

Util.stringToArrayBuffer = function(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}


Util.decodeBase64 = (function() {
  var   __map = {}
    , __map_18 = {}
    , __map_12 = {}
    , __map_6 = {};
 
  !function() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
 
     for (var i = 0, j = chars.length, c; i < j; i ++) {
      c = chars.charAt(i);
      __map[c] = i;
      __map_18[c] = i << 18;
      __map_12[c] = i << 12;
      __map_6[c] = i << 6;
     }
  }();
 
  return function(_a, callback) {
    if (_a.indexOf('\n') !== -1)
      _a = _a.replace(/\n/g, '');
 
    var execute = function() {
      var   a = _a
        , map_18 = __map_18
        , map_12 = __map_12
        , map_6 = __map_6
        , map = __map
        , length = a.length
        , padindex = a.indexOf('=')
        , padlen = padindex > -1 ? length - padindex : 0
        , result = new DataView(new ArrayBuffer(length * 3 / 4 - padlen))
        , offset = 0
        , last = length - 4 - (length % 4);
 
      for (var i = 0, padding_length, len, n; i < length; i += 4) {
        if (i === last) {
          len = 4 - (padlen || (i + 4) - length);
          padding_length = len % 4;
 
          n = (len > 0 ? map_18[a[i + 0]] : 0) |
            (len > 1 ? map_12[a[i + 1]] : 0) |
            (len > 2 ? map_6[a[i + 2]] : 0) |
            (len > 3 ? map[a[i + 3]] : 0);
        } else {
          padding_length = 0;
          n = map_18[a[i + 0]] | map_12[a[i + 1]] | map_6[a[i + 2]] | map[a[i + 3]];
        }
 
        switch (padding_length) {
        case 0:
        case 1:
          result.setUint8(offset ++, n >>> 16);
          result.setUint8(offset ++, (n >>> 8) & 0xff);
          result.setUint8(offset ++, n & 0xff);
          break;
        case 2:
          result.setUint8(offset ++, n >>> 16);
          break;
        case 3:
          result.setUint8(offset ++, n >>> 16);
          result.setUint8(offset ++, (n >>> 8) & 0xff);
          break;
        }
      }
 
      return result;
    };
 
    if (callback) {
      setTimeout(function() {
        callback(execute());
      }, 0);
    } else {
      return execute();
    }
  };
})();

Util.encodeBase64 = function(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
 
  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder
 
  var a, b, c, d
  var chunk
 
  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
 
    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1
 
    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }
 
  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]
 
    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
 
    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1
 
    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
 
    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4
 
    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1
 
    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  
  return base64
}


if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = Util;
  }
  exports.Util = Util;
}