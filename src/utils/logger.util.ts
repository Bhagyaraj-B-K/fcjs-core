export class Logger {
  public static colorLog(
    log: string,
    color?: 'green' | 'yellow' | 'blue' | 'red' | 'pink' | 'cyan',
  ): string {
    switch (color) {
      case 'green':
        return `\x1b[32m${log}\x1b[0m`;
      case 'yellow':
        return `\x1b[33m${log}\x1b[0m`;
      case 'blue':
        return `\x1b[34m${log}\x1b[0m`;
      case 'red':
        return `\x1b[31m${log}\x1b[0m`;
      case 'pink':
        return `\x1b[35m${log}\x1b[0m`;
      case 'cyan':
        return `\x1b[36m${log}\x1b[0m`;
      default:
        return log;
    }
  }

  public static colorLogBg(
    log: string,
    color?: 'green' | 'yellow' | 'blue' | 'red' | 'pink' | 'cyan' | 'white',
  ): string {
    switch (color) {
      case 'green':
        return `\x1b[42m${log}\x1b[0m`;
      case 'yellow':
        return `\x1b[43m${log}\x1b[0m`;
      case 'blue':
        return `\x1b[44m${log}\x1b[0m`;
      case 'red':
        return `\x1b[41m${log}\x1b[0m`;
      case 'pink':
        return `\x1b[45m${log}\x1b[0m`;
      case 'cyan':
        return `\x1b[46m${log}\x1b[0m`;
      case 'white':
        return `\x1b[47m${log}\x1b[0m`;
      default:
        return log;
    }
  }

  private static logBase(
    context: string,
    message: string,
    color: 'green' | 'yellow' | 'red' = 'green',
  ) {
    const now = new Date().toLocaleString();
    const pid = process.pid.toString().padEnd(5);
    const colorFn = (log: string) => this.colorLog(log, color);

    console.log(
      `${colorFn('[FCJs]')} ${pid} - ${colorFn(now)}   [${context}] ${message}`,
    );
  }

  public static log(context: string, message: string) {
    this.logBase(context, message);
  }

  public static error(context: string, message: string) {
    this.logBase(context, message, 'red');
  }

  public static warn(context: string, message: string) {
    this.logBase(context, message, 'yellow');
  }

  public static colorizeMethod(method: string): string {
    const upper = method.toUpperCase();
    switch (upper) {
      case 'GET':
        return this.colorLog(upper, 'green');
      case 'POST':
        return this.colorLog(upper, 'yellow');
      case 'PUT':
        return this.colorLog(upper, 'blue');
      case 'DELETE':
        return this.colorLog(upper, 'red');
      default:
        return this.colorLog(upper, 'blue');
    }
  }
}
