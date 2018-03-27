/*
  Jquery SVG Pan & Zoom v1.0.0, March 2018
  ========================================
  Author : AvcS (avcs06@gmail.com)
  Repository: https://github.com/avcs06/SVGPanZoom/
*/

(function (root, factory) {
    if (typeof define === 'function' && define['amd']) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory(root, require('jquery'));
    } else {
        root.SVGPanZoom = factory(root, root.jQuery);
    }
}(this, function (window, $) {
    if (!$) {
        throw new Error("Dependencies not met - jQuery is not defined");
    };

    //Polyfill for AnimationFrame
    let requestAnimationFrame = window.requestAnimationFrame;
    let cancelAnimationFrame = window.cancelAnimationFrame;
    (function () {
        let lastTime = 0;
        const vendors = ['webkit', 'moz', 'o', 'ms'];
        for (let x = 0; x < vendors.length && !requestAnimationFrame; ++x) {
            requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!requestAnimationFrame)
            requestAnimationFrame = function (callback, element) {
                const currTime = new Date().getTime();
                const timeToCall = Math.max(0, 16 - (currTime - lastTime));
                const id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                }, timeToCall);

                lastTime = currTime + timeToCall;
                return id;
            };
        if (!cancelAnimationFrame)
            cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
    }());

    const defaultOptions = {
        initialViewBox: null,
        animationTime: 300,
        zoom: {
            factor: 0.25,
            minZoom: 1,
            maxZoom: 3,
            events: {
                mouseWheel: true,
                doubleClick: true,
                pinch: true,
            },
            callback: function (multiplier) { }
        },
        pan: {
            factor: 100,
            events: {
                drag: true,
                dragMouseButton: 1,
                dragCursor: "move"
            },
            callback: function (coordinates) { }
        },
        limits: null,
        eventMagnet: null
    };

    const defaultViewBox = {
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
    const parseViewBoxString = string => {
        const viewBox = string.replace("\s+", " ").split(" ");
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
    const coordinateTransform = function (svgRoot, point) {
        let pos = svgRoot.createSVGPoint();
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
    const getViewBoxCoordinatesFromEvent = function (svgRoot, e) {
        const position = { x: null, y: null };
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
    const setViewBox = function (svg, viewBox) {
        svg.setAttribute("viewBox", viewBox.x + " " + viewBox.y + " " + viewBox.width + " " + viewBox.height);
    };

    /**
     * Get distance between fingers for two finger touch event
     *
     * @param {TouchEvent|jQueryEvent} event
     *   The DOM or jQuery event.
     */
    const touchDistance = function (event) {
        const touches = ((event.originalEvent != null) && (event.touches == null)) ? event.originalEvent.touches : event.touches;
        return Math.sqrt((touches[0].clientX - touches[1].clientX) * (touches[0].clientX - touches[1].clientX) + (touches[0].clientY - touches[1].clientY) * (touches[0].clientY - touches[1].clientY));
    };

    /**
     * Check if the event is a two finger touch event
     *
     * @param {TouchEvent|jQueryEvent} event
     *   The DOM or jQuery event.
     */
    const isDoubleTouch = function (event) {
        const touches = ((event.originalEvent != null) && (event.touches == null)) ? event.originalEvent.touches : event.touches;
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
    const touchCenter = function (svg, event) {
        const touches = ((event.originalEvent != null) && (event.touches == null)) ? event.originalEvent.touches : event.touches;
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
    const getAnimator = (callback) => (
        (() => {
            let currentAnimation;

            class Animation {
                constructor(initialState, finalState, time, onComplete) {
                    let start = 0;
                    let now = 0;

                    this.getCurrentState = () => {
                        const currentState = {};
                        Object.keys(initialState).forEach(key => {
                            currentState[key] = initialState[key] + (now / time) * (finalState[key] - initialState[key]);
                        });
                        return currentState;
                    };

                    this.animate = timestamp => {
                        if (!start) {
                            start = timestamp;
                        }

                        now = timestamp - start;
                        if (now <= time) {
                            callback(this.getCurrentState());
                            this.id = requestAnimationFrame(this.animate);
                        } else {
                            currentAnimation = null;
                            if (onComplete && typeof onComplete === 'function') {
                                onComplete();
                            }
                        }
                    };

                    this.id = requestAnimationFrame(this.animate.bind(this));
                }
            }

            return (initialState, finalState, time, onComplete) => {
                if (currentAnimation) {
                    cancelAnimationFrame(currentAnimation.id);
                }

                currentAnimation = new Animation(initialState, finalState, time, onComplete);
            };
        })()
    );

    class SVGPanZoom {
        constructor(svg, options) {
            if (!(svg instanceof SVGElement)) {
                throw new Error('Invalid Parameters. Firt parameter to SVGPanZoom should be an svg element');
            }
            const self = this;
            this.svg = svg;

            svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            let viewBox = $.extend({}, svg.viewBox.baseVal);
            if (viewBox.x === 0 && viewBox.y === 0 && viewBox.width === 0 && viewBox.height === 0) {
                viewBox = defaultViewBox;
            }

            // Option validations
            this.options = {
                set initialViewBox(initialViewBox) {
                    // Set initial viewbox
                    if (initialViewBox != null) {
                        if (typeof initialViewBox === "string") {
                            viewBox = parseViewBoxString(initialViewBox);
                        } else if (typeof initialViewBox === "object") {
                            viewBox = $.extend({}, defaultViewBox, initialViewBox);
                        } else {
                            throw new Error('initialViewBox is of invalid type');
                        }
                    }

                    this.initialViewBox = $.extend({}, viewBox);
                },
                set animationTime(animationTime) {
                    this.animationTime = animationTime || 0;
                },
                set eventMagnet(eventMagnet) {
                    this.eventMagnet = $(eventMagnet || svg);
                },
                set limits(limits) {
                    if (limits === null) {
                        const multiplier = 0.15;
                        const horizontalSizeIncrement = viewBox.width * 0.15;
                        const verticalSizeIncrement = viewBox.height * 0.15;
                        this.limits = {
                            minX: viewBox.x - horizontalSizeIncrement,
                            minY: viewBox.y - verticalSizeIncrement,
                            maxX: viewBox.x + viewBox.width + horizontalSizeIncrement,
                            maxY: viewBox.y + viewBox.height + verticalSizeIncrement
                        };
                    } else {
                        this.limits = {
                            minX: limits.min.x,
                            minY: limits.min.y,
                            maxX: limits.max.x,
                            maxY: limits.max.y
                        };
                    }
                    this.validateLimits(viewBox);
                },
                set pan(pan) {
                    if (pan) {
                        const panMethod = (callback, amount, animationTime) => {
                            if (amount == null) {
                                amount = pan.factor
                                if (!amount) {
                                    return this;
                                }
                            }

                            return callback(amount, animationTime);
                        };

                        self.panLeft = panMethod.bind(self, (amount, animationTime) => (
                            self.panRight(-amount, animationTime)
                        ));

                        self.panRight = panMethod.bind(self, (amount, animationTime) => (
                            self.setViewBox(viewBox.x + amount, null, null, null, animationTime, () => {
                                pan.callback({x: viewBox.x, y: viewBox.y});
                            })
                        ));

                        self.panUp = panMethod.bind(self, (amount, animationTime) => (
                            self.panDown(-amount, animationTime)
                        ));

                        self.panDown = panMethod.bind(self, (amount, animationTime) => (
                            self.setViewBox(null, viewBox.y + amount, null, null, animationTime, () => {
                                pan.callback({ x: viewBox.x, y: viewBox.y });
                            })
                        ));
                    } else {
                        delete self.panLeft;
                        delete self.panRight;
                        delete self.panUp;
                        delete self.panDown;
                    }

                    this.pan = pan || null;
                },
                set zoom(zoom) {
                    if (zoom) {
                        const minWidthAfterZoom = this.initialViewBox.width / zoom.maxZoom;
                        const minHeightAfterZoom = this.initialViewBox.height / zoom.maxZoom;
                        const maxWidthAfterZoom = this.initialViewBox.width / zoom.minZoom;
                        const maxHeightAfterZoom = this.initialViewBox.height / zoom.minZoom;

                        const zoomMethod = (callback, focalPoint, amount, animationTime) => {
                            if (amount == null) {
                                amount = zoom.factor
                                if (!amount) {
                                    return this;
                                }
                            }

                            return callback(focalPoint, amount, animationTime);
                        };

                        self.zoomIn = zoomMethod.bind(self, (focalPoint, amount, animationTime) => (
                            self.zoomOut(focalPoint, -amount, animationTime)
                        ));

                        self.zoomOut = zoomMethod.bind(self, (focalPoint, amount, animationTime) => {
                            let newHeight, newWidth;
                            if (amount < 0) {
                                newWidth = viewBox.width / (1 - amount);
                                newHeight = viewBox.height / (1 - amount);
                            } else {
                                newWidth = viewBox.width * (1 + amount);
                                newHeight = viewBox.height * (1 + amount);
                            }

                            //Validate zoom limits
                            if (newWidth < minWidthAfterZoom) {
                                newHeight *= minWidthAfterZoom / newWidth;
                                newWidth = minWidthAfterZoom;
                            } else if (newWidth > maxWidthAfterZoom) {
                                newHeight *= maxWidthAfterZoom / newWidth;
                                newWidth = maxWidthAfterZoom;
                            }

                            if (newHeight < minHeightAfterZoom) {
                                newWidth *= minHeightAfterZoom / newHeight;
                                newHeight = minHeightAfterZoom;
                            } else if (newHeight > maxHeightAfterZoom) {
                                newWidth *= maxHeightAfterZoom / newHeight;
                                newHeight = maxHeightAfterZoom;
                            }

                            // Calculate origin based on the focal point constant
                            let origin;
                            if (focalPoint == null) {
                                origin = {
                                    x: viewBox.x + (viewBox.width - newWidth) / 2,
                                    y: viewBox.y + (viewBox.height - newHeight) / 2
                                };
                            } else {
                                origin = {
                                    x: focalPoint.x + (newWidth / viewBox.width) * (viewBox.x - focalPoint.x),
                                    y: focalPoint.y + (newHeight / viewBox.height) * (viewBox.y - focalPoint.y),
                                };
                            }

                            self.setViewBox(origin.x, origin.y, newWidth, newHeight, animationTime, () => {
                                zoom.callback(this.initialViewBox.width / newWidth);
                            });

                            return self;
                        });
                    } else {
                        delete self.zoomIn;
                        delete self.zoomOut;
                    }

                    this.zoom = zoom || null;
                }
            };

            // Fill in default options
            this.options = $.extend(true, {}, defaultOptions, options);

            // Getter and Setter for ViewBox
            this.getViewBox = () => $.extend({}, viewBox);

            // animate method
            const animate = getAnimator(state => setViewBox(svg, state));
            this.setViewBox = (x, y, width, height, animationTime, callback) => {
                if (animationTime == null) {
                    animationTime = this.options.animationTime;
                }

                const oldBox = this.getViewBox();

                viewBox = {
                    x: x != null ? x : viewBox.x,
                    y: y != null ? y : viewBox.y,
                    width: width != null ? width : viewBox.width,
                    height: height != null ? height : viewBox.height
                };

                this.validateLimits(viewBox);
                if (animationTime > 0) {
                    animate(oldBox, viewBox, animationTime, callback);
                } else {
                    setViewBox(svg, viewBox);
                    if(callback && typeof callback === 'function') {
                        callback();
                    }
                }

                // Chaining
                return this;
            };

            this.setViewBox(viewBox.x, viewBox.y, viewBox.width, viewBox.height, 0);


            if (this.eventMagnet) {
                this.eventMagnet.off("mousewheel DOMMouseScroll MozMousePixelScroll", self._mousewheelEventHandler);
                this.eventMagnet.off("dblclick", self._dblclickEventHandler);
            }

            this.eventMagnet.bind("mousewheel DOMMouseScroll MozMousePixelScroll", self._mousewheelEventHandler.bind(self));
            this.eventMagnet.bind("dblclick", self._dblclickEventHandler.bind(self));

            touchEvents: {
                var dragStarted = false;
                var scaleStarted = false;
                var preventClick = false;
                var distance = 0;
                opts.eventDom[0].addEventListener("click", function (ev) {
                    if (preventClick) {
                        preventClick = false;
                        return ev.preventDefault();
                    }
                }, true);
                opts.eventDom.bind("mousedown touchstart", (function (ev) {
                    var domBody, initialViewBox, mouseMoveCallback, mouseUpCallback, oldCursor;
                    if (dragStarted || scaleStarted) return;
                    if (this.events.drag !== true || (ev.type === "mousedown" && ev.which !== this.events.dragMouseButton)) return;
                    ev.preventDefault();
                    if (ev.type === "touchstart" && isDoubleTouch(ev)) {
                        scaleStarted = true;
                        distance = touchDistance(ev);
                    } else dragStarted = true;
                    preventClick = false;
                    initialViewBox = $.extend({}, viewBox);
                    domBody = window.document.body;
                    oldCursor = opts.eventDom.css("cursor");
                    if (this.events.dragCursor != null) opts.eventDom.css("cursor", this.events.dragCursor);
                    mouseMoveCallback = (function (ev2) {
                        var isTouch = /touch/i.test(ev.type);
                        var checkDoubleTouch = isTouch && isDoubleTouch(ev2);
                        if (scaleStarted && !checkDoubleTouch) return;
                        ev2.preventDefault();
                        if (!scaleStarted && checkDoubleTouch) {
                            scaleStarted = true;
                            distance = touchDistance(ev2);
                            dragStarted = false;
                        }
                        if (Math.sqrt(Math.pow(ev.pageX + ev2.pageX, 2) + Math.pow(ev.pageY + ev2.pageY, 2)) > 3) preventClick = true;
                        if (dragStarted) {
                            (function (thisref) {
                                var initialMousePosition = getViewBoxCoordinatesFromEvent(thisref.svg, ev);
                                var currentMousePosition = getViewBoxCoordinatesFromEvent(thisref.svg, ev2);
                                thisref.setViewBox(initialViewBox.x + initialMousePosition.x - currentMousePosition.x, initialViewBox.y + initialMousePosition.y - currentMousePosition.y, null, null, 0);
                            })(this);
                        } else if (scaleStarted) {
                            (function (thisref) {
                                var newDistance = touchDistance(ev2);
                                if (newDistance == distance) {
                                    return;
                                }
                                var mouse = touchCenter(thisref.svg, ev2);
                                this.zoomOut(mouse, (distance - newDistance) / distance);
                                distance = newDistance;
                            })(this);
                        }
                    }).bind(opts);
                    mouseUpCallback = (function (ev2) {
                        if (ev2.type === "mouseout" && ev2.target !== ev2.currentTarget) return;
                        if (ev2.type === "mouseup" && ev2.which !== this.events.dragMouseButton) return;
                        ev2.preventDefault();
                        domBody.removeEventListener("mousemove", mouseMoveCallback, true);
                        domBody.removeEventListener("touchmove", mouseMoveCallback, true);
                        domBody.removeEventListener("mouseup", mouseUpCallback, true);
                        domBody.removeEventListener("touchend", mouseUpCallback, true);
                        domBody.removeEventListener("touchcancel", mouseUpCallback, true);
                        domBody.removeEventListener("mouseout", mouseUpCallback, true);
                        if (this.events.dragCursor != null) opts.eventDom.css("cursor", oldCursor);
                        dragStarted = false;
                        scaleStarted = false;
                        distance = 0;
                    }).bind(opts);
                    domBody.addEventListener("mousemove", mouseMoveCallback, true);
                    domBody.addEventListener("touchmove", mouseMoveCallback, true);
                    domBody.addEventListener("mouseup", mouseUpCallback, true);
                    domBody.addEventListener("touchend", mouseUpCallback, true);
                    domBody.addEventListener("touchcancel", mouseUpCallback, true);
                    domBody.addEventListener("mouseout", mouseUpCallback, true);
                }).bind(opts));
            }
        }

        validateLimits(viewBox) {
            const limits = this.options.limits;
            const limitsWidth = Math.abs(limits.maxX - limits.minX);
            const limitsHeight = Math.abs(limits.maxY - limits.minY);
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

        reset() {
            return this.clone(this.initialViewBox);
        }

        clone(viewBox) {
            return this.setViewBox(viewBox.x, viewBox.y, viewBox.width, viewBox.height);
        }

        getCenter() {
            const viewBox = this.getViewBox();
            return {
                x: viewBox.x + viewBox.width / 2,
                y: viewBox.y + viewBox.height / 2
            };
        }

        setCenter(x, y, animationTime) {
            return this.setViewBox(x - viewBox.width / 2, y - viewBox.height / 2, viewBox.width, viewBox.height, animationTime);
        }

        _mousewheelEventHandler(event) {
            const delta = parseInt(event.originalEvent.wheelDelta || -event.originalEvent.detail);

            if (!delta || !this.options.zoom || !this.options.zoom.events.mouseWheel) {
                return;
            }

            const mouse = getViewBoxCoordinatesFromEvent(this.svg, event);

            if (delta > 0) {
                this.zoomIn(mouse);
            } else {
                this.zoomOut(mouse);
            }

            return false;
        }

        _dblclickEventHandler(event) {
            if (!this.zoom || !this.options.zoom.events.events.doubleClick) {
                return;
            }

            this.zoomIn(getViewBoxCoordinatesFromEvent(this.svg, event));
            return false;
        }

        _touchEventHandler(evnt) {

        }
    }

    return $.fn.svgPanZoom = function (options) {
        var ret = [];
        this.each(function () {
        });
        if (ret.length === 0) {
            return null;
        }
        if (ret.length === 1) {
            return ret[0];
        } else {
            return ret;
        }
    };
}));
