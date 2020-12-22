export interface AuthStrategy {

    authorize(): Promise<any>;
}
