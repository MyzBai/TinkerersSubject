import { queryHTML } from "../utils/helpers";
import { RemoteConfigEntryHandler, LocalConfigEntryHandler } from "./configEntryHandlers";

const newButton = queryHTML('[data-type="new"]');
const loadButton = queryHTML('[data-type="load"]');

const configEntryHandlerNew = new RemoteConfigEntryHandler();
const configEntryHandlerLoad = new LocalConfigEntryHandler();


[newButton, loadButton].forEach((x, _i, arr) => {
    x.addEventListener('click', async () => {
        arr.forEach(y => y.classList.toggle('selected', y === x));
        const type = x.getAttribute('data-type') as 'new' | 'load';
        switch (type) {
            case 'new': await configEntryHandlerNew.populateConfigList(); break;
            case 'load': await configEntryHandlerLoad.populateConfigList(); break;
        }
    });
});

export async function init() {
    newButton.click();
}
