export default class glinaOfficer extends foundry.appv1.sheets.ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          width: 900,
          height: 990,
        });
      }

    get template() {
        return `systems/glina/templates/${this.actor.type}.hbs`;
    }
    async baseMoves() {
        const json = `systems/glina/moves.json`;
        return fetch(json).then( r => r.json() );   
    }

    getData() {
        const context = super.getData();
        context.system = context.actor.system;
        context.relations = context.items.filter( ({type}) => type === 'relation' );
        context.labels = context.items.filter( ({type}) => type === 'label' );
        //Add base moves
        if (context.items.length === 0)
        this.baseMoves().then( moves => {
            moves.forEach( move => {
                Item.create(move, { parent: this.actor });
            });
        });
        // Move items
        context.personalMoves = context.items.filter( ({type, system}) => type === 'move' && system.category === "Personalny" );
        context.archetypeMoves = context.items.filter( ({type, system}) => type === 'move' && system.category === "Archetyp" );
        context.investigatorMoves = context.items.filter( ({type, system}) => type === 'move' && system.category === "Śledczy" ).map( x => ({
            ...x,
            attributeName: x.name.replaceAll(' ','_').toLowerCase(),
            attributeValue: context.system.investigativeMoves[x.name.replaceAll(' ','_').toLowerCase()]
        }));

        // Trackers check
        if ( context.system.trackers.luck.curr > context.system.trackers.luck.max )
            context.system.trackers.luck.curr = context.system.trackers.luck.max;
        if ( context.system.trackers.stress.curr > context.system.trackers.stress.max )
            context.system.trackers.stress.curr = context.system.trackers.stress.max;
        if ( context.system.trackers.hour.curr > context.system.trackers.hour.max )
            context.system.trackers.hour.curr = context.system.trackers.hour.max;
        
        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(`button.item-delete`).mousedown( this._DeleteItem.bind(this) );
        html.find(`.item-add`).mousedown( this._AddItem.bind(this) );
        //Trackers
        html.find(`.trackers`).mousedown( this._TrackersOnMouseDown.bind(this) );
        html.find(`.attributes`).mousedown( this._StarTrackerOnMouseDown.bind(this));
        //investigate levels
        html.find(`.investigate p[data-name]`).mousedown( this.investigativeMovesStar.bind(this) );
        //Move
        html.find(`.move button.roll`).mousedown( this._Roll.bind(this) );
        html.find(`.move button.chat`).mousedown( this._SendToChat.bind(this) );
        html.find(`.move button.item-edit`).mousedown( this._MoveEditItem.bind(this) );
        //Relations
        html.find(`.relations li`).mousedown( this._RelationItemEdit.bind(this) );
        html.find(`.relations li input[type="number"]`).change( this._RelationItemValue.bind(this) );
        //Labels
        html.find(`.label button.item-edit`).mousedown( this._LabelItemEdit.bind(this) );
        html.find(`.label input[type="number"]`).change( this._LabelItemValue.bind(this) );
        html.find(`.label input[type="text"]`).change( this._LabelItemName.bind(this) );

        html.find(`.move`).hover(
            (event) => {
                this._dialogShow(event, true)
            },
            (event) => {
                this._dialogShow(event, false)
            }
        );
    }

    _TrackersOnMouseDown(event) {
        const btnClick = 
            (event.which === 1 || event.button === 0) ? "l" :
            (event.which === 2 || event.button === 1) ? "m" :
            (event.which === 3 || event.button === 2) ? "r" : null;
        const dataTr = event.target.getAttribute('data-tr');
        if (!dataTr) return;
        
        let minMax = [];
        if (dataTr === "PD") minMax = [0,Infinity];
        else if (dataTr === "hold") minMax = [-3,5];
        else if (dataTr === "Pagon") minMax = [0,3];
        
        if (btnClick == "l")
            this.actor.update({ 
                [`system.${dataTr === "Pagon" ? 'attributes' : 'trackers'}.${dataTr}`]:
                Math.min(this.actor.system[dataTr === "Pagon" ? 'attributes' : 'trackers'][dataTr]+1,minMax[1])
            });
        else if (btnClick == "r")
            this.actor.update({
                [`system.${dataTr === "Pagon" ? 'attributes' : 'trackers'}.${dataTr}`]:
                Math.max(this.actor.system[dataTr === "Pagon" ? 'attributes' : 'trackers'][dataTr]-1,minMax[0])
            });

        if (dataTr === "Pagon") {
            this.actor.update({
                "system.pagonName":
                [
                    "Posterunkowy",
                    "Sierżant",
                    "Aspirant",
                    "Komisarz"
                ][this.actor.system.attributes["Pagon"] + (btnClick == "l" ? 1 : -1)]
            })
        }
    }
    _StarTrackerOnMouseDown(event) {
        const btnClick = 
            (event.which === 1 || event.button === 0) ? "l" :
            (event.which === 2 || event.button === 1) ? "m" :
            (event.which === 3 || event.button === 2) ? "r" : null;
        const type = event.target.closest('div').getAttribute("data-attributes") || event.target.closest('div').getAttribute("data-skill");
        if ( !type ) return;
        else if ( event.target.closest('div').getAttribute("data-attributes") && btnClick == "l" )
            this.actor.update({ 
                [`system.attributes.${type}`]: this.actor.system.attributes[type]+1
            });
        else if (event.target.closest('div').getAttribute("data-attributes") && btnClick == "r")
            this.actor.update({
                [`system.attributes.${type}`]: Math.max(this.actor.system.attributes[type]-1,1)
            });
        else if ( event.target.closest('div').getAttribute("data-skill") && btnClick == "l" )
            this.actor.update({ 
                [`system.investigativeMoves.${type}`]:
                this.actor.system.investigativeMoves[type]+1
            });
        else if ( event.target.closest('div').getAttribute("data-skill") && btnClick == "r" )
            this.actor.update({
                [`system.investigativeMoves.${type}`]: 
                Math.max(this.actor.system.investigativeMoves[type]-1,1)
            });
    }
    _DeleteItem(event) {
        this.actor.deleteEmbeddedDocuments("Item", [
            event.target.closest("li").getAttribute("data-item-id")
        ]);
    }
    _AddItem(event) {
        switch (event.target.closest('section').classList[0]) {
            case "connections":
                Item.create({
                    name: "Więź",
                    type: "relation"
                }, { parent: this.actor });
            break;
            case "tabs":
                // if (event.target.closest('button').getAttribute("data-type") === null) return;
                Item.create({
                    name: "Ruch",
                    type: "move",
                    system: { 
                        category: "Archetyp",
                    }
                }, { parent: this.actor });
            break;
            case "labels":
                Item.create({
                    name: "Etykieta",
                    type: "label"
                }, { parent: this.actor });
            break;
            default: break;
        }
    }
    _MoveEditItem (event) {
        this.actor.items.get( 
            event.target.closest("li").getAttribute("data-item-id")
        ).sheet.render(true);   
    }
    _RelationItemEdit(event) {
        if (event.target.closest("button")?.classList.contains("item-delete")) return;
        if (event.target.nodeName == "INPUT") return;
        this.actor.items.get( 
            event.target.closest("li").getAttribute("data-item-id")
        ).sheet.render(true);   
    }
    _RelationItemValue(event) {
        const item = this.actor.items.get(event.target.closest("li").getAttribute("data-item-id"));
        const newValue = parseInt(event.target.value);

        item.update({ "system.value": newValue });
    }
    _SendToChat(event) {
        const chatSkillTemplate = `systems/glina/templates/chats/skillMsg.hbs`;
        const item = this.actor.items.get(event.target.closest("li").getAttribute("data-item-id"));
        const dataChart = {
            name: item.name,
            description: item.system.desc,
            options: item.system.options,
        }
        if (item.system.roll !== "none") {
            dataChart.result = {
                sukcess: item.system.sukcess,
                patrial: item.system.patrial,
                fail: item.system.fail,
            }
        }
        (async () =>
        ChatMessage.create({
            user: game.user._id,
            speaker: ChatMessage.getSpeaker({token: this.actor}),
            content: await renderTemplate(chatSkillTemplate, dataChart)
        }))();
    }
    async sendRollToChat({attributes, item, skill, mod, speaker}) {
        const chatRollTemplate = `systems/glina/templates/chats/rollMsg.hbs`;
        const roll = await new Roll('1d6 + 2d10').roll({async:true});
        const rollResult = {
            D6: roll.dice[0].total,
            D10: roll.dice[1].results.map( ({result}) => result ),
            isDublet: roll.dice[1].results.map( ({result}) => result )[0] === roll.dice[1].results.map( ({result}) => result )[1]
        }
        //build equation
        let equation = `${rollResult.D6}`;
        if (skill) equation +=  `+ ${attributes[skill]}`;
        if (mod !== 0) equation += `+ ${mod}`;

        const interpretation = rollResult.D10.map( x => eval(equation) >= x).reduceRight( (agg, val) => agg + val);
        const dataChart = {
            result: ["Skucha", "Fuks", "Triumf"][interpretation],
            roll: `${equation} = ${eval(equation)} 🆚 ${rollResult.D10}`,
            resultDesc: item.system[ ["fail","patrial","sukcess"][interpretation] ],
            name: item.name,
            moveDesc: item.system.desc,
        };
        if (rollResult.isDublet) dataChart.isDublet = true;
        if ( item.system.options ) dataChart.moveOption = item.system.options.filter( ({attribute}) => attribute === skill ).map( ({attribute, desc}) => `<strong>${attribute === 'Pagon' ? 'Stopień Służbowy' : attribute}</strong> - ${desc}`)[0]

        ChatMessage.create({
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            rolls: [roll],
            user: game.user._id,
            speaker: speaker,
            content: await renderTemplate(chatRollTemplate, dataChart)
        });
    }
    async _Roll(event) {
        const item = this.actor.items.get(event.target.closest("li").getAttribute("data-item-id"));
        if (item.type !== "move") return;
        if (
            this.actor.system.trackers.hour.curr == this.actor.system.trackers.hour.max &&
            item.system.category === "Śledczy"
        ) {
            ChatMessage.create({
                user: game.user._id,
                speaker: ChatMessage.getSpeaker({token: this.actor}),
                content: "Masz już 8 godzin pracy!"
            });
            return;
        }
        const attributes = this.actor.system.attributes;
        const dialogOptions = {
            hold: this.actor.system.trackers.hold,            
            itemOptions: item.system.options,
            roll: item.system.roll,
            description: item.system.desc,
        };
        if ( item.system.roll === "stress" ) dialogOptions.hold = 1;

        const template = `systems/glina/templates/parts/roll.hbs`;

        if (item.system.roll === "ask") {
            new Dialog({
                title: item.name,
                content: await renderTemplate(template, dialogOptions),
                buttons: {
                    submit: {
                        label: "Rzuć",
                        callback: async (html) => {
                            this.sendRollToChat({
                                attributes,
                                item,
                                skill: html.find('[name="option.attribute"]:checked').val(),
                                mod: parseInt(html.find('[name="mod"]:checked').val()),
                                speaker: ChatMessage.getSpeaker({token: this.actor})
                            });

                            if (dialogOptions.hold > 0 && parseInt(html.find('[name="mod"]:checked').val()) != 0)
                                this.actor.update({"system.trackers.hold": 0 });
                            if (item.system.category === "Śledczy" && item.name !== "Wbrew regułom")
                                this.actor.update({"system.trackers.hour.curr": Math.min( parseInt(this.actor.system.trackers.hour.curr) + 1, this.actor.system.trackers.max ) });
                        }
                    },
                    cancel: { label: "Zamknij", callback: () => false }
                },
                default: 'submit',
                close: () => false
            }, /* {width: 572} */).render(true);
        }
        else if (item.system.roll === "stress") {           
            new Dialog({
                title: item.name,
                content: await renderTemplate(template, dialogOptions),
                buttons: {
                    submit: {
                        label: "Rzuć",
                        callback: async (html) => {
                            this.sendRollToChat({
                                attributes,
                                item,
                                skill: null,
                                mod: parseInt(html.find('[name="mod"]:checked').val()),
                                speaker: ChatMessage.getSpeaker({token: this.actor})
                            });
                            const takeAllStress = parseInt(this.actor.system.trackers.stress.curr)+parseInt(html.find('[name="mod"]:checked').val() )
                            if ( takeAllStress <= 5 ) {
                                this.actor.update({
                                    "system.trackers.stress.curr": takeAllStress
                                });
                            }
                            else {
                                this.actor.update({
                                    "system.trackers.stress.curr": 5,
                                    "system.trackers.luck.curr": parseInt(this.actor.system.trackers.luck.curr) - (takeAllStress - 5)
                                });
                            }                            
                        }
                    },
                    cancel: { label: "Zamknij", callback: () => false }
                },
                default: 'submit',
                close: () => false
            }, /* {width: 572} */).render(true);
        }
        else if (item.system.roll !== "none") {
            this.sendRollToChat({
                attributes,
                item,
                skill: item.system.roll,
                mod: this.actor.system.trackers.hold,
                speaker: ChatMessage.getSpeaker({token: this.actor})
            });

            if (dialogOptions.hold > 0 && parseInt(html.find('[name="mod"]:checked').val()) != 0)
                this.actor.update({"system.trackers.hold": 0 });
            if (item.system.category === "Śledczy" && item.name !== "Wbrew regułom")
                this.actor.update({"system.trackers.hour.curr": Math.min( parseInt(this.actor.system.trackers.hour.curr) + 1, this.actor.system.trackers.hour.max ) });
        }
    }
    _LabelItemEdit(event) {
        this.actor.items.get( 
            event.target.closest("li").getAttribute("data-item-id")
        ).sheet.render(true);
    }
    _LabelItemValue(event) {
        const item = this.actor.items.get(event.target.closest("li").getAttribute("data-item-id"));
        const newValue = parseInt(event.target.value);

        item.update({ "system.value": newValue });
    }
    _LabelItemName(event) {
        const item = this.actor.items.get(event.target.closest("li").getAttribute("data-item-id"));
        item.update({ "system.name": event.target.value });
    }
    investigativeMovesStar(event) {
        const btnClick = 
            (event.which === 1 || event.button === 0) ? "l" :
            (event.which === 2 || event.button === 1) ? "m" :
            (event.which === 3 || event.button === 2) ? "r" : null;
        const elem = event.target.closest('p');
        const elemValue = parseInt(elem.getAttribute('data-value'));
        const elemName =  elem.getAttribute('data-name');
        if (btnClick === 'l')
            this.actor.update({ 
                [`system.investigativeMoves.${elemName}`]:
                Math.min(elemValue+1,3)
            });
        else if (btnClick === "r")
            this.actor.update({ 
                [`system.investigativeMoves.${elemName}`]:
                Math.max(elemValue-1,1)
            });
    }
    _dialogShow(event, isShow) {
        const move = event.target.closest('.move');
        const dialog = move.querySelector('.dialog');

        if (!dialog.innerText.trim()) return ;

        if (isShow) {
            dialog.style.width = move.clientWidth*.9 + 'px';
            dialog.style.display = 'initial';
        } else {
            dialog.style.display = 'none';
        }
    }
}