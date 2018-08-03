//Polyfill for AnimationFrame
let requestAnimationFrame = window.requestAnimationFrame;
let cancelAnimationFrame = window.cancelAnimationFrame;
if (!requestAnimationFrame || !cancelAnimationFrame) {
    let lastTime = 0;
    requestAnimationFrame = function(callback, element) {
        const currTime = new Date().getTime();
        const timeToCall = Math.max(0, 16 - (currTime - lastTime));
        const id = window.setTimeout(function() {
            callback(currTime + timeToCall);
        }, timeToCall);

        lastTime = currTime + timeToCall;
        return id;
    };
    cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}

class Animation {
    constructor(initialState, finalState, time, onChange, onComplete) {
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
                onChange(this.getCurrentState());
                this.id = requestAnimationFrame(this.animate);
            } else {
                onComplete();
            }
        };

        this.id = requestAnimationFrame(this.animate.bind(this));
    }
}

/**
 * Returns an animate method which executes given callback at intervals
 * animate method accepts (initialState, finalState, time)
 * callback has currentState as parameter
 * @param {Function} callback
 *   Executed at each step of animation
 */
export default callback => {
    let currentAnimation;
    return (initialState, finalState, time, onComplete) => {
        currentAnimation && cancelAnimationFrame(currentAnimation.id);
        currentAnimation = new Animation(initialState, finalState, time, callback || Function.prototype, (...args) => {
            currentAnimation = null;
            (onComplete || Function.prototype).apply(null, args);
        });
    };
};
