import debug from 'debug';

class DebugFactory {
    public success: (formatter: any, ...args: any[]) => void;
    public trace: (formatter: any, ...args: any[]) => void;
    public debug: (formatter: any, ...args: any[]) => void;
    public info: (formatter: any, ...args: any[]) => void;
    public error: (formatter: any, ...args: any[]) => void;

    constructor(instance: string) {
        const debugTrace = debug(instance + ':trace');
        const debugDebug = debug(instance + ':debug');
        const debugInfo = debug(instance + ':info');
        const debugSuccess = debug(instance + ':success');
        const debugError = debug(instance + ':error');

        this.trace = (formatter: any, ...args: any[]) => debugTrace(formatter, ...args);
        this.debug = (formatter: any, ...args: any[]) => debugDebug(formatter, ...args);
        this.info = (formatter: any, ...args: any[]) => debugInfo(formatter, ...args);
        this.success = (formatter: any, ...args: any[]) => debugSuccess(formatter, ...args);
        this.error = (formatter: any, ...args: any[]) => debugError(formatter, ...args);
    }
}

export default DebugFactory
