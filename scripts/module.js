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

        let token = combat.combatant.token;

        let $canvas = $('canvas');
        
        if (token.flags.orientations?.orientation !== undefined) {
            canvas.stage.angle = token.flags.orientations.orientation;
        } else {
            canvas.stage.angle = 0;
        }

        let position = canvas.tokens.get(combat.combatant.tokenId).position

        // Pan to the  token
        let x = position.x
        let y = position.y
        let scale = canvas.stage.scale._x

        canvas.animatePan({x,y,scale})
    }

})