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

        // Get the current combatant token
        let token = combat.combatant.token;
        
        // Animation parameters
        let targetRotation = (token.flags.orientations?.orientation) * (Math.PI / 180);
        if (Number.isNaN(targetRotation)) {
            targetRotation = 0;
        }
        const currentRotation = canvas.app.stage.rotation;

        let duration = 1; // duration in seconds
        let rotationPerFrame = (targetRotation - currentRotation) / (5 * duration);

        function animate() {

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
            canvas.animatePan({x,y,scale})
        },50)

        
    }

})