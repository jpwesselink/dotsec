import {
    DotSecFile,
    DotSecCollapseValues as DotSecCollapseValues,
    DotSecEncryptedValues,
    DotSecExpandValues,
    DotSecFullConfig,
    DotSecLiteral,
    DotSecParameterStoreValue,
    DotSecPlainTextValues as DotSecPlainTextValues,
    DotSecSecretsManagerValue,
    isDotSecLiteral,
} from './types';

const expand = <Encrypted extends boolean = false>(
    dotSecFile: DotSecFile<DotSecFullConfig, DotSecCollapseValues, Encrypted>,
    transform: Encrypted extends false
        ? (value: DotSecLiteral) => { value: DotSecLiteral }
        : (value: DotSecLiteral) => { encryptedValue: string },
): DotSecFile<DotSecFullConfig, DotSecExpandValues, Encrypted> => {
    const expandedParameterStoreValues = dotSecFile.parameterStore
        ? Object.fromEntries(
              Object.entries(dotSecFile.parameterStore).map(([key, value]) => {
                  if (isDotSecLiteral(value)) {
                      return [
                          key,
                          transform(value) as DotSecParameterStoreValue<
                              DotSecExpandValues,
                              Encrypted
                          >,
                      ];
                  }

                  return [key, value];
              }),
          )
        : undefined;
    const expandedSecretsManagerValues = dotSecFile.secretsManager
        ? Object.fromEntries(
              Object.entries(dotSecFile.secretsManager).map(([key, value]) => {
                  if (isDotSecLiteral(value)) {
                      return [
                          key,
                          transform(value) as DotSecSecretsManagerValue<
                              DotSecExpandValues,
                              Encrypted
                          >,
                      ];
                  }

                  return [key, value];
              }),
          )
        : undefined;

    return {
        config: dotSecFile.config,
        parameterStore: expandedParameterStoreValues,
        secretsManager: expandedSecretsManagerValues,
    };
};

export const expandValues = (
    dotSecFile: DotSecFile<
        DotSecFullConfig,
        DotSecCollapseValues,
        DotSecPlainTextValues
    >,
) => expand(dotSecFile, (value) => ({ value }));

export const expandEncryptedValues = (
    dotSecFile: DotSecFile<
        DotSecFullConfig,
        DotSecCollapseValues,
        DotSecEncryptedValues
    >,
) => expand(dotSecFile, (value) => ({ encryptedValue: String(value) }));

type CollapseTransform<Encrypted extends boolean = false> = (
    value:
        | DotSecParameterStoreValue<DotSecExpandValues, Encrypted>
        | DotSecSecretsManagerValue<DotSecExpandValues, Encrypted>,
) =>
    | DotSecParameterStoreValue<DotSecCollapseValues, Encrypted>
    | DotSecSecretsManagerValue<DotSecCollapseValues, Encrypted>;

const collapse = <Encrypted extends boolean = false>(
    dotSecFile: DotSecFile<DotSecFullConfig, DotSecExpandValues, Encrypted>,
    transform: CollapseTransform<Encrypted>,
): DotSecFile<DotSecFullConfig, DotSecCollapseValues, Encrypted> => {
    const expandedParameterStoreValues = dotSecFile.parameterStore
        ? Object.fromEntries(
              Object.entries(dotSecFile.parameterStore).map(([key, value]) => {
                  type ZZ = typeof value;
                  return [
                      key,
                      transform(value) as DotSecParameterStoreValue<
                          DotSecCollapseValues,
                          Encrypted
                      >,
                  ];
              }),
          )
        : undefined;

    return {
        config: dotSecFile.config,
        parameterStore: expandedParameterStoreValues,
    };
};

export const collapseValues = (
    dotSecFile: DotSecFile<
        DotSecFullConfig,
        DotSecExpandValues,
        DotSecPlainTextValues
    >,
) =>
    collapse(dotSecFile, (value) => {
        if (Object.keys(value).length === 1) {
            return value.value;
        }
        return value;
    });

export const collapseEncryptedValues = (
    dotSecFile: DotSecFile<
        DotSecFullConfig,
        DotSecExpandValues,
        DotSecEncryptedValues
    >,
) =>
    collapse(dotSecFile, (value) => {
        if (Object.keys(value).length === 1) {
            return value.encryptedValue;
        }
        return value;
    });
export const flattenToJSON = () => {};

export const unflattenFromJSON = () => {};
