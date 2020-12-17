import "reflect-metadata";
import { ElectronManager, ELECTRON_VERSION, ELECTRON_INSTALL_PATH } from "./utils/manager";
import { container, inject, singleton } from "tsyringe";

container.register(ELECTRON_INSTALL_PATH, {useValue: "./bin"});
container.register(ELECTRON_VERSION, {useValue: "11.0.3"});

@singleton()
export class ElectronAuthModule {

    public constructor(
        @inject(ElectronManager) private manager: ElectronManager
    ) { }

    public async authorize() {
        const isValid = await this.manager.validateInstallation();
        if (!isValid) {
            await this.manager.install();
        }
        process.stdout.write("starte nun");
        this.manager.start();
    }
}

const eam = container.resolve(ElectronAuthModule);
eam.authorize();
process.stdout.write("closed");

setInterval(() => {}, 1 << 30);