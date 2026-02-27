export namespace Units {
    export type UnitsLength = "mm" | "cm" | "dm" | "m" | "km" | "mile";

    export type UnitsArea = "m2" | "km2" | "mu" | "ha" | "ft2" | "acre";

    export type UnitsAngle = "d" | "m" | "s" | "r";

    function unsupportUnitsError(units: string) {
        return Error(`不支持的单位转换：${units}`);
    }

    /**
     * 面积转换到基础单位(平方米)
     * @param value 面积
     * @param units value的单位
     * @returns 面积 单位平方米
     */
    export function areaToBase(value: number, units: UnitsArea) {
        switch (units) {
            case "km2":
                return value * 1000000;
            case "ha":
                return value * 10000;
            case "acre":
                return value * 4046.86;
            case "mu":
                return value * 666.67;
            case "m2":
                return value;
            case "ft2":
                return value * 0.09290304;
            default:
                throw unsupportUnitsError(units);
        }
    }

    /**
     * 面积基础单位(平方米)，转换到对应面积单位
     * @param value 面积 单位平方米
     * @param units 转换至的面积单位
     * @returns units 对应的面积
     */
    export function areaBaseTo(value: number, units: UnitsArea) {
        switch (units) {
            case "km2":
                return value / 1000000;
            case "ha":
                return value / 10000;
            case "acre":
                return value / 4046.86;
            case "mu":
                return value / 666.67;
            case "m2":
                return value;
            case "ft2":
                return value / 0.09290304;
            default:
                throw unsupportUnitsError(units);
        }
    }

    /**
     * 长度转换到基础单位(米)
     * @param value 长度
     * @param units value的单位
     * @returns 长度 单位米
     */
    export function lengthToBase(value: number, units: UnitsLength) {
        switch (units) {
            case "km":
                return value * 1000;
            case "m":
                return value;
            case "dm":
                return value / 10;
            case "cm":
                return value / 100;
            case "mm":
                return value / 1000;
            default:
                throw unsupportUnitsError(units);
        }
    }

    /**
     * 长度基础单位(米)，转换到对应长度单位
     * @param value 长度 单位米
     * @param units 转换至的长度单位
     * @returns units 对应的长度
     */
    export function lengthBaseTo(value: number, units: UnitsLength) {
        switch (units) {
            case "km":
                return value / 1000;
            case "m":
                return value;
            case "dm":
                return value / 10;
            case "cm":
                return value / 100;
            case "mm":
                return value / 1000;
            default:
                throw unsupportUnitsError(units);
        }
    }

    /**
     * 角转换成基础单位(°)
     * @param value 角
     * @param units value的单位
     * @returns 角 单位度
     */
    export function angleToBase(value: number, units: UnitsAngle) {
        switch (units) {
            case "d":
                return value;
            case "m":
                return value / 60;
            case "s":
                return value / 3600;
            case "r":
                return (value * 180) / Math.PI;
            default:
                throw unsupportUnitsError(units);
        }
    }

    /**
     * 角度(°)，转换到对应的单位
     * @param value 角 单位°
     * @param units 转换至的角单位
     * @returns units 对应的角数据
     */
    export function angleBaseTo(value: number, units: UnitsAngle) {
        switch (units) {
            case "d":
                return value;
            case "m":
                return value * 60;
            case "s":
                return value * 3600;
            case "r":
                return (value * Math.PI) / 180;
            default:
                throw unsupportUnitsError(units);
        }
    }

    /**
     * 面积转换
     * @param value 面积
     * @param fromUnits 原单位
     * @param toUnits 转换后单位
     * @returns
     */
    export function convertArea(value: number, fromUnits: UnitsArea, toUnits: UnitsArea): number {
        return areaBaseTo(areaToBase(value, fromUnits), toUnits);
    }

    /**
     * 长度转换
     * @param value 长度
     * @param fromUnits 原单位
     * @param toUnits 转换后单位
     * @returns
     */
    export function convertLength(value: number, fromUnits: UnitsLength, toUnits: UnitsLength): number {
        return lengthBaseTo(lengthToBase(value, fromUnits), toUnits);
    }

    /**
     * 角度转换
     * @param value 角度
     * @param fromUnits 原单位
     * @param toUnits 转换后单位
     * @returns
     */
    export function convertAngle(value: number, fromUnits: UnitsAngle, toUnits: UnitsAngle): number {
        return angleBaseTo(angleToBase(value, fromUnits), toUnits);
    }
}