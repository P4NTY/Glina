export default class glinaItem extends foundry.appv1.sheets.ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 625,
            height: 390,
        });
    }

    get template() {
        return `systems/glina/templates/items/${this.item.type}.hbs`;
    }

    getData() {
        const context = super.getData();
        context.system = context.item.system;

        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(`.askRoll button`).mousedown( this._askRollManage.bind(this) );
        html.find(`.option`).change( this._changeOption.bind(this) );
        html.find(`.trackMods button`).mousedown( this._toggleEffects.bind(this) );
        html.find(`.trackMods input`).change( this._changeEffects.bind(this) );
    }

    _askRollManage( event ) {
        if ( !event.target.closest('button') ) return;
        switch (event.target.closest('button').classList[0]) {
            case "add":
                this.item.update({
                    "system.options": [
                        ...this.item.system.options,
                        {
                            id: this.item.system.options.length,
                            attribute: "",
                            desc: ""
                        }
                    ]
                });
                break;
            case "remove":              
                const removeId = event.target.closest('.option').getAttribute('data-id');
                this.item.update({
                    "system.options":
                        this.item.system.options.filter( ({id}) => id != removeId )
                });
                break;
            default:
                break;
        }
    }

    _changeOption(event) {
        const changeId = event.target.closest('.option').getAttribute('data-id');
        const values = {
            attribute: event.target.closest('.option').querySelector('select').value,
            desc: event.target.closest('.option').querySelector('input').value
        }
        
        this.item.update({
            "system.options": [
                ...this.item.system.options.filter( ({id}) => id != changeId ),
                {
                    id: changeId,
                    attribute: values.attribute,
                    desc: values.desc
                }
            ].sort( (a,b) => a.id - b.id )
        });
    }

    _toggleEffects( event ) {
        const label = event.target.closest('.mod').getAttribute('data-label'),
              effect = this.item.effects.getName(label);
        if (!effect) {
            ActiveEffect.implementation.create({
                name: label,
                disabled: false,
                changes: [{
                    key: `system.trackers.${label}.max`,
                    value: this.item.system.mods[label].value||0,
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD  
                }]
            }, { parent: this.item })
            this.item.update({ [`system.mods.${label}.isActive`]: true })
        } else {
            effect.update({ disabled: !effect.disabled });
            this.item.update({ [`system.mods.${label}.isActive`]: !this.item.system.mods[label].isActive })
        }
    }
    
    _changeEffects (event) {
        const label = event.target.closest('.mod').getAttribute('data-label'),
              effect = this.item.effects.getName(label);

        effect.update({
            "changes": [{
                key: `system.trackers.${label}.max`,
                value: event.target.value,
                mode: CONST.ACTIVE_EFFECT_MODES.ADD  
            }]
        })
    }
}