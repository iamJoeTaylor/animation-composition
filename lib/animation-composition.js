class Animation {
  constructor({
    canvas,
    layers,
    loop = true,
    ticksPerFrame = 0,
    debug = false,
    debugOffset = 0,
    onerror = () => {},
    paused = false,
  }) {
    this.canvas = canvas;
    this.loop = loop;

    this.layers = layers;

    this.debug = debug;
    this.debugOffset = debugOffset;
    this.onerror = onerror;

    if (this.debug) {
      this.canvases = [...this.layers]
        .map(
          (_l, i) => {
            if (i === 0) {
              return canvas;
            }

            const _canvas = canvas.cloneNode(true);
            _canvas.style = this._getCanvasStyle(i);
            canvas.parentNode.appendChild(_canvas);
            return _canvas;
          }
        );
    }

    this.maxNumOfFrames = this.layers.reduce((acc, cur, i) => {
     return Math.max(acc, cur.getFrames());
    }, 0);

    this.isPaused = paused;

    this.frameIndex = 0,
    this.tickCount = 0,
    this.ticksPerFrame = this.isPaused ? 0 : ticksPerFrame;

    // Start Animation
    this._preloadFrame(0)
      .then(this._RAFLoop());
  }

  _getCanvasStyle(i) {
    const canvasOffset = this.canvas.getBoundingClientRect()
    const shift = [ 'top', 'left' ];
    const keys = [ 'width', 'height'];
    const style = [...keys, ...shift]
      .reduce((acc, key) => `
        ${acc}
        ${key}:
          ${shift.indexOf(key) >= 0 ? canvasOffset[key] + (this.debugOffset * i) : canvasOffset[key]}px;
      `, 'position: absolute;');
    return style;
  }

  updateDebugOffset(debugOffset) {
    this.debugOffset = debugOffset;
  }

  destroy() {
    this._clearCtx();
    if (this.debug) {
      this.canvases.forEach((canvas, i) => i !== 0 && canvas.parentNode.removeChild(canvas));
    }
    this.isDestroyed = true;
  }

  next() {
    if (this.isDestroyed || !this.isPaused) return;

    this.render();
    this._RAFLoop(this.frameIndex)();
  }

  _update() {
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

  _RAFLoop(frameIndex = 0) {
    if (this.isDestroyed) return;

    const preloadFramePromise = this._preloadFrame(frameIndex + 1);
    this._update();
    return () => {
      preloadFramePromise
        .then(() => {
          if (!this.isPaused) {
            window.requestAnimationFrame(() => {
              if (this.isDestroyed) return;

              this._RAFLoop(this.frameIndex)();
            });
          }

          if (this.maxNumOfFrames !== 1 && this.frameIndex === frameIndex) return;

          if (!this.isPaused) this.render();
        });
    };
  }

  _preloadFrame(index) {
    const promises = this.layers.reduce((acc, layer) => {
      acc.push(layer.preload(index));
      return acc;
    }, []);
    return Promise.all(promises)
      .catch((err ={}) => {
        if (this.debug) {
          console.warn(`Error preloading image: ${JSON.stringify(err)}`);
        }
        this.onerror('Image not available', err);
      });
  }

  _clearCtx() {
    if (this.debug) {
      this.canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      });
      return;
    }

    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _setCtxComposite(operation, canvas) {
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = operation;
  }

  render() {
    this._clearCtx();

    if (this.debug) {
      [...this.layers]
        .forEach(
          (_l, i) => {
            if (i === 0) return;

            this.canvases[i].style = this._getCanvasStyle(i);
          }
        );
    }

    if (!this._layerRendering) {
      this._layerRendering = [...this.layers].reduce((acc, layer, i) => {
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

    [...this._layerRendering.masks].reverse().forEach((layer, i) => {
      const canvas = this.debug ?
        this.canvases[layer._originalIndex] :
        this.canvas;
      this._setCtxComposite('destination-over', canvas);
      layer.render(canvas, this.frameIndex);
    });

    [...this._layerRendering.premaskLayers].reverse().forEach((layer, i) => {
      const canvas = this.debug ?
        this.canvases[layer._originalIndex] :
        this.canvas;
      this._setCtxComposite('destination-over', canvas);
      layer.render(canvas, this.frameIndex);
    });

    [...this._layerRendering.postmaskLayers].forEach((layer, i) => {
      const canvas = this.debug ?
        this.canvases[layer._originalIndex] :
        this.canvas;
      this._setCtxComposite('source-over', canvas);
      layer.render(canvas, this.frameIndex);
    });
  }
}


class BaseLayer {
  constructor({ name = 'UNKOWN' } = {}) { this.name = name; }
  getFrames() { return 0; }
  preload() { return Promise.resolve(); }
}

class ColorLayer extends BaseLayer {
  constructor(opts) {
    super(opts);
    const { color } = opts;

    this.color = color;
  }
  render(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

class Layer extends BaseLayer {
  constructor(opts) {
    super(opts);
    const { images = [], sprite = {}, sizeRef, size } = opts;

    this.images = images;
    this.sprite = sprite;
    this._spriteSize = sprite.size;

    this.sizeRef = sizeRef;
    this.size = size;
    this.imageCache = [];
    this.imagesError = [];
  }

  getFrames() {
    return this._isSprite() ?
      this.sprite.frames :
      this.images.length;
  }

  getSize(index) {
    if (this._isSprite()) return { width: this._spriteSize, height: this._spriteSize };

    if (index >= this.images.length) index = this.images.length - 1;
    if (this.imageCache[index]) {
      const { width, height } = this.imageCache[index];
      return { width, height };
    }
    return null;
  }

  preload(index) {
    if (this._isSprite()) {
      if (this.spriteImageCache) return Promise.resolve();
      return new Promise((resolve, reject) => this._getSpriteImg(resolve, reject));
    }

    if (index >= this.images.length) return Promise.resolve();
    if (this.imageCache[index]) return Promise.resolve();
    return new Promise((resolve, reject) => this._getImg(index, resolve, reject));
  }

  _getImg(index, cb = () => {}, reject = () => {}) {
    if (index >= this.images.length) index = this.images.length - 1;
    if (this.imagesError[index]) return null;
    if (!!this.imageCache[index]) return this.imageCache[index];

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = cb;
    img.onerror = err => {
      this.imagesError[index] = true;
      reject(Object.assign({}, { src: this.images[index] }, err));
    };
    img.src = this.images[index];
    this.imageCache[index] = img;
    return img;
  }

  _getSpriteImg(cb = () => {}, reject = () => {}) {
    if (this.spriteImageError) return null;
    if (!!this.spriteImageCache) return this.spriteImageCache;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = (...args) => {
      this._spriteCol = img.width/this._spriteSize;
      this._spriteRow = img.height/this._spriteSize;

      cb(...args);
    }
    img.onerror = err => {
      this.spriteImageError = true;
      reject(Object.assign({}, { src: this.sprite.sheet }, err));
    };
    img.src = this.sprite.sheet;
    this.spriteImageCache = img;
    return img;
  }

  _getSpriteOrigin(frameIndex) {
    let col = frameIndex % this._spriteCol;
    let row = Math.floor(frameIndex / this._spriteCol);

    // Trying to get origin outside of image
    if (row >= this._spriteRow) {
      const maxFrameCol = this.sprite.frames % this._spriteCol;
      const maxFrameRow = Math.floor(this.sprite.frames / this._spriteCol);
      // Get last frame
      col = Math.min(maxFrameCol, this._spriteCol - 1);
      row = Math.min(maxFrameRow, this._spriteRow - 1);
    }

    const sx = col * this._spriteSize;
    const sy = row * this._spriteSize;

    return {
      sx,
      sy,
    };
  }

  _isSprite() {
    return this.images.length === 0 && !!this.sprite.sheet;
  }

  render(canvas, frameIndex) {
    const ctx = canvas.getContext('2d');
    if (!this._isSprite()) {
      const img = this._getImg(frameIndex);

      if (!img) return;
      if (this.sizeRef || this.size) {
        // Warning: When trying to abstract width and height out and only having a single call
        // to drawImage it breaks........WTFBBQ
        let { width, height } = this._getImg(0);
        let x = 0;
        let y = 0;

        if (this.size) {
          width = this.size.width || width;
          height = this.size.height || height;
          x = this.size.x || x;
          y = this.size.y || y;
        } else {
          const size = this.sizeRef.getSize(frameIndex);
          if (size) {
            width = size.width;
            height = size.height;
          }
        }
        return ctx.drawImage(img, x, y, width, height);
      }

      return ctx.drawImage(img, 0, 0);
    }

    // if _isSprite
    const { sx, sy } = this._getSpriteOrigin(Math.min(frameIndex, this.sprite.frames));
    const img = this._getSpriteImg();

    if (!img) return;
    ctx.drawImage(
      img, // image,
      sx,
      sy,
      this._spriteSize, // sWidth,
      this._spriteSize, // sHeight,
      0, // dx,
      0, // dy,
      this._spriteSize, // dWidth,
      this._spriteSize  // dHeight
    );
  }
}

class MaskLayer extends BaseLayer {
  constructor(opts) {
    super(opts);
    const { mask, layers } = opts;

    this.mask = mask;
    this.layers = layers;

    this.maxNumOfFrames = [this.mask, ...this.layers].reduce((acc, cur, i) => {
      return Math.max(acc, cur.getFrames());
    }, 0);
  }
  getFrames() { return this.maxNumOfFrames; }

  preload(index) {
    const promises = [this.mask, ...this.layers].reduce((acc, layer) => {
      acc.push(layer.preload(index));
      return acc;
    }, []);
    return Promise.all(promises);
  }

  render(canvas, frameIndex) {
    const ctx = canvas.getContext('2d');
    this.layers.forEach((layer, i) => {
      layer.render(canvas, frameIndex)
    });
    ctx.globalCompositeOperation = 'destination-in';
    this.mask.render(canvas, frameIndex);
  }
}

const imageStringIterator = (stringWithSymbol, start, end, padWithZeros = true) => {
  const images = [];
  for (let i = start; i <= end; i++) {
    const iAsString = `${end}`.length > `${i}`.length
      ? `0${i}`
      : `${i}`;
    images.push(stringWithSymbol.replace('XX', iAsString));
  }
  return images;
};

export default {
  Animation,
  BaseLayer,
  Layer,
  MaskLayer,
  ColorLayer,
  Utils: {
    imageStringIterator,
  },
};
