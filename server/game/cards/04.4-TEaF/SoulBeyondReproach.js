const DrawCard = require('../../drawcard.js');
const { Players, CardTypes } = require('../../Constants');

class SoulBeyondReproach extends DrawCard {
    setupCardAbilities(ability) {
        this.action({
            title: 'Honor a character, then honor it again',
            target: {
                cardType: CardTypes.Character,
                controller: Players.Self,
                gameAction: ability.actions.honor()
            },
            then: context => ({
                gameAction: ability.actions.honor({ target: context.target })
            })
        });
    }
}

SoulBeyondReproach.id = 'soul-beyond-reproach';

module.exports = SoulBeyondReproach;
