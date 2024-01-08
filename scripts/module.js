Hooks.on('renderTokenConfig', (app,[html],data) => {
    
    const currentOrientation = app.document.flags?.orientations?.orientation ?? ''

    let extra_html = `
    <div class="form-group slim">
        <label>Player Orientation <span class="units">(degrees)</span></label>
        <div class="form-fields">
            <input type="number" value="${currentOrientation}" step="any" name="flags.orientations.orientation" placeholder="0 deg">
        </div>
    </div>
    `
    html.querySelector('div[data-tab=character]').insertAdjacentHTML('beforeend', extra_html)

})

function normalizeRadians(angle) {
    // Normalize the angle between 0 and 2π
    angle = angle % (2 * Math.PI);
    if (angle < 0) angle += (2 * Math.PI);
    return angle;
}

function calculateShortestRotation(currentRotation, targetRotation) {
    currentRotation = normalizeRadians(currentRotation);
    targetRotation = normalizeRadians(targetRotation);

    let delta = targetRotation - currentRotation;
    // Normalize the delta angle to be between -π and π
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    return delta;
}

function centerOnToken(token) {

    let feetPerSquare = 5;

    let visionRangeFeet = token.sight.range
    let visionRangeSquares = visionRangeFeet / feetPerSquare;

    // Convert the vision range from squares to pixels
    let visionRangePixels = visionRangeSquares * canvas.grid.size;

    // Adjust the scale calculation
    let scale = Math.min(canvas.dimensions.width, canvas.dimensions.height) / (visionRangePixels * 13);

    // debugger;
    
    // Ensure scale is within sensible bounds
    scale = Math.max(0.1, Math.min(scale, 2));

    // Center and zoom on the token
    canvas.animatePan({
        x: token.x,
        y: token.y,
        scale: scale
    });

}

Hooks.on('updateCombat', function(combat, html, data, anotherThing) {

    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id].display === true) {

        // Get the current combatant token
        let token = combat.combatant.token;
        
        // Animation parameters
        let targetRotation = (token.flags.orientations?.orientation) * (Math.PI / 180);

        if (Number.isNaN(targetRotation)) {
            targetRotation = 0;
        }

        const currentRotation = canvas.app.stage.rotation;

        let delta = calculateShortestRotation(currentRotation, targetRotation);
        let duration = 1; // duration in seconds
        let rotationPerFrame = delta / (20 * duration);

        function animate() {

            // debugger;

            if (currentRotation + delta >= targetRotation) {
                targetRotation = currentRotation + delta;
            }

            if (canvas.app.stage.rotation != targetRotation) {
                requestAnimationFrame(animate); // Continue animation while the condition is true
                canvas.app.stage.rotation += rotationPerFrame;
            }
        }
   
        animate();
        
        canvas.app.stage.rotation = normalizeRadians(canvas.app.stage.rotation)
        centerOnToken(token)
        canvas.tokens.get(token.id).control({releaseOthers: true})
        
    } else {
        return;
    }

})

Hooks.on("refreshToken", (token, updateData, ...args) => {

    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id].display === true) { 
        
        centerOnToken(canvas.tokens.get(token.id).document);
    }

})