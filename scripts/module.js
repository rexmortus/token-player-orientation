let socket;

// Register to get hooks from simple-token-movement
Hooks.once("socketlib.ready", () => {

    socket = socketlib.registerModule("simple-token-movement");

    socket.register('getZoomLevel', getZoomLevel)
    socket.register('changeZoomLevel', changeZoomLevel)
    socket.register('selectOrReleaseToken', selectOrReleaseToken)

});

function selectOrReleaseToken(actorId) {

    // Canvas
    let token = canvas.tokens.get(actorId) || findByDocumentActorId(actorId);
    let isTokenActive = token?.controlled;

    let isActiveCombat = game.combats?.active && game.combats?.active?.started;

    if (isActiveCombat) {
        return;
    }

    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id].display === true) { 
        
        if (isTokenActive) {
            // Release currently controlled token
            token.release();
            panToCenterpointOfTokens(canvas.tokens.ownedTokens);
        } else {
            // Release all other controlled tokens
            canvas.tokens.controlled.forEach(t => {
                if (t.id !== token.id) t.release();
            });

            // Control the specified token
            token.control({releaseOthers: true});
            centerOnToken(token, false, true);
        }
    }  
}


function getZoomLevel() {
    return canvas.scene._viewPosition.scale
}

function changeZoomLevel(nFeet) {

    let currentViewPosition = canvas.scene._viewPosition;

    canvas.animatePan({
        x: currentViewPosition.x,
        y: currentViewPosition.y,
        scale: calculateScaleForNumberOfFeet(nFeet)
    })

}



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

function calculateScaleForNumberOfFeet(nFeet) {

    let gridDistance = canvas.scene.grid.distance;
    let gridSize = canvas.scene.grid.size;

    // Calculate total vision area in pixels (vision range + buffer)
    let buffer = canvas.scene.grid.distance; // 5 feet buffer
    let totalVisionPixels = (nFeet + buffer) * (gridSize / gridDistance) * 2;

    // Window dimensions
    let windowHeight = window.innerHeight;
    let windowWidth = window.innerWidth;

    // Calculate required scale
    let scaleX = windowWidth / totalVisionPixels;
    let scaleY = windowHeight / totalVisionPixels;
    let scale = Math.min(scaleX, scaleY, 2); // Ensure scale is not more than 2

    return scale;

}

// This function takes a token and calculates the appropriate scale 
// for showing the entire token's vision within the canvas

function calculateVisionScaleForToken(token) {

    // Token's vision range and grid information
    let visionRange = token.document.sight.range;
    let gridDistance = canvas.scene.grid.distance;
    let gridSize = canvas.scene.grid.size;

    // Calculate total vision area in pixels (vision range + buffer)
    let buffer = 5; // 5 feet buffer
    let totalVisionPixels = (visionRange + buffer) * (gridSize / gridDistance) * 2;

    // Window dimensions
    let windowHeight = window.innerHeight;
    let windowWidth = window.innerWidth;

    // Calculate required scale
    let scaleX = windowWidth / totalVisionPixels;
    let scaleY = windowHeight / totalVisionPixels;
    let scale = Math.min(scaleX, scaleY, 2); // Ensure scale is not more than 2

    return scale;
}

function calculateScaleForAllTokens(tokens) {

    let buffer = canvas.scene.grid.size;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    let totalVisionRange = 0, ownedTokensCount = 0;

    let gridSize = canvas.scene.grid.size;
    let gridDistance = canvas.scene.grid.distance;

    // Calculate total vision range for owned tokens
    tokens.forEach(token => {
        if (canvas.tokens.ownedTokens.includes(token)) {

            // NOTE - I'm capping the vision range at 30 for now, anything else just seems to zoomed out
            totalVisionRange += Math.min(token.document.sight.range, 30);
            ownedTokensCount++;
        }
    });

    // Calculate average vision range
    let averageVisionRange = ownedTokensCount > 0 ? totalVisionRange / ownedTokensCount : 0;

    // Calculate scale considering average vision range
    tokens.forEach(token => {
        
        let visionPixels = (averageVisionRange) * (gridSize / gridDistance);
        
        let x1 = token.x - visionPixels;
        let y1 = token.y - visionPixels;
        let x2 = token.x + visionPixels;
        let y2 = token.y + visionPixels;

        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);

    });

    let totalWidth = maxX - minX;
    let totalHeight = maxY - minY;

    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;

    let scaleX = windowWidth / totalWidth;
    let scaleY = windowHeight / totalHeight;
    let scale = Math.min(scaleX, scaleY, 2); // Ensure scale is not more than 2

    return scale;
}



