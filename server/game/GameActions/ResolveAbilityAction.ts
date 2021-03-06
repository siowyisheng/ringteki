import AbilityContext = require('../AbilityContext');
import AbilityResolver = require('../gamesteps/abilityresolver');
import CardAbility = require('../CardAbility');
import DrawCard = require('../drawcard');
import Player = require('../player');
import SimpleStep = require('../gamesteps/simplestep');
import InitiateCardAbilityEvent = require('../Events/InitiateCardAbilityEvent');
import { CardGameAction, CardActionProperties } from './CardGameAction';
import { EventNames } from '../Constants';

class NoCostsAbilityResolver extends AbilityResolver {
    initialise() {
        this.pipeline.initialise([
            new SimpleStep(this.game, () => this.createSnapshot()),
            new SimpleStep(this.game, () => this.openInitiateAbilityEventWindow()),
            new SimpleStep(this.game, () => this.executeHandler()),
            new SimpleStep(this.game, () => this.refillProvinces())
        ]);
    }

    openInitiateAbilityEventWindow() {
        this.game.raiseEvent(EventNames.OnCardAbilityInitiated, { card: this.context.source, ability: this.context.ability, context: this.context }, () => {
            this.game.queueSimpleStep(() => this.resolveTargets());
            this.game.queueSimpleStep(() => this.initiateAbilityEffects());    
        });
    }

    initiateAbilityEffects() {
        if(this.cancelled) {
            return;
        } else if(this.context.ability.max && !this.context.subResolution) {
            this.context.player.incrementAbilityMax(this.context.ability.maxIdentifier);
        }
        this.context.ability.displayMessage(this.context, 'resolves');
        this.game.openEventWindow(new InitiateCardAbilityEvent({ card: this.context.source, context: this.context }, () => this.initiateAbility = true));
    }
}

export interface ResolveAbilityProperties extends CardActionProperties {
    ability: CardAbility,
    subResolution?: boolean,
    player?: Player
}

export class ResolveAbilityAction extends CardGameAction {
    name = 'resolveAbility';
    defaultProperties: ResolveAbilityProperties = { 
        ability: null,
        subResolution: false
    };
    constructor(properties: ((context: AbilityContext) => ResolveAbilityProperties) | ResolveAbilityProperties) {
        super(properties);
    }

    getEffectMessage(context: AbilityContext): [string, any[]] {
        let properties = this.getProperties(context) as ResolveAbilityProperties;
        return ['resolve {0}\'s {1} ability', [properties.target, properties.ability.title]];
    }

    canAffect(card: DrawCard, context: AbilityContext, additionalProperties = {}): boolean {
        let properties = this.getProperties(context, additionalProperties) as ResolveAbilityProperties;
        let ability = properties.ability;
        let player = properties.player || context.player;
        if(!super.canAffect(card, context) || !ability || !properties.subResolution && player.isAbilityAtMax(ability.maxIdentifier)) {
            return false;
        }
        let newContext = ability.createContext(player);
        if(ability.targets.length === 0) {
            return ability.gameAction.length === 0 || ability.gameAction.some(action => action.hasLegalTarget(newContext));
        }
        return ability.canResolveTargets(newContext);
    }

    eventHandler(event, additionalProperties): void {
        let properties = this.getProperties(event.context, additionalProperties) as ResolveAbilityProperties;
        let newContext = properties.ability.createContext(properties.player || event.context.player);
        newContext.subResolution = !!properties.subResolution;
        event.context.game.queueStep(new NoCostsAbilityResolver(event.context.game, newContext));
    }

    hasTargetsChosenByInitiatingPlayer(context) {
        let properties = this.getProperties(context) as ResolveAbilityProperties;
        return properties.ability.hasTargetsChosenByInitiatingPlayer(context);
    }
}
