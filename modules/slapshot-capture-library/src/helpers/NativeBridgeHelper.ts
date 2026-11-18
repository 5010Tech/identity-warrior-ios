export function mapToObject(map: Map<any, any>): any {
    const obj: any = {};
    map.forEach((value, key) => {
        obj[key] = value;
    });
    return obj;
}

export function mapsToObject(map: Map<any, Map<any,any>>): any {
    const obj: any = {};
    map.forEach((value, key) => {
        obj[key] = mapToObject(value);
    });
    return obj;
}