function centerOnToken(token, visionZoom=true, closezoom=false) {    

    if (visionZoom) {

        if (!token || !canvas.scene || !token.document.sight.range) {
            console.log("Required elements are missing.");
            return;
        }

        canvas.animatePan({
            x: token.document.x + (canvas.scene.grid.size /  2),
            y: token.document.y + (canvas.scene.grid.size / 2),
            scale: calculateScaleForNumberOfFeet(30)
        });

    }

    else if (closezoom) {
        
        canvas.animatePan({
            x: token.document.x + (canvas.scene.grid.size / 2),
            y: token.document.y + (canvas.scene.grid.size / 2),
            scale: calculateScaleForNumberOfFeet(15)
        })
        
    } 
    
    else {

        canvas.animatePan({
            x: token.document.x + (canvas.scene.grid.size / 2),
            y: token.document.y + (canvas.scene.grid.size / 2)
        });

    }

}

function canTokenSeeToken(observerToken, targetToken) {

    let losBlocked = CONFIG.Canvas.polygonBackends.move.testCollision(observerToken.center, targetToken.center, { type: "move", mode: "any" });
    
    if (losBlocked) {
        return false; // Line of sight is blocked
    }

    // Calculate distance between tokens
    let distance = Math.floor(canvas.grid.measureDistance(observerToken, targetToken));

    // Check if the target is within the observer's vision range
    if (distance <= observerToken.document.sight.range) {
        return true;
    }

    return false; // Target is out of vision range
}

function canAnyOwnedTokenSeeToken(movingToken) {
    
    // Get all tokens owned by the current user
    let ownedTokens = canvas.tokens.ownedTokens;

    // Check each owned token for line of sight and vision range to the moving token
    return ownedTokens.some(ownedToken => {

        // Check line of sight
        let losBlocked = CONFIG.Canvas.polygonBackends.move.testCollision(ownedToken.center, movingToken.center, { type: "move", mode: "any" });

        if (losBlocked) return false; // Line of sight is blocked

        // Calculate distance between tokens
        const distance = canvas.grid.measureDistance(ownedToken, movingToken);

        // Check if the moving token is within the owned token's vision range
        return distance <= ownedToken.document.sight.range;
    });
}

function panToCenterpointOfTokens(tokens) {

    // Initialize sums of X and Y coordinates
    let sumX = 0;
    let sumY = 0;

    // Add up the X and Y coordinates of each token
    tokens.forEach(token => {
        sumX += token.document.x;
        sumY += token.document.y;
    });

    // Calculate the average X and Y coordinates
    let centerX = sumX / tokens.length;
    let centerY = sumY / tokens.length;

    canvas.animatePan({
        x: centerX,
        y: centerY,
        scale: calculateScaleForAllTokens(tokens)
    });

}

function findByDocumentActorId(actorId) {

    console.log('resorted to findByActorId');

    let foundEntry = null;

    canvas.tokens.placeables.forEach((value, key) => {
        if (value.document && value.document.actorId === actorId) {
            foundEntry = value;
        }
    });

    return foundEntry;
}

let chatMessages = [];
let intervalId = null;

function processElement() {

    if (chatMessages.length > 0) {

        // Process the first element
        const chatMessage = chatMessages.shift();
        displayTextBelowToken(chatMessage);

        // Check if the chatMessages is empty and clear the interval
        if (chatMessages.length === 0) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
}

function startProcessing(immediate = false) {

    if (intervalId === null) {

        if (immediate) {
            processElement(); // Process immediately
            intervalId = setInterval(processElement, 3000);
        } else {
            intervalId = setInterval(processElement, 3000);
            processElement(); // This ensures the first element is processed immediately
        }
    }
}

function addChatMessage(chatMessage) {

    let wasEmpty = chatMessages.length === 0;
    chatMessages.push(chatMessage);
    startProcessing(wasEmpty);

}


Hooks.on('createChatMessage', function(chatMessage) {

    if (chatMessage.isRoll && chatMessage.rolls) {

        addChatMessage(chatMessage)

    }
    
});

function displayTextBelowToken(chatMessage) {
    
    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id].display === true) {

        let messageString = chatMessage.flavor ? chatMessage.flavor : '';

        let speakerToken = canvas.tokens.get(chatMessage.speaker.token) || findByDocumentActorId(chatMessage.speaker.actor)  

        if (!chatMessage.whisper.length && chatMessage.isRoll && chatMessage.rolls) {
            messageString = `${messageString}\n ${chatMessage.rolls[0].total}`
         }

        let flavorTextSprite = new PIXI.Text(messageString, {
            fontFamily: 'Arial',
            fontSize: 40,
            fill: 0xD3D3D3,
            align: 'center',
            stroke: 0x000000,
            strokeThickness: 6
        });

        flavorTextSprite.alpha = 0.5; 
        flavorTextSprite.scale.set(0.8);

        let tokenCenterX = speakerToken.x + (canvas.dimensions.size / 2);
        let tokenBottomY = speakerToken.y + (canvas.dimensions.size * 1.1);

        flavorTextSprite.anchor.set(0.5, 0);
        flavorTextSprite.x = tokenCenterX;
        flavorTextSprite.y = tokenBottomY;
    
        flavorTextSprite.position.set(tokenCenterX, tokenBottomY - 30);

        canvas.stage.addChild(flavorTextSprite);

        let elapsedTime = 0;

        canvas.app.ticker.add((delta) => {

            elapsedTime += delta;

            const progress = Math.min(elapsedTime / 180, 1); // Normalize progress to [0, 1]
            flavorTextSprite.alpha = progress; // Fade in
            flavorTextSprite.scale.x = flavorTextSprite.scale.y = 0.8 + 0.2 * progress; // Scale up from 0.8 to 1

            if (progress === 1) {
                canvas.stage.removeChild(flavorTextSprite);
            }
        });
        
        if (canAnyOwnedTokenSeeToken(speakerToken)) {

            centerOnToken(speakerToken, false, true)

        }


    }
    
}

