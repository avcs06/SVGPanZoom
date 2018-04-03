'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
  Jquery SVG Pan & Zoom v1.0.0, March 2018
  ========================================
  Author : AvcS (avcs06@gmail.com)
  Repository: https://github.com/avcs06/SVGPanZoom/
*/

(function (factory) {
    "use strict";

    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery'], function ($) {
            return factory($, window, document);
        });
    } else if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') {
        // CommonJS
        module.exports = function (root, $) {
            if (!root) {
                // CommonJS environments without a window global must pass a
                // root. This will give an error otherwise
                root = window;
            }

            if (!$) {
                $ = typeof window !== 'undefined' ? // jQuery's factory checks for a global window
                require('jquery') : require('jquery')(root);
            }

            return factory($, root, root.document);
        };
    } else {
        // Browser
        window.SVGPanZoom = factory(jQuery, window, document);
    }
})(function ($, window, document, undefined) {

    if (!$) {
        throw new Error("Dependencies not met - jQuery is not defined");
    };

    //Polyfill for AnimationFrame
    var requestAnimationFrame = window.requestAnimationFrame;
    var cancelAnimationFrame = window.cancelAnimationFrame;
    (function () {
        var lastTime = 0;
        var vendors = ['webkit', 'moz', 'o', 'ms'];
        for (var x = 0; x < vendors.length && !requestAnimationFrame; ++x) {
            requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!requestAnimationFrame) requestAnimationFrame = function requestAnimationFrame(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                callback(currTime + timeToCall);
            }, timeToCall);

            lastTime = currTime + timeToCall;
            return id;
        };
        if (!cancelAnimationFrame) cancelAnimationFrame = function cancelAnimationFrame(id) {
            clearTimeout(id);
        };
    })();

    var defaultOptions = {
        initialViewBox: null,
        animationTime: 300,
        limits: null,
        eventMagnet: null,
        zoom: {
            factor: 0.25,
            minZoom: 1,
            maxZoom: 3,
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
        var viewBox = string.replace("\s+", " ").split(" ");
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
        pos = pos.matrixTransform(svgRoot.getScreenCTM().inverse());
        return pos;
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
        var position = { x: null, y: null };
        if (/touch/i.test(e.type)) {
            //Event has touch information
            if (e.touches != null && e.touches.length) {
                e = e.touches[0];
            }
            //If modified event get original event
            else if (e.originalEvent != null && e.originalEvent.touches.length) {
                    e = e.originalEvent.touches[0];
                }
                //If touchend get the required info from changedTouches
                else if (e.changedTouches != null && e.changedTouches.length) {
                        e = e.changedTouches[0];
                    }
        } else if (e.clientX == null && e.originalEvent != null) {
            e = e.originalEvent;
        }
        position.x = e.clientX;
        position.y = e.clientY;
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
        svg.setAttribute("viewBox", viewBox.x + " " + viewBox.y + " " + viewBox.width + " " + viewBox.height);
    };

    /**
     * Get distance between fingers for two finger touch event
     *
     * @param {TouchEvent|jQueryEvent} event
     *   The DOM or jQuery event.
     */
    var touchDistance = function touchDistance(event) {
        var touches = event.originalEvent != null && event.touches == null ? event.originalEvent.touches : event.touches;
        return Math.sqrt((touches[0].clientX - touches[1].clientX) * (touches[0].clientX - touches[1].clientX) + (touches[0].clientY - touches[1].clientY) * (touches[0].clientY - touches[1].clientY));
    };

    /**
     * Check if the event is a two finger touch event
     *
     * @param {TouchEvent|jQueryEvent} event
     *   The DOM or jQuery event.
     */
    var isDoubleTouch = function isDoubleTouch(event) {
        var touches = event.originalEvent != null && event.touches == null ? event.originalEvent.touches : event.touches;
        return touches.length == 2;
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
        var touches = event.originalEvent != null && event.touches == null ? event.originalEvent.touches : event.touches;
        return coordinateTransform(svg, {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        });
    };

    /**
     * Returns an animate method which executes given callback at intervals
     * animate method accepts (initialState, finalState, time)
     * callback has currentState as parameter
     * @param {Function} callback
     *   Executed at each step of animation
     */
    var getAnimator = function getAnimator(callback) {
        return function () {
            var currentAnimation = void 0;

            var Animation = function Animation(initialState, finalState, time, onComplete) {
                var _this = this;

                _classCallCheck(this, Animation);

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
                        callback(_this.getCurrentState());
                        _this.id = requestAnimationFrame(_this.animate);
                    } else {
                        currentAnimation = null;
                        if (onComplete && typeof onComplete === 'function') {
                            onComplete();
                        }
                    }
                };

                this.id = requestAnimationFrame(this.animate.bind(this));
            };

            return function (initialState, finalState, time, onComplete) {
                if (currentAnimation) {
                    cancelAnimationFrame(currentAnimation.id);
                }

                currentAnimation = new Animation(initialState, finalState, time, onComplete);
            };
        }();
    };

    var SVGPanZoom = function () {
        function SVGPanZoom(svg, options) {
            var _this2 = this;

            _classCallCheck(this, SVGPanZoom);

            if (!(svg instanceof SVGElement)) {
                throw new Error('Invalid Parameters. Firt parameter to SVGPanZoom should be an svg element');
            }

            this.svg = svg;
            svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

            var viewBox = $.extend({}, svg.viewBox.baseVal);
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
                    set initialViewBox(initialViewBox) {
                        // Set initial viewbox
                        if (initialViewBox != null) {
                            if (typeof initialViewBox === "string") {
                                viewBox = parseViewBoxString(initialViewBox);
                            } else if ((typeof initialViewBox === 'undefined' ? 'undefined' : _typeof(initialViewBox)) === "object") {
                                viewBox = $.extend({}, defaultViewBox, initialViewBox);
                            } else {
                                throw new Error('initialViewBox is of invalid type');
                            }
                        }

                        _initialViewBox = $.extend({}, viewBox);
                    },
                    get animationTime() {
                        return _animationTime;
                    },
                    set animationTime(animationTime) {
                        _animationTime = animationTime || 0;
                    },
                    get eventMagnet() {
                        return _eventMagnet;
                    },
                    set eventMagnet(eventMagnet) {
                        self.destroy();
                        _eventMagnet = $(eventMagnet || svg);
                        self._setupEvents(svg);
                    },
                    get limits() {
                        return _limits;
                    },
                    set limits(limits) {
                        _limits = {};
                        var directionalLimits = ((limits ? limits : limits === 0 ? 0 : 15) + '').trim().split(' ');

                        horizontal: {
                            var multiplier = Number((directionalLimits[1] || directionalLimits[0]).replace(/%/g, '')) / 100;
                            var horizontalSizeIncrement = viewBox.height * multiplier;
                            _limits.minX = viewBox.x - horizontalSizeIncrement;
                            _limits.maxX = viewBox.x + viewBox.width + horizontalSizeIncrement;
                        }

                        vertical: {
                            var _multiplier = Number(directionalLimits[0].replace(/%/g, '')) / 100;
                            var verticalSizeIncrement = viewBox.width * _multiplier;
                            _limits.minY = viewBox.y - verticalSizeIncrement;
                            _limits.maxY = viewBox.y + viewBox.height + verticalSizeIncrement;
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
                return $.extend({}, viewBox);
            };

            // Setter for ViewBox
            this.setViewBox = function (x, y, width, height, animationTime, callback) {
                if (animationTime == null) {
                    animationTime = _this2.options.animationTime;
                }

                var oldBox = _this2.getViewBox();

                viewBox = {
                    x: x != null ? x : viewBox.x,
                    y: y != null ? y : viewBox.y,
                    width: width != null ? width : viewBox.width,
                    height: height != null ? height : viewBox.height
                };

                _this2.validateLimits(viewBox);

                if (animationTime > 0) {
                    animate(oldBox, viewBox, animationTime, callback);
                } else {
                    setViewBox(svg, viewBox);
                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                }

                // Chaining
                return _this2;
            };

            // Pan methods
            pan: {
                var panMethod = function panMethod(callback, amount, animationTime) {
                    if (!this.options.pan) {
                        return this;
                    }

                    if (amount == null) {
                        amount = this.options.pan.factor;
                        if (!amount) {
                            return this;
                        }
                    }

                    return callback(amount, animationTime);
                };

                this.panLeft = panMethod.bind(this, function (amount, animationTime) {
                    return _this2.panRight(-amount, animationTime);
                });

                this.panRight = panMethod.bind(this, function (amount, animationTime) {
                    return _this2.setViewBox(viewBox.x + amount, null, null, null, animationTime, function () {
                        _this2.options.pan.callback({ x: viewBox.x, y: viewBox.y });
                    });
                });

                this.panUp = panMethod.bind(this, function (amount, animationTime) {
                    return _this2.panDown(-amount, animationTime);
                });

                this.panDown = panMethod.bind(this, function (amount, animationTime) {
                    return _this2.setViewBox(null, viewBox.y + amount, null, null, animationTime, function () {
                        _this2.options.pan.callback(_this2.getViewBox());
                    });
                });
            }

            // Zoom methods
            zoom: {
                var zoomMethod = function zoomMethod(callback, focalPoint, amount, animationTime) {
                    if (!this.options.zoom) {
                        return this;
                    }

                    if (amount == null) {
                        amount = this.options.zoom.factor;
                        if (!amount) {
                            return this;
                        }
                    }

                    return callback(focalPoint, amount, animationTime);
                };

                ;

                this.zoomIn = zoomMethod.bind(this, function (focalPoint, amount, animationTime) {
                    return _this2.zoomOut(focalPoint, -amount, animationTime);
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
                    var minWidthAfterZoom = _this2.options.initialViewBox.width / _this2.options.zoom.maxZoom;
                    var maxWidthAfterZoom = _this2.options.initialViewBox.width / _this2.options.zoom.minZoom;
                    if (newWidth < minWidthAfterZoom) {
                        newHeight *= minWidthAfterZoom / newWidth;
                        newWidth = minWidthAfterZoom;
                    } else if (newWidth > maxWidthAfterZoom) {
                        newHeight *= maxWidthAfterZoom / newWidth;
                        newWidth = maxWidthAfterZoom;
                    }

                    var minHeightAfterZoom = _this2.options.initialViewBox.height / _this2.options.zoom.maxZoom;
                    var maxHeightAfterZoom = _this2.options.initialViewBox.height / _this2.options.zoom.minZoom;
                    if (newHeight < minHeightAfterZoom) {
                        newWidth *= minHeightAfterZoom / newHeight;
                        newHeight = minHeightAfterZoom;
                    } else if (newHeight > maxHeightAfterZoom) {
                        newWidth *= maxHeightAfterZoom / newHeight;
                        newHeight = maxHeightAfterZoom;
                    }

                    // Calculate origin based on the focal point constant
                    var origin = void 0;
                    if (focalPoint == null) {
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

                    return _this2.setViewBox(origin.x, origin.y, newWidth, newHeight, animationTime, function () {
                        _this2.options.zoom.callback(_this2.options.initialViewBox.width / newWidth, _this2.getViewBox());
                    });
                });
            }

            this.destroy = Function.prototype;

            // Fill in default options
            $.extend(this.options, $.extend(true, {}, defaultOptions, options));

            // Set initial viewbox
            this.reset(0);
        }

        _createClass(SVGPanZoom, [{
            key: 'validateLimits',
            value: function validateLimits(viewBox) {
                var limits = this.options.limits;
                var limitsWidth = Math.abs(limits.maxX - limits.minX);
                var limitsHeight = Math.abs(limits.maxY - limits.minY);
                if (viewBox.width > limitsWidth) {
                    viewBox.height *= limitsWidth / viewBox.width;
                    viewBox.width = limitsWidth;
                }
                if (viewBox.height > limitsHeight) {
                    viewBox.width *= limitsHeight / viewBox.height;
                    viewBox.height = limitsHeight;
                }
                if (viewBox.x < limits.minX) viewBox.x = limits.minX;
                if (viewBox.y < limits.minY) viewBox.y = limits.minY;
                if (viewBox.x + viewBox.width > limits.maxX) viewBox.x = limits.maxX - viewBox.width;
                if (viewBox.y + viewBox.height > limits.maxY) viewBox.y = limits.maxY - viewBox.height;
            }
        }, {
            key: 'reset',
            value: function reset(animationTime) {
                return this.clone(this.options.initialViewBox, animationTime);
            }
        }, {
            key: 'clone',
            value: function clone(viewBox, animationTime) {
                return this.setViewBox(viewBox.x, viewBox.y, viewBox.width, viewBox.height, animationTime);
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
            value: function setCenter(x, y, animationTime) {
                return this.setViewBox(x - viewBox.width / 2, y - viewBox.height / 2, viewBox.width, viewBox.height, animationTime);
            }
        }, {
            key: '_setupEvents',
            value: function _setupEvents(svg) {
                var _this4 = this;

                var handlers = {
                    mousewheel: function mousewheel(event) {
                        var delta = parseInt(event.originalEvent.wheelDelta || -event.originalEvent.detail);

                        if (!delta || !this.options.zoom || !this.options.zoom.events.mouseWheel) {
                            return;
                        }

                        var mouse = getViewBoxCoordinatesFromEvent(svg, event);
                        if (delta > 0) {
                            this.zoomIn(mouse, null, 0);
                        } else {
                            this.zoomOut(mouse, null, 0);
                        }
                        return false;
                    },
                    dblclick: function dblclick(event) {
                        if (!this.options.zoom || !this.options.zoom.events.doubleClick) {
                            return;
                        }

                        this.zoomIn(getViewBoxCoordinatesFromEvent(svg, event));
                        return false;
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
                            return event.preventDefault();
                        }
                    };

                    handlers.pinchAndDrag = function (event) {
                        var _this3 = this;

                        if (!this.options.pan.events.drag || event.type === "mousedown" && event.which !== this.options.pan.events.dragMouseButton || dragStarted || scaleStarted) {
                            return;
                        }

                        event.preventDefault();
                        preventClick = false;

                        var domBody = window.document.body;
                        var initialViewBox = $.extend({}, this.getViewBox());

                        var oldCursor = this.options.eventMagnet.css("cursor");
                        if (this.options.pan.events.dragCursor != null) {
                            this.options.eventMagnet.css("cursor", this.options.pan.events.dragCursor);
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

                            if (Math.sqrt(Math.pow(event.pageX - event2.pageX, 2) + Math.pow(event.pageY - event2.pageY, 2)) > 2) {
                                preventClick = true;
                            }

                            if (dragStarted) {
                                var initialMousePosition = getViewBoxCoordinatesFromEvent(svg, event);
                                var currentMousePosition = getViewBoxCoordinatesFromEvent(svg, event2);
                                _this3.setViewBox(initialViewBox.x + (initialMousePosition.x - currentMousePosition.x), initialViewBox.y + (initialMousePosition.y - currentMousePosition.y), null, null, 0);
                            } else if (scaleStarted) {
                                var newPinchDistance = touchDistance(event2);
                                if (newPinchDistance === pinchDistance) {
                                    return;
                                }

                                var mouse = touchCenter(svg, event2);
                                _this3.zoomOut(mouse, (pinchDistance - newPinchDistance) / pinchDistance, 0);
                                pinchDistance = newPinchDistance;
                            }
                        };

                        var mouseUpCallback = function mouseUpCallback(event2) {
                            if (event2.type === "mouseout" && event2.target !== event2.currentTarget || event2.type === "mouseup" && event2.which !== _this3.options.pan.events.dragMouseButton) {
                                return;
                            }

                            event2.preventDefault();
                            domBody.removeEventListener("mousemove", mouseMoveCallback, true);
                            domBody.removeEventListener("touchmove", mouseMoveCallback, true);
                            domBody.removeEventListener("mouseup", mouseUpCallback, true);
                            domBody.removeEventListener("touchend", mouseUpCallback, true);
                            domBody.removeEventListener("touchcancel", mouseUpCallback, true);
                            domBody.removeEventListener("mouseout", mouseUpCallback, true);

                            if (_this3.options.pan.events.dragCursor != null) {
                                _this3.options.eventMagnet.css("cursor", oldCursor);
                            }

                            dragStarted = false;
                            scaleStarted = false;
                            pinchDistance = 0;
                        };

                        domBody.addEventListener("mousemove", mouseMoveCallback, true);
                        domBody.addEventListener("touchmove", mouseMoveCallback, true);
                        domBody.addEventListener("mouseup", mouseUpCallback, true);
                        domBody.addEventListener("touchend", mouseUpCallback, true);
                        domBody.addEventListener("touchcancel", mouseUpCallback, true);
                        domBody.addEventListener("mouseout", mouseUpCallback, true);
                    };
                }

                Object.keys(handlers).forEach(function (handler) {
                    handlers[handler] = handlers[handler].bind(_this4);
                });

                this.options.eventMagnet[0].addEventListener("click.SVGPanZoom", handlers.click, true);
                this.options.eventMagnet.on("mousewheel.SVGPanZoom DOMMouseScroll.SVGPanZoom MozMousePixelScroll.SVGPanZoom", handlers.mousewheel);
                this.options.eventMagnet.on("dblclick.SVGPanZoom", handlers.dblclick);
                this.options.eventMagnet.on("mousedown.SVGPanZoom touchstart.SVGPanZoom", handlers.pinchAndDrag);

                this.destroy = function () {
                    this.options.eventMagnet[0].addEventListener("click.SVGPanZoom", handlers.click, true);
                    this.options.eventMagnet.off("mousewheel.SVGPanZoom DOMMouseScroll.SVGPanZoom MozMousePixelScroll.SVGPanZoom");
                    this.options.eventMagnet.off("dblclick.SVGPanZoom");
                    this.options.eventMagnet.off("mousedown.SVGPanZoom touchstart.SVGPanZoom");
                };
            }
        }]);

        return SVGPanZoom;
    }();

    $.fn.svgPanZoom = function (options) {
        var instances = [];
        this.each(function () {
            var element = $(this);
            var instance = element.data('svgpanzoom');

            if (!instance) {
                instance = new SVGPanZoom(this, options);

                var defaultDestroy = instance.destroy;
                instance.destroy = function () {
                    defaultDestroy.bind(this)();
                    element.removeData('svgpanzoom');
                }.bind(instance);

                element.data('svgpanzoom', instance);
            }

            instances.push(instance);
        });

        if (instances.length === 0) {
            return null;
        }

        if (instances.length === 1) {
            return instances[0];
        }

        return instances;
    };

    return SVGPanZoom;
});
