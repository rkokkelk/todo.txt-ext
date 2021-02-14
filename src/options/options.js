/*
 * Get browser preferences
 * @return {dict} - The preference dictionary
 */
async function getPrefs(){
    const result = await browser.storage.local.get("preferences") || {};
    return result.preferences || {};
}

/*
 * When checkbox changes update preferences
 */
async function onCheckboxChange() {
    let item = this;
    const prefs = await getPrefs();
    prefs[item.id] = item.checked;

    browser.storage.local.set({
        preferences: prefs
    });
}

/*
 * Default onReady function
 */
async function onReady() {
    console.log( "ready!" );
    const prefs = await getPrefs();

    // Set all labels & boolean values from preferences
    $("div#behavior").find("input").each(function(){ 

        const id = this.id;
        let label = $("label[for='" + id + "']");
        let label_id = id.substr(0,1).toUpperCase() +id.substr(1);  // Capatalize id

        // Set label value & checkbox
        label.text(browser.i18n.getMessage("opt" + label_id));
        this.checked = prefs[this.id];

        // Set onChange function
        $(this).on("change", onCheckboxChange);
    });
}

/*
 * Default onload function
 */
$( document ).ready(onReady);
