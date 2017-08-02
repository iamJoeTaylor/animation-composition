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
- `images`: An array of one or more images to be used
- `sizeRef` (optional): an optional reference to a Layer type to be used

EXAMPLE:
```js
const border = new Layer({
  images: [ '/ripple-web/border/ripple_border_00.png', '/ripple-web/border/ripple_border_01.png' ]
});
```

### `MaskLayer` (extends BaseLayer)
MaskLayer is used to cleverly compose global canvas masking to apply masks to certain layers. This
does have some hard limitations (to be explained later), though this should handle most simple
cases.

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

return new Animation({
  ticksPerFrame: 1,
  canvas,
  layers: [ border, participantLayer, avatarLayer ],
});
```
