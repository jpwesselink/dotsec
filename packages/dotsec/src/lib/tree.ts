export type FFLiterals = string | number | boolean;
export type FFValue = FFLiterals | FFObject;
export type FFObject = { [key: string]: FFValue };
export const unflatten = (target: FFObject) => {
    const result: FFObject = {};
    Object.keys(target).map((key) => {
        const parts = key.split('/');
        const last = parts.pop();
        if (last) {
            const parent = parts.reduce((acc, part) => {
                if (!acc[part]) {
                    acc[part] = {};
                }
                return acc[part];
            }, result);
            parent[last] = target[key];
        }
    });

    return result;
};
const hasManualHalt = (target: FFValue) => {
    if (typeof target === 'object' && target.__dotsec_halt__) {
        return true;
    }
    return false;
};
const isParameterStoreValue = (target: FFValue) => {
    if (typeof target === 'object') {
        if (Array.isArray(target)) {
            return true;
        }
        if (target.value || target.encryptedValue) {
            if (['description'].find((x) => x in target)) {
                return true;
            } else if (
                ['String', 'SecureString'].find((x) => x === target.type)
            ) {
                return true;
            } else if (
                ['andInRegions', 'onlyInRegions'].find((x) => x in target)
            ) {
                return true;
            }
        }
    }
    return false;
};

const isSecretsManagerValue = (target: FFValue) => {
    if (typeof target === 'object') {
        if (Array.isArray(target)) {
            return true;
        }
        if (target.value || target.encryptedValue) {
            if (['description'].find((x) => x in target)) {
                return true;
            } else if (
                'addReplicaRegions' in target &&
                Array.isArray(target.addReplicaRegions)
            ) {
                return true;
            } else if (
                ['String', 'SecureString'].find((x) => x === target.type)
            ) {
                return true;
            } else if (
                ['andInRegions', 'onlyInRegions'].find((x) => x in target)
            ) {
                return true;
            }
        }
    }
    return false;
};
export const flatten = (target: FFValue) => {
    const recurse = (
        cur: FFValue,
        result: { [key: string]: FFValue } = {},
        currentPath = '',
    ) => {
        // check if it is an object
        if (
            typeof cur === 'object' &&
            hasManualHalt(cur) === false &&
            isParameterStoreValue(cur) === false &&
            isSecretsManagerValue(cur) === false
        ) {
            Object.keys(cur).forEach((key) =>
                recurse(
                    cur[key],
                    result,
                    `${currentPath ? `${currentPath}/` : ``}${key}`,
                ),
            );
        } else {
            result[currentPath] = cur;
        }

        return result;
    };

    return recurse(target);
};
