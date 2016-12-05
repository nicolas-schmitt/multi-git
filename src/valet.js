import confirm from 'inquirer-confirm';
import path from 'path';

import fs from './fs';
import Manager from './manager';

export default class Valet {
    static helpInstall() {
        const configFilePath = fs.expandHomeDir(path.join('~', Manager.ConfigFileName));
        return fs.statAsync(configFilePath)
            .catch((error) => {
                if (error.code === 'ENOENT') {
                    return confirm('No configuration file found. Do you want to create one ?');
                } else {
                    throw error;
                }
            })
            .then(() => {
                fs.createReadStream(path.join(__dirname, '../', Manager.ConfigFileName))
                .pipe(fs.createWriteStream(configFilePath));
            })
            .catch((error) => {
                if (typeof error !== 'undefined') {
                    throw error;
                }
            })
            .done();
    }
}
