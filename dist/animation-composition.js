(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define('AnimationComposition', ['exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.AnimationComposition = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    } else {
      return Array.from(arr);
    }
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var Animation = function () {
    function Animation(_ref) {
      var canvas = _ref.canvas,
          layers = _ref.layers,
          _ref$loop = _ref.loop,
          loop = _ref$loop === undefined ? true : _ref$loop,
          _ref$ticksPerFrame = _ref.ticksPerFrame,
          ticksPerFrame = _ref$ticksPerFrame === undefined ? 0 : _ref$ticksPerFrame;

      _classCallCheck(this, Animation);

      this.canvas = canvas;
      this.loop = loop;

      this.layers = layers;

      this.maxNumOfFrames = this.layers.reduce(function (acc, cur, i) {
        return Math.max(acc, cur.getFrames());
      }, 0);

      this.frameIndex = 0, this.tickCount = 0, this.ticksPerFrame = ticksPerFrame;

      // Start Animation
      this._preloadFrame(0).then(this._RAFLoop());
    }

    _createClass(Animation, [{
      key: 'destroy',
      value: function destroy() {
        this.isDestroyed = true;
      }
    }, {
      key: '_update',
      value: function _update() {
        if (this.isDestroyed) return;
        this.tickCount += 1;

        if (this.tickCount > this.ticksPerFrame) {
          this.tickCount = 0;

          // If the current frame index is in range
          if (this.frameIndex + 1 < this.maxNumOfFrames) {
            // Go to the next frame
            this.frameIndex += 1;
          } else if (this.loop) {
            this.frameIndex = 0;
          }
        }
      }
    }, {
      key: '_RAFLoop',
      value: function _RAFLoop() {
        var _this = this;

        var frameIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        if (this.isDestroyed) return;

        var preloadFramePromise = this._preloadFrame(frameIndex + 1);
        this._update();
        return function () {
          preloadFramePromise.then(function () {
            window.requestAnimationFrame(function () {
              if (_this.isDestroyed) return;

              _this._RAFLoop(_this.frameIndex)();
            });

            if (_this.maxNumOfFrames !== 1 && _this.frameIndex === frameIndex) return;
            _this.render();
          });
        };
      }
    }, {
      key: '_preloadFrame',
      value: function _preloadFrame(index) {
        var promises = this.layers.reduce(function (acc, layer) {
          acc.push(layer.preload(index));
          return acc;
        }, []);
        return Promise.all(promises);
      }
    }, {
      key: 'render',
      value: function render() {
        var _this2 = this;

        // Render top down
        var ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        [].concat(_toConsumableArray(this.layers)).reverse().forEach(function (layer, i) {
          ctx.globalCompositeOperation = 'destination-over';
          layer.render(_this2.canvas, _this2.frameIndex);
        });
      }
    }]);

    return Animation;
  }();

  var BaseLayer = function () {
    function BaseLayer() {
      var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          _ref2$name = _ref2.name,
          name = _ref2$name === undefined ? 'UNKOWN' : _ref2$name;

      _classCallCheck(this, BaseLayer);

      this.name = name;
    }

    _createClass(BaseLayer, [{
      key: 'getFrames',
      value: function getFrames() {
        return 0;
      }
    }, {
      key: 'preload',
      value: function preload() {
        return Promise.resolve();
      }
    }]);

    return BaseLayer;
  }();

  var ColorLayer = function (_BaseLayer) {
    _inherits(ColorLayer, _BaseLayer);

    function ColorLayer(opts) {
      _classCallCheck(this, ColorLayer);

      var _this3 = _possibleConstructorReturn(this, (ColorLayer.__proto__ || Object.getPrototypeOf(ColorLayer)).call(this, opts));

      var color = opts.color;


      _this3.color = color;
      return _this3;
    }

    _createClass(ColorLayer, [{
      key: 'render',
      value: function render(canvas) {
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }]);

    return ColorLayer;
  }(BaseLayer);

  var Layer = function (_BaseLayer2) {
    _inherits(Layer, _BaseLayer2);

    function Layer(opts) {
      _classCallCheck(this, Layer);

      var _this4 = _possibleConstructorReturn(this, (Layer.__proto__ || Object.getPrototypeOf(Layer)).call(this, opts));

      var images = opts.images,
          sizeRef = opts.sizeRef;


      _this4.images = images;
      _this4.sizeRef = sizeRef;
      _this4.imageCache = [];
      return _this4;
    }

    _createClass(Layer, [{
      key: 'getFrames',
      value: function getFrames() {
        return this.images.length;
      }
    }, {
      key: 'getSize',
      value: function getSize(index) {
        if (index >= this.images.length) index = this.images.length - 1;
        if (this.imageCache[index]) {
          var _imageCache$index = this.imageCache[index],
              width = _imageCache$index.width,
              height = _imageCache$index.height;

          return { width: width, height: height };
        }
        return null;
      }
    }, {
      key: 'preload',
      value: function preload(index) {
        var _this5 = this;

        if (index >= this.images.length) return Promise.resolve();
        if (this.imageCache[index]) return Promise.resolve();
        return new Promise(function (resolve, reject) {
          return _this5._getImg(index, resolve);
        });
      }
    }, {
      key: '_getImg',
      value: function _getImg(index) {
        var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

        if (index >= this.images.length) index = this.images.length - 1;
        if (!!this.imageCache[index]) return this.imageCache[index];

        var img = new Image();
        img.onload = cb;
        img.src = this.images[index];
        this.imageCache[index] = img;
        return img;
      }
    }, {
      key: 'render',
      value: function render(canvas, frameIndex) {
        var ctx = canvas.getContext('2d');
        if (this.sizeRef) {
          var width = void 0;
          var height = void 0;

          var size = this.sizeRef.getSize(frameIndex);
          if (size) {
            width = size.width;
            height = size.height;
          }
          return ctx.drawImage(this._getImg(frameIndex), 0, 0, width, height);
        }
        ctx.drawImage(this._getImg(frameIndex), 0, 0);
      }
    }]);

    return Layer;
  }(BaseLayer);

  var MaskLayer = function (_BaseLayer3) {
    _inherits(MaskLayer, _BaseLayer3);

    function MaskLayer(opts) {
      _classCallCheck(this, MaskLayer);

      var _this6 = _possibleConstructorReturn(this, (MaskLayer.__proto__ || Object.getPrototypeOf(MaskLayer)).call(this, opts));

      var mask = opts.mask,
          layers = opts.layers;


      _this6.mask = mask;
      _this6.layers = layers;

      _this6.maxNumOfFrames = [_this6.mask].concat(_toConsumableArray(_this6.layers)).reduce(function (acc, cur, i) {
        return Math.max(acc, cur.getFrames());
      }, 0);
      return _this6;
    }

    _createClass(MaskLayer, [{
      key: 'getFrames',
      value: function getFrames() {
        return this.maxNumOfFrames;
      }
    }, {
      key: 'preload',
      value: function preload(index) {
        var promises = [this.mask].concat(_toConsumableArray(this.layers)).reduce(function (acc, layer) {
          acc.push(layer.preload(index));
          return acc;
        }, []);
        return Promise.all(promises);
      }
    }, {
      key: 'render',
      value: function render(canvas, frameIndex) {
        var ctx = canvas.getContext('2d');
        this.layers.forEach(function (layer, i) {
          layer.render(canvas, frameIndex);
        });
        ctx.globalCompositeOperation = 'destination-in';
        this.mask.render(canvas, frameIndex);
      }
    }]);

    return MaskLayer;
  }(BaseLayer);

  exports.default = {
    Animation: Animation,
    BaseLayer: BaseLayer,
    Layer: Layer,
    MaskLayer: MaskLayer,
    ColorLayer: ColorLayer
  };
});
