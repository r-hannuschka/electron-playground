import "reflect-metadata";
import { container } from "tsyringe";
import * as vscode from "vscode";

import { ElectronAuthStrategy } from "./authorization/electron.strategy";
import { AuthStrategy } from "./authorization/strategy";
import { ELECTRON_INSTALL_PATH, ELECTRON_VERSION } from "./utils/installer";

container.register(ELECTRON_INSTALL_PATH, {useValue: "./bin"});
container.register(ELECTRON_VERSION, {useValue: "11.1.0"});

export function activate(context: vscode.ExtensionContext) {

    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('vscodeElectron.helloWorld', () => {
        const authService: AuthStrategy  = container.resolve(ElectronAuthStrategy);
        authService.authorize();
    });
      
    context.subscriptions.push(disposable);
}

function deactivate() {
}
