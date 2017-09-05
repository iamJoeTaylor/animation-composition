## Animation
#### Opts
- `canvas`: The canvas element for the animation to use
- `layers`: An Array of Layers composed however you'd like
- `loop` (optional default: true)
- `ticksPerFrame` (optional default: 0): How many frame delay you would like in each 60 frame/sec call. e.g. 1 ticksPerFrame is ~30fps
- `debug` (optional default: false): If you'd like to offset Layers or receive console logs
- `debugOffset` (optional default: 0): This only takes effect if `debug` is true. This is the amount of pixels to offset the layers for debugging.
- `onerror` (optional): If there is an error this function will be called

## Layers

### `BaseLayer`
This is a base class that can be extended. This base class is the base for all Layer Types included
in this library.

#### Opts
- `name` (optional): this can be used for debugging

Interface Methods are:
- `render(canvas, frameIndex)`
    You will use this to manipulate the Canvas in any way you'd like. Be aware this canvas could
    have data in it based on previous layers in the animation.

Preset Default Methods:
- `getFrames() { return 0; }`
- `preload() { return Promise.resolve(); }`

### `ColorLayer` (extends BaseLayer)
Color Layer will give a flat full canvas color fill. I built this for my use with MaskLayer to color
fill a mask image.

#### Opts
- `color`: a `CanvasRenderingContext2D.fillStyle`

EXAMPLE:
```js
const colorLayer = new ColorLayer({ color: 'rgba(51, 170, 51, .7)' });
```

### `Layer` (extends BaseLayer)
Layer is an image layer. This is used as an animation layer base for animating across multiple
images.

#### Opts
One of the following are required:
  - `images`: An array of one or more image URLs to be used
  - `sprite`: An object to describe the sprite sheet
    - `sheet`: The URL to the sprite sheet
    - `size`: width of a frame (only with is supported right now)
    - `frames`: Number of frames in the animation (this allows a sheet to have empty frames)
- `sizeRef` (optional): an optional reference to a Layer type to be used

EXAMPLE:
```js
const border = new Layer({
  images: [ '/ripple-web/border/ripple_border_00.png', '/ripple-web/border/ripple_border_01.png' ]
});
```

### `MaskLayer` (extends BaseLayer)
MaskLayer is used to cleverly compose global canvas masking to apply masks to certain layers. This
does have some hard limitations;

- Mask layers must be grouped together if there is more than one.
Example:
```
OK: [ shapeLayer1, mask1, mask2, shapeLayer2 ]

NOT VALID: [ mask1, shapeLayer1, mask2, shapeLayer2 ]
```

Technical explanation. Canvas only allows global mask composition, this means that any layer
data already written to the canvas will affect the mask. To work around that we first find all the
mask layers in the animation and render those first (top to bottom, writing new data below
existing data). After masks we write nonmask layers to the canvas being careful to place data
correctly below or above. If needed we could allow nongrouped mask layers, but it was not
needed for my usage.

#### Opts
- `mask`: A Layer that will be used as the mask source. This can be an animation.
- `layers`: An array of Layers to be masked using the source.

EXAMPLE:
```js
const avatarMask = new Layer({
  images: [ '/ripple-web/mask/ripple_00.png', '/ripple-web/mask/ripple_01.png' ],
});
const avatarImageLayer = new Layer({ images: [ '/ripple-web/avatar.png' ], sizeRef: avatarMask });
const avatarLayer = new MaskLayer({ mask: avatarMask, layers: [ avatarImageLayer ]});
```

## Utils

### `imageStringIterator(path, startNumber, endNumber)`
This Util is used to iterate over a number of images at a specific path.

#### Arguments
- path: Path with `XX` representing the number to be replaced
- startNumber: what to start at
- endNumber: what to end at

EXAMPLE:
```js
import AnimationComposition from 'animation-composition';
const { Utils } = AnimationComposition;
const { imageStringIterator } = Utils;

console.log(
  imageStringIterator(`/ripple/border/ripple_XX_xhdpi.png`, 0, 29)
);

// [
//   '/ripple/border/ripple_00_xhdpi.png',
//   '/ripple/border/ripple_01_xhdpi.png',
//   ...
//   '/ripple/border/ripple_29_xhdpi.png',
// ]
```

## Library Example
```js
import AnimationComposition from 'animation-composition';
const { Animation, Layer, MaskLayer, ColorLayer, Utils } = AnimationComposition;
const { imageStringIterator } = Utils;

const PATH = '/FAKE/PATH/';
const color = '#c0ffee';
const avatarImage = `${PATH}/myAvatar.png`;

const canvas = document.querySelector('canvas');

const border = new Layer({
  images: imageStringIterator(`${PATH}ripple-web/border/ripple_border_XX_xhdpi.png`, 0, 29)
});

const colorLayer = new ColorLayer({ color });
const fill = new Layer({
  images: imageStringIterator(`${PATH}ripple-web/fill/ripple_fill_XX_xhdpi.png`, 0, 29)
});
const participantLayer = new MaskLayer({ name: 'participantLayer', mask: fill, layers: [ colorLayer ]});

const avatarMask = new Layer({ images: imageStringIterator(`${PATH}ripple-web/mask/ripple_mask_XX_xhdpi.png`, 0, 29) });
const avatarImageLayer = new Layer({ images: [ avatarImage ], sizeRef: avatarMask });
const avatarLayer = new MaskLayer({ mask: avatarMask, layers: [ avatarImageLayer ]});

new Animation({
  ticksPerFrame: 1,
  canvas,
  layers: [ border, participantLayer, avatarLayer ],
});
```
