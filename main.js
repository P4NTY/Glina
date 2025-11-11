import glinaItem from "./sheets/item.js";
import glinaOfficer from "./sheets/officer.js";

async function preloadHandlebarTemplates() {
    const templatepaths = [
      "systems/glina/templates/parts/relation.hbs",
      "systems/glina/templates/parts/label.hbs",
      "systems/glina/templates/parts/move.hbs",
      "systems/glina/templates/parts/attr.hbs",
      "systems/glina/templates/chats/rollMsg.hbs",
      "systems/glina/templates/chats/skillMsg.hbs",
      "systems/glina/templates/parts/investigativeMoves.hbs"
    ];
    return loadTemplates(templatepaths);
  }

Hooks.once("init", async function () {
    console.log('Start');

    Items.unregisterSheet("core",ItemSheet);
    Items.registerSheet("glina", glinaItem, {makeDefault: true});

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("glina", glinaOfficer, {types: ["officer"],makeDefault: true});

    await preloadHandlebarTemplates();

    console.log("Successfully initialized GLINA!");
});

// Custom HandelBars
Handlebars.registerHelper("for", function(n, content) {
    let result = ``;
    for (let i = 1 ; i <= n ; i++)
        result += content.fn(this).replace('#{i}', i);
    return result;
});

Handlebars.registerHelper('isBigger', function (max, value) {
    return value <= max;
});

Handlebars.registerHelper('isEqual', function (max, value) {
    return value == max;
});

Handlebars.registerHelper('isNotEqual', function (max, value) {
    return value != max;
});


Handlebars.registerHelper( 'loop', function (n, content) {
    let result = "";
    for (let i = 0 ; i < n ; ++i) {
        result += content.fn(i);
    }
    return result;
})

Handlebars.registerHelper( 'loopTrack', function (min, max, current, track) {
    let result = ``;
    for ( let i = max ; i >= min ; i-- ) {
        result += `<label><input name="${track}" type="radio" value=${i} ${i == current ? 'checked' : ''}/>${i}</label>`
    }
    return result
})