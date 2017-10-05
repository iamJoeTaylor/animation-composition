(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.animationComposition = mod.exports;
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
      var _this = this;

      var canvas = _ref.canvas,
          layers = _ref.layers,
          _ref$loop = _ref.loop,
          loop = _ref$loop === undefined ? true : _ref$loop,
          _ref$ticksPerFrame = _ref.ticksPerFrame,
          ticksPerFrame = _ref$ticksPerFrame === undefined ? 0 : _ref$ticksPerFrame,
          _ref$debug = _ref.debug,
          debug = _ref$debug === undefined ? false : _ref$debug,
          _ref$debugOffset = _ref.debugOffset,
          debugOffset = _ref$debugOffset === undefined ? 0 : _ref$debugOffset,
          _ref$onerror = _ref.onerror,
          onerror = _ref$onerror === undefined ? function () {} : _ref$onerror,
          _ref$paused = _ref.paused,
          paused = _ref$paused === undefined ? false : _ref$paused;

      _classCallCheck(this, Animation);

      this.canvas = canvas;
      this.loop = loop;

      this.layers = layers;

      this.debug = debug;
      this.debugOffset = debugOffset;
      this.onerror = onerror;

      if (this.debug) {
        this.canvases = [].concat(_toConsumableArray(this.layers)).map(function (_l, i) {
          if (i === 0) {
            return canvas;
          }

          var _canvas = canvas.cloneNode(true);
          _canvas.style = _this._getCanvasStyle(i);
          canvas.parentNode.appendChild(_canvas);
          return _canvas;
        });
      }

      this.maxNumOfFrames = this.layers.reduce(function (acc, cur, i) {
        return Math.max(acc, cur.getFrames());
      }, 0);

      this.isPaused = paused;

      this.frameIndex = 0, this.tickCount = 0, this.ticksPerFrame = this.isPaused ? 0 : ticksPerFrame;

      // Start Animation
      this._preloadFrame(0).then(this._RAFLoop());
    }

    _createClass(Animation, [{
      key: '_getCanvasStyle',
      value: function _getCanvasStyle(i) {
        var _this2 = this;

        var canvasOffset = this.canvas.getBoundingClientRect();
        var shift = ['top', 'left'];
        var keys = ['width', 'height'];
        var style = [].concat(keys, shift).reduce(function (acc, key) {
          return '\n        ' + acc + '\n        ' + key + ':\n          ' + (shift.indexOf(key) >= 0 ? canvasOffset[key] + _this2.debugOffset * i : canvasOffset[key]) + 'px;\n      ';
        }, 'position: absolute;');
        return style;
      }
    }, {
      key: 'updateDebugOffset',
      value: function updateDebugOffset(debugOffset) {
        this.debugOffset = debugOffset;
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        this._clearCtx();
        if (this.debug) {
          this.canvases.forEach(function (canvas, i) {
            return i !== 0 && canvas.parentNode.removeChild(canvas);
          });
        }
        this.isDestroyed = true;
      }
    }, {
      key: 'next',
      value: function next() {
        if (this.isDestroyed || !this.isPaused) return;

        this.render();
        this._RAFLoop(this.frameIndex)();
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
        var _this3 = this;

        var frameIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        if (this.isDestroyed) return;

        var preloadFramePromise = this._preloadFrame(frameIndex + 1);
        this._update();
        return function () {
          preloadFramePromise.then(function () {
            if (!_this3.isPaused) {
              window.requestAnimationFrame(function () {
                if (_this3.isDestroyed) return;

                _this3._RAFLoop(_this3.frameIndex)();
              });
            }

            if (_this3.maxNumOfFrames !== 1 && _this3.frameIndex === frameIndex) return;

            if (!_this3.isPaused) _this3.render();
          });
        };
      }
    }, {
      key: '_preloadFrame',
      value: function _preloadFrame(index) {
        var _this4 = this;

        var promises = this.layers.reduce(function (acc, layer) {
          acc.push(layer.preload(index));
          return acc;
        }, []);
        return Promise.all(promises).catch(function () {
          var err = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          if (_this4.debug) {
            console.warn('Error preloading image: ' + JSON.stringify(err));
          }
          _this4.onerror('Image not available', err);
        });
      }
    }, {
      key: '_clearCtx',
      value: function _clearCtx() {
        var _this5 = this;

        if (this.debug) {
          this.canvases.forEach(function (canvas) {
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, _this5.canvas.width, _this5.canvas.height);
          });
          return;
        }

        var ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }, {
      key: '_setCtxComposite',
      value: function _setCtxComposite(operation, canvas) {
        var ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = operation;
      }
    }, {
      key: 'render',
      value: function render() {
        var _this6 = this;

        this._clearCtx();

        if (this.debug) {
          [].concat(_toConsumableArray(this.layers)).forEach(function (_l, i) {
            if (i === 0) return;

            _this6.canvases[i].style = _this6._getCanvasStyle(i);
          });
        }

        if (!this._layerRendering) {
          this._layerRendering = [].concat(_toConsumableArray(this.layers)).reduce(function (acc, layer, i) {
            layer._originalIndex = i;
            if (!!layer.mask) {
              acc.masks.push(layer);
            } else {
              if (acc.masks.length) {
                acc.postmaskLayers.push(layer);
              } else {
                acc.premaskLayers.push(layer);
              }
            }

            return acc;
          }, { masks: [], premaskLayers: [], postmaskLayers: [] });
        }

        [].concat(_toConsumableArray(this._layerRendering.masks)).reverse().forEach(function (layer, i) {
          var canvas = _this6.debug ? _this6.canvases[layer._originalIndex] : _this6.canvas;
          _this6._setCtxComposite('destination-over', canvas);
          layer.render(canvas, _this6.frameIndex);
        });

        [].concat(_toConsumableArray(this._layerRendering.premaskLayers)).reverse().forEach(function (layer, i) {
          var canvas = _this6.debug ? _this6.canvases[layer._originalIndex] : _this6.canvas;
          _this6._setCtxComposite('destination-over', canvas);
          layer.render(canvas, _this6.frameIndex);
        });

        [].concat(_toConsumableArray(this._layerRendering.postmaskLayers)).forEach(function (layer, i) {
          var canvas = _this6.debug ? _this6.canvases[layer._originalIndex] : _this6.canvas;
          _this6._setCtxComposite('source-over', canvas);
          layer.render(canvas, _this6.frameIndex);
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

      var _this7 = _possibleConstructorReturn(this, (ColorLayer.__proto__ || Object.getPrototypeOf(ColorLayer)).call(this, opts));

      var color = opts.color;


      _this7.color = color;
      return _this7;
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

      var _this8 = _possibleConstructorReturn(this, (Layer.__proto__ || Object.getPrototypeOf(Layer)).call(this, opts));

      var _opts$images = opts.images,
          images = _opts$images === undefined ? [] : _opts$images,
          _opts$sprite = opts.sprite,
          sprite = _opts$sprite === undefined ? {} : _opts$sprite,
          sizeRef = opts.sizeRef,
          size = opts.size;


      _this8.images = images;
      _this8.sprite = sprite;
      _this8._spriteSize = sprite.size;

      _this8.sizeRef = sizeRef;
      _this8.size = size;
      _this8.imageCache = [];
      _this8.imagesError = [];
      return _this8;
    }

    _createClass(Layer, [{
      key: 'getFrames',
      value: function getFrames() {
        return this._isSprite() ? this.sprite.frames : this.images.length;
      }
    }, {
      key: 'getSize',
      value: function getSize(index) {
        if (this._isSprite()) return { width: this._spriteSize, height: this._spriteSize };

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
        var _this9 = this;

        if (this._isSprite()) {
          if (this.spriteImageCache) return Promise.resolve();
          return new Promise(function (resolve, reject) {
            return _this9._getSpriteImg(resolve, reject);
          });
        }

        if (index >= this.images.length) return Promise.resolve();
        if (this.imageCache[index]) return Promise.resolve();
        return new Promise(function (resolve, reject) {
          return _this9._getImg(index, resolve, reject);
        });
      }
    }, {
      key: '_getImg',
      value: function _getImg(index) {
        var _this10 = this;

        var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};
        var reject = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};

        if (index >= this.images.length) index = this.images.length - 1;
        if (this.imagesError[index]) return null;
        if (!!this.imageCache[index]) return this.imageCache[index];

        var img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = cb;
        img.onerror = function (err) {
          _this10.imagesError[index] = true;
          reject(Object.assign({}, { src: _this10.images[index] }, err));
        };
        img.src = this.images[index];
        this.imageCache[index] = img;
        return img;
      }
    }, {
      key: '_getSpriteImg',
      value: function _getSpriteImg() {
        var _this11 = this;

        var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};
        var reject = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

        if (this.spriteImageError) return null;
        if (!!this.spriteImageCache) return this.spriteImageCache;

        var img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function () {
          _this11._spriteCol = img.width / _this11._spriteSize;
          _this11._spriteRow = img.height / _this11._spriteSize;

          cb.apply(undefined, arguments);
        };
        img.onerror = function (err) {
          _this11.spriteImageError = true;
          reject(Object.assign({}, { src: _this11.sprite.sheet }, err));
        };
        img.src = this.sprite.sheet;
        this.spriteImageCache = img;
        return img;
      }
    }, {
      key: '_getSpriteOrigin',
      value: function _getSpriteOrigin(frameIndex) {
        var col = frameIndex % this._spriteCol;
        var row = Math.floor(frameIndex / this._spriteCol);

        // Trying to get origin outside of image
        if (row >= this._spriteRow) {
          var maxFrameCol = this.sprite.frames % this._spriteCol;
          var maxFrameRow = Math.floor(this.sprite.frames / this._spriteCol);
          // Get last frame
          col = Math.min(maxFrameCol, this._spriteCol - 1);
          row = Math.min(maxFrameRow, this._spriteRow - 1);
        }

        var sx = col * this._spriteSize;
        var sy = row * this._spriteSize;

        return {
          sx: sx,
          sy: sy
        };
      }
    }, {
      key: '_isSprite',
      value: function _isSprite() {
        return this.images.length === 0 && !!this.sprite.sheet;
      }
    }, {
      key: 'render',
      value: function render(canvas, frameIndex) {
        var ctx = canvas.getContext('2d');
        if (!this._isSprite()) {
          var _img = this._getImg(frameIndex);

          if (!_img) return;
          if (this.sizeRef || this.size) {
            var _getImg2 = this._getImg(0),
                width = _getImg2.width,
                height = _getImg2.height;

            var x = 0;
            var y = 0;

            if (this.size) {
              width = this.size.width || width;
              height = this.size.height || height;
              x = this.size.x || x;
              y = this.size.y || y;
            } else {
              var size = this.sizeRef.getSize(frameIndex);
              if (size) {
                width = size.width;
                height = size.height;
              }
            }
            return ctx.drawImage(_img, x, y, width, height);
          }

          return ctx.drawImage(_img, 0, 0);
        }

        // if _isSprite

        var _getSpriteOrigin2 = this._getSpriteOrigin(Math.min(frameIndex, this.sprite.frames)),
            sx = _getSpriteOrigin2.sx,
            sy = _getSpriteOrigin2.sy;

        var img = this._getSpriteImg();

        if (!img) return;
        ctx.drawImage(img, // image,
        sx, sy, this._spriteSize, // sWidth,
        this._spriteSize, // sHeight,
        0, // dx,
        0, // dy,
        this._spriteSize, // dWidth,
        this._spriteSize // dHeight
        );
      }
    }]);

    return Layer;
  }(BaseLayer);

  var MaskLayer = function (_BaseLayer3) {
    _inherits(MaskLayer, _BaseLayer3);

    function MaskLayer(opts) {
      _classCallCheck(this, MaskLayer);

      var _this12 = _possibleConstructorReturn(this, (MaskLayer.__proto__ || Object.getPrototypeOf(MaskLayer)).call(this, opts));

      var mask = opts.mask,
          layers = opts.layers;


      _this12.mask = mask;
      _this12.layers = layers;

      _this12.maxNumOfFrames = [_this12.mask].concat(_toConsumableArray(_this12.layers)).reduce(function (acc, cur, i) {
        return Math.max(acc, cur.getFrames());
      }, 0);
      return _this12;
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

  var imageStringIterator = function imageStringIterator(stringWithSymbol, start, end) {
    var padWithZeros = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

    var images = [];
    for (var i = start; i <= end; i++) {
      var iAsString = ('' + end).length > ('' + i).length ? '0' + i : '' + i;
      images.push(stringWithSymbol.replace('XX', iAsString));
    }
    return images;
  };

  exports.default = {
    Animation: Animation,
    BaseLayer: BaseLayer,
    Layer: Layer,
    MaskLayer: MaskLayer,
    ColorLayer: ColorLayer,
    Utils: {
      imageStringIterator: imageStringIterator
    }
  };
});