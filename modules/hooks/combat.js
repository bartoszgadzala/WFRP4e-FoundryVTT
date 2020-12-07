import WFRP_Audio from "../system/audio-wfrp4e.js";
import WFRP_Utility from "../system/utility-wfrp4e.js";
import WFRP4E from "../system/config-wfrp4e.js";

export default function() {
  /**
   * Displays round/turn summaries as combat turns go by, also focuses on token whose turn is starting
   */
  Hooks.on("updateCombat", (combat, data) => {
    if (game.user.isGM && combat.data.round != 0 && combat.turns && combat.data.active) {
      let turn = combat.turns.find(t => t.tokenId == combat.current.tokenId)

      if (game.settings.get("wfrp4e", "statusOnTurnStart"))
        WFRP_Utility.displayStatus(turn.actor, combat.data.round);

      if (game.settings.get("wfrp4e", "focusOnTurnStart")) {
        canvas.tokens.get(turn.token._id).control();
        canvas.tokens.cycleTokens(1, true);
      }

      // if (combat.current.turn > -1)
      // {
      //   let actor = combat.turns[combat.current.turn].actor;
      //   let endTurnEffects = actor.constructor.consolidateEffects(actor.data.effects).filter(e => e.flags.wfrp4e.trigger == "endTurn")
      //   endTurnEffects.forEach(e => {
      //     WFRP4E.conditionScripts[e.flags.wfrp4e.key](actor);
      //   })
      // }

      WFRP_Audio.PlayContextAudio({ item: { type: 'round' }, action: "change" })
    }
  })

  Hooks.on("preUpdateCombat", (combat, data) => {
    if (game.user.isGM && combat.data.round != 0 && combat.turns && combat.data.active) 
    {
      if (combat.current.turn > -1 && combat.current.turn == combat.turns.length-1)
      {
        let msgContent = ""
        for(let turn of combat.turns)
        {
          let endRoundEffects = turn.actor.data.effects.filter(e => getProperty(e, "flags.wfrp4e.trigger") == "endRound")
          for(let effect of endRoundEffects)
          {
            if (game.wfrp4e.config.conditionScripts[effect.flags.core.statusId])
            {
              let conditionName = game.i18n.localize(game.wfrp4e.config.conditions[effect.flags.core.statusId])
              if (Number.isNumeric(effect.flags.wfrp4e.value))
                conditionName += ` ${effect.flags.wfrp4e.value}`
              msgContent = `
              <h2>${conditionName}</h2>
              <a class="condition-script" data-combatant-id="${turn._id}" data-cond-id="${effect.flags.core.statusId}">${game.i18n.format("CONDITION.Apply", {condition : conditionName})}</a>
              `
              ChatMessage.create({content : msgContent, speaker : { alias : turn.token.name} } )
            }
          }
        }
      } 
      
      
      let combatant = game.combat.turns[game.combat.turn]
      let endTurnEffects = combatant.actor.data.effects.filter(e => getProperty(e, "flags.wfrp4e.trigger") == "endTurn")
      for(let effect of endTurnEffects)
      {
        if (game.wfrp4e.config.conditionScripts[effect.flags.core.statusId])
        {
          let conditionName = game.i18n.localize(game.wfrp4e.config.conditions[effect.flags.core.statusId])
          if (Number.isNumeric(effect.flags.wfrp4e.value))
            conditionName += ` ${effect.flags.wfrp4e.value}`
          msgContent = `
          <h2>${conditionName}</h2>
          <a class="condition-script" data-combatant-id="${combatant._id}" data-cond-id="${effect.flags.core.statusId}">${game.i18n.format("CONDITION.Apply", {condition : conditionName})}</a>
          `
          ChatMessage.create({content : msgContent, speaker : { alias : combatant.token.name} } )

        }
      }

    }
  })

  /**
   * Remove advantage from all combatants when combat ends
   */
  Hooks.on("deleteCombat", async (combat) => {
    for (let turn of combat.turns) {
      await turn.actor.update({ "data.status.advantage.value": 0 })
    }

    let content = 
    `
    <h2>End Of Combat Reminders</h3>
    `

    for (let script in game.wfrp4e.config.systemScripts.endCombat)
    {
      let scriptResult = game.wfrp4e.config.systemScripts.endCombat[script](combat)
      if (scriptResult)
        content += scriptResult + "<br><br>";
    }

    ChatMessage.create({content, whisper: ChatMessage.getWhisperRecipients("GM")})
  })
}