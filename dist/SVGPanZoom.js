(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.SVGPanZoom = factory());
}(this, (function () { 'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var defineProperty = Object.defineProperty;
var gOPD = Object.getOwnPropertyDescriptor;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) { /**/ }

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

// If name is '__proto__', and Object.defineProperty is available, define __proto__ as an own property on target
var setProperty = function setProperty(target, options) {
	if (defineProperty && options.name === '__proto__') {
		defineProperty(target, options.name, {
			enumerable: true,
			configurable: true,
			value: options.newValue,
			writable: true
		});
	} else {
		target[options.name] = options.newValue;
	}
};

// Return undefined instead of __proto__ if '__proto__' is not an own property
var getProperty = function getProperty(obj, name) {
	if (name === '__proto__') {
		if (!hasOwn.call(obj, name)) {
			return void 0;
		} else if (gOPD) {
			// In early versions of node, obj['__proto__'] is buggy when obj has
			// __proto__ as an own property. Object.getOwnPropertyDescriptor() works.
			return gOPD(obj, name).value;
		}
	}

	return obj[name];
};

var extend = function extend() {
	var options, name, src, copy, copyIsArray, clone;
	var target = arguments[0];
	var i = 1;
	var length = arguments.length;
	var deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = getProperty(target, name);
				copy = getProperty(options, name);

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						setProperty(target, { name: name, newValue: extend(deep, clone, copy) });

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						setProperty(target, { name: name, newValue: copy });
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};

function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//Polyfill for AnimationFrame
var GLOBAL = typeof window !== 'undefined' ? window : global;
var requestAnimationFrame = GLOBAL.requestAnimationFrame;
var cancelAnimationFrame = GLOBAL.cancelAnimationFrame;
if (!requestAnimationFrame || !cancelAnimationFrame) {
    var lastTime = 0;
    requestAnimationFrame = function requestAnimationFrame(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = GLOBAL.setTimeout(function () {
            callback(currTime + timeToCall);
        }, timeToCall);

        lastTime = currTime + timeToCall;
        return id;
    };
    cancelAnimationFrame = function cancelAnimationFrame(id) {
        clearTimeout(id);
    };
}

var Animation = function Animation(initialState, finalState, time, onChange, onComplete) {
    var _this = this;

    _classCallCheck$1(this, Animation);

    var start = 0;
    var now = 0;

    this.getCurrentState = function () {
        var currentState = {};
        Object.keys(initialState).forEach(function (key) {
            currentState[key] = initialState[key] + now / time * (finalState[key] - initialState[key]);
        });
        return currentState;
    };

    this.animate = function (timestamp) {
        if (!start) {
            start = timestamp;
        }

        now = timestamp - start;
        if (now <= time) {
            onChange(_this.getCurrentState());
            _this.id = requestAnimationFrame(_this.animate);
        } else {
            onComplete();
        }
    };

    this.id = requestAnimationFrame(this.animate.bind(this));
};

/**
 * Returns an animate method which executes given callback at intervals
 * animate method accepts (initialState, finalState, time)
 * callback has currentState as parameter
 * @param {Function} callback
 *   Executed at each step of animation
 */


var getAnimator = (function (callback) {
    var currentAnimation = void 0;
    return function (initialState, finalState, time, onComplete) {
        currentAnimation && cancelAnimationFrame(currentAnimation.id);
        currentAnimation = new Animation(initialState, finalState, time, callback || Function.prototype, function () {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            currentAnimation = null;
            (onComplete || Function.prototype).apply(null, args);
        });
    };
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultOptions = {
    initialViewBox: null,
    animationTime: 200,
    limits: null,
    eventMagnet: null,
    zoom: {
        factor: 0.25,
        minZoom: 0.1,
        maxZoom: 5,
        events: {
            mouseWheel: true,
            doubleClick: true,
            pinch: true
        },
        callback: function callback(multiplier) {}
    },
    pan: {
        factor: 100,
        events: {
            drag: true,
            dragMouseButton: 1,
            dragCursor: "move"
        },
        callback: function callback(coordinates) {}
    }
};

var defaultViewBox = {
    x: 0,
    y: 0,
    width: 1000,
    height: 1000
};

/**
 * Parse the viewbox string as defined in the spec for the svg tag.
 *
 * @param {String} viewBoxString
 *   A valid value of the `viewBox` attribute.
 *
 * @return {Object} viewBox
 *   A viewbox object. Contains numbers, in the format `{x, y, width, height}`.
 */
var parseViewBoxString = function parseViewBoxString(string) {
    var viewBox = string.replace(/\s+/g, " ").split(" ");
    return {
        x: parseFloat(viewBox[0]),
        y: parseFloat(viewBox[1]),
        width: parseFloat(viewBox[2]),
        height: parseFloat(viewBox[3])
    };
};

/**
 * Transform the point from page co-ordinate system to SVG co-ordinate system
 *
 * @param {SVGElement} svgRoot
 *   The `<svg>` DOM object
 *
 * @param {Object} point
 *   Coordinates of the point. Contains numbers, in the format `{x, y}`.
 *
 * @return {Object}
 *   Coordinates of the point in SVG co-ordinate system. Contains numbers, in the format `{x, y}`.
 */
var coordinateTransform = function coordinateTransform(svgRoot, point) {
    var pos = svgRoot.createSVGPoint();
    pos.x = parseInt(point.x, 10);
    pos.y = parseInt(point.y, 10);
    return pos.matrixTransform(svgRoot.getScreenCTM().inverse());
};

/**
 * Get the mouse or first touch position from the `event`, relative to the SVG viewBox.
 *
 * @param {SVGElement} svgRoot
 *   The `<svg>` DOM object
 *
 * @param {MouseEvent|TouchEvent|jQueryEvent} event
 *   The DOM or jQuery event.
 *
 * @return {Object}
 *   Coordinates of the event. Contains numbers, in the format `{x, y}`.
 */
var getViewBoxCoordinatesFromEvent = function getViewBoxCoordinatesFromEvent(svgRoot, e) {
    //If modified event get original event
    e = e.originalEvent || e;

    if (/touch/i.test(e.type)) {
        //Event has touch information
        if (e.touches !== null && e.touches.length) {
            e = e.touches[0];
        }
        //If touchend get the required info from changedTouches
        else if (e.changedTouches !== null && e.changedTouches.length) {
                e = e.changedTouches[0];
            }
    }

    var position = { x: e.clientX, y: e.clientY };
    return coordinateTransform(svgRoot, position);
};

/**
 * Create and set viewBox attribute of given SVG element
 *
 * @param {SVGElement} svg
 *   The `<svg>` DOM object
 *
 * @param {Object} viewBox
 *   A viewbox object. Contains numbers, in the format `{x, y, width, height}`.
 */
var setViewBox = function setViewBox(svg, viewBox) {
    svg.setAttribute("viewBox", [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' '));
};

/**
 * Get distance between fingers for two finger touch event
 *
 * @param {TouchEvent|jQueryEvent} event
 *   The DOM or jQuery event.
 */
var touchDistance = function touchDistance(event) {
    var touches = (event.originalEvent || event).touches;
    return Math.sqrt(Math.pow(touches[0].clientX - touches[1].clientX, 2) + Math.pow(touches[0].clientY - touches[1].clientY, 2));
};

/**
 * Check if the event is a two finger touch event
 *
 * @param {TouchEvent|jQueryEvent} event
 *   The DOM or jQuery event.
 */
var isDoubleTouch = function isDoubleTouch(event) {
    var touches = (event.originalEvent || event).touches;
    return touches.length === 2;
};

/**
 * Get mid point of fingers for two finger touch event in SVG co-ordinate system
 *
 * @param {SVGElement} svg
 *   The `<svg>` DOM object
 *
 * @param {TouchEvent|jQueryEvent} event
 *   The DOM or jQuery event.
 */
var touchCenter = function touchCenter(svg, event) {
    var touches = (event.originalEvent || event).touches;
    return coordinateTransform(svg, {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    });
};

var SVGPanZoom = function () {
    function SVGPanZoom(svg, options) {
        var _this = this;

        _classCallCheck(this, SVGPanZoom);

        if (!(svg instanceof SVGElement)) {
            throw new Error('Invalid Parameters. Firt parameter to SVGPanZoom should be an svg element');
        }

        this.svg = svg;
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        var viewBox = extend({}, svg.viewBox.baseVal);
        if (viewBox.x === 0 && viewBox.y === 0 && viewBox.width === 0 && viewBox.height === 0) {
            viewBox = defaultViewBox;
        }

        // Option validations
        options: {
            var _options = void 0;
            Object.defineProperty(this, 'options', {
                get: function get() {
                    return _options;
                },
                set: function set(options) {
                    if (_options) {
                        throw new Error('Options cannot be overriden');
                    }
                    _options = options;
                }
            });
        }

        setOptions: {
            var self = this;
            var _initialViewBox = void 0,
                _animationTime = void 0,
                _eventMagnet = void 0,
                _limits = void 0;

            this.options = {
                get initialViewBox() {
                    return _initialViewBox;
                },
                set initialViewBox(value) {
                    // Set initial viewbox
                    if (value !== null) {
                        if (typeof value === "string") {
                            viewBox = parseViewBoxString(value);
                        } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === "object") {
                            viewBox = extend({}, defaultViewBox, value);
                        } else {
                            throw new Error('initialViewBox is of invalid type');
                        }
                    }

                    _initialViewBox = extend({}, viewBox);
                },
                get animationTime() {
                    return _animationTime;
                },
                set animationTime(value) {
                    _animationTime = value || 0;
                },
                get eventMagnet() {
                    return _eventMagnet;
                },
                set eventMagnet(value) {
                    self.destroy();
                    _eventMagnet = value || svg;
                    self._setupEvents();
                },
                get limits() {
                    return _limits;
                },
                set limits(value) {
                    _limits = {};
                    var directionalLimits = ((value ? value : value === 0 ? 0 : 15) + '').trim().split(' ');

                    horizontal: {
                        var multiplier = Number((directionalLimits[1] || directionalLimits[0]).replace(/%/g, '')) / 100;
                        var horizontalSizeIncrement = viewBox.height * multiplier;
                        _limits.minX = viewBox.x - horizontalSizeIncrement;
                        _limits.maxX = viewBox.x + horizontalSizeIncrement;
                    }

                    vertical: {
                        var _multiplier = Number(directionalLimits[0].replace(/%/g, '')) / 100;
                        var verticalSizeIncrement = viewBox.width * _multiplier;
                        _limits.minY = viewBox.y - verticalSizeIncrement;
                        _limits.maxY = viewBox.y + verticalSizeIncrement;
                    }
                }
            };
        }

        // Animate method
        var animate = getAnimator(function (state) {
            return setViewBox(svg, state);
        });

        // Getter for ViewBox
        this.getViewBox = function () {
            return extend({}, viewBox);
        };

        // Setter for ViewBox
        this.setViewBox = function (x, y, width, height, animationTime, callback) {
            if (typeof animationTime === 'function') {
                callback = animationTime;
                animationTime = null;
            }

            if (!animationTime && animationTime !== 0) {
                animationTime = _this.options.animationTime;
            }

            var oldBox = _this.getViewBox();

            viewBox = {
                x: !!x || x === 0 ? x : viewBox.x,
                y: !!y || y === 0 ? y : viewBox.y,
                width: !!width || width === 0 ? width : viewBox.width,
                height: !!height || height === 0 ? height : viewBox.height
            };

            _this.validateLimits(viewBox);

            if (animationTime > 0) {
                animate(oldBox, viewBox, animationTime, callback);
            } else {
                setViewBox(svg, viewBox);
                (callback || Function.prototype)();
            }

            // Chaining
            return _this;
        };

        // Pan methods
        pan: {
            var panMethod = function panMethod(callback, amount, animationTime) {
                if (!this.options.pan) {
                    return this;
                }

                if (!amount && amount !== 0) {
                    amount = this.options.pan.factor;
                    if (!amount) {
                        return this;
                    }
                }

                return callback(amount, animationTime);
            };

            this.panLeft = panMethod.bind(this, function (amount, animationTime) {
                return _this.pan(viewBox.x - amount, null, animationTime);
            });

            this.panRight = panMethod.bind(this, function (amount, animationTime) {
                return _this.pan(viewBox.x + amount, null, animationTime);
            });

            this.panUp = panMethod.bind(this, function (amount, animationTime) {
                return _this.pan(null, viewBox.y - amount, animationTime);
            });

            this.panDown = panMethod.bind(this, function (amount, animationTime) {
                return _this.pan(null, viewBox.y + amount, animationTime);
            });

            this.pan = function (x, y, animationTime) {
                return _this.setViewBox(x, y, null, null, animationTime, function () {
                    _this.options.pan.callback(_this.getViewBox());
                });
            };
        }

        // Zoom methods
        zoom: {
            var zoomMethod = function zoomMethod(callback, focalPoint, amount, animationTime) {
                if (!this.options.zoom) {
                    return this;
                }

                if (!amount && amount !== 0) {
                    amount = this.options.zoom.factor;
                    if (!amount) {
                        return this;
                    }
                }

                return callback(focalPoint, amount, animationTime);
            };

            

            this.zoomIn = zoomMethod.bind(this, function (focalPoint, amount, animationTime) {
                return _this.zoomOut(focalPoint, -amount, animationTime);
            });

            this.zoomOut = zoomMethod.bind(this, function (focalPoint, amount, animationTime) {
                var newHeight = void 0,
                    newWidth = void 0;
                if (amount < 0) {
                    newWidth = viewBox.width / (1 - amount);
                    newHeight = viewBox.height / (1 - amount);
                } else {
                    newWidth = viewBox.width * (1 + amount);
                    newHeight = viewBox.height * (1 + amount);
                }

                //Validate zoom limits
                var minWidthAfterZoom = _this.options.initialViewBox.width / _this.options.zoom.maxZoom;
                var maxWidthAfterZoom = _this.options.initialViewBox.width / _this.options.zoom.minZoom;
                if (newWidth < minWidthAfterZoom) {
                    newHeight *= minWidthAfterZoom / newWidth;
                    newWidth = minWidthAfterZoom;
                } else if (newWidth > maxWidthAfterZoom) {
                    newHeight *= maxWidthAfterZoom / newWidth;
                    newWidth = maxWidthAfterZoom;
                }

                var minHeightAfterZoom = _this.options.initialViewBox.height / _this.options.zoom.maxZoom;
                var maxHeightAfterZoom = _this.options.initialViewBox.height / _this.options.zoom.minZoom;
                if (newHeight < minHeightAfterZoom) {
                    newWidth *= minHeightAfterZoom / newHeight;
                    newHeight = minHeightAfterZoom;
                } else if (newHeight > maxHeightAfterZoom) {
                    newWidth *= maxHeightAfterZoom / newHeight;
                    newHeight = maxHeightAfterZoom;
                }

                // Calculate origin based on the focal point constant
                var origin = void 0;
                if (!focalPoint) {
                    origin = {
                        x: viewBox.x + (viewBox.width - newWidth) / 2,
                        y: viewBox.y + (viewBox.height - newHeight) / 2
                    };
                } else {
                    origin = {
                        x: focalPoint.x + newWidth / viewBox.width * (viewBox.x - focalPoint.x),
                        y: focalPoint.y + newHeight / viewBox.height * (viewBox.y - focalPoint.y)
                    };
                }

                return _this.setViewBox(origin.x, origin.y, newWidth, newHeight, animationTime, function () {
                    _this.options.zoom.callback(_this.options.initialViewBox.width / newWidth, _this.getViewBox());
                });
            });
        }

        this.destroy = Function.prototype;

        // Fill in default options
        extend(this.options, extend(true, {}, defaultOptions, options));

        // Set initial viewbox
        this.reset(0);
    }

    _createClass(SVGPanZoom, [{
        key: 'validateLimits',
        value: function validateLimits(viewBox) {
            var limits = this.options.limits;
            var initialViewBox = this.options.initialViewBox;

            if (viewBox.width <= initialViewBox.width) {
                viewBox.x = Math.min(Math.max(viewBox.x, limits.minX), limits.maxX + (initialViewBox.width - viewBox.width));
            } else {
                viewBox.x = Math.min(Math.max(viewBox.x, limits.minX + (initialViewBox.width - viewBox.width)), limits.maxX);
            }

            if (viewBox.height <= initialViewBox.height) {
                viewBox.y = Math.min(Math.max(viewBox.y, limits.minY), limits.maxY + (initialViewBox.height - viewBox.height));
            } else {
                viewBox.y = Math.min(Math.max(viewBox.y, limits.minY + (initialViewBox.height - viewBox.height)), limits.maxY);
            }
        }
    }, {
        key: 'reset',
        value: function reset(animationTime, callback) {
            return this.clone(this.options.initialViewBox, animationTime, callback);
        }
    }, {
        key: 'clone',
        value: function clone(viewBox, animationTime, callback) {
            return this.setViewBox(viewBox.x, viewBox.y, viewBox.width, viewBox.height, animationTime, callback);
        }
    }, {
        key: 'getCenter',
        value: function getCenter() {
            var viewBox = this.getViewBox();
            return {
                x: viewBox.x + viewBox.width / 2,
                y: viewBox.y + viewBox.height / 2
            };
        }
    }, {
        key: 'setCenter',
        value: function setCenter(x, y, animationTime, callback) {
            var viewBox = this.getViewBox();
            return this.setViewBox(x - viewBox.width / 2, y - viewBox.height / 2, viewBox.width, viewBox.height, animationTime, callback);
        }
    }, {
        key: '_setupEvents',
        value: function _setupEvents() {
            var _this3 = this;

            var svg = this.svg;
            var handlers = {
                mousewheel: function mousewheel(event) {
                    event.preventDefault();
                    event.stopPropagation();

                    event = event || event.originalEvent;
                    var detail = event.detail || event.deltaX || event.deltaY || event.deltaZ;
                    var delta = parseInt(-detail || event.wheelDelta);

                    if (!delta || !this.options.zoom || !this.options.zoom.events.mouseWheel) {
                        return;
                    }

                    var mouse = getViewBoxCoordinatesFromEvent(svg, event);
                    if (delta > 0) {
                        this.zoomIn(mouse, null, 0);
                    } else {
                        this.zoomOut(mouse, null, 0);
                    }
                },
                dblclick: function dblclick(event) {
                    if (!this.options.zoom || !this.options.zoom.events.doubleClick) {
                        return;
                    }

                    this.zoomIn(getViewBoxCoordinatesFromEvent(svg, event));
                }
            };

            touchEvents: {
                var dragStarted = false;
                var scaleStarted = false;
                var preventClick = false;
                var pinchDistance = 0;

                handlers.click = function (event) {
                    if (preventClick) {
                        preventClick = false;
                        event.preventDefault();
                    }
                };

                handlers.pinchAndDrag = function (event) {
                    var _this2 = this;

                    if (!this.options.pan.events.drag || event.type === "mousedown" && event.which !== this.options.pan.events.dragMouseButton || dragStarted || scaleStarted) {
                        return;
                    }

                    preventClick = false;
                    var domBody = window.document.body;
                    var initialViewBox = extend({}, this.getViewBox());

                    var oldCursor = this.options.eventMagnet.style.cursor;
                    if (this.options.pan.events.dragCursor !== null) {
                        this.options.eventMagnet.style.cursor = this.options.pan.events.dragCursor;
                    }

                    if (event.type === "touchstart" && isDoubleTouch(event)) {
                        scaleStarted = true;
                        pinchDistance = touchDistance(event);
                    } else {
                        dragStarted = true;
                    }

                    var mouseMoveCallback = function mouseMoveCallback(event2) {
                        var isTouch = /touch/i.test(event.type);
                        var checkDoubleTouch = isTouch && isDoubleTouch(event2);

                        if (scaleStarted && !checkDoubleTouch) {
                            return;
                        }

                        event2.preventDefault();

                        if (!scaleStarted && checkDoubleTouch) {
                            scaleStarted = true;
                            dragStarted = false;
                            pinchDistance = touchDistance(event2);
                        }

                        if (Math.sqrt(Math.pow(event.pageX - event2.pageX, 2) + Math.pow(event.pageY - event2.pageY, 2)) > 25) {
                            preventClick = true;
                        }

                        if (dragStarted) {
                            var initialMousePosition = getViewBoxCoordinatesFromEvent(svg, event);
                            var currentMousePosition = getViewBoxCoordinatesFromEvent(svg, event2);
                            _this2.pan(initialViewBox.x + (initialMousePosition.x - currentMousePosition.x), initialViewBox.y + (initialMousePosition.y - currentMousePosition.y), 0);
                        } else if (scaleStarted) {
                            var newPinchDistance = touchDistance(event2);
                            if (newPinchDistance === pinchDistance) {
                                return;
                            }

                            var mouse = touchCenter(svg, event2);
                            if (pinchDistance > newPinchDistance) {
                                _this2.zoomOut(mouse, (pinchDistance - newPinchDistance) / newPinchDistance, 0);
                            } else {
                                _this2.zoomOut(mouse, (pinchDistance - newPinchDistance) / pinchDistance, 0);
                            }
                            pinchDistance = newPinchDistance;
                        }
                    };

                    var mouseUpCallback = function mouseUpCallback(event2) {
                        if (event2.type === "mouseout" && event2.target !== event2.currentTarget || event2.type === "mouseup" && event2.which !== _this2.options.pan.events.dragMouseButton) {
                            return;
                        }

                        domBody.removeEventListener("mousemove", mouseMoveCallback, { passive: false, capture: true });
                        domBody.removeEventListener("touchmove", mouseMoveCallback, { passive: false, capture: true });
                        domBody.removeEventListener("mouseup", mouseUpCallback, { passive: false, capture: true });
                        domBody.removeEventListener("touchend", mouseUpCallback, { passive: false, capture: true });
                        domBody.removeEventListener("touchcancel", mouseUpCallback, { passive: false, capture: true });
                        domBody.removeEventListener("mouseout", mouseUpCallback, { passive: false, capture: true });

                        if (_this2.options.pan.events.dragCursor !== null) {
                            _this2.options.eventMagnet.style.cursor = oldCursor;
                        }

                        dragStarted = false;
                        scaleStarted = false;
                        pinchDistance = 0;
                    };

                    domBody.addEventListener("mousemove", mouseMoveCallback, { passive: false, capture: true });
                    domBody.addEventListener("touchmove", mouseMoveCallback, { passive: false, capture: true });
                    domBody.addEventListener("mouseup", mouseUpCallback, { passive: false, capture: true });
                    domBody.addEventListener("touchend", mouseUpCallback, { passive: false, capture: true });
                    domBody.addEventListener("touchcancel", mouseUpCallback, { passive: false, capture: true });
                    domBody.addEventListener("mouseout", mouseUpCallback, { passive: false, capture: true });
                };
            }

            Object.keys(handlers).forEach(function (handler) {
                handlers[handler] = handlers[handler].bind(_this3);
            });

            this.options.eventMagnet.addEventListener("DOMMouseScroll", handlers.mousewheel);
            this.options.eventMagnet.addEventListener("wheel", handlers.mousewheel);

            this.options.eventMagnet.addEventListener("dblclick", handlers.dblclick);
            this.options.eventMagnet.addEventListener("click", handlers.click, { capture: true });

            this.options.eventMagnet.addEventListener("mousedown", handlers.pinchAndDrag, { passive: false, capture: true });
            this.options.eventMagnet.addEventListener("touchstart", handlers.pinchAndDrag, { passive: false, capture: true });

            this.destroy = function () {
                this.options.eventMagnet.removeEventListener("DOMMouseScroll", handlers.mousewheel);
                this.options.eventMagnet.removeEventListener("wheel", handlers.mousewheel);

                this.options.eventMagnet.removeEventListener("dblclick", handlers.dblclick);
                this.options.eventMagnet.removeEventListener("click", handlers.click, { capture: true });

                this.options.eventMagnet.removeEventListener("mousedown", handlers.pinchAndDrag, { passive: false, capture: true });
                this.options.eventMagnet.removeEventListener("touchstart", handlers.pinchAndDrag, { passive: false, capture: true });
            };
        }
    }]);

    return SVGPanZoom;
}();

return SVGPanZoom;

})));
//# sourceMappingURL=SVGPanZoom.js.map
