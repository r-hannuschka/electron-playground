
import { inject, InjectionToken, singleton } from 'tsyringe';
import { spawn, exec } from "child_process";
import extract from "extract-zip";
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from "readline";

export const ELECTRON_INSTALL_PATH: InjectionToken<string> = Symbol(`electron download path`);
export const ELECTRON_VERSION: InjectionToken<string> = Symbol(`electron version`);

@singleton()
export class ElectronInstaller {

    public constructor(
        @inject(ELECTRON_VERSION) private version: string,
        @inject(ELECTRON_INSTALL_PATH) private installPath: string
    ) {}

    /**
     * install electron
     *
     */
    public async install(): Promise<void> {
        const isAvailable = await this.isElectronAvailable();

        if (!isAvailable) {
            const installDir = path.resolve(__dirname, this.installPath);
            if (!fs.existsSync(installDir)) {
                fs.mkdirSync(installDir);
            }

            await this.downloadElectron();
            await this.extractFile();
            await this.finalizeInstallation();
        }
    }

    /**
     * validate electron installation
     *
     */
    public async validateInstallation() {

        const installDir = path.resolve(__dirname, this.installPath);
        const electronCommand = await this.resolveElectronCommand();

        if (!electronCommand) {
            return false;
        }

        const versionFilePath = path.resolve(installDir, "version");
        if (!fs.existsSync(versionFilePath) || fs.statSync(versionFilePath).isFile) {
            return false;
        }

        const version = await this.readElectronVersion();
        return version === this.version;
    }

    /**
     * get current electron version
     *
     */
    private async readElectronVersion(): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const versionFile = path.resolve(__dirname, this.installPath, 'version');

            if (!fs.existsSync(versionFile) || fs.statSync(versionFile).isFile) {
                return null;
            }

            const rs = fs.createReadStream(versionFile, {encoding: 'utf8'});
            const line = readline.createInterface(rs);

            line.on("line", (version) => resolve(version));
        });
    }

    /**
     * get path from our installed electron
     *
     */
    public resolveElectronCommand(): Promise<string | null> {

        return new Promise((resolve, reject) => {
            const pathFile = path.resolve(__dirname, 'path.txt');

            if (!fs.existsSync(pathFile) || !fs.statSync(pathFile).isFile) {
                return resolve(null);
            }

            const rs = fs.createReadStream(pathFile, {encoding: 'utf8'});
            const line = readline.createInterface(rs);

            line.on("line", (command) => {
                line.close();
                rs.close();

                resolve(command);
            });
        });
    }

    /**
     * download electron binary from github
     *
     */
    private async downloadElectron(): Promise<void> {

        console.log(`Start download from: ${this.resolveDownloadUrl()} ${os.EOL}`);

        const download    = await fetch(this.resolveDownloadUrl());

        const filename    = `electron.zip`
        const fileStream  = fs.createWriteStream(path.join(__dirname, this.installPath, filename), {flags: 'wx' });

        download.body.pipe(fileStream);

        return new Promise((resolve) => {
            fileStream.once('close', () => {
                resolve();
            });

            fileStream.once('error', (err) => {
                console.log(err);
            })
        });
    }

    /**
     * finalize installation
     * 
     */
    public async finalizeInstallation(): Promise<void> {
        return new Promise((resolve) => {

            const pathTxt = path.resolve(__dirname, 'path.txt');
            const pathTxt$ = fs.createWriteStream(pathTxt);

            pathTxt$.once("close", () => resolve());
            pathTxt$.write(path.join(__dirname, this.installPath, this.getPlatformPath()));
            pathTxt$.close();
        });
    }

    /**
     * build download url for electron
     * 
     */
    private resolveDownloadUrl(): string {
        const baseUrl = `https://github.com/electron/electron/releases/download`;
        const downloadFile = `electron-v${this.version}-${os.platform()}-x64.zip`;
        return baseUrl + '/v' + this.version + '/' + downloadFile;
    }
    
    /**
     * extract elctron binary
     *
     */
    private async extractFile (): Promise<void> {

        const source = path.resolve(__dirname, this.installPath, `electron.zip`);
        const outDir = path.join(__dirname, this.installPath);

        return os.platform() === `darwin`
            ? this.extractMacOs(source, outDir)
            : extract(source, {dir: outDir});
    }

    /**
     * for mac os electron requires symlinks which are not created
     * if we unzip the binary file with extract-zip inside a vscode extension
     * (by default this works on nodejs). So we have currently 2 options to make this work
     * inside of vscode
     * 
     * Option1: spawn a new node process with extract-unzip (extra file with 90kb in total)
     * but not sure node is installed
     *
     * Option2: we use unzip (mac) directly
     *
     */
    private extractMacOs(source: string, out: string): Promise<void> {

        return new Promise((resolve, reject) => {
            const childProcess = spawn("unzip", ["-o", source, "-d", out], {stdio: "inherit"});
            childProcess.on("exit", (code) => {
                if (code === 0) {
                    fs.writeFileSync(path.join(__dirname, 'path.txt'), this.getPlatformPath());
                    resolve();
                }
                reject();
            });
        });
    }

    /**
     * get platform path for electron
     *
     */
    private getPlatformPath() {
        const platform = process.env.npm_config_platform || os.platform();
        switch (platform) {
            case 'mas':
            case 'darwin':
            return 'Electron.app/Contents/MacOS/Electron'
            case 'freebsd':
            case 'openbsd':
            case 'linux':
            return 'electron'
            case 'win32':
            return 'electron.exe'
            default:
            throw new Error('Electron builds are not available on platform: ' + platform)
        }
    }

    /**
     * check we have an running electron version, first check the path.txt command
     * if this not exists or is just empty we try global electron installation
     *
     */
    private async isElectronAvailable(): Promise<boolean> {
        const command = await this.resolveElectronCommand();
        return new Promise((resolve) => {
            exec(`${command ?? `electron`} --version`, (err, version: string) => {

                if (!err && !command) {
                    const pathTxt = path.resolve(__dirname, 'path.txt');
                    const pathTxt$ = fs.createWriteStream(pathTxt);
                    pathTxt$.write('electron');
                    pathTxt$.close();
                }

                resolve(err === null);
            });
        });
    }
}