Hooks.on('deleteCombat', (combat, options, userId) => {

    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id].display === true) {
        canvas.tokens.releaseAll();
        panToCenterpointOfTokens(canvas.tokens.ownedTokens)
    }

});


Hooks.on('updateCombat', function(combat, html, data, anotherThing) {

    // debugger;

    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id].display === true) {

        // Get the current combatant token
        let token = combat.combatant.token;

        // Animation parameters
        let targetOrientation = token.flags.orientations?.orientation ?? 0;
        let targetRotation = targetOrientation * (Math.PI / 180);
        let currentRotation = canvas.app.stage.rotation;

        let deltaRotation = calculateShortestRotation(currentRotation, targetRotation);
        let durationInSeconds = .5;
        let rotationPerFrame = deltaRotation / (30 * durationInSeconds); // Assuming 60 frames per second

        function animate() {
            if (Math.abs(canvas.app.stage.rotation - targetRotation) > Math.abs(rotationPerFrame)) {
                canvas.app.stage.rotation += rotationPerFrame;
                requestAnimationFrame(animate); // Continue animation
            } else {
                canvas.app.stage.rotation = targetRotation;
                finalizeAnimation();
            }
        }

        function finalizeAnimation() {
            canvas.app.stage.rotation = normalizeRadians(canvas.app.stage.rotation);

            if (canvas.tokens.ownedTokens.includes(canvas.tokens.get(token.id))) {
                centerOnToken(canvas.tokens.get(token.id));
                canvas.tokens.get(token.id).control({ releaseOthers: true });
            } else  {
                canvas.tokens.releaseAll();
                panToCenterpointOfTokens(canvas.tokens.ownedTokens)
            }
        }

        animate();

        
    } else {
        return;
    }

})

Hooks.on("updateToken", (token, updateData, ...args) => {

    // Get the respective tokens
    let updatedToken = canvas.tokens.get(token.id);
    let controlledToken = canvas.tokens.controlled[0];

    // Get some info bout' 'em
    let isTokenOwned = canvas.tokens?.ownedTokens?.includes(updatedToken);
    let isActiveCombat = game.combats?.active && game.combats?.active?.started;
    let isTokenMoving = updateData.x || updateData.y || false
    let isTokenActive = controlledToken?.id === updatedToken?.id

    if (game.settings.get('monks-common-display', 'playerdata')[game.users.current._id]?.display === true) { 

        // For active combats
        if (isActiveCombat) {

            // When the token's position has been refreshed
            if (isTokenMoving) {
                
                // If there is a controlled token and it's the active token
                if (controlledToken && isTokenActive) {
                    centerOnToken(updatedToken, false, false)
                }

                // Otherwise, if the token is owned
                else if (isTokenOwned) {
                    panToCenterpointOfTokens(canvas.tokens.ownedTokens)
                }
                
                // Otherwise if it's not owned
                else if (canAnyOwnedTokenSeeToken(updatedToken)) {
                    panToCenterpointOfTokens(canvas.tokens.ownedTokens.concat([updatedToken]))
                } else {
                    return;
                }
            }
                    
            // Some other things?

        } 
        
        // For non-combat scenes, if the token is moving just pan to the centerpoint of all owned tokens
        else {

            if (isTokenActive) {
                centerOnToken(updatedToken, false, false)
            } else if (isTokenMoving && canAnyOwnedTokenSeeToken(updatedToken)) {
                panToCenterpointOfTokens(canvas.tokens.ownedTokens.concat([updatedToken]))
            } else if (isTokenMoving) {
                panToCenterpointOfTokens(canvas.tokens.ownedTokens);
            }
        }
       
        
    }

})