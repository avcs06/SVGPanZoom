function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//Polyfill for AnimationFrame
var requestAnimationFrame = window.requestAnimationFrame;
var cancelAnimationFrame = window.cancelAnimationFrame;
if (!requestAnimationFrame || !cancelAnimationFrame) {
    requestAnimationFrame = function requestAnimationFrame(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function () {
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


export default (function (callback) {
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