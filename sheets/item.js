export default class glinaItem extends foundry.appv1.sheets.ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 600,
            height: 350,
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

        html.find(`button`).mousedown( this._ItemOnMouseDown.bind(this) );
        html.find(`.option`).change( this._changeOption.bind(this) );
    }

    _ItemOnMouseDown( event ) {
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
}