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

Hooks.on('updateCombat', function(combat, html, data, anotherThing) {

    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id].display === true) {

        function normalizeRadians(angle) {
            // Normalize the angle between 0 and 2π
            angle = angle % (2 * Math.PI);
            if (angle < 0) angle += (2 * Math.PI);
            return angle;
        }
        
        function calculateShortestRotation(currentRotation, targetRotation) {
            currentRotation = normalizeRadians(currentRotation);
            targetRotation = normalizeRadians(targetRotation);
            console.log(currentRotation);
            console.log(targetRotation);
        
            let delta = targetRotation - currentRotation;
            // Normalize the delta angle to be between -π and π
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;
        
            return delta;
        }
        
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
        let rotationPerFrame = delta / (5 * duration);

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
        
        // Pan to the  token
        let position = canvas.tokens.get(combat.combatant.tokenId).position
        let x = position.x
        let y = position.y
        let scale = canvas.stage.scale._x

        setTimeout(function() {
            canvas.app.stage.rotation = normalizeRadians(canvas.app.stage.rotation)
            canvas.animatePan({x,y,scale})
            token.control()
        },50)

        
    }

})