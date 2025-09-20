export class AutoBind<T extends object> {
  constructor(private instance: T) {
    const proto = Object.getPrototypeOf(this.instance) as Record<
      string,
      unknown
    >;
    const propertyNames = Object.getOwnPropertyNames(proto) as (keyof T)[];

    for (const key of propertyNames) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (
        key !== 'constructor' &&
        descriptor &&
        typeof descriptor.value === 'function'
      ) {
        Object.defineProperty(this.instance, key, {
          ...descriptor,
          value: descriptor.value.bind(this.instance),
        });
      }
    }
  }
}
