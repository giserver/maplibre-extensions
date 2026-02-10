export namespace Events {
    export type EventDefinition = Record<string, any>;

    export class EventManager<T extends EventDefinition> {
        private onceListeners = new Map<keyof T, Array<(e: any) => Promise<void>>>();
        private listeners = new Map<keyof T, Array<(e: any) => Promise<void>>>();

        on<TEvent extends keyof T>(t: TEvent, callback: (e: T[TEvent]) => Promise<void>) {
            if (this.listeners.has(t)) this.listeners.get(t)!.push(callback);
            else this.listeners.set(t, [callback]);
        }

        once<TEvent extends keyof T>(t: TEvent, callback: (e: T[TEvent]) => Promise<void>) {
            if (this.onceListeners.has(t)) this.onceListeners.get(t)!.push(callback);
            else this.onceListeners.set(t, [callback]);
        }

        off<TEvent extends keyof T>(t: TEvent, callback: (e: T[TEvent]) => Promise<void>) {
            if (this.listeners.has(t)) {
                this.listeners.get(t)!.splice(this.listeners.get(t)!.indexOf(callback), 1);
            }

            if (this.onceListeners.has(t)) {
                this.onceListeners.get(t)!.splice(this.onceListeners.get(t)!.indexOf(callback), 1);
            }
        }

        async fire<TEvent extends keyof T>(t: TEvent, e: T[TEvent]) {
            if (this.listeners.has(t)) {
                for (const callback of this.listeners.get(t)!) {
                    await callback(e);
                }
            }

            if (this.onceListeners.has(t)) {
                for (const callback of this.onceListeners.get(t)!) {
                    await callback(e);
                }
                this.onceListeners.delete(t);
            }
        }
    }
}
