// TODO
// make better performing line wrap
// dont animate stuff off screen
// opengl shader instead?????????? css?????????????? i dont know lol

// if this is true then all glitch text will have its text split into words
// where each word will get its own canvas
// this is a easy way to allow for some kind of word level wrapping
// but its also much slower if there are many words
// otherwise you could just keep this false and just manually separate text into
// multiple glitch elements where you want there to be wrapping
const splitWords = false;

function mapRange(dstMin, dstMax, srcMin, srcMax, n) {

    const dstRange = dstMax - dstMin;
    const srcRange = srcMax - srcMin;
    const rangeRatio = dstRange / srcRange;
    const nNormalized = (n - srcMin) / srcRange;
    const nMapped = nNormalized * dstRange + dstMin;
    return nMapped;
}

function makePreset(craziness) {

    const preset = new Object();
    preset.colorDistortionDistance = mapRange(0, 2, 0, 2.5, craziness);
    preset.yStepJitter = mapRange(4, 1, 2.5, 4, craziness);
    preset.shiftCoefficient = mapRange(0, 2, 0, 2.5, craziness);

    return preset;
}

const canvasSettings = {};

function stripAlpha(string) {

    if (string.startsWith('rgba')) {
        const s = string.split(',');
        const r = s[0].split('(')[1];
        const g = s[1];
        const b = s[2];
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
        return string;
    }
}

function animationFrame(timestep) {

    // get all the glitch canvas elements
    const elements = document.querySelectorAll("[class^='glitch-canvas']");
    for (let canvas of elements) {

        const craziness = parseInt(canvas.className.split('-')[2]);

        // use this preset to draw with
        const preset = makePreset(craziness);

        // text to draw
        const settings = canvasSettings[canvas.cid];
        const text = settings.text;

        // style
        const style = window.getComputedStyle(canvas);
        const fontSize = style.getPropertyValue('font-size');
        const fontFamily = style.getPropertyValue('font-family');

        // create a buffer for drawing the undistorted text
        const buffer = document.createElement('canvas');
        const bufferContext = buffer.getContext('2d');

        // draw vanilla onto buffer
        bufferContext.font = fontSize + ' ' + fontFamily;
        const metrics = bufferContext.measureText(text);
        canvas.width = metrics.width;
        canvas.height = metrics.actualBoundingBoxAscent;
        buffer.width = canvas.width * 1.3; // Account for the bottom of the canvas. Keeps the bottom portions of letters such as g or p.
        buffer.height = canvas.height;
        bufferContext.font = fontSize + ' ' + fontFamily;

        // draw it with colors separated
        const backgroundColor = stripAlpha(window.getComputedStyle(document.body).getPropertyValue('background-color'));
        const foregroundColor = stripAlpha(style.getPropertyValue('color'));
        bufferContext.fillStyle = backgroundColor;
        bufferContext.fillRect(0, 0, canvas.width, canvas.height);
        bufferContext.fillStyle = foregroundColor;
        bufferContext.fillText(text, 0, canvas.height);

        // prepare to draw distorted text on screen canvas
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'lighter';

        // temporary buffer for holding scanlines
        const scanlineBuffer = document.createElement('canvas');
        scanlineBuffer.width = canvas.width;
        const scanlineContext = scanlineBuffer.getContext('2d');
        scanlineContext.globalCompositeOperation = 'multiply';

        // draw the rgb distorted buffer onto the screen one scanline at a time with jagged scanlines
        let yStep = 0;
        for (y = 0; y < canvas.height; y += yStep) {

            // let yStep jitter
            yStep = Math.floor(Math.random() * preset.yStepJitter + 1);
            if (yStep < 1)
                yStep = 1;

            // shift horizontally some amount
            const x = (Math.random() * 2 - 1) * Math.PI / 2 * preset.shiftCoefficient;

            // prepare to draw scanline
            scanlineBuffer.height = yStep;

            // clip to scanline
            context.save();
            context.rect(0, y, canvas.width, yStep);
            context.clip();

            // red
            scanlineContext.globalCompositeOperation = 'source-over';
            scanlineContext.fillStyle = backgroundColor;
            scanlineContext.fillRect(0, 0, canvas.width, yStep);
            scanlineContext.drawImage(buffer, x, -y);
            scanlineContext.globalCompositeOperation = 'multiply';
            scanlineContext.fillStyle = '#ff0000'; // red
            scanlineContext.fillRect(0, 0, canvas.width, yStep);
            context.drawImage(scanlineBuffer, 0, y);

            // green
            scanlineContext.globalCompositeOperation = 'source-over';
            scanlineContext.fillStyle = backgroundColor;
            scanlineContext.fillRect(0, 0, canvas.width, yStep);
            scanlineContext.drawImage(buffer, x, -y - preset.colorDistortionDistance);
            scanlineContext.globalCompositeOperation = 'multiply';
            scanlineContext.fillStyle = '#00ff00'; // green
            scanlineContext.fillRect(0, 0, canvas.width, yStep);
            context.drawImage(scanlineBuffer, 0, y);

            // blue
            scanlineContext.globalCompositeOperation = 'source-over';
            scanlineContext.fillStyle = backgroundColor;
            scanlineContext.fillRect(0, 0, canvas.width, yStep);
            scanlineContext.drawImage(buffer, x - preset.colorDistortionDistance, -y);
            scanlineContext.globalCompositeOperation = 'multiply';
            scanlineContext.fillStyle = '#0000ff'; // blue
            scanlineContext.fillRect(0, 0, canvas.width, yStep);
            context.drawImage(scanlineBuffer, 0, y);

            context.restore();
        }
    }

    // continue the animation forever
    window.requestAnimationFrame(animationFrame);
}

window.addEventListener('load', event => {

    // get all the elements with glitch class
    const elements = document.querySelectorAll("[class^='glitch']");
    for (let element of elements) {

        const craziness = element.className.split('-')[1];
        const text = element.innerText;

        // split into words
        const words = splitWords ? (text + ' ').match(/\b(\w+\W+)/g) : [text];

        // create the element to hold all the canvases
        const container = document.createElement('span');

        for (let word of words) {

            // we r going to replace the text with a canvas that we will draw on
            const canvas = document.createElement('canvas');
            canvas.cid = Math.random()
            canvas.className = 'glitch-canvas-' + craziness;
            const settings = new Object();
            settings.text = word;
            canvasSettings[canvas.cid] = settings;

            // add child to container
            container.appendChild(canvas);
        }

        // replace it
        element.parentNode.replaceChild(container, element);
    }

    // now we want to animate all of the elements each frame of rendering the page
    window.requestAnimationFrame(animationFrame);
});
