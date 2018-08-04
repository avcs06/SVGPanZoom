SVG Pan & Zoom v2
======================
A Javascript plugin to pan and zoom SVG images either programatically or through mouse/touch events

# Installation
```
npm install @avcs/svgpanzoom --save
```

# Live Demo
Available at [https://avcs.pro/svgpanzoom](https://avcs.pro/svgpanzoom).

# Project forked
This project uses [jquery-svg-pan-zoom project](https://github.com/DanielHoffmann/jquery-svg-pan-zoom) as base and improves on it.

# Features
 - Programmatically manipulate the SVG viewBox
 - Mouse and touch events to pan the SVG viewBox
 - Mousewheel and pinch events for zooming the SVG viewBox
 - Animate pan and zoom actions
 - Zooming keeps the cursor over the same coordinates relative to the image (A.K.A. GoogleMaps-like zoom)

# Dependencies
 - SVG-enabled browser (does not work with SVG work-arounds that use Flash)

# The viewBox
The viewBox is an attribute of SVG images that defines the area of the SVG that is visible, it is defined by 4 numbers: `X, Y, Width, Height`. These numbers together specify the visible area. This plugin works by manipulating these four numbers.
> **Examples**
> Reducing `X` value pans the SVG to left.
> By reducing `Width` and `Height` we can zoom in to the SVG.

# Usage
```javascript
var SVGPanZoom= new SVGPanZoom(SVGElement, options)
```

The returned SVGPanZoom instance contains all options inside options property, these can be overwritten at any time directly, for example to disable mouseWheel events simply:
```javascript
SVGPanZoom.options.zoom.events.mouseWheel= false
```

The SVGPanZoom instance also has methods for manipulating the viewBox programmatically. For example:
```javascript
SVGPanZoom.zoomIn()
```

# Options
Default values are inside `()`.
```javascript
Options: {
    /* the initial viewBox,
     * if null or undefined will try to use the viewBox set in the svg tag.
     * Also accepts string in the format "X Y Width Height"
     ***/
    initialViewBox: Object {
        x: Number (0), // the top-left corner X coordinate
        y: Number (0), // the top-left corner Y coordinate
        width: Number (1000), // the width of the viewBox
        height: Number (1000) // the height of the viewBox
    } (null),

    // Time(milliseconds) to use for animations. Set 0 to remove the animation
    animationTime: Number (200),

    /* ViewBox Limits in percentage
        * Number (15) (all directions)
        * String "Number Number" (15 15) (horizontal vertical)
        ***/
    limits: String (15),

    /* DOMElement(container) to which all the events are attached
     * If null events will be attached to SVG element itself
     * Useful when your own touch and mouse events are interfering with the events of plugin
     ***/
    eventMagnet: DOMElement (null),

    // Zoom Params, set false to disable zoom
    zoom: {
        // Zoom Factor, viewBox values are multiplied or divided based on this factor to zoom on each step
        // Formula: ZoomOut => newWidth = width / (1 + factor), ZoomIn => newWidth = width * (1 + factor)
        factor: Number (0.25),
        // Zoom Limits
        // minZoom:0.1 => zoom out up to 0.1x
        minZoom: Number (0.1),
        // maxZoom:5 => zoom in upto 5x
        maxZoom: Number (5),
        // Event related flags
        events: {
            // enable mouse wheel zooming events
            mouseWheel: Boolean (true),
            // enable double-click zooming events
            doubleClick: Boolean (true),
            // enable pinch zooming events
            pinch: Boolean (true)
        },
        // onZoom callback, multiplier = current multiplier
        callback: Function (function(multiplier) {})
    },
    // Pan Params, set false to disable pan
    pan: {
        // Pan Factor, this factor is added to or substracted from viewBox values to pan
        factor: Number (100),
        // Event related flags
        events: {
            // enable drag to PAN the SVG events
            drag: Boolean (true),
            // e.which value for the mouse button you want to use for dragging
            dragMouseButton : Number (1), 
            // cursor to use while dragging
            dragCursor: String ("move")
        },
        // onPan callback, coordinates = {x: x, y: y}
        callback: Function (function(coordinates) {})
    }
}
```

# Methods
### Pan Methods
```javascript
SVGPanZoom.panLeft([amount, animationTime])
SVGPanZoom.panRight([amount, animationTime])
SVGPanZoom.panUp([amount, animationTime])
SVGPanZoom.panDown([amount, animationTime])
```
Pans the SVG in the specified direction.

`amount` [`Number`] optional
PAN distance, defaults to options.panFactor.

`animationTime` [`Number`] optional
Animation duration, defaults to options.animationTime.

### Zoom Methods
```javascript
SVGPanZoom.zoomIn([focalPoint, amount, animationTime])
SVGPanZoom.zoomOut([focalPoint, amount, animationTime])
```
Zooms the SVG in or out.

`focalPoint` [`Object {x: Number,y: Number}`] optional
This point should be relative to SVG co-ordinate system, defaults to center of current viewBox. This point will remain at the same place after zooming.

`amount` [`Number`] optional
Zoom factor, defaults to options.zoomFactor.

`animationTime` [`Number`] optional
Animation duration, defaults to options.animationTime.

### reset
```javascript
SVGPanZoom.reset()
```
Resets the SVG to `options.initialViewBox` values.

### getViewBox
```javascript
SVGPanZoom.getViewBox()
```
Returns the viewbox in this format:
```javascript
{
    x: Number
    y: Number
    width: Number
    height: Number
}
```

### setViewBox
```javascript
SVGPanZoom.setViewBox(x, y, width, height, animationTime, callback)
```
Changes the viewBox to the specified coordinates. Will respect the `options.limits` adapting the viewBox if needed (moving or reducing it to fit into `options.limits`

`x` [`Number`]
the new x coodinate of the top-left corner

`y` [`Number`]
the new y coodinate of the top-left corner

`width` [`Number`]
the new width of the viewBox

`height` [`Number`]
the new height of the viewBox

`animationTime` [`Number`] optional
Animation duration, defaults to options.animationTime.

### setCenter
```javascript
SVGPanZoom.setCenter(x, y, animationTime)
```
Sets the center of the SVG.

`x` [`Number`]
the new x coodinate of the center

`y` [`Number`]
the new y coodinate of the center

`animationTime` [`Number`] optional
Animation duration, defaults to options.animationTime.

# Notes:
 - This plugin does not create any controls (like arrows to move the image) on top of the SVG. These controls are simple to create manually and they can programmatically call the methods to move the image.
 - Do not manipulate the SVG viewBox attribute manually, use `SVGPanZoom.setViewBox()` instead
