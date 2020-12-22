import { resolve } from "path";
import { spawn } from "child_process";
import { ElectronInstaller } from "../utils/installer";
import { inject, singleton } from "tsyringe";
import { AuthStrategy } from "./strategy";

@singleton()
export class ElectronAuthStrategy implements AuthStrategy {

    public constructor(
        @inject(ElectronInstaller) private installer: ElectronInstaller
    ) { }

    /**
     * start authorization process, check we have electron installed
     * and install if required
     *
     */
    public async authorize() {
        const isValid = await this.installer.validateInstallation();
        if (!isValid) {
            await this.installer.install();
        }
        this.startElectron();
    }

    /**
     * spawns electron process and load authorization page
     * 
     */
    private async startElectron() {
        const electronApp = resolve(__dirname, 'electron-main.js');
        const command     = await this.installer.resolveElectronCommand();
        console.log('start');

        if (!command) {
            return;
        }

        const spawn_env = JSON.parse(JSON.stringify(process.env));
        delete spawn_env.ATOM_SHELL_INTERNAL_RUN_AS_NODE;
        delete spawn_env.ELECTRON_RUN_AS_NODE;

        spawn(command, [electronApp], {env: spawn_env, detached: true});
    }
}
