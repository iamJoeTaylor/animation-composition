class Animation {
  constructor({
    canvas,
    layers,
    loop = true,
    ticksPerFrame = 0,
    debug = false,
    debugOffset = 0,
  }) {
    this.canvas = canvas;
    this.loop = loop;

    this.layers = layers;

    this.debug = debug;
    this.debugOffset = debugOffset;

    if (this.debug) {
      const canvasOffset = canvas.getBoundingClientRect()
      const shift = [ 'top', 'left' ];
      const keys = [ 'width', 'height'];
      const style = i => [...keys, ...shift]
        .reduce((acc, key) => `
          ${acc}
          ${key}:
            ${shift.indexOf(key) >= 0 ? canvasOffset[key] + (this.debugOffset * i) : canvasOffset[key]}px;
        `, 'position: absolute;');
      this.canvases = [...this.layers]
        .map(
          (_l, i) => {
            if (i === 0) {
              return canvas;
            }

            const _canvas = canvas.cloneNode(true);
            _canvas.style = style(i);
            canvas.parentNode.appendChild(_canvas);
            return _canvas;
          }
        );
    }

    this.maxNumOfFrames = this.layers.reduce((acc, cur, i) => {
     return Math.max(acc, cur.getFrames());
    }, 0);

    this.frameIndex = 0,
    this.tickCount = 0,
    this.ticksPerFrame = ticksPerFrame;

    // Start Animation
    this._preloadFrame(0)
      .then(this._RAFLoop());
  }

  destroy() {
    this._clearCtx();
    if (this.debug) {
      this.canvases.forEach((canvas, i) => i !== 0 && canvas.parentNode.removeChild(canvas));
    }
    this.isDestroyed = true;
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
          window.requestAnimationFrame(() => {
            if (this.isDestroyed) return;

            this._RAFLoop(this.frameIndex)();
          });

          if (this.maxNumOfFrames !== 1 && this.frameIndex === frameIndex) return;
          this.render();
        });
    };
  }

  _preloadFrame(index) {
    const promises = this.layers.reduce((acc, layer) => {
      acc.push(layer.preload(index));
      return acc;
    }, []);
    return Promise.all(promises);
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
    const { images = [], sprite = {}, sizeRef } = opts;

    this.images = images;
    this.sprite = sprite;
    this._spriteSize = sprite.size;

    this.sizeRef = sizeRef;
    this.imageCache = [];
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
      return new Promise((resolve, reject) => this._getSpriteImg(resolve));
    }

    if (index >= this.images.length) return Promise.resolve();
    if (this.imageCache[index]) return Promise.resolve();
    return new Promise((resolve, reject) => this._getImg(index, resolve));
  }

  _getImg(index, cb = () => {}) {
    if (index >= this.images.length) index = this.images.length - 1;
    if (!!this.imageCache[index]) return this.imageCache[index];

    const img = new Image();
    img.onload = cb;
    img.src = this.images[index];
    this.imageCache[index] = img;
    return img;
  }

  _getSpriteImg(cb = () => {}) {
    if (!!this.spriteImageCache) return this.spriteImageCache;

    const img = new Image();
    img.onload = (...args) => {
      this._spriteCol = img.width/this._spriteSize;
      cb(...args);
    }
    img.src = this.sprite.sheet;
    this.spriteImageCache = img;
    return img;
  }

  _getSpriteOrigin(frameIndex) {
    const col = frameIndex % this._spriteCol;
    const row = Math.floor(frameIndex / this._spriteCol);
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
      if (this.sizeRef) {
        // Warning: When trying to abstract width and height out and only having a single call
        // to drawImage it breaks........WTFBBQ
        let width;
        let height;

        const size = this.sizeRef.getSize(frameIndex);
        if (size) {
          width = size.width;
          height = size.height;
        }
        return ctx.drawImage(this._getImg(frameIndex), 0, 0, width, height);
      }

      return ctx.drawImage(this._getImg(frameIndex), 0, 0);
    }

    // if _isSprite
    const { sx, sy } = this._getSpriteOrigin(frameIndex);
    ctx.drawImage(
      this._getSpriteImg(), // image,
